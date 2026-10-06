package com.metropolis.lab.transaction;

import com.metropolis.lab.user.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
  private final TransactionRepository repository;
  public TransactionController(TransactionRepository repository){this.repository=repository;}
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
}

interface TransactionRepository extends org.springframework.data.jpa.repository.JpaRepository<Transaction, Long> {
  List<Transaction> findAllByUserId(Long userId);
}
