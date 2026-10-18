package com.metropolis.lab.transaction;

import com.metropolis.lab.equipment.Equipment;
import com.metropolis.lab.equipment.EquipmentRepository;
import com.metropolis.lab.equipment.EquipmentStatus;
import com.metropolis.lab.common.ResourceNotFoundException;
import com.metropolis.lab.maintenance.MaintenanceTicketRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Issuing and returning equipment are the two writes that must never interleave, so both read the
 * equipment row through SELECT ... FOR UPDATE ({@link EquipmentRepository#findByIdForUpdate}).
 *
 * Two members scanning the same asset, or two administrators approving two requests in different tabs,
 * are therefore serialized at the database row: the first writer commits, the second one wakes up,
 * reads the new status and is answered with a conflict instead of creating a second loan for one asset.
 */
@Service
public class TransactionService {
  private final TransactionRepository transactions;
  private final EquipmentRepository equipment;
  private final MaintenanceTicketRepository maintenanceTickets;

  public TransactionService(TransactionRepository transactions, EquipmentRepository equipment, MaintenanceTicketRepository maintenanceTickets) {
    this.transactions = transactions;
    this.equipment = equipment;
    this.maintenanceTickets = maintenanceTickets;
  }

  @Transactional
  public Transaction issue(Transaction request, Long currentUserId, boolean isAdmin) {
    // Non-admin members can only take equipment out on their own account (kiosk self-checkout).
    if (!isAdmin && !currentUserId.equals(request.getUserId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only check out equipment to your own account.");
    }
    if ("RETURN".equalsIgnoreCase(request.getAction())) {
      // A RETURN row created here would look closed to some screens and open to others. Returns go through
      // TransactionService#returnEquipment so the equipment state is updated in the same step.
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Record a return with PUT /api/transactions/{id}/return so the equipment status is updated with it.");
    }

    Equipment item = locked(request.getEquipmentId());
    if (item.getStatus() != EquipmentStatus.AVAILABLE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Equipment is not available for checkout.");
    }
    // The status is only a cache of the ledger, so the ledger is what decides. Two open loans on one asset
    // would let the first check-in release equipment the second borrower still has.
    if (transactions.existsByEquipmentIdAndReturnedAtIsNull(item.getId())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This equipment already has an open loan. Check it back in before issuing it again.");
    }

    item.setStatus(EquipmentStatus.IN_USE);
    equipment.saveAndFlush(item);
    return transactions.saveAndFlush(request);
  }

  @Transactional
  public Transaction returnEquipment(Long id, Long currentUserId, boolean isAdmin) {
    // Resolve the asset with a scalar projection, then take both locks in a fixed order (equipment, then
    // loan). Loading the loan first would put a stale copy in the persistence context, and a locking query
    // never refreshes an entity the session already holds.
    Long equipmentId = transactions.findEquipmentIdById(id)
      .orElseThrow(() -> new ResourceNotFoundException("Transaction not found."));
    Equipment item = locked(equipmentId);
    Transaction transaction = transactions.findByIdForUpdate(id)
      .orElseThrow(() -> new ResourceNotFoundException("Transaction not found."));

    if (!isAdmin && !transaction.getUserId().equals(currentUserId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only return equipment assigned to your account.");
    }
    if (transaction.getReturnedAt() != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This transaction is already closed.");
    }

    transaction.setReturnedAt(java.time.Instant.now());
    transaction.setAction("RETURN");
    Transaction saved = transactions.saveAndFlush(transaction);

    // A returned item only re-enters circulation once its maintenance tickets are resolved and no other
    // loan is still open; otherwise the catalogue would offer equipment that is out or on the repair bench.
    if (item.getStatus() == EquipmentStatus.IN_USE) {
      boolean stillOnLoan = transactions.existsByEquipmentIdAndReturnedAtIsNull(item.getId());
      boolean underService = maintenanceTickets.existsByEquipmentIdAndStatusNot(item.getId(), MaintenanceTicketRepository.RESOLVED);
      item.setStatus(stillOnLoan ? EquipmentStatus.IN_USE : underService ? EquipmentStatus.MAINTENANCE : EquipmentStatus.AVAILABLE);
      equipment.saveAndFlush(item);
    }
    return saved;
  }

  /** Locks the equipment row for the remainder of the transaction; readers see the committed state. */
  private Equipment locked(Long equipmentId) {
    return equipment.findByIdForUpdate(equipmentId)
      .orElseThrow(() -> new ResourceNotFoundException("Equipment not found."));
  }
}