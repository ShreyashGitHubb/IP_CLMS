package com.metropolis.lab.equipment;

import com.metropolis.lab.common.ResourceNotFoundException;
import com.metropolis.lab.maintenance.MaintenanceTicketRepository;
import com.metropolis.lab.request.EquipmentRequestRepository;
import com.metropolis.lab.transaction.TransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class EquipmentService {
  private final EquipmentRepository repository;
  private final EquipmentRequestRepository requests;
  private final TransactionRepository transactions;
  private final MaintenanceTicketRepository maintenanceTickets;
  public EquipmentService(EquipmentRepository repository, EquipmentRequestRepository requests, TransactionRepository transactions, MaintenanceTicketRepository maintenanceTickets){this.repository=repository; this.requests=requests; this.transactions=transactions; this.maintenanceTickets=maintenanceTickets;}
  public List<Equipment> list(){return repository.findAll();}
  public Equipment get(Long id){return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id));}
  public Equipment create(Equipment equipment){return repository.save(equipment);}
  public Equipment update(Long id, Equipment input){
    Equipment current=get(id);
    if (input.getStatus() == EquipmentStatus.AVAILABLE
        && (transactions.existsByEquipmentIdAndReturnedAtIsNull(id) || maintenanceTickets.existsByEquipmentIdAndStatusNot(id, "RESOLVED"))) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Equipment with an active loan or unresolved maintenance ticket cannot be marked available.");
    }
    current.setName(input.getName()); current.setCategory(input.getCategory()); current.setAssetTag(input.getAssetTag());
    current.setStatus(input.getStatus()); current.setLocation(input.getLocation()); current.setDescription(input.getDescription()); return repository.save(current);
  }
  public void delete(Long id){
    Equipment equipment = get(id);
    if (requests.existsByEquipmentId(id) || transactions.existsByEquipmentId(id) || maintenanceTickets.existsByEquipmentId(id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Equipment has linked requests, loans, or maintenance history and cannot be deleted. Retire it to preserve its records.");
    }
    repository.delete(equipment);
  }
}
