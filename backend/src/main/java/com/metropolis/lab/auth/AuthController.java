package com.metropolis.lab.auth;

import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private static final Set<String> ALLOWED_ROLES = Set.of("MEMBER", "ADMIN");
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final UserRepository userRepository;
  private final AuthTokenService authTokenService;

  public AuthController(UserRepository userRepository, AuthTokenService authTokenService) {
    this.userRepository = userRepository;
    this.authTokenService = authTokenService;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
    String email = normalizeEmail(request.email());
    if (email.isBlank() || request.password() == null || request.password().isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
    }

    Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
    if (existing.isPresent()) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "An account with this email already exists."));
    }

    String requestedRole = normalizeRole(request.role());
    if ("ADMIN".equals(requestedRole)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
        "error", "Admin accounts must be created by an existing administrator or a seed process."
      ));
    }

    User user = new User();
    user.setName(request.name());
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRole("MEMBER");

    User saved = userRepository.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(authResponse(saved));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
    String email = normalizeEmail(request.email());
    if (email.isBlank() || request.password() == null || request.password().isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
    }

    Optional<User> user = userRepository.findByEmailIgnoreCase(email);
    if (user.isEmpty() || !passwordEncoder.matches(request.password(), user.get().getPasswordHash())) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
    }

    return ResponseEntity.ok(authResponse(user.get()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
    return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase();
  }

  private String normalizeRole(String role) {
    String normalized = role == null ? "" : role.trim();
    if (normalized.isEmpty()) {
      return "MEMBER";
    }

    normalized = normalized.toUpperCase(Locale.ROOT);
    if (!ALLOWED_ROLES.contains(normalized)) {
      throw new IllegalArgumentException("Role must be MEMBER or ADMIN.");
    }
    return normalized;
  }

  private Map<String, Object> authResponse(User user) {
    return Map.of(
      "token", authTokenService.issue(user),
      "user", Map.of(
        "id", user.getId(),
        "name", user.getName(),
        "email", user.getEmail(),
        "role", user.getRole()
      )
    );
  }

  public record RegisterRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    String role
  ) {}
  public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
}
