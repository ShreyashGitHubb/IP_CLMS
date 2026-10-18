package com.metropolis.lab.transaction;

import com.metropolis.lab.equipment.Equipment;
import com.metropolis.lab.equipment.EquipmentRepository;
import com.metropolis.lab.equipment.EquipmentStatus;
import com.metropolis.lab.maintenance.MaintenanceTicketRepository;
import com.metropolis.lab.user.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
  private final TransactionRepository repository;
  private final EquipmentRepository equipmentRepository;
  private final MaintenanceTicketRepository maintenanceTickets;
  public TransactionController(TransactionRepository repository, EquipmentRepository equipmentRepository, MaintenanceTicketRepository maintenanceTickets){this.repository=repository; this.equipmentRepository=equipmentRepository; this.maintenanceTickets=maintenanceTickets;}
  @GetMapping public List<Transaction> list(@RequestAttribute("currentUser") User currentUser){
    return "ADMIN".equals(currentUser.getRole())
      ? repository.findAll()
      : repository.findAllByUserId(currentUser.getId());
  }
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Transaction create(@Valid @RequestBody Transaction transaction, @RequestAttribute("currentUser") User currentUser){
    // Admins can create transactions for any user.
    // Non-admin members can only create a transaction assigned to themselves (self-checkout via kiosk).
    boolean isAdmin = "ADMIN".equals(currentUser.getRole());
    if (!isAdmin && !currentUser.getId().equals(transaction.getUserId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only check out equipment to your own account.");
    }
    if ("RETURN".equalsIgnoreCase(transaction.getAction())) {
      // A RETURN row created here would look closed to some screens and open to others. Returns go through
      // PUT /api/transactions/{id}/return so the equipment state is updated in the same step.
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Record a return with PUT /api/transactions/{id}/return so the equipment status is updated with it.");
    }
    Equipment item = equipmentRepository.findById(transaction.getEquipmentId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
    if (item.getStatus() != EquipmentStatus.AVAILABLE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Equipment is not available for checkout.");
    }
    // Guard the ledger itself, not only the cached status: issuing an item that already has an open loan
    // creates two borrowers for one asset, and the first check-in would release it while it is still out.
    if (repository.existsByEquipmentIdAndReturnedAtIsNull(item.getId())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This equipment already has an open loan. Check it back in before issuing it again.");
    }
    item.setStatus(EquipmentStatus.IN_USE);
    equipmentRepository.save(item);
    return repository.save(transaction);
  }

  @PutMapping("/{id}/return")
  @Transactional
  public Transaction returnEquipment(@PathVariable Long id, @RequestAttribute("currentUser") User currentUser) {
    Transaction transaction = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found."));
    if (!"ADMIN".equals(currentUser.getRole()) && !transaction.getUserId().equals(currentUser.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only return equipment assigned to your account.");
    }
    if (transaction.getReturnedAt() != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This transaction is already closed.");
    }
    transaction.setReturnedAt(java.time.Instant.now());
    transaction.setAction("RETURN");
    Transaction saved = repository.save(transaction);
    Equipment item = equipmentRepository.findById(transaction.getEquipmentId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
    // A returned item only re-enters circulation once its maintenance tickets are resolved and no other loan
    // is still open; otherwise the catalogue would offer equipment that is still out or on the repair bench.
    if (item.getStatus() == EquipmentStatus.IN_USE) {
      boolean stillOnLoan = repository.existsByEquipmentIdAndReturnedAtIsNull(item.getId());
      boolean underService = maintenanceTickets.existsByEquipmentIdAndStatusNot(item.getId(), MaintenanceTicketRepository.RESOLVED);
      item.setStatus(stillOnLoan ? EquipmentStatus.IN_USE : underService ? EquipmentStatus.MAINTENANCE : EquipmentStatus.AVAILABLE);
      equipmentRepository.save(item);
    }
    return saved;
  }
}
