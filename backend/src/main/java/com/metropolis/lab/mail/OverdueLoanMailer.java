package com.metropolis.lab.mail;

import com.metropolis.lab.equipment.Equipment;
import com.metropolis.lab.equipment.EquipmentRepository;
import com.metropolis.lab.transaction.Transaction;
import com.metropolis.lab.transaction.TransactionRepository;
import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Emails members whose loan passed its due date. Runs on a fixed daily schedule and does nothing at all when
 * email delivery is switched off, so it costs nothing in a deployment without a mail provider.
 */
@Component
public class OverdueLoanMailer {
  private static final Logger log = LoggerFactory.getLogger(OverdueLoanMailer.class);

  private final TransactionRepository transactions;
  private final EquipmentRepository equipment;
  private final UserRepository users;
  private final MailService mail;

  public OverdueLoanMailer(TransactionRepository transactions, EquipmentRepository equipment, UserRepository users, MailService mail) {
    this.transactions = transactions;
    this.equipment = equipment;
    this.users = users;
    this.mail = mail;
  }

  @Scheduled(cron = "${app.mail.overdue-cron:0 15 9 * * *}", zone = "${app.mail.time-zone:Asia/Kolkata}")
  public void sendOverdueReminders() {
    if (!mail.isEnabled()) { return; }
    Instant now = Instant.now();
    List<Transaction> overdue = transactions.findAll().stream()
      .filter(transaction -> transaction.getDueAt() != null
        && transaction.getReturnedAt() == null
        && transaction.getDueAt().isBefore(now)
        && !"RETURN".equalsIgnoreCase(transaction.getAction()))
      .toList();
    if (overdue.isEmpty()) { return; }

    Map<Long, Equipment> items = equipment.findAll().stream()
      .collect(Collectors.toMap(Equipment::getId, Function.identity()));
    Map<Long, User> accounts = users.findAll().stream()
      .collect(Collectors.toMap(User::getId, Function.identity()));

    for (Transaction loan : overdue) {
      User borrower = accounts.get(loan.getUserId());
      Equipment item = items.get(loan.getEquipmentId());
      if (borrower == null || !borrower.isActive() || item == null) { continue; }
      mail.overdueLoan(borrower, item.getName(), loan.getDueAt());
    }
    log.info("Queued {} overdue loan reminder(s)", overdue.size());
  }
}