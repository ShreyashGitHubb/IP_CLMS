package com.metropolis.lab.auth;

import com.metropolis.lab.user.User;
import com.metropolis.lab.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.auth.seed-admin", havingValue = "true")
public class AuthInitializer implements CommandLineRunner {
  private final UserRepository userRepository;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final String adminEmail;
  private final String adminPassword;

  public AuthInitializer(
    UserRepository userRepository,
    @Value("${app.auth.admin-email:admin@clms.local}") String adminEmail,
    @Value("${app.auth.admin-password:Admin@123}") String adminPassword
  ) {
    this.userRepository = userRepository;
    this.adminEmail = adminEmail;
    this.adminPassword = adminPassword;
  }

  @Override
  public void run(String... args) {
    if (userRepository.findByEmailIgnoreCase(adminEmail).isEmpty()) {
      User admin = new User();
      admin.setName("Admin User");
      admin.setEmail(adminEmail);
      admin.setPasswordHash(passwordEncoder.encode(adminPassword));
      admin.setRole("ADMIN");
      userRepository.save(admin);
    }
  }
}
