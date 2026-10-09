package com.metropolis.lab.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmailIgnoreCase(String email);
  List<User> findAllByRoleAndActive(String role, boolean active);
  long countByRoleAndActive(String role, boolean active);

  @Query(value = "SELECT EXISTS (SELECT 1 FROM equipment_requests WHERE user_id = :userId UNION ALL SELECT 1 FROM transactions WHERE user_id = :userId UNION ALL SELECT 1 FROM maintenance_tickets WHERE opened_by = :userId UNION ALL SELECT 1 FROM lab_events WHERE created_by = :userId UNION ALL SELECT 1 FROM logs WHERE user_id = :userId)", nativeQuery = true)
  boolean hasOperationalHistory(@Param("userId") Long userId);
}
