package com.metropolis.lab.equipment;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
  Optional<Equipment> findByAssetTag(String assetTag);
  Optional<Equipment> findFirstByAssetTagIgnoreCase(String assetTag);

  /**
   * SELECT ... FOR UPDATE. Issuing and returning an item must be strictly serialized, so the row is locked
   * for the rest of the transaction and the second writer reads the status the first one committed.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from Equipment e where e.id = :id")
  Optional<Equipment> findByIdForUpdate(@Param("id") Long id);
}