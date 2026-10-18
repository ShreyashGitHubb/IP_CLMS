package com.metropolis.lab.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket, Long> {
  String RESOLVED = "RESOLVED";
  List<MaintenanceTicket> findAllByOrderByOpenedAtDesc();
  List<MaintenanceTicket> findByEquipmentIdAndStatusNot(Long equipmentId, String status);
  boolean existsByEquipmentId(Long equipmentId);
  boolean existsByEquipmentIdAndStatusNot(Long equipmentId, String status);
  void deleteByEquipmentId(Long equipmentId);
}