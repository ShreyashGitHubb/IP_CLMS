package com.metropolis.lab.request;

import com.metropolis.lab.equipment.Equipment;
import com.metropolis.lab.equipment.EquipmentRepository;
import com.metropolis.lab.equipment.EquipmentStatus;
import com.metropolis.lab.transaction.Transaction;
import com.metropolis.lab.transaction.TransactionRepository;
import com.metropolis.lab.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class EquipmentRequestController {
  private final EquipmentRequestRepository requests;
  private final EquipmentRepository equipment;
  private final TransactionRepository transactions;

  public EquipmentRequestController(EquipmentRequestRepository requests, EquipmentRepository equipment, TransactionRepository transactions) {
    this.requests = requests;
    this.equipment = equipment;
    this.transactions = transactions;
  }

  @GetMapping
  public List<EquipmentRequest> list(@RequestAttribute("currentUser") User user) {
    return isAdmin(user) ? requests.findAllByOrderByCreatedAtDesc() : requests.findAllByUserIdOrderByCreatedAtDesc(user.getId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public EquipmentRequest create(@Valid @RequestBody CreateRequest body, @RequestAttribute("currentUser") User user) {
    Equipment item = equipment.findById(body.equipmentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
    if (item.getStatus() != EquipmentStatus.AVAILABLE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This equipment is not currently available.");
    }
    EquipmentRequest request = new EquipmentRequest();
    request.setEquipmentId(item.getId());
    request.setUserId(user.getId());
    request.setPurpose(body.purpose().trim());
    request.setDueAt(body.dueAt());
    return requests.save(request);
  }

  @PatchMapping("/{id}/decision")
  @Transactional
  public EquipmentRequest decide(@PathVariable Long id, @Valid @RequestBody Decision decision, @RequestAttribute("currentUser") User user) {
    requireAdmin(user);
    EquipmentRequest request = requests.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found."));
    if (!"PENDING".equals(request.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This request has already been reviewed.");
    }
    if ("APPROVED".equals(decision.status())) {
      Equipment item = equipment.findById(request.getEquipmentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
      if (item.getStatus() != EquipmentStatus.AVAILABLE) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "This equipment is no longer available.");
      }
      Transaction transaction = new Transaction();
      transaction.setEquipmentId(item.getId());
      transaction.setUserId(request.getUserId());
      transaction.setAction("BORROW");
      transaction.setDueAt(request.getDueAt());
      transaction.setNotes(request.getPurpose());
      transactions.save(transaction);
      item.setStatus(EquipmentStatus.IN_USE);
      equipment.save(item);
    }
    request.setStatus(decision.status());
    request.setReviewedAt(Instant.now());
    return requests.save(request);
  }

  private boolean isAdmin(User user) { return "ADMIN".equals(user.getRole()); }

  private void requireAdmin(User user) {
    if (!isAdmin(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
  }

  public record CreateRequest(@NotNull Long equipmentId, @NotBlank String purpose, Instant dueAt) {}
  public record Decision(@NotBlank @Pattern(regexp = "APPROVED|REJECTED") String status) {}
}