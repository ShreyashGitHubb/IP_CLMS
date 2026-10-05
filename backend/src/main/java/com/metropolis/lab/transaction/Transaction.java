package com.metropolis.lab.transaction;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "transactions")
public class Transaction {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "equipment_id", nullable = false) private Long equipmentId;
  @Column(name = "user_id", nullable = false) private Long userId;
  @NotBlank @Column(nullable = false) private String action;
  @Column(name = "due_at") private Instant dueAt;
  @Column(name = "returned_at") private Instant returnedAt;
  private String notes;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  public Long getId(){return id;} public Long getEquipmentId(){return equipmentId;} public void setEquipmentId(Long v){equipmentId=v;} public Long getUserId(){return userId;} public void setUserId(Long v){userId=v;}
  public String getAction(){return action;} public void setAction(String v){action=v;} public Instant getDueAt(){return dueAt;} public void setDueAt(Instant v){dueAt=v;} public Instant getReturnedAt(){return returnedAt;} public void setReturnedAt(Instant v){returnedAt=v;} public String getNotes(){return notes;} public void setNotes(String v){notes=v;} public Instant getCreatedAt(){return createdAt;}
}
