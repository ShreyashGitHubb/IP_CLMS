-- =============================================================================
-- CLMS | manual migration  V7  |  equipment optimistic locking
-- =============================================================================
-- Applies the V7 schema change to an already running database, so a deployed
-- MySQL/Aiven instance can be updated from the CLI without touching Flyway.
--
-- Run it against the SAME schema the backend uses:
--
--   mysql --host=<host> --user=<user> --password --database=<db> \
--         < backend/sql/V7__add_equipment_optimistic_lock.sql
--
-- or paste the whole file into the Aiven / PlanetScale SQL console.
--
-- Safe to run more than once: every statement checks INFORMATION_SCHEMA first,
-- so a second run reports "already present" and changes nothing. The matching
-- Flyway migration (backend/src/main/resources/db/migration/V7__...) is guarded
-- the same way, so running this file first does not break the next deploy.
--
-- Only one object is created: equipment.version.
--   - H2 development databases do not need this; schema.sql recreates them in memory on every start.
--   - No data is modified, moved or deleted.
-- =============================================================================

-- 1. Optimistic lock counter used by the JPA @Version column.
--    Every equipment UPDATE then carries "WHERE id = ? AND version = ?", so a record that another
--    transaction changed underneath is rejected instead of silently overwritten.
SET @equipment_version_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'equipment'
    AND COLUMN_NAME = 'version'
);

SET @equipment_version_sql = IF(
  @equipment_version_exists = 0,
  'ALTER TABLE equipment ADD COLUMN version BIGINT NOT NULL DEFAULT 0',
  'SELECT ''equipment.version already present - nothing to do'' AS message'
);

PREPARE equipment_version_stmt FROM @equipment_version_sql;
EXECUTE equipment_version_stmt;
DEALLOCATE PREPARE equipment_version_stmt;

-- 2. Verification (read only). Expect equipment_version = 1.
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'equipment'
  AND COLUMN_NAME = 'version';

-- Optional sanity check on rows that a previous deploy may have left inconsistent.
-- Read only; it reports, it does not repair.
SELECT
  e.id,
  e.asset_tag,
  e.status,
  e.version,
  (SELECT COUNT(*) FROM transactions t WHERE t.equipment_id = e.id AND t.returned_at IS NULL) AS open_loans,
  (SELECT COUNT(*) FROM maintenance_tickets m WHERE m.equipment_id = e.id AND m.status <> 'RESOLVED') AS open_tickets
FROM equipment e
WHERE (e.status = 'IN_USE' AND NOT EXISTS (
         SELECT 1 FROM transactions t WHERE t.equipment_id = e.id AND t.returned_at IS NULL))
   OR (e.status = 'AVAILABLE' AND EXISTS (
         SELECT 1 FROM transactions t WHERE t.equipment_id = e.id AND t.returned_at IS NULL))
   OR (e.status = 'AVAILABLE' AND EXISTS (
         SELECT 1 FROM maintenance_tickets m WHERE m.equipment_id = e.id AND m.status <> 'RESOLVED'))
ORDER BY e.id;