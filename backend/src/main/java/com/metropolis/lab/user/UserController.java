package com.metropolis.lab.user;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserRepository repository;
  public UserController(UserRepository repository){this.repository = repository;}
  @GetMapping public List<UserSummary> list(@RequestAttribute("currentUser") User currentUser){
    if (!"ADMIN".equals(currentUser.getRole())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
    }
    return repository.findAll().stream().map(UserSummary::from).toList();
  }
  record UserSummary(Long id, String name, String email, String role, Instant createdAt) {
    static UserSummary from(User user){return new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCreatedAt());}
  }
}
