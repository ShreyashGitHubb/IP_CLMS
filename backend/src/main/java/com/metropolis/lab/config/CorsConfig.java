package com.metropolis.lab.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  private static final List<String> DEFAULT_ORIGINS = List.of(
      "https://ip-clms.vercel.app",
      "https://ip-clms-*.vercel.app",
      "http://localhost:3000"
  );

  @Value("${app.cors.allowed-origins:}")
  private String propertyOrigins;

  @Value("${APP_ORIGINS:}")
  private String appOrigins;

  @Value("${APP_ORIGIN:}")
  private String appOrigin;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] configuredOrigins = Stream.of(propertyOrigins, appOrigins, appOrigin)
      .flatMap(value -> Arrays.stream(value.split(",")))
      .map(String::trim)
      .filter(s -> !s.isEmpty())
      .toArray(String[]::new);
    String[] origins = Stream.concat(DEFAULT_ORIGINS.stream(), Arrays.stream(configuredOrigins))
      .distinct()
      .toArray(String[]::new);

    registry.addMapping("/api/**")
      .allowedOriginPatterns(origins)
      .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
      .allowedHeaders("*")
      .allowCredentials(true)
      .maxAge(3600);
  }
}
