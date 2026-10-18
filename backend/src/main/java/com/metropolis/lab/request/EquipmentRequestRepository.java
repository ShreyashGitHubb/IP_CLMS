package com.metropolis.lab.request;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EquipmentRequestRepository extends JpaRepository<EquipmentRequest, Long> {
  List<EquipmentRequest> findAllByUserIdOrderByCreatedAtDesc(Long userId);
  List<EquipmentRequest> findAllByOrderByCreatedAtDesc();
  boolean existsByEquipmentId(Long equipmentId);
  boolean existsByUserIdAndEquipmentIdAndStatus(Long userId, Long equipmentId, String status);
  void deleteByEquipmentId(Long equipmentId);

  /**
   * SELECT ... FOR UPDATE on the request. Without it an approval and a rejection of the same request can both
   * read PENDING and the last write wins, which would leave a loan attached to a rejected request.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from EquipmentRequest r where r.id = :id")
  java.util.Optional<EquipmentRequest> findByIdForUpdate(@Param("id") Long id);
}