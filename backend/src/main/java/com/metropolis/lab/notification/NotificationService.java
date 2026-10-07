package com.metropolis.lab.notification;

import org.springframework.stereotype.Service;

@Service
public class NotificationService {
  private final NotificationRepository repository;

  public NotificationService(NotificationRepository repository) { this.repository = repository; }

  public Notification create(Long userId, String title, String message) {
    Notification notification = new Notification();
    notification.setUserId(userId);
    notification.setTitle(title);
    notification.setMessage(message);
    return repository.save(notification);
  }
}