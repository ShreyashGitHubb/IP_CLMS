package com.metropolis.lab.mail;

import com.metropolis.lab.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;
import jakarta.annotation.PreDestroy;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

/**
 * Transactional email through the Resend HTTP API.
 *
 * Nothing here is allowed to affect the operational endpoints: the feature is off unless MAIL_ENABLED is true
 * and an API key is present, delivery failures are logged and swallowed, and a send never runs inside the
 * caller's database transaction. Emails are queued after the commit so a slow provider cannot hold an
 * equipment row lock while the request is still open.
 */
@Service
public class MailService {
  private static final Logger log = LoggerFactory.getLogger(MailService.class);
  private static final ZoneId MAIL_ZONE = ZoneId.of("Asia/Kolkata");

  private final RestClient restClient;
  private final String endpoint;
  private final String from;
  private final String signInUrl;
  private final ExecutorService sender;

  public MailService(
      @Value("${app.mail.enabled:false}") boolean enabled,
      @Value("${app.mail.api-key:}") String apiKey,
      @Value("${app.mail.endpoint:https://api.resend.com/emails}") String endpoint,
      @Value("${app.mail.from:CLMS Lab <noreply@clms.shreyashvishwakarma.in>}") String from,
      @Value("${app.mail.sign-in-url:https://clms.shreyashvishwakarma.in/sign-in}") String signInUrl) {
    this.endpoint = endpoint;
    this.from = from;
    this.signInUrl = signInUrl;
    boolean configured = enabled && apiKey != null && !apiKey.isBlank();
    this.restClient = configured ? RestClient.builder().defaultHeader("Authorization", "Bearer " + apiKey).build() : null;
    // Two threads and a bounded queue: enough to keep up with a maintenance broadcast, small enough that a
    // provider outage cannot grow the heap without limit.
    this.sender = new ThreadPoolExecutor(2, 2, 60, TimeUnit.SECONDS, new java.util.concurrent.LinkedBlockingQueue<>(500),
      runnable -> {
        Thread thread = new Thread(runnable, "clms-mail");
        thread.setDaemon(true);
        return thread;
      },
      (runnable, pool) -> { log.warn("Mail queue full, dropping one message"); });
    if (!configured) {
      log.info("Email delivery disabled; set MAIL_ENABLED=true and RESEND_API_KEY to send from {}", from);
    }
  }

  public boolean isEnabled() { return restClient != null; }

  // ---------------------------------------------------------------- account

  public void accountCreated(User user, String temporaryPassword) {
    sendToUser(user, "Your lab account is ready",
      MailTemplates.accountCreated(user.getName(), user.getRole(), user.getEmail(), temporaryPassword, signInUrl));
  }

  public void temporaryPasswordReset(User user, String temporaryPassword) {
    sendToUser(user, "Your temporary password",
      MailTemplates.temporaryPasswordReset(user.getName(), user.getEmail(), temporaryPassword, signInUrl));
  }

  // ---------------------------------------------------------------- requests

  public void newRequest(Collection<User> admins, String requesterName, String equipmentName, String purpose) {
    sendToUsers(admins, "New equipment request",
      admin -> MailTemplates.newEquipmentRequest(admin.getName(), requesterName, equipmentName, purpose));
  }

  public void requestDecision(User member, String equipmentName, boolean approved) {
    sendToUser(member, approved ? "Equipment request approved" : "Equipment request rejected",
      MailTemplates.requestDecision(member.getName(), equipmentName, approved));
  }

  // ---------------------------------------------------------------- maintenance

  public void maintenanceStarted(Collection<User> members, String equipmentName, String ticketTitle) {
    sendToUsers(members, "Equipment sent to maintenance",
      member -> MailTemplates.maintenanceStarted(member.getName(), equipmentName, ticketTitle));
  }

  public void maintenanceCompleted(Collection<User> members, String equipmentName, String statusLine) {
    sendToUsers(members, "Maintenance completed",
      member -> MailTemplates.maintenanceCompleted(member.getName(), equipmentName, statusLine));
  }

  // ---------------------------------------------------------------- reminders

  public void overdueLoan(User member, String equipmentName, java.time.Instant dueAt) {
    String due = DateTimeFormatter.ofPattern("d MMMM yyyy").format(dueAt.atZone(MAIL_ZONE));
    sendToUser(member, "Overdue equipment loan", MailTemplates.overdueLoan(member.getName(), equipmentName, due));
  }

  // ---------------------------------------------------------------- plumbing

  public void sendToUser(User user, String subject, String html) {
    if (user == null || user.getEmail() == null || user.getEmail().isBlank()) { return; }
    send(user.getEmail(), subject, html);
  }

  /** One message per recipient so each gets their own copy; bad addresses cannot block the others. */
  public void sendToUsers(Collection<User> users, String subject, Function<User, String> htmlFor) {
    if (users == null || users.isEmpty()) { return; }
    for (User user : users) { sendToUser(user, subject, htmlFor.apply(user)); }
  }

  private void send(String to, String subject, String html) {
    if (restClient == null || to == null || to.isBlank()) { return; }
    Runnable deliver = () -> deliver(to, subject, html);
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      // Never send before the commit: a rolled back transaction would announce work that did not happen.
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override public void afterCommit() { sender.execute(deliver); }
      });
    } else {
      sender.execute(deliver);
    }
  }

  private void deliver(String to, String subject, String html) {
    try {
      restClient.post()
        .uri(endpoint)
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .body(Map.of("from", from, "to", List.of(to), "subject", subject, "html", html))
        .retrieve()
        .toBodilessEntity();
      log.info("Sent \"{}\" to {}", subject, to);
    } catch (Exception e) {
      // Email is best effort. The in-app notification still exists, so a provider problem must not surface
      // as a failed equipment, request or maintenance operation.
      log.warn("Could not send \"{}\" to {}: {}", subject, to, e.getMessage());
    }
  }

  @PreDestroy
  void shutdown() {
    sender.shutdown();
    try {
      if (!sender.awaitTermination(5, TimeUnit.SECONDS)) { sender.shutdownNow(); }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      sender.shutdownNow();
    }
  }
}