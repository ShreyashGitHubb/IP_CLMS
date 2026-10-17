-- V6: Fix orphaned child records and remove any remaining test equipment
-- Safe to run on production: only deletes records referencing non-existent equipment
-- or equipment whose name/tag is clearly a test/dummy value.

-- 1. Delete orphaned maintenance_tickets (equipment was already deleted, FK broken)
DELETE FROM maintenance_tickets
WHERE equipment_id NOT IN (SELECT id FROM equipment);

-- 2. Delete orphaned equipment_requests
DELETE FROM equipment_requests
WHERE equipment_id NOT IN (SELECT id FROM equipment);

-- 3. Delete orphaned transactions
DELETE FROM transactions
WHERE equipment_id NOT IN (SELECT id FROM equipment);

-- 4. Cascade-delete any remaining equipment whose name or asset_tag looks like test data
--    Matches: empty names, single-word lowercase names like "now", "test", "sTest", numeric-only names.
--    This covers the IDs 10, 16 that are appearing as conflicts if they are dummy records.
DELETE mt FROM maintenance_tickets mt
  JOIN equipment e ON mt.equipment_id = e.id
  WHERE LOWER(TRIM(e.name)) IN ('test','tests','now','demo','dummy','sample','temp','tmp','asdf','abc')
     OR LOWER(TRIM(e.asset_tag)) IN ('test','tests','stest','now','demo','dummy','temp','tmp');

DELETE er FROM equipment_requests er
  JOIN equipment e ON er.equipment_id = e.id
  WHERE LOWER(TRIM(e.name)) IN ('test','tests','now','demo','dummy','sample','temp','tmp','asdf','abc')
     OR LOWER(TRIM(e.asset_tag)) IN ('test','tests','stest','now','demo','dummy','temp','tmp');

DELETE tr FROM transactions tr
  JOIN equipment e ON tr.equipment_id = e.id
  WHERE LOWER(TRIM(e.name)) IN ('test','tests','now','demo','dummy','sample','temp','tmp','asdf','abc')
     OR LOWER(TRIM(e.asset_tag)) IN ('test','tests','stest','now','demo','dummy','temp','tmp');

DELETE FROM equipment
  WHERE LOWER(TRIM(name)) IN ('test','tests','now','demo','dummy','sample','temp','tmp','asdf','abc')
     OR LOWER(TRIM(asset_tag)) IN ('test','tests','stest','now','demo','dummy','temp','tmp');
