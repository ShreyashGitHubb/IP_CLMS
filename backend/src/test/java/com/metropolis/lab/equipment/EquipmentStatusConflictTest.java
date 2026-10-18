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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Equipment status and maintenance tickets both write to equipment.status, so these tests pin down which
 * combinations of ticket, loan and status are allowed.
 */
@SpringBootTest(properties = "app.auth.token-secret=CLMS-Test-Token-Secret-32-Bytes-Long")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EquipmentStatusConflictTest {

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

    admin = new User();
    admin.setName("Conflict Admin");
    admin.setEmail("conflict-admin@example.edu");
    admin.setPasswordHash(new BCryptPasswordEncoder().encode("Password123"));
    admin.setRole("ADMIN");
    admin = userRepository.save(admin);
    adminToken = authTokenService.issue(admin);
  }

  @Test
  void markingEquipmentAvailableWithAnOpenTicketFailsUntilTheTicketIsClosed() throws Exception {
    Long equipmentId = insertEquipment("Conflict Scope", "CONFLICT-1", "AVAILABLE");
    insertOpenTicket(equipmentId);

    mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Conflict Scope", "CONFLICT-1", "AVAILABLE")))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value(
        "This equipment has 1 unresolved maintenance ticket. Confirm to close it and return the item to circulation, or keep it in service."));
    // The rejected save must not have written anything.
    assertEquals("AVAILABLE", equipmentStatus(equipmentId));
    assertEquals(1, jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM maintenance_tickets WHERE equipment_id = ? AND status <> 'RESOLVED'",
      Integer.class, equipmentId));

    mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .param("closeMaintenance", "true")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Conflict Scope", "CONFLICT-1", "AVAILABLE")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("AVAILABLE"));

    assertEquals("AVAILABLE", equipmentStatus(equipmentId));
    assertEquals(1, jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM maintenance_tickets WHERE equipment_id = ? AND status = 'RESOLVED' AND resolved_at IS NOT NULL",
      Integer.class, equipmentId));
  }

  @Test
  void equipmentOnLoanCannotBeMarkedAvailable() throws Exception {
    Long equipmentId = insertEquipment("Loaned Conflict Scope", "CONFLICT-LOAN-1", "IN_USE");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, admin.getId(), "BORROW");

    mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Loaned Conflict Scope", "CONFLICT-LOAN-1", "AVAILABLE")))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value(
        "This equipment is still on loan. Record the return before changing its status."));

    assertEquals("IN_USE", equipmentStatus(equipmentId));
  }

  @Test
  void returningEquipmentKeepsItInMaintenanceWhenATicketIsStillOpen() throws Exception {
    Long equipmentId = insertEquipment("Damaged Loan Scope", "CONFLICT-RETURN-1", "IN_USE");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, admin.getId(), "BORROW");
    Long transactionId = jdbcTemplate.queryForObject("SELECT id FROM transactions WHERE equipment_id = ?", Long.class, equipmentId);
    Long ticketId = insertOpenTicket(equipmentId);

    mockMvc.perform(put("/api/transactions/{id}/return", transactionId)
        .header("Authorization", "Bearer " + adminToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.action").value("RETURN"));

    assertEquals("MAINTENANCE", equipmentStatus(equipmentId));

    // Resolving the ticket is what releases the item back to circulation.
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
        .patch("/api/maintenance/{id}", ticketId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"status\":\"RESOLVED\"}"))
      .andExpect(status().isOk());
    assertEquals("AVAILABLE", equipmentStatus(equipmentId));
  }

  @Test
  void returningEquipmentWithoutOpenTicketsMakesItAvailable() throws Exception {
    Long equipmentId = insertEquipment("Clean Loan Scope", "CONFLICT-RETURN-2", "IN_USE");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, admin.getId(), "BORROW");
    Long transactionId = jdbcTemplate.queryForObject("SELECT id FROM transactions WHERE equipment_id = ?", Long.class, equipmentId);

    mockMvc.perform(put("/api/transactions/{id}/return", transactionId)
        .header("Authorization", "Bearer " + adminToken))
      .andExpect(status().isOk());

    assertEquals("AVAILABLE", equipmentStatus(equipmentId));
  }

  @Test
  void secondOpenTicketForTheSameEquipmentIsRejected() throws Exception {
    Long equipmentId = insertEquipment("Repeat Fault Scope", "CONFLICT-TICKET-1", "AVAILABLE");
    String body = objectMapper.writeValueAsString(java.util.Map.of(
      "equipmentId", equipmentId, "title", "Loose connector", "details", "Connector needs replacement"));

    mockMvc.perform(post("/api/maintenance")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
      .andExpect(status().isCreated());

    mockMvc.perform(post("/api/maintenance")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value(
        "This equipment already has an unresolved maintenance ticket. Resolve the open ticket before logging another incident."));

    assertEquals(1, jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM maintenance_tickets WHERE equipment_id = ?", Integer.class, equipmentId));
  }

  @Test
  void loggingAFaultDoesNotResurrectRetiredEquipment() throws Exception {
    Long equipmentId = insertEquipment("Retired Fault Scope", "CONFLICT-RETIRED-1", "RETIRED");

    mockMvc.perform(post("/api/maintenance")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(java.util.Map.of(
          "equipmentId", equipmentId, "title", "Storage fault", "details", "Stored spare no longer powers on"))))
      .andExpect(status().isCreated());

    assertEquals("RETIRED", equipmentStatus(equipmentId));
  }

  @Test
  void duplicateAssetTagIsRejectedAndNamesTheConflictingRecord() throws Exception {
    insertEquipment("Spectrometer A", "CONFLICT-TAG-1", "AVAILABLE");

    mockMvc.perform(post("/api/equipment")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Spectrometer B", "conflict-tag-1", "AVAILABLE")))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value("Asset tag \"conflict-tag-1\" is already used by \"Spectrometer A\"."));

    assertEquals(1, jdbcTemplate.queryForObject(
      "SELECT COUNT(*) FROM equipment WHERE LOWER(asset_tag) = 'conflict-tag-1'", Integer.class));
  }

  @Test
  void editingAnEquipmentRecordKeepsItsOwnAssetTag() throws Exception {
    Long equipmentId = insertEquipment("Spectrometer C", "CONFLICT-TAG-2", "AVAILABLE");

    mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(equipmentPayload("Spectrometer C", "CONFLICT-TAG-2", "MAINTENANCE")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.assetTag").value("CONFLICT-TAG-2"));
  }

  private String equipmentPayload(String name, String assetTag, String status) throws Exception {
    return objectMapper.writeValueAsString(java.util.Map.of(
      "name", name, "category", "Test", "assetTag", assetTag, "status", status, "location", "Lab"));
  }

  private Long insertEquipment(String name, String assetTag, String status) {
    jdbcTemplate.update(
      "INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)",
      name, "Test", assetTag, status, "Lab");
    Long id = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, assetTag);
    assertNotNull(id);
    return id;
  }

  private Long insertOpenTicket(Long equipmentId) {
    jdbcTemplate.update(
      "INSERT INTO maintenance_tickets (equipment_id, opened_by, title, details, status) VALUES (?, ?, ?, ?, 'OPEN')",
      equipmentId, admin.getId(), "Power supply fault", "Replace the failing power supply");
    return jdbcTemplate.queryForObject("SELECT id FROM maintenance_tickets WHERE equipment_id = ?", Long.class, equipmentId);
  }

  private String equipmentStatus(Long equipmentId) {
    return jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId);
  }
}