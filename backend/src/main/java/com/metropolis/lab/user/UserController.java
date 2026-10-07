package com.metropolis.lab.user;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.ResponseEntity;
import com.metropolis.lab.auth.AuthTokenService;
import com.metropolis.lab.notification.NotificationService;
import java.time.Instant;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserRepository repository;
  private final AuthTokenService tokenService;
  private final NotificationService notifications;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final SecureRandom secureRandom = new SecureRandom();
  public UserController(UserRepository repository, AuthTokenService tokenService, NotificationService notifications){this.repository = repository; this.tokenService = tokenService; this.notifications = notifications;}
  @GetMapping public List<UserSummary> list(@RequestAttribute("currentUser") User currentUser){
    if (!"ADMIN".equals(currentUser.getRole())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
    }
    return repository.findAll().stream().map(UserSummary::from).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ResponseEntity<?> create(@Valid @RequestBody CreateUser request, @RequestAttribute("currentUser") User currentUser) {
    requireAdmin(currentUser);
    if (repository.findByEmailIgnoreCase(request.email().trim()).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
    }
    User user = new User();
    user.setName(request.name().trim());
    user.setEmail(request.email().trim().toLowerCase(java.util.Locale.ROOT));
    user.setRole(request.role());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setMustChangePassword(true);
    User saved = repository.save(user);
    notifications.create(saved.getId(), "Lab account created", "An administrator created your " + saved.getRole().toLowerCase() + " account. Sign in using the credentials they provided.");
    return ResponseEntity.status(HttpStatus.CREATED).body(UserSummary.from(saved));
  }

  @PatchMapping("/{id}/role")
  public UserSummary updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRole request, @RequestAttribute("currentUser") User currentUser) {
    requireAdmin(currentUser);
    User user = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    if (user.getId().equals(currentUser.getId()) && !"ADMIN".equals(request.role())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot remove your own administrator access.");
    }
    if ("ADMIN".equals(user.getRole()) && !"ADMIN".equals(request.role()) && repository.countByRole("ADMIN") <= 1) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The last administrator cannot be demoted.");
    }
    user.setRole(request.role());
    tokenService.revokeAll(user.getId());
    return UserSummary.from(repository.save(user));
  }

  @PostMapping("/{id}/reset-password")
  public TemporaryPassword resetPassword(@PathVariable Long id, @RequestAttribute("currentUser") User currentUser) {
    requireAdmin(currentUser);
    User user = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    byte[] random = new byte[18];
    secureRandom.nextBytes(random);
    String temporaryPassword = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
    user.setMustChangePassword(true);
    repository.save(user);
    tokenService.revokeAll(user.getId());
    notifications.create(user.getId(), "Password reset", "An administrator reset your password. Sign in with the temporary password they provided and change it in Settings.");
    return new TemporaryPassword(user.getId(), temporaryPassword);
  }

  @PutMapping("/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(@Valid @RequestBody ChangePassword request, @RequestAttribute("currentUser") User currentUser) {
    if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPasswordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect.");
    }
    currentUser.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    currentUser.setMustChangePassword(false);
    repository.save(currentUser);
    tokenService.revokeAll(currentUser.getId());
  }

  private void requireAdmin(User currentUser) {
    if (!"ADMIN".equals(currentUser.getRole())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
  }

  public record CreateUser(@NotBlank @Size(max = 120) String name, @NotBlank @Email String email,
      @NotBlank @Size(min = 8, max = 72) String password, @NotBlank @Pattern(regexp = "MEMBER|ADMIN") String role) {}
  public record UpdateRole(@NotBlank @Pattern(regexp = "MEMBER|ADMIN") String role) {}
  public record ChangePassword(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 72) String newPassword) {}
  public record TemporaryPassword(Long userId, String password) {}

  record UserSummary(Long id, String name, String email, String role, Instant createdAt, boolean mustChangePassword) {
    static UserSummary from(User user){return new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCreatedAt(), user.isMustChangePassword());}
  }
}
