package com.metropolis.lab.transaction;

import com.metropolis.lab.equipment.Equipment;
import com.metropolis.lab.equipment.EquipmentRepository;
import com.metropolis.lab.equipment.EquipmentStatus;
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
  public TransactionController(TransactionRepository repository, EquipmentRepository equipmentRepository){this.repository=repository; this.equipmentRepository=equipmentRepository;}
  @GetMapping public List<Transaction> list(@RequestAttribute("currentUser") User currentUser){
    return "ADMIN".equals(currentUser.getRole())
      ? repository.findAll()
      : repository.findAllByUserId(currentUser.getId());
  }
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public Transaction create(@Valid @RequestBody Transaction transaction, @RequestAttribute("currentUser") User currentUser){
    if (!"ADMIN".equals(currentUser.getRole())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
    }
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
    Equipment item = equipmentRepository.findById(transaction.getEquipmentId())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found."));
    if (item.getStatus() == EquipmentStatus.IN_USE) {
      item.setStatus(EquipmentStatus.AVAILABLE);
      equipmentRepository.save(item);
    }
    return repository.save(transaction);
  }
}
