package com.metropolis.lab.transaction;

import com.metropolis.lab.user.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
  private final TransactionRepository repository;
  private final TransactionService service;
  public TransactionController(TransactionRepository repository, TransactionService service){this.repository=repository; this.service=service;}
  @GetMapping public List<Transaction> list(@RequestAttribute("currentUser") User currentUser){
    return "ADMIN".equals(currentUser.getRole())
      ? repository.findAll()
      : repository.findAllByUserId(currentUser.getId());
  }

  /** Issue (checkout). Serialized on the equipment row inside the service. */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Transaction create(@Valid @RequestBody Transaction transaction, @RequestAttribute("currentUser") User currentUser){
    return service.issue(transaction, currentUser.getId(), "ADMIN".equals(currentUser.getRole()));
  }

  /** Check-in. Serialized on the equipment row inside the service. */
  @PutMapping("/{id}/return")
  public Transaction returnEquipment(@PathVariable Long id, @RequestAttribute("currentUser") User currentUser) {
    return service.returnEquipment(id, currentUser.getId(), "ADMIN".equals(currentUser.getRole()));
  }
}