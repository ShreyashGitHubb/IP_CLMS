package com.metropolis.lab.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.auth.token-secret=CLMS-Test-Token-Secret-32-Bytes-Long")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

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
  }

  @Test
  void registerMember_createsMemberAccountAndLoginWorks() throws Exception {
    String registerBody = """
      {
        "name": "Jane Member",
        "email": "jane@example.edu",
        "password": "Password123",
        "role": "MEMBER"
      }
      """;

    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(registerBody))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.user.email").value("jane@example.edu"))
      .andExpect(jsonPath("$.user.role").value("MEMBER"));

    String loginBody = """
      {
        "email": "jane@example.edu",
        "password": "Password123"
      }
      """;

    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(loginBody))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.user.email").value("jane@example.edu"))
      .andExpect(jsonPath("$.user.role").value("MEMBER"));
  }

  @Test
  void registerAdmin_isRejected() throws Exception {
    String body = """
      {
        "name": "Jane Admin",
        "email": "admin@example.edu",
        "password": "Password123",
        "role": "ADMIN"
      }
      """;

    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.error").value("Admin accounts must be created by an existing administrator or a seed process."));
  }

  @Test
  void operationalEndpointsRequireAuthenticationAndRestrictAdminActions() throws Exception {
    mockMvc.perform(get("/api/equipment"))
      .andExpect(status().isUnauthorized());

    String registerBody = """
      {
        "name": "Jane Member",
        "email": "jane@example.edu",
        "password": "Password123"
      }
      """;
    String token = mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(registerBody))
      .andExpect(status().isCreated())
      .andReturn().getResponse().getContentAsString();
    String bearerToken = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
      .readTree(token).get("token").asText();

    mockMvc.perform(get("/api/equipment").header("Authorization", "Bearer " + bearerToken))
      .andExpect(status().isOk());
    mockMvc.perform(get("/api/transactions").header("Authorization", "Bearer " + bearerToken))
      .andExpect(status().isOk());
    mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + bearerToken))
      .andExpect(status().isForbidden());
    mockMvc.perform(post("/api/equipment")
        .header("Authorization", "Bearer " + bearerToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Scope\",\"category\":\"Test\",\"assetTag\":\"TEST-1\",\"location\":\"Lab\"}"))
      .andExpect(status().isForbidden());
  }

  @Test
  void invalidBearerTokenIsRejected() throws Exception {
    mockMvc.perform(get("/api/equipment").header("Authorization", "Bearer invalid.token"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void logoutRevokesTheCurrentBearerSession() throws Exception {
    String token = registerMember("Logout Member", "logout@example.edu");
    mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
      .andExpect(status().isNoContent());
    mockMvc.perform(get("/api/equipment").header("Authorization", "Bearer " + token))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void adminCanCreateAccountAndPromoteMember() throws Exception {
    User admin = createAdmin("account-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    String createBody = """
      {"name":"Created Member","email":"created@example.edu","password":"Temporary123","role":"MEMBER"}
      """;
    String response = mockMvc.perform(post("/api/users")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(createBody))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.mustChangePassword").value(true))
      .andReturn().getResponse().getContentAsString();
    Long memberId = objectMapper.readTree(response).get("id").asLong();

    mockMvc.perform(patch("/api/users/{id}/role", memberId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"role\":\"ADMIN\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.role").value("ADMIN"));
  }

  @Test
  void adminCanDeleteUnusedAccountAndItsSessionAndNotifications() throws Exception {
    User admin = createAdmin("delete-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    String createBody = """
      {"name":"Unused Member","email":"unused@example.edu","password":"Temporary123","role":"MEMBER"}
      """;
    String response = mockMvc.perform(post("/api/users")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(createBody))
      .andExpect(status().isCreated())
      .andReturn().getResponse().getContentAsString();
    Long memberId = objectMapper.readTree(response).get("id").asLong();
    authTokenService.issue(userRepository.findById(memberId).orElseThrow());

    mockMvc.perform(delete("/api/users/{id}", memberId).header("Authorization", "Bearer " + adminToken))
      .andExpect(status().isNoContent());

    org.junit.jupiter.api.Assertions.assertFalse(userRepository.existsById(memberId));
    org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM auth_sessions WHERE user_id = ?", Integer.class, memberId));
    org.junit.jupiter.api.Assertions.assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id = ?", Integer.class, memberId));
  }

  @Test
  void adminCannotDeleteAccountWithOperationalHistory() throws Exception {
    User admin = createAdmin("delete-history-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    String memberToken = registerMember("History Member", "history-member@example.edu");
    Long memberId = userRepository.findByEmailIgnoreCase("history-member@example.edu").orElseThrow().getId();
    jdbcTemplate.update("INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)", "History Scope", "Test", "DELETE-HISTORY-1", "AVAILABLE", "Lab");
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "DELETE-HISTORY-1");
    jdbcTemplate.update("INSERT INTO equipment_requests (equipment_id, user_id, purpose, status) VALUES (?, ?, ?, ?)", equipmentId, memberId, "Coursework", "PENDING");

    mockMvc.perform(delete("/api/users/{id}", memberId).header("Authorization", "Bearer " + adminToken))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value("This account has linked records. Deactivate it to preserve its history."));

    org.junit.jupiter.api.Assertions.assertTrue(userRepository.existsById(memberId));
    mockMvc.perform(get("/api/equipment").header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isOk());
  }

  @Test
  void adminCanDeactivateMemberAndRevokesExistingSessions() throws Exception {
    User admin = createAdmin("deactivate-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    String memberToken = registerMember("Inactive Member", "inactive@example.edu");
    Long memberId = userRepository.findByEmailIgnoreCase("inactive@example.edu").orElseThrow().getId();

    mockMvc.perform(patch("/api/users/{id}/active", memberId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"active\":false}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.active").value(false));

    mockMvc.perform(get("/api/equipment").header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"inactive@example.edu\",\"password\":\"Password123\"}"))
      .andExpect(status().isUnauthorized());
    org.junit.jupiter.api.Assertions.assertTrue(userRepository.existsById(memberId));
  }

  @Test
  void cannotDeactivateSelfLastAdminOrMemberWithActiveLoan() throws Exception {
    User admin = createAdmin("protected-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    mockMvc.perform(patch("/api/users/{id}/active", admin.getId())
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"active\":false}"))
      .andExpect(status().isConflict());

    String memberToken = registerMember("Borrowing Member", "borrowing@example.edu");
    Long memberId = userRepository.findByEmailIgnoreCase("borrowing@example.edu").orElseThrow().getId();
    jdbcTemplate.update("INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)", "Loaned Scope", "Test", "DEACTIVATE-LOAN", "IN_USE", "Lab");
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "DEACTIVATE-LOAN");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, memberId, "BORROW");

    mockMvc.perform(patch("/api/users/{id}/active", memberId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"active\":false}"))
      .andExpect(status().isConflict());
    mockMvc.perform(get("/api/equipment").header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isOk());
  }

  @Test
  void maintenanceTicketCanBeResolvedAndEquipmentReturnsToAvailable() throws Exception {
    User admin = createAdmin("maintenance-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    jdbcTemplate.update("INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)", "Repair Scope", "Test", "MAINTENANCE-1", "AVAILABLE", "Lab");
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "MAINTENANCE-1");

    String ticketBody = objectMapper.writeValueAsString(java.util.Map.of("equipmentId", equipmentId, "title", "Loose connector", "details", "Connector needs replacement"));
    String ticketResponse = mockMvc.perform(post("/api/maintenance")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(ticketBody))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.status").value("OPEN"))
      .andReturn().getResponse().getContentAsString();
    Long ticketId = objectMapper.readTree(ticketResponse).get("id").asLong();
    org.junit.jupiter.api.Assertions.assertEquals("MAINTENANCE", jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId));

    mockMvc.perform(patch("/api/maintenance/{id}", ticketId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"status\":\"RESOLVED\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("RESOLVED"));
    org.junit.jupiter.api.Assertions.assertEquals("AVAILABLE", jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId));
  }

  @Test
  void equipmentWithHistoryCannotBeDeletedButCanBeRetired() throws Exception {
    User admin = createAdmin("equipment-retire-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    jdbcTemplate.update("INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)", "Tracked Microscope", "Microscopy", "RETIRE-HISTORY-1", "IN_USE", "Lab A");
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "RETIRE-HISTORY-1");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, admin.getId(), "BORROW");

    mockMvc.perform(delete("/api/equipment/{id}", equipmentId).header("Authorization", "Bearer " + adminToken))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.error").value("Equipment has linked requests, loans, or maintenance history and cannot be deleted. Retire it to preserve its records."));

    mockMvc.perform(put("/api/equipment/{id}", equipmentId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Tracked Microscope\",\"category\":\"Microscopy\",\"assetTag\":\"RETIRE-HISTORY-1\",\"status\":\"RETIRED\",\"location\":\"Lab A\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("RETIRED"));
    org.junit.jupiter.api.Assertions.assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM transactions WHERE equipment_id = ?", Integer.class, equipmentId));
  }

  @Test
  void resolvingMaintenanceDoesNotMakeEquipmentAvailableWhileLoanIsActive() throws Exception {
    User admin = createAdmin("maintenance-loan-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    jdbcTemplate.update("INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)", "Loaned Repair Scope", "Test", "MAINTENANCE-LOAN-1", "AVAILABLE", "Lab");
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "MAINTENANCE-LOAN-1");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, admin.getId(), "BORROW");

    String ticketResponse = mockMvc.perform(post("/api/maintenance")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(java.util.Map.of("equipmentId", equipmentId, "title", "Cable repair", "details", "Replace damaged power cable"))))
      .andExpect(status().isCreated())
      .andReturn().getResponse().getContentAsString();
    Long ticketId = objectMapper.readTree(ticketResponse).get("id").asLong();

    mockMvc.perform(patch("/api/maintenance/{id}", ticketId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"status\":\"RESOLVED\"}"))
      .andExpect(status().isOk());
    org.junit.jupiter.api.Assertions.assertEquals("IN_USE", jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId));
  }

  @Test
  void memberCanCancelOnlyOwnPendingRequest() throws Exception {
    String memberToken = registerMember("Request Member", "request-member@example.edu");
    Long memberId = userRepository.findByEmailIgnoreCase("request-member@example.edu").orElseThrow().getId();
    jdbcTemplate.update("INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)", "Request Board", "Test", "REQUEST-1", "AVAILABLE", "Lab");
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "REQUEST-1");
    jdbcTemplate.update("INSERT INTO equipment_requests (equipment_id, user_id, purpose, status) VALUES (?, ?, ?, ?)", equipmentId, memberId, "Coursework", "PENDING");
    Long requestId = jdbcTemplate.queryForObject("SELECT id FROM equipment_requests WHERE user_id = ?", Long.class, memberId);

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/requests/{id}", requestId)
        .header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isNoContent());
    org.junit.jupiter.api.Assertions.assertEquals("CANCELLED", jdbcTemplate.queryForObject("SELECT status FROM equipment_requests WHERE id = ?", String.class, requestId));
  }

  @Test
  void memberCannotReadAnotherUsersNotifications() throws Exception {
    String memberToken = registerMember("Notification Member", "notify-member@example.edu");
    Long otherMemberId = registerMemberAndGetId("Other Member", "other-notify@example.edu");
    jdbcTemplate.update("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)", otherMemberId, "Private", "Not yours");
    mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void corsPreflightDoesNotRequireBearerAuthentication() throws Exception {
    mockMvc.perform(options("/api/equipment")
        .header("Origin", "https://ip-clms.vercel.app")
        .header("Access-Control-Request-Method", "GET")
        .header("Access-Control-Request-Headers", "authorization"))
      .andExpect(status().isOk())
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
        .string("Access-Control-Allow-Origin", "https://ip-clms.vercel.app"))
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
        .string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("GET")));

    mockMvc.perform(options("/api/auth/login")
        .header("Origin", "https://clms.shreyashvishwakarma.in")
        .header("Access-Control-Request-Method", "POST")
        .header("Access-Control-Request-Headers", "authorization,content-type"))
      .andExpect(status().isOk())
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
        .string("Access-Control-Allow-Origin", "https://clms.shreyashvishwakarma.in"))
      .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
        .string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("POST")));
  }

  @Test
  void memberCanOnlyReadTheirOwnTransactions() throws Exception {
    String memberToken = registerMember("First Member", "first@example.edu");
    Long memberId = userRepository.findByEmailIgnoreCase("first@example.edu").orElseThrow().getId();
    registerMember("Second Member", "second@example.edu");
    Long otherMemberId = userRepository.findByEmailIgnoreCase("second@example.edu").orElseThrow().getId();

    jdbcTemplate.update(
      "INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)",
      "Test Scope", "Test", "TEST-SCOPE-1", "AVAILABLE", "Lab"
    );
    Long equipmentId = jdbcTemplate.queryForObject(
      "SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "TEST-SCOPE-1"
    );
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, memberId, "BORROW");
    jdbcTemplate.update("INSERT INTO transactions (equipment_id, user_id, action) VALUES (?, ?, ?)", equipmentId, otherMemberId, "BORROW");

    mockMvc.perform(get("/api/transactions").header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(1))
      .andExpect(jsonPath("$[0].userId").value(memberId));
  }

  @Test
  void authenticatedMutationIsRecordedInAuditLog() throws Exception {
    User admin = createAdmin("audit-admin@example.edu");
    String adminToken = authTokenService.issue(admin);
    mockMvc.perform(post("/api/equipment")
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Audit Scope\",\"category\":\"Test\",\"assetTag\":\"AUDIT-1\",\"location\":\"Lab\"}"))
      .andExpect(status().isCreated());
    mockMvc.perform(get("/api/audit-logs").header("Authorization", "Bearer " + adminToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].action").value("POST /api/equipment"));
  }

  @Test
  void requestApprovalCreatesLoanAndMemberCanReturnIt() throws Exception {
    String memberToken = registerMember("Loan Member", "loan@example.edu");
    Long memberId = userRepository.findByEmailIgnoreCase("loan@example.edu").orElseThrow().getId();

    User admin = new User();
    admin.setName("Lab Admin");
    admin.setEmail("workflow-admin@example.edu");
    admin.setPasswordHash(new BCryptPasswordEncoder().encode("Password123"));
    admin.setRole("ADMIN");
    admin = userRepository.save(admin);
    String adminToken = authTokenService.issue(admin);

    jdbcTemplate.update(
      "INSERT INTO equipment (name, category, asset_tag, status, location) VALUES (?, ?, ?, ?, ?)",
      "Workflow Scope", "Test", "WORKFLOW-1", "AVAILABLE", "Lab"
    );
    Long equipmentId = jdbcTemplate.queryForObject("SELECT id FROM equipment WHERE asset_tag = ?", Long.class, "WORKFLOW-1");
    String requestBody = objectMapper.writeValueAsString(java.util.Map.of("equipmentId", equipmentId, "purpose", "Research session"));
    String requestResponse = mockMvc.perform(post("/api/requests")
        .header("Authorization", "Bearer " + memberToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(requestBody))
      .andExpect(status().isCreated())
      .andReturn().getResponse().getContentAsString();
    Long requestId = objectMapper.readTree(requestResponse).get("id").asLong();

    mockMvc.perform(patch("/api/requests/{id}/decision", requestId)
        .header("Authorization", "Bearer " + adminToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"status\":\"APPROVED\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("APPROVED"));
    Long transactionId = jdbcTemplate.queryForObject("SELECT id FROM transactions WHERE user_id = ?", Long.class, memberId);
    org.junit.jupiter.api.Assertions.assertEquals("IN_USE", jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId));

    mockMvc.perform(put("/api/transactions/{id}/return", transactionId)
        .header("Authorization", "Bearer " + memberToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.action").value("RETURN"));
    org.junit.jupiter.api.Assertions.assertEquals("AVAILABLE", jdbcTemplate.queryForObject("SELECT status FROM equipment WHERE id = ?", String.class, equipmentId));
  }

  private String registerMember(String name, String email) throws Exception {
    String body = objectMapper.writeValueAsString(java.util.Map.of(
      "name", name,
      "email", email,
      "password", "Password123"
    ));
    String response = mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
      .andExpect(status().isCreated())
      .andReturn().getResponse().getContentAsString();
    return objectMapper.readTree(response).get("token").asText();
  }

  private Long registerMemberAndGetId(String name, String email) throws Exception {
    registerMember(name, email);
    return userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
  }

  private User createAdmin(String email) {
    User admin = new User();
    admin.setName("Test Admin");
    admin.setEmail(email);
    admin.setPasswordHash(new BCryptPasswordEncoder().encode("Password123"));
    admin.setRole("ADMIN");
    return userRepository.save(admin);
  }
}
