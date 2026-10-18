package com.metropolis.lab.transaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
  List<Transaction> findAllByUserId(Long userId);
  boolean existsByEquipmentId(Long equipmentId);
  boolean existsByEquipmentIdAndReturnedAtIsNull(Long equipmentId);
  boolean existsByUserIdAndReturnedAtIsNull(Long userId);
  void deleteByEquipmentId(Long equipmentId);

  /**
   * SELECT ... FOR UPDATE on the loan itself. Two check-ins of the same loan would otherwise both read
   * returned_at = NULL and both close it; the loser waits and then sees the committed return.
   *
   * This has to be the first read of the row in the transaction: an entity already in the persistence
   * context is returned as-is and never refreshed by a locking query.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from Transaction t where t.id = :id")
  Optional<Transaction> findByIdForUpdate(@Param("id") Long id);

  /** Scalar projection: finds the asset of a loan without loading the stale entity into the session. */
  @Query("select t.equipmentId from Transaction t where t.id = :id")
  Optional<Long> findEquipmentIdById(@Param("id") Long id);
}