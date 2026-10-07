package com.metropolis.lab.event;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;

public interface LabEventRepository extends JpaRepository<LabEvent, Long> {
  List<LabEvent> findAllByStartsAtBetweenOrderByStartsAtAsc(Instant from, Instant to);
  List<LabEvent> findAllByOrderByStartsAtAsc();
}