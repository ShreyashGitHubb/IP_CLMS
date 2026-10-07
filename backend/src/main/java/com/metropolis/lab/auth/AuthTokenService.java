package com.metropolis.lab.auth;

import com.metropolis.lab.user.User;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthTokenService {
  private static final String HMAC_SHA256 = "HmacSHA256";
  private static final Duration TOKEN_LIFETIME = Duration.ofHours(12);
  private final byte[] signingKey = new byte[32];
  private final AuthSessionRepository sessions;

  public AuthTokenService(@Value("${app.auth.token-secret:}") String configuredSecret, AuthSessionRepository sessions) {
    this.sessions = sessions;
    if (configuredSecret == null || configuredSecret.isBlank()) {
      new SecureRandom().nextBytes(signingKey);
    } else {
      byte[] secretBytes = configuredSecret.getBytes(StandardCharsets.UTF_8);
      if (secretBytes.length < 32) {
        throw new IllegalArgumentException("AUTH_TOKEN_SECRET must be at least 32 bytes.");
      }
      System.arraycopy(secretBytes, 0, signingKey, 0, signingKey.length);
    }
  }

  public String issue(User user) {
    Instant expiresAt = Instant.now().plus(TOKEN_LIFETIME);
    String sessionId = UUID.randomUUID().toString();
    AuthSession session = new AuthSession();
    session.setSessionId(sessionId);
    session.setUserId(user.getId());
    session.setExpiresAt(expiresAt);
    sessions.save(session);
    String claims = user.getId() + ":" + expiresAt.getEpochSecond() + ":" + sessionId;
    String encodedClaims = Base64.getUrlEncoder().withoutPadding()
      .encodeToString(claims.getBytes(StandardCharsets.UTF_8));
    return encodedClaims + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(sign(encodedClaims));
  }

  public Optional<TokenClaims> claims(String token) {
    if (token == null) return Optional.empty();
    String[] parts = token.split("\\.", -1);
    if (parts.length != 2) return Optional.empty();

    try {
      byte[] suppliedSignature = Base64.getUrlDecoder().decode(parts[1]);
      if (!MessageDigest.isEqual(sign(parts[0]), suppliedSignature)) return Optional.empty();

      String[] claims = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8).split(":", -1);
      if (claims.length != 3 || Long.parseLong(claims[1]) <= Instant.now().getEpochSecond()) {
        return Optional.empty();
      }
      Long userId = Long.parseLong(claims[0]);
      String sessionId = claims[2];
      AuthSession active = sessions.findBySessionIdAndRevokedAtIsNullAndExpiresAtAfter(sessionId, Instant.now()).orElse(null);
      if (active == null || !active.getUserId().equals(userId)) return Optional.empty();
      return Optional.of(new TokenClaims(userId, sessionId));
    } catch (IllegalArgumentException exception) {
      return Optional.empty();
    }
  }

  public void revoke(String sessionId) {
    sessions.findBySessionIdAndRevokedAtIsNullAndExpiresAtAfter(sessionId, Instant.now())
      .ifPresent(session -> {
        session.setRevokedAt(Instant.now());
        sessions.save(session);
      });
  }

  public void revokeAll(Long userId) {
    Instant revokedAt = Instant.now();
    var activeSessions = sessions.findAllByUserIdAndRevokedAtIsNull(userId);
    activeSessions.forEach(session -> session.setRevokedAt(revokedAt));
    sessions.saveAll(activeSessions);
  }

  public record TokenClaims(Long userId, String sessionId) {}

  private byte[] sign(String value) {
    try {
      Mac mac = Mac.getInstance(HMAC_SHA256);
      mac.init(new SecretKeySpec(signingKey, HMAC_SHA256));
      return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    } catch (Exception exception) {
      throw new IllegalStateException("Could not sign authentication token.", exception);
    }
  }
}