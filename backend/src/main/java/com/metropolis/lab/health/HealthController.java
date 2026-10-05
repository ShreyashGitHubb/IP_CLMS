package com.metropolis.lab.health;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {
  @GetMapping public Map<String, Object> health(){return Map.of("status", "ok", "service", "lab-equipment-api", "timestamp", Instant.now());}
}
