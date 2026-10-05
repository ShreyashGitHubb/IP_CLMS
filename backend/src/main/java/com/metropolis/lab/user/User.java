package com.metropolis.lab.user;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @NotBlank private String name;
  @Email @NotBlank @Column(unique = true, nullable = false) private String email;
  @Column(name = "password_hash", nullable = false) private String passwordHash;
  @Column(nullable = false) private String role = "MEMBER";
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;}
  public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getPasswordHash(){return passwordHash;} public void setPasswordHash(String v){passwordHash=v;}
  public String getRole(){return role;} public void setRole(String v){role=v;} public Instant getCreatedAt(){return createdAt;}
}
