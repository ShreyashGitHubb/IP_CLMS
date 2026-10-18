package com.metropolis.lab.equipment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metropolis.lab.auth.AuthTokenService;
import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Two administrators approving two requests in separate tabs at the same moment, and two members scanning
 * the same asset at the same moment, must never produce two loans for one piece of equipment.
 */
@SpringBootTest(properties = "app.auth.token-secret=CLMS-Test-Token-Secret-32-Bytes-Long")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConcurrentCheckoutTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private AuthTokenService authTokenService;

  private User admin;
  private String adminToken;

  @BeforeEach
  void setUp() {
    jdbcTemplate.update("DELETE FROM notifications");
    jdbcTemplate.update("DELETE FROM maintenance_tickets");
    jdbcTemplate.update("DELETE FROM lab_events");
    jdbcTemplate.update("DELETE FROM auth_sessions");
    jdbcTemplate.update("DELETE FROM logs");
    jdbcTemplate.update("DELETE FROM equipment_requests");
    jdbcTemplate.update("DELETE FROM transactions");
    jdbcTemplate.update("DELETE FROM equipment");
    userRepository.deleteAll();

    admin = createUser("Race Admin", "race-admin@example.edu", "ADMIN");
    adminToken = authTokenService.issue(admin);
  }

  @Test
  void twoMembersCannotBeIssuedTheSameAssetAtTheSameMoment() throws Exception {
    Long equipmentId = insertEquipment("Race Microscope", "RACE-1");
    User first = createUser("First Racer", "first-racer@example.edu", "MEMBER");
    User second = createUser("Second Racer", "second-racer@example.edu", "MEMBER");

    // Warm both threads, then release them together.
    CountDownLatch start = new CountDownLatch(1);
    List<Callable<Integer>> checkouts = List.of(
      () -> checkout(start, equipmentId, first.getId()),
      () -> checkout(start, equipmentId, second.getId()));
    List<Integer> results = runTogether(checkouts);

    assertEquals(1, results.stream().filter(status -> status == 201).count(), "exactly one checkout may succeed: " + results);
    assertEquals(1, results.stream().filter(status -> status == 409).count(), "the loser must get a conflict: " + results);
    assertEquals(1, openLoans(equipmentId), "one asset can only have one open loan");
    assertEquals("IN_USE", equipmentStatus(equipmentId));
  }

  @Test
  void twoAdministratorsCannotApproveTwoRequestsForTheSameAsset() throws Exception {
    Long equipmentId = insertEquipment("Race Spectrometer", "RACE-2");
    User first = createUser("First Requester", "first-requester@example.edu", "MEMBER");
    User second = createUser("Second Requester", "second-requester@example.edu", "MEMBER");
    Long firstRequest = insertPendingRequest(equipmentId, first.getId());
    Long secondRequest = insertPendingRequest(equipmentId, second.getId());

    CountDownLatch start = new CountDownLatch(1);
    List<Callable<Integer>> decisions = List.of(
      () -> decide(start, firstRequest),
      () -> decide(start, secondRequest));
    List<Integer> results = runTogether(decisions);

    assertEquals(1, results.stream().filter(status -> status == 200).count(), "exactly one approval may succeed: " + results);
    assertEquals(1, results.stream().filter(status -> status == 409).count(), "the loser must get a conflict: " + results);
    assertEquals(1, openLoans(equipmentId), "one asset can only have one open loan");
    assertEquals(1, jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM equipment_requests WHERE equipment_id = ? AND status = 'APPROVED'", Integer.class, equipmentId));
    assertEquals(1, jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM equipment_requests WHERE equipment_id = ? AND status = 'PENDING'", Integer.class, equipmentId));
  }

  @Test
  void concurrentCheckinsOfTheSameLoanLeaveOneClosedRecord() throws Exception {
    Long equipmentId = insertEquipment("Race Return Scope", "RACE-3");
    Long transactionId = insertLoan(equipmentId, admin.getId());
    jdbcTemplate.update("UPDATE equipment SET status = 'IN_USE' WHERE id = ?", equipmentId);

    CountDownLatch start = new CountDownLatch(1);
    List<Callable<Integer>> returns = List.of(
      () -> checkin(start, transactionId),
      () -> checkin(start, transactionId));
    List<Integer> results = runTogether(returns);

    assertEquals(1, results.stream().filter(status -> status == 200).count(), "exactly one check-in may succeed: " + results);
    assertEquals(1, results.stream().filter(status -> status == 409).count(), "the second check-in is already closed: " + results);
    assertEquals(0, openLoans(equipmentId));
    assertEquals("AVAILABLE", equipmentStatus(equipmentId));
  }

  @Test
  void aStaleCopyIsRejectedInsteadOfOverwritingANewerChange() throws Exception {
    Long equipmentId = insertEquipment("Stale Edit Scope", "RACE-4");
    String staleVersion = jdbcTemplate.queryForObject(
      "SELECT version FROM equipment WHERE id = ?", String.class, equipmentId);

    // Someone else edits the record while our form is still open.
    MvcResult updated = mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Stale Edit Scope", "RACE-4", "Lab B")))
      .andExpect(status().isOk())
      .andReturn();
    long currentVersion = objectMapper.readTree(updated.getResponse().getContentAsString()).get("version").asLong();
    assertTrue(currentVersion > Long.parseLong(staleVersion), "the version column must advance on every update");

    mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Stale Edit Scope", "RACE-4", "Lab C", Long.parseLong(staleVersion))))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value(
        "This equipment record was changed by someone else while you were editing it. Reload the record and apply your change again."));

    assertEquals("Lab B", jdbcTemplate.queryForObject("SELECT location FROM equipment WHERE id = ?", String.class, equipmentId));
  }

  @Test
  void equipmentExposesAVersionThatAdvancesOnEveryChange() throws Exception {
    Long equipmentId = insertEquipment("Versioned Scope", "RACE-5");
    Long first = jdbcTemplate.queryForObject("SELECT version FROM equipment WHERE id = ?", Long.class, equipmentId);

    MvcResult updated = mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Versioned Scope", "RACE-5", "Lab C")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.version").isNumber())
      .andReturn();

    assertEquals(first + 1, (long) objectMapper.readTree(updated.getResponse().getContentAsString()).get("version").asLong());
  }

  /** Runs the tasks on separate threads and releases them together, then collects their HTTP statuses. */
  private List<Integer> runTogether(List<Callable<Integer>> tasks) throws Exception {
    ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
    try {
      CountDownLatch start = new CountDownLatch(1);
      List<Future<Integer>> futures = new java.util.ArrayList<>();
      for (Callable<Integer> task : tasks) {
        futures.add(pool.submit(() -> {
          start.await(5, TimeUnit.SECONDS);
          return task.call();
        }));
      }
      start.countDown();
      List<Integer> statuses = new java.util.ArrayList<>();
      for (Future<Integer> future : futures) statuses.add(future.get(30, TimeUnit.SECONDS));
      return statuses;
    } finally {
      pool.shutdownNow();
    }
  }

  private int checkout(CountDownLatch start, Long equipmentId, Long userId) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc.perform(post("/api/transactions")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"equipmentId\":" + equipmentId + ",\"userId\":" + userId + ",\"action\":\"BORROW\"}"))
      .andReturn().getResponse().getStatus();
  }

  private int decide(CountDownLatch start, Long requestId) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
        .patch("/api/requests/{id}/decision", requestId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"status\":\"APPROVED\"}"))
      .andReturn().getResponse().getStatus();
  }

  private int checkin(CountDownLatch start, Long transactionId) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc.perform(put("/api/transactions/{id}/return", transactionId)
        .header("Authorization", "Bearer " + adminToken))
      .andReturn().getResponse().getStatus();
  }

  private String equipmentPayload(String name, String assetTag, String location) throws Exception {
    return equipmentPayload(name, assetTag, location, null);
  }

  private String equipmentPayload(String name, String assetTag, String location, Long version) throws Exception {
    java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
    payload.put("name", name);
    payload.put("category", "Test");
    payload.put("assetTag", assetTag);
    payload.put("status", "AVAILABLE");
    payload.put("location", location);
    if (version != null) payload.put("version", version);
    return objectMapper.writeValueAsString(payload);
  }

  private User createUser(String name, String email, String role) {
    User user = new User();
    user.setName(name);
    user.setEmail(email);
    user.setPasswordHash(new BCryptPasswordEncoder().encode("Password123"));
    user.setRole(role);
    return userRepository.save(user);
  }

  private Long insertEquipment(String name, String assetTag) {
    jdbcTemplate.update(
      "INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, 'AVAILABLE', 'Lab')",
      name, "Test", assetTag);
    return jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, assetTag);
  }

  private Long insertPendingRequest(Long equipmentId, Long userId) {
    jdbcTemplate.update("INSERT INTO equipment_requests (equipment_id, user_id, purpose, status) VALUES (?, ?, ?, 'PENDING')",
      equipmentId, userId, "Coursework");
    return jdbcTemplate.queryForObject("SELECT id FROM equipment_requests WHERE equipment_id = ? ORDER BY id DESC LIMIT 1", Long.class, equipmentId);
  }

  private Long insertLoan(Long equipmentId, Long userId) {
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, 'BORROW')", equipmentId, userId);
    return jdbcTemplate.queryForObject("SELECT id FROM transactions WHERE equipment_id = ? ORDER BY id DESC LIMIT 1", Long.class, equipmentId);
  }

  private int openLoans(Long equipmentId) {
    return jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM transactions WHERE equipment_id = ? AND returned_at IS NULL", Integer.class, equipmentId);
  }

  private String equipmentStatus(Long equipmentId) {
    return jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId);
  }
}