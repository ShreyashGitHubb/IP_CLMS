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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
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
}
