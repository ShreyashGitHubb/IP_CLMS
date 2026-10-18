package com.metropolis.lab.mail;

/**
 * Renders the transactional emails. Kept as plain static methods so the wording can be checked without a
 * running server, and so no value taken from a user is ever interpolated unescaped into HTML.
 */
public final class MailTemplates {
  private MailTemplates() {}

  private static final String ACCENT = "#8e73ff";
  private static final String INK = "#15151a";
  private static final String MUTED = "#5b5b66";

  public static String accountCreated(String name, String role, String email, String temporaryPassword, String signInUrl) {
    String body = """
      <p>Hello %s,</p>
      <p>An administrator created a <strong>%s</strong> account for you in the CLMS lab system.</p>
      <p>Sign in with these credentials and change the password straight away.</p>
      """.formatted(escape(name), escape(role.toLowerCase(java.util.Locale.ROOT)))
      + credentials(email, temporaryPassword, signInUrl)
      + note("If you were not expecting this, contact your lab administrator before signing in.");
    return layout("Your lab account is ready", body);
  }

  public static String temporaryPasswordReset(String name, String email, String temporaryPassword, String signInUrl) {
    String body = """
      <p>Hello %s,</p>
      <p>An administrator reset your CLMS password. Use the temporary password below, then set a new one in
      Settings. Any other sessions have been signed out.</p>
      """.formatted(escape(name))
      + credentials(email, temporaryPassword, signInUrl)
      + note("If you did not request this reset, tell your lab administrator.");
    return layout("Your temporary password", body);
  }

  public static String newEquipmentRequest(String adminName, String requesterName, String equipmentName, String purpose) {
    String body = """
      <p>Hello %s,</p>
      <p><strong>%s</strong> requested <strong>%s</strong>.</p>
      <p style="margin:16px 0;padding:12px 14px;background:#f4f2ff;border-radius:8px;color:%s;">%s</p>
      <p>Review it in the Requests queue and approve or reject it.</p>
      """.formatted(escape(adminName), escape(requesterName), escape(equipmentName), INK, escape(purpose));
    return layout("New equipment request", body);
  }

  public static String requestDecision(String memberName, String equipmentName, boolean approved) {
    String body = approved
      ? """
        <p>Hello %s,</p>
        <p>Your request for <strong>%s</strong> was approved and the equipment has been issued to your account.</p>
        """.formatted(escape(memberName), escape(equipmentName))
        + note("Check the due date in Transactions and return it on time.")
      : """
        <p>Hello %s,</p>
        <p>Your request for <strong>%s</strong> was not approved. It may be unavailable, already on loan, or
        reserved for another session.</p>
        """.formatted(escape(memberName), escape(equipmentName))
        + note("You can submit a new request for other equipment from the Equipment page.");
    return layout(approved ? "Equipment request approved" : "Equipment request rejected", body);
  }

  public static String maintenanceStarted(String memberName, String equipmentName, String ticketTitle) {
    String body = """
      <p>Hello %s,</p>
      <p><strong>%s</strong> is unavailable for service: %s</p>
      <p>It cannot be requested or checked out until the repair is resolved.</p>
      """.formatted(escape(memberName), escape(equipmentName), escape(ticketTitle));
    return layout("Equipment sent to maintenance", body);
  }

  public static String maintenanceCompleted(String memberName, String equipmentName, String statusLine) {
    String body = """
      <p>Hello %s,</p>
      <p><strong>%s</strong> %s</p>
      """.formatted(escape(memberName), escape(equipmentName), escape(statusLine));
    return layout("Maintenance completed", body);
  }

  public static String overdueLoan(String memberName, String equipmentName, String dueDate) {
    String body = """
      <p>Hello %s,</p>
      <p><strong>%s</strong> was due on <strong>%s</strong> and has not been returned yet.</p>
      <p>Please return it to the lab as soon as possible so the next person in the queue can use it.</p>
      """.formatted(escape(memberName), escape(equipmentName), escape(dueDate));
    return layout("Overdue equipment loan", body);
  }

  private static String credentials(String email, String temporaryPassword, String signInUrl) {
    return """
      <table role="presentation" style="margin:18px 0;border-collapse:separate;border-spacing:0 8px">
        <tr><td style="padding-right:16px;color:%s;font-size:13px">Email</td><td style="font-weight:600">%s</td></tr>
        <tr><td style="padding-right:16px;color:%s;font-size:13px">Temporary password</td><td style="font-family:monospace;font-weight:600">%s</td></tr>
      </table>
      """.formatted(MUTED, escape(email), MUTED, escape(temporaryPassword))
      + button("Sign in to CLMS", signInUrl);
  }

  private static String note(String text) {
    return "<p style=\"margin-top:20px;font-size:12px;color:" + MUTED + ";\">" + escape(text) + "</p>";
  }

  private static String button(String label, String url) {
    String safeUrl = url == null || url.isBlank() ? "#" : escape(url);
    return """
      <p style="margin:20px 0 4px">
        <a href="%s" style="display:inline-block;padding:11px 20px;background:%s;color:#ffffff;text-decoration:none;
        border-radius:6px;font-weight:600;font-size:13px">%s</a>
      </p>
      """.formatted(safeUrl, ACCENT, escape(label));
  }

  private static String layout(String title, String body) {
    return """
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f6f5fb;padding:28px 16px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
          <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:%s">CLMS &middot; Lab Control</div>
          <h1 style="margin:6px 0 18px;font-size:20px;color:%s">%s</h1>
          <div style="font-size:14px;line-height:1.6;color:%s">%s</div>
          <p style="margin-top:26px;font-size:11px;color:#9a9aa3;border-top:1px solid #ececf1;padding-top:14px">
            Laboratory Equipment Management System &middot; automated message, no reply.
          </p>
        </div>
      </div>
      """.formatted(ACCENT, INK, escape(title), INK, body);
  }

  /** User supplied text is escaped so a name or purpose can never inject markup into an inbox. */
  static String escape(String value) {
    if (value == null) { return ""; }
    return value
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;")
      .replace("\"", "&quot;")
      .replace("'", "&#39;");
  }
}