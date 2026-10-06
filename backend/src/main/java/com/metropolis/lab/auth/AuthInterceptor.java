package com.metropolis.lab.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Map;

@Component
public class AuthInterceptor implements HandlerInterceptor {
  public static final String CURRENT_USER_ATTRIBUTE = "currentUser";

  private final AuthTokenService tokenService;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  public AuthInterceptor(AuthTokenService tokenService, UserRepository userRepository, ObjectMapper objectMapper) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.objectMapper = objectMapper;
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

    User user = tokenService.userId(token)
      .flatMap(userRepository::findById)
      .orElse(null);
    if (user == null) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json");
      objectMapper.writeValue(response.getWriter(), Map.of("error", "A valid sign-in is required."));
      return false;
    }

    request.setAttribute(CURRENT_USER_ATTRIBUTE, user);
    return true;
  }
}