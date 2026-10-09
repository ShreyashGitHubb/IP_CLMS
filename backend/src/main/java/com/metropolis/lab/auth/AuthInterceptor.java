package com.metropolis.lab.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import com.metropolis.lab.log.AuditLog;
import com.metropolis.lab.log.AuditLogRepository;
import com.metropolis.lab.notification.LiveUpdateService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Map;

@Component
public class AuthInterceptor implements HandlerInterceptor {
  public static final String CURRENT_USER_ATTRIBUTE = "currentUser";
  public static final String CURRENT_SESSION_ATTRIBUTE = "currentSessionId";

  private final AuthTokenService tokenService;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;
  private final AuditLogRepository auditLogs;
  private final LiveUpdateService liveUpdates;

  public AuthInterceptor(AuthTokenService tokenService, UserRepository userRepository, ObjectMapper objectMapper, AuditLogRepository auditLogs, LiveUpdateService liveUpdates) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.objectMapper = objectMapper;
    this.auditLogs = auditLogs;
    this.liveUpdates = liveUpdates;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
      return true;
    }

    String authorization = request.getHeader("Authorization");
    String token = authorization != null && authorization.startsWith("Bearer ")
      ? authorization.substring(7).trim()
      : null;

    AuthTokenService.TokenClaims claims = tokenService.claims(token).orElse(null);
    User user = claims == null ? null : userRepository.findById(claims.userId()).orElse(null);
    if (user == null || !user.isActive()) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json");
      objectMapper.writeValue(response.getWriter(), Map.of("error", "A valid sign-in is required."));
      return false;
    }

    boolean passwordChangeAllowed = "PUT".equalsIgnoreCase(request.getMethod())
      && request.getRequestURI().endsWith("/api/users/password");
    boolean logoutAllowed = "POST".equalsIgnoreCase(request.getMethod())
      && request.getRequestURI().endsWith("/api/auth/logout");
    boolean logoutAllAllowed = "POST".equalsIgnoreCase(request.getMethod())
      && request.getRequestURI().endsWith("/api/auth/logout-all");
    if (user.isMustChangePassword() && !passwordChangeAllowed && !logoutAllowed && !logoutAllAllowed) {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      response.setContentType("application/json");
      objectMapper.writeValue(response.getWriter(), Map.of("error", "Change your temporary password before using this service."));
      return false;
    }

    request.setAttribute(CURRENT_USER_ATTRIBUTE, user);
    request.setAttribute(CURRENT_SESSION_ATTRIBUTE, claims.sessionId());
    return true;
  }

  @Override
  public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception exception) {
    String method = request.getMethod();
    if (response.getStatus() >= 400 || !("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method))) return;
    Object userValue = request.getAttribute(CURRENT_USER_ATTRIBUTE);
    if (!(userValue instanceof User user)) return;

    AuditLog log = new AuditLog();
    log.setUserId(user.getId());
    log.setAction(method + " " + request.getRequestURI());
    log.setEntityType(request.getRequestURI().split("/")[2]);
    log.setDetails("HTTP " + response.getStatus());
    auditLogs.save(log);
    liveUpdates.notifyAllUsers();
  }
}