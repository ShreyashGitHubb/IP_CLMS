package com.metropolis.lab.auth;

import com.metropolis.lab.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private UserRepository userRepository;

  @BeforeEach
  void setUp() {
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
}
