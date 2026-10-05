package com.metropolis.lab.equipment;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "equipment")
public class Equipment {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @NotBlank private String name;
  @NotBlank private String category;
  @Column(name = "asset_tag", unique = true, nullable = false) @NotBlank private String assetTag;
  @Enumerated(EnumType.STRING) @Column(nullable = false) private EquipmentStatus status = EquipmentStatus.AVAILABLE;
  @NotBlank private String location;
  private String description;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;}
  public String getCategory(){return category;} public void setCategory(String v){category=v;} public String getAssetTag(){return assetTag;} public void setAssetTag(String v){assetTag=v;}
  public EquipmentStatus getStatus(){return status;} public void setStatus(EquipmentStatus v){status=v;} public String getLocation(){return location;} public void setLocation(String v){location=v;}
  public String getDescription(){return description;} public void setDescription(String v){description=v;} public Instant getCreatedAt(){return createdAt;}
}
