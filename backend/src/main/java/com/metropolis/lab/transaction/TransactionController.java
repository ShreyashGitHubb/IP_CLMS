package com.metropolis.lab.transaction;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
  private final TransactionRepository repository;
  public TransactionController(TransactionRepository repository){this.repository=repository;}
  @GetMapping public List<Transaction> list(){return repository.findAll();}
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public Transaction create(@Valid @RequestBody Transaction transaction){return repository.save(transaction);}
}

interface TransactionRepository extends org.springframework.data.jpa.repository.JpaRepository<Transaction, Long> {}
