package com.metropolis.lab.maintenance;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "maintenance_tickets")
public class MaintenanceTicket {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "equipment_id", nullable = false) private Long equipmentId;
  @Column(name = "opened_by", nullable = false) private Long openedBy;
  @Column(name = "assigned_technician", length = 120) private String assignedTechnician;
  @NotBlank @Column(nullable = false, length = 160) private String title;
  @NotBlank @Column(nullable = false, columnDefinition = "TEXT") private String details;
  @Column(nullable = false, length = 24) private String status = "OPEN";
  @Column(name = "repair_cost", precision = 12, scale = 2) private BigDecimal repairCost;
  @Column(name = "opened_at", nullable = false) private Instant openedAt = Instant.now();
  @Column(name = "resolved_at") private Instant resolvedAt;

  public Long getId() { return id; }
  public Long getEquipmentId() { return equipmentId; }
  public void setEquipmentId(Long equipmentId) { this.equipmentId = equipmentId; }
  public Long getOpenedBy() { return openedBy; }
  public void setOpenedBy(Long openedBy) { this.openedBy = openedBy; }
  public String getAssignedTechnician() { return assignedTechnician; }
  public void setAssignedTechnician(String assignedTechnician) { this.assignedTechnician = assignedTechnician; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDetails() { return details; }
  public void setDetails(String details) { this.details = details; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public BigDecimal getRepairCost() { return repairCost; }
  public void setRepairCost(BigDecimal repairCost) { this.repairCost = repairCost; }
  public Instant getOpenedAt() { return openedAt; }
  public Instant getResolvedAt() { return resolvedAt; }
  public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}