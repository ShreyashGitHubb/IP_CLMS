package com.metropolis.lab.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket, Long> {
  List<MaintenanceTicket> findAllByOrderByOpenedAtDesc();
  boolean existsByEquipmentIdAndStatusNot(Long equipmentId, String status);
}