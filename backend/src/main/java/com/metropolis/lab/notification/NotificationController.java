package com.metropolis.lab.notification;

import com.metropolis.lab.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationRepository repository;

  public NotificationController(NotificationRepository repository) { this.repository = repository; }

  @GetMapping
  public List<Notification> list(@RequestAttribute("currentUser") User user) {
    return repository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
  }

  @PutMapping("/{id}/read")
  public Notification markRead(@PathVariable Long id, @RequestAttribute("currentUser") User user) {
    Notification notification = repository.findByIdAndUserId(id, user.getId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
    if (notification.getReadAt() == null) notification.setReadAt(Instant.now());
    return repository.save(notification);
  }

  @PutMapping("/read-all")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void markAllRead(@RequestAttribute("currentUser") User user) {
    repository.findAllByUserIdOrderByCreatedAtDesc(user.getId()).stream()
      .filter(notification -> notification.getReadAt() == null)
      .forEach(notification -> {
        notification.setReadAt(Instant.now());
        repository.save(notification);
      });
  }
}