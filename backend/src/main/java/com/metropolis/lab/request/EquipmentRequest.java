package com.metropolis.lab.request;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "equipment_requests")
public class EquipmentRequest {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "equipment_id", nullable = false) private Long equipmentId;
  @Column(name = "user_id", nullable = false) private Long userId;
  @NotBlank @Column(nullable = false, length = 500) private String purpose;
  @Column(nullable = false, length = 20) private String status = "PENDING";
  @Column(name = "due_at") private Instant dueAt;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "reviewed_at") private Instant reviewedAt;

  public Long getId() { return id; }
  public Long getEquipmentId() { return equipmentId; }
  public void setEquipmentId(Long equipmentId) { this.equipmentId = equipmentId; }
  public Long getUserId() { return userId; }
  public void setUserId(Long userId) { this.userId = userId; }
  public String getPurpose() { return purpose; }
  public void setPurpose(String purpose) { this.purpose = purpose; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getDueAt() { return dueAt; }
  public void setDueAt(Instant dueAt) { this.dueAt = dueAt; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getReviewedAt() { return reviewedAt; }
  public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
}