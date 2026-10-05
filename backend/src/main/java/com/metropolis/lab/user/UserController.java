package com.metropolis.lab.user;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "${APP_ORIGIN:http://localhost:3000}")
public class UserController {
  private final UserRepository repository;
  public UserController(UserRepository repository){this.repository = repository;}
  @GetMapping public List<UserSummary> list(){return repository.findAll().stream().map(UserSummary::from).toList();}
  record UserSummary(Long id, String name, String email, String role, Instant createdAt) {
    static UserSummary from(User user){return new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCreatedAt());}
  }
}
