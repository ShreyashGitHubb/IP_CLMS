package com.metropolis.lab.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
  List<Transaction> findAllByUserId(Long userId);
  boolean existsByEquipmentId(Long equipmentId);
  boolean existsByEquipmentIdAndReturnedAtIsNull(Long equipmentId);
  boolean existsByUserIdAndReturnedAtIsNull(Long userId);
}