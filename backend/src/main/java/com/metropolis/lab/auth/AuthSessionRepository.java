package com.metropolis.lab.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.List;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {
  Optional<AuthSession> findBySessionIdAndRevokedAtIsNullAndExpiresAtAfter(String sessionId, Instant now);
  List<AuthSession> findAllByUserIdAndRevokedAtIsNull(Long userId);
  void deleteAllByUserId(Long userId);
}