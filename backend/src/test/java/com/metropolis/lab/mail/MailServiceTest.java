package com.metropolis.lab.mail;

import com.metropolis.lab.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Email is an addition to the system, never a dependency: with no provider configured nothing is sent, and
 * every send is best effort. These tests cover the disabled path and the escaping of user supplied values.
 */
class MailServiceTest {

  @Test
  void mailIsOffUntilAKeyIsConfigured() {
    MailService disabled = new MailService(false, "", "https://example.invalid/emails", "Lab <no-reply@example.com>", "https://example.com/sign-in");
    assertFalse(disabled.isEnabled(), "no API key means no sending");

    // Must be a safe no-op: the caller is inside a request that already succeeded.
    disabled.sendToUser(user(), "Subject", "<p>body</p>");
    disabled.sendToUsers(List.of(user()), "Subject", u -> "<p>body</p>");
    disabled.overdueLoan(user(), "Centrifuge", java.time.Instant.now());
    disabled.shutdown();
  }

  @Test
  void sendingNeverThrowsWhenTheProviderIsUnreachable() {
    // Enabled, but pointing at a closed port: the failure has to stay inside the log.
    MailService failing = new MailService(true, "test-key", "http://127.0.0.1:1/emails", "Lab <no-reply@example.com>", "https://example.com/sign-in");
    assertTrue(failing.isEnabled(), "a configured key switches delivery on");
    failing.sendToUser(user(), "Subject", "<p>body</p>");
    failing.shutdown();
  }

  @Test
  void userSuppliedTextCannotInjectMarkup() {
    String html = MailTemplates.accountCreated("<script>alert(1)</script>", "MEMBER", "a@b.edu", "pw", "https://example.com/sign-in");
    assertFalse(html.contains("<script>"), "the name must be escaped");
    assertTrue(html.contains("&lt;script&gt;"));

    String purpose = MailTemplates.newEquipmentRequest("Admin", "Member", "Centrifuge", "\"><img src=x onerror=alert(1)>");
    assertFalse(purpose.contains("<img"), "the request purpose must be escaped");
  }

  @Test
  void templatesCarryTheDetailsTheReaderNeeds() {
    String created = MailTemplates.accountCreated("Alex", "MEMBER", "alex@example.edu", "Temp-123", "https://example.com/sign-in");
    assertTrue(created.contains("Alex"));
    assertTrue(created.contains("alex@example.edu"));
    assertTrue(created.contains("Temp-123"));
    assertTrue(created.contains("https://example.com/sign-in"));

    assertTrue(MailTemplates.requestDecision("Alex", "Centrifuge", true).contains("approved"));
    assertTrue(MailTemplates.requestDecision("Alex", "Centrifuge", false).contains("not approved"));
    assertTrue(MailTemplates.maintenanceStarted("Alex", "Centrifuge", "Rotor wobble").contains("Rotor wobble"));
    assertTrue(MailTemplates.overdueLoan("Alex", "Centrifuge", "18 October 2026").contains("18 October 2026"));
  }

  private User user() {
    User user = new User();
    user.setName("Alex Member");
    user.setEmail("alex@example.edu");
    user.setRole("MEMBER");
    return user;
  }
}