package com.metropolis.lab.event;

import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import com.metropolis.lab.notification.NotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class LabEventController {
  private final LabEventRepository events;
  private final UserRepository users;
  private final NotificationService notifications;

  public LabEventController(LabEventRepository events, UserRepository users, NotificationService notifications) {
    this.events = events;
    this.users = users;
    this.notifications = notifications;
  }

  @GetMapping
  public List<LabEvent> list(@RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to) {
    if (from != null && to != null) return events.findAllByStartsAtBetweenOrderByStartsAtAsc(from, to);
    return events.findAllByOrderByStartsAtAsc();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public LabEvent create(@Valid @RequestBody EventInput input, @RequestAttribute("currentUser") User user) {
    requireAdmin(user);
    if (input.endsAt() != null && input.endsAt().isBefore(input.startsAt())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event end must be after its start.");
    }
    LabEvent event = new LabEvent();
    event.setCreatedBy(user.getId());
    event.setTitle(input.title().trim());
    event.setDetails(input.details());
    event.setStartsAt(input.startsAt());
    event.setEndsAt(input.endsAt());
    LabEvent saved = events.save(event);
    users.findAll().stream().filter(account -> !account.getId().equals(user.getId())).forEach(account ->
      notifications.create(account.getId(), "New lab event scheduled", saved.getTitle() + " · " + saved.getStartsAt())
    );
    return saved;
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id, @RequestAttribute("currentUser") User user) {
    requireAdmin(user);
    if (!events.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found.");
    events.deleteById(id);
  }

  private void requireAdmin(User user) {
    if (!"ADMIN".equals(user.getRole())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
  }

  public record EventInput(@NotBlank String title, String details, @NotNull Instant startsAt, Instant endsAt) {}
}