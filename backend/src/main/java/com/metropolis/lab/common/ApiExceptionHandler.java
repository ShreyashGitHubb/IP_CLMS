package com.metropolis.lab.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.sql.SQLException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResourceNotFoundException.class)
  ResponseEntity<?> notFound(ResourceNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("timestamp", Instant.now(), "error", e.getMessage())); }
  /**
   * Without this handler Spring answers with the bare status reason ("Conflict") and drops the message the
   * controllers wrote, so the UI can only tell the user that something conflicted, never why.
   */
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> statusException(ResponseStatusException e) {
    String message = e.getReason() == null ? e.getStatusCode().toString() : e.getReason();
    return ResponseEntity.status(e.getStatusCode()).body(Map.of("timestamp", Instant.now(), "error", message));
  }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> invalid(MethodArgumentNotValidException e) { return ResponseEntity.badRequest().body(Map.of("timestamp", Instant.now(), "error", "Validation failed", "fields", e.getBindingResult().getFieldErrors().stream().collect(java.util.stream.Collectors.toMap(x -> x.getField(), x -> x.getDefaultMessage(), (a,b)->a)))); }
  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> conflict(DataIntegrityViolationException exception) {
    Throwable cause = exception;
    boolean duplicateValue = false;
    while (cause != null) {
        if (cause instanceof SQLException sqlException
          && (sqlException.getErrorCode() == 1062 || "23505".equals(sqlException.getSQLState()))) {
        duplicateValue = true;
        break;
      }
      cause = cause.getCause();
    }
    String message = duplicateValue
      ? "A record with the same unique value already exists."
      : "This record is referenced by existing data and cannot be removed.";
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("timestamp", Instant.now(), "error", message));
  }
}
