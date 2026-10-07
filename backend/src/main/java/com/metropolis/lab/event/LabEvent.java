package com.metropolis.lab.event;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "lab_events")
public class LabEvent {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "created_by", nullable = false) private Long createdBy;
  @NotBlank @Column(nullable = false, length = 160) private String title;
  @Column(columnDefinition = "TEXT") private String details;
  @Column(name = "starts_at", nullable = false) private Instant startsAt;
  @Column(name = "ends_at") private Instant endsAt;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

  public Long getId() { return id; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDetails() { return details; }
  public void setDetails(String details) { this.details = details; }
  public Instant getStartsAt() { return startsAt; }
  public void setStartsAt(Instant startsAt) { this.startsAt = startsAt; }
  public Instant getEndsAt() { return endsAt; }
  public void setEndsAt(Instant endsAt) { this.endsAt = endsAt; }
  public Instant getCreatedAt() { return createdAt; }
}