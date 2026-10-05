package com.metropolis.lab.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResourceNotFoundException.class)
  ResponseEntity<?> notFound(ResourceNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("timestamp", Instant.now(), "error", e.getMessage())); }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> invalid(MethodArgumentNotValidException e) { return ResponseEntity.badRequest().body(Map.of("timestamp", Instant.now(), "error", "Validation failed", "fields", e.getBindingResult().getFieldErrors().stream().collect(java.util.stream.Collectors.toMap(x -> x.getField(), x -> x.getDefaultMessage(), (a,b)->a)))); }
  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> conflict() { return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("timestamp", Instant.now(), "error", "A record with the same unique value already exists")); }
}
