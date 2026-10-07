package com.metropolis.lab.log;

import com.metropolis.lab.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {
  private final AuditLogRepository repository;

  public AuditLogController(AuditLogRepository repository) { this.repository = repository; }

  @GetMapping
  public List<AuditLog> list(@RequestAttribute("currentUser") User user) {
    if (!"ADMIN".equals(user.getRole())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
    return repository.findTop250ByOrderByCreatedAtDesc();
  }
}