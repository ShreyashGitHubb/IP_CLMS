package com.metropolis.lab.notification;

import com.metropolis.lab.user.User;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class LiveUpdateController {
  private final LiveUpdateService liveUpdates;

  public LiveUpdateController(LiveUpdateService liveUpdates) {
    this.liveUpdates = liveUpdates;
  }

  @GetMapping(value = "/api/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter subscribe(@RequestAttribute("currentUser") User user) {
    return liveUpdates.subscribe(user);
  }
}
