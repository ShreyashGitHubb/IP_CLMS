-- V7: optimistic locking for equipment.
-- equipment.version backs the JPA @Version column so two concurrent updates (for example two
-- administrators editing the same record, or an approval racing a check-in) cannot silently
-- overwrite each other: the loser of the race fails with a 409 instead of corrupting the ledger.
--
-- The migration is guarded so it is a no-op when the column is already there. That keeps it safe for
-- databases where the column was added by hand from backend/sql/ before this file ran.
SET @equipment_version_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'version'
);
SET @equipment_version_sql = IF(
  @equipment_version_exists = 0,
  'ALTER TABLE equipment ADD COLUMN version BIGINT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE equipment_version_stmt FROM @equipment_version_sql;
EXECUTE equipment_version_stmt;
DEALLOCATE PREPARE equipment_version_stmt;