package com.metropolis.lab.log;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "logs")
public class AuditLog {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "user_id") private Long userId;
  @NotBlank @Column(nullable = false) private String action;
  @NotBlank @Column(name = "entity_type", nullable = false) private String entityType;
  @Column(name = "entity_id") private Long entityId;
  private String details;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  public Long getId(){return id;} public Long getUserId(){return userId;} public void setUserId(Long v){userId=v;} public String getAction(){return action;} public void setAction(String v){action=v;} public String getEntityType(){return entityType;} public void setEntityType(String v){entityType=v;} public Long getEntityId(){return entityId;} public void setEntityId(Long v){entityId=v;} public String getDetails(){return details;} public void setDetails(String v){details=v;} public Instant getCreatedAt(){return createdAt;}
}
