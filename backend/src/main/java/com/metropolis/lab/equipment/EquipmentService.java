package com.metropolis.lab.equipment;

import com.metropolis.lab.common.ResourceNotFoundException;
import com.metropolis.lab.maintenance.MaintenanceTicket;
import com.metropolis.lab.maintenance.MaintenanceTicketRepository;
import com.metropolis.lab.request.EquipmentRequestRepository;
import com.metropolis.lab.transaction.TransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@Service
public class EquipmentService {
  private final EquipmentRepository repository;
  private final EquipmentRequestRepository requests;
  private final TransactionRepository transactions;
  private final MaintenanceTicketRepository maintenanceTickets;
  public EquipmentService(EquipmentRepository repository, EquipmentRequestRepository requests, TransactionRepository transactions, MaintenanceTicketRepository maintenanceTickets){this.repository=repository; this.requests=requests; this.transactions=transactions; this.maintenanceTickets=maintenanceTickets;}
  public List<Equipment> list() { return repository.findAll(); }
  public Equipment get(Long id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id)); }
  public Equipment findByTag(String tag) { return repository.findByAssetTag(tag).orElseThrow(() -> new ResourceNotFoundException("Equipment not found with tag: " + tag)); }
  public Equipment create(Equipment equipment) { requireUniqueAssetTag(equipment.getAssetTag(), null); return repository.save(equipment); }

  public Equipment update(Long id, Equipment input) { return update(id, input, false); }

  /**
   * Updates an equipment record. Equipment carrying an open maintenance ticket cannot be moved back into
   * circulation (AVAILABLE or IN_USE) until that ticket is resolved, otherwise the catalogue would offer an
   * item that is still in the workshop. Callers may pass closeMaintenance to resolve those tickets in the same
   * transaction, which is what the administrator confirms from the equipment form.
   *
   * Two layers of concurrency control apply here. The row carries a @Version column, so a record another
   * transaction changed while this request was in flight fails with a 409 instead of being overwritten, and a
   * caller that echoes the version it read gets an earlier, clearer rejection when its copy is already stale.
   */
  @Transactional
  public Equipment update(Long id, Equipment input, boolean closeMaintenance) {
    Equipment current=get(id);
    requireUnchangedVersion(current, input.getVersion());
    requireUniqueAssetTag(input.getAssetTag(), id);
    if (isInCirculation(input.getStatus())) {
      if (transactions.existsByEquipmentIdAndReturnedAtIsNull(id)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "This equipment is still on loan. Record the return before changing its status.");
      }
      List<MaintenanceTicket> openTickets = maintenanceTickets.findByEquipmentIdAndStatusNot(id, MaintenanceTicketRepository.RESOLVED);
      if (!openTickets.isEmpty()) {
        if (!closeMaintenance) {
          throw new ResponseStatusException(HttpStatus.CONFLICT, openTicketConflictMessage(openTickets.size()));
        }
        Instant resolvedAt = Instant.now();
        for (MaintenanceTicket ticket : openTickets) { ticket.setStatus(MaintenanceTicketRepository.RESOLVED); ticket.setResolvedAt(resolvedAt); }
        maintenanceTickets.saveAll(openTickets);
      }
    }
    current.setName(input.getName()); current.setCategory(input.getCategory()); current.setAssetTag(input.getAssetTag());
    current.setStatus(input.getStatus()); current.setLocation(input.getLocation()); current.setDescription(input.getDescription()); return repository.saveAndFlush(current);
  }

  public void delete(Long id) {
    delete(id, false);
  }

  @org.springframework.transaction.annotation.Transactional
  public void delete(Long id, boolean force) {
    Equipment equipment = get(id);
    boolean hasRelations = requests.existsByEquipmentId(id) || transactions.existsByEquipmentId(id) || maintenanceTickets.existsByEquipmentId(id);
    if (hasRelations && !force) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Equipment has linked requests, loans, or maintenance history and cannot be deleted. Retire it to preserve its records.");
    }
    if (hasRelations && force) {
      maintenanceTickets.deleteByEquipmentId(id);
      requests.deleteByEquipmentId(id);
      transactions.deleteByEquipmentId(id);
    }
    repository.delete(equipment);
  }

  /** True when a status value puts the item back into circulation instead of removing it from service. */
  private boolean isInCirculation(EquipmentStatus status) {
    return status == EquipmentStatus.AVAILABLE || status == EquipmentStatus.IN_USE;
  }

  private String openTicketConflictMessage(int openTickets) {
    String tickets = openTickets == 1 ? "1 unresolved maintenance ticket" : openTickets + " unresolved maintenance tickets";
    String pronoun = openTickets == 1 ? "it" : "them";
    return "This equipment has " + tickets + ". Confirm to close " + pronoun + " and return the item to circulation, or keep it in service.";
  }

  private void requireUniqueAssetTag(String assetTag, Long selfId) {
    String tag = assetTag == null ? "" : assetTag.trim();
    if (tag.isEmpty()) { return; }
    Equipment clash = repository.findFirstByAssetTagIgnoreCase(tag).orElse(null);
    if (clash != null && !clash.getId().equals(selfId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Asset tag \"" + tag + "\" is already used by \"" + clash.getName() + "\".");
    }
  }

  /**
   * Rejects a save made against a copy another user already changed. Clients that do not send a version are
   * still protected by the @Version column itself; this only turns a silent overwrite into a clear message.
   */
  private void requireUnchangedVersion(Equipment current, Long submittedVersion) {
    if (submittedVersion == null || submittedVersion.equals(current.getVersion())) { return; }
    throw new ResponseStatusException(HttpStatus.CONFLICT,
      "This equipment record was changed by someone else while you were editing it. Reload the record and apply your change again.");
  }
}
