package com.metropolis.lab.notification;

import com.metropolis.lab.user.User;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class LiveUpdateService {
  private final ConcurrentHashMap<Long, Set<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

  public SseEmitter subscribe(User user) {
    SseEmitter emitter = new SseEmitter(0L);
    Set<SseEmitter> userEmitters = emittersByUser.computeIfAbsent(user.getId(), ignored -> ConcurrentHashMap.newKeySet());
    userEmitters.add(emitter);
    emitter.onCompletion(() -> remove(user.getId(), emitter));
    emitter.onTimeout(() -> remove(user.getId(), emitter));
    emitter.onError(error -> remove(user.getId(), emitter));
    return emitter;
  }

  public void notifyUser(Long userId) {
    Set<SseEmitter> emitters = emittersByUser.get(userId);
    if (emitters == null) return;
    emitters.forEach(emitter -> send(emitter, userId));
  }

  public void notifyAllUsers() {
    emittersByUser.forEach((userId, emitters) -> emitters.forEach(emitter -> send(emitter, userId)));
  }

  @Scheduled(fixedRate = 25000)
  public void keepConnectionsAlive() {
    emittersByUser.forEach((userId, emitters) -> emitters.forEach(emitter -> {
      try {
        emitter.send(SseEmitter.event().comment("keepalive"));
      } catch (IOException | IllegalStateException exception) {
        remove(userId, emitter);
      }
    }));
  }

  private void send(SseEmitter emitter, Long userId) {
    try {
      emitter.send(SseEmitter.event().name("update").data("changed"));
    } catch (IOException | IllegalStateException exception) {
      remove(userId, emitter);
    }
  }

  private void remove(Long userId, SseEmitter emitter) {
    Set<SseEmitter> userEmitters = emittersByUser.get(userId);
    if (userEmitters == null) return;
    userEmitters.remove(emitter);
    if (userEmitters.isEmpty()) emittersByUser.remove(userId, userEmitters);
  }
}
