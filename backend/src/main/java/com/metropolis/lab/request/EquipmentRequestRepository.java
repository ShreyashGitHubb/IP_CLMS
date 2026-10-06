package com.metropolis.lab.request;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EquipmentRequestRepository extends JpaRepository<EquipmentRequest, Long> {
  List<EquipmentRequest> findAllByUserIdOrderByCreatedAtDesc(Long userId);
  List<EquipmentRequest> findAllByOrderByCreatedAtDesc();
}