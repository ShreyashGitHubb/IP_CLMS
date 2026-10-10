package com.metropolis.lab.maintenance;

import com.metropolis.lab.equipment.Equipment;
import com.metropolis.lab.equipment.EquipmentRepository;
import com.metropolis.lab.equipment.EquipmentStatus;
import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import com.metropolis.lab.notification.NotificationService;
import com.metropolis.lab.transaction.TransactionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {
  private final MaintenanceTicketRepository tickets;
  private final EquipmentRepository equipment;
  private final UserRepository users;
  private final NotificationService notifications;
  private final TransactionRepository transactions;

  public MaintenanceController(MaintenanceTicketRepository tickets, EquipmentRepository equipment, UserRepository users, NotificationService notifications, TransactionRepository transactions) {
    this.tickets = tickets;
    this.equipment = equipment;
    this.users = users;
    this.notifications = notifications;
    this.transactions = transactions;
  }

  @GetMapping
  public List<MaintenanceTicket> list(@RequestAttribute("currentUser") User user) {
    requireAdmin(user);
    return tickets.findAllByOrderByOpenedAtDesc();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public MaintenanceTicket create(@Valid @RequestBody CreateTicket request, @RequestAttribute("currentUser") User user) {
    requireAdmin(user);
    Equipment item = equipment.findById(request.equipmentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
    MaintenanceTicket ticket = new MaintenanceTicket();
    ticket.setEquipmentId(item.getId());
    ticket.setOpenedBy(user.getId());
    ticket.setTitle(request.title().trim());
    ticket.setDetails(request.details().trim());
    ticket.setAssignedTechnician(request.assignedTechnician());
    ticket.setRepairCost(request.repairCost());
    item.setStatus(EquipmentStatus.MAINTENANCE);
    equipment.save(item);
    MaintenanceTicket saved = tickets.save(ticket);
    users.findAll().stream().filter(account -> "MEMBER".equals(account.getRole())).forEach(account ->
      notifications.create(account.getId(), "Equipment sent to maintenance", item.getName() + " is unavailable for service: " + saved.getTitle())
    );
    return saved;
  }

  @PatchMapping("/{id}")
  @Transactional
  public MaintenanceTicket update(@PathVariable Long id, @Valid @RequestBody UpdateTicket request, @RequestAttribute("currentUser") User user) {
    requireAdmin(user);
    MaintenanceTicket ticket = tickets.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maintenance ticket not found."));
    ticket.setStatus(request.status());
    ticket.setAssignedTechnician(request.assignedTechnician());
    ticket.setRepairCost(request.repairCost());
    if ("RESOLVED".equals(request.status())) {
      ticket.setResolvedAt(Instant.now());
    } else {
      ticket.setResolvedAt(null);
    }
    MaintenanceTicket saved = tickets.save(ticket);
    Equipment item = equipment.findById(ticket.getEquipmentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
    if ("RESOLVED".equals(request.status()) && !tickets.existsByEquipmentIdAndStatusNot(item.getId(), "RESOLVED")) {
      if (item.getStatus() == EquipmentStatus.MAINTENANCE) {
        item.setStatus(transactions.existsByEquipmentIdAndReturnedAtIsNull(item.getId()) ? EquipmentStatus.IN_USE : EquipmentStatus.AVAILABLE);
      }
    } else if (!"RESOLVED".equals(request.status())) {
      item.setStatus(EquipmentStatus.MAINTENANCE);
    }
    equipment.save(item);
    if ("RESOLVED".equals(request.status())) {
      String statusMessage = switch (item.getStatus()) {
        case AVAILABLE -> item.getName() + " has completed maintenance and is available again.";
        case IN_USE -> item.getName() + " has completed maintenance and remains checked out until its active loan is returned.";
        case MAINTENANCE -> item.getName() + " has one resolved ticket but remains unavailable because other maintenance is still open.";
        case RETIRED -> item.getName() + " has completed maintenance but remains retired.";
      };
      users.findAll().stream().filter(account -> "MEMBER".equals(account.getRole())).forEach(account ->
        notifications.create(account.getId(), "Maintenance completed", statusMessage)
      );
    }
    return saved;
  }

  private void requireAdmin(User user) {
    if (!"ADMIN".equals(user.getRole())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
  }

  public record CreateTicket(@NotNull Long equipmentId, @NotBlank String title, @NotBlank String details, String assignedTechnician, @DecimalMin("0.00") BigDecimal repairCost) {}
  public record UpdateTicket(@NotBlank @Pattern(regexp = "OPEN|IN_PROGRESS|RESOLVED") String status, String assignedTechnician, @DecimalMin("0.00") BigDecimal repairCost) {}
}