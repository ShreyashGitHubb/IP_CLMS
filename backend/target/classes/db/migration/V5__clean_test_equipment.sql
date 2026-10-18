DELETE mt FROM maintenance_tickets mt JOIN equipment e ON mt.equipment_id = e.id WHERE e.name IN ('Tests', 'now') OR e.asset_tag IN ('sTest', 'now') OR e.id = 2;
DELETE er FROM equipment_requests er JOIN equipment e ON er.equipment_id = e.id WHERE e.name IN ('Tests', 'now') OR e.asset_tag IN ('sTest', 'now') OR e.id = 2;
DELETE tr FROM transactions tr JOIN equipment e ON tr.equipment_id = e.id WHERE e.name IN ('Tests', 'now') OR e.asset_tag IN ('sTest', 'now') OR e.id = 2;
DELETE FROM equipment WHERE name IN ('Tests', 'now') OR asset_tag IN ('sTest', 'now') OR id = 2;
