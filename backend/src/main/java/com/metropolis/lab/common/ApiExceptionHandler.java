package com.metropolis.lab.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.sql.SQLException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
  /** Error code sent with concurrency conflicts so the UI can tell "someone else changed this" from a rule. */
  public static final String CONCURRENT_UPDATE = "CONCURRENT_UPDATE";

  @ExceptionHandler(ResourceNotFoundException.class)
  ResponseEntity<?> notFound(ResourceNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("timestamp", Instant.now(), "error", e.getMessage())); }
  /**
   * Two writers reached the same equipment row. The @Version column stopped one of them from overwriting the
   * other, or a row lock timed out; either way the caller retries instead of corrupting the ledger.
   */
  @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class})
  ResponseEntity<?> concurrentUpdate(RuntimeException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
      "timestamp", Instant.now(),
      "code", CONCURRENT_UPDATE,
      "error", "Someone else updated this equipment at the same time. Reload and try again."));
  }
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
