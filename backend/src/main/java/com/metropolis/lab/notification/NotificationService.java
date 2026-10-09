package com.metropolis.lab.notification;

import org.springframework.stereotype.Service;

@Service
public class NotificationService {
  private final NotificationRepository repository;
  private final LiveUpdateService liveUpdates;

  public NotificationService(NotificationRepository repository, LiveUpdateService liveUpdates) {
    this.repository = repository;
    this.liveUpdates = liveUpdates;
  }

  public Notification create(Long userId, String title, String message) {
    Notification notification = new Notification();
    notification.setUserId(userId);
    notification.setTitle(title);
    notification.setMessage(message);
    Notification saved = repository.save(notification);
    liveUpdates.notifyUser(userId);
    return saved;
  }
}