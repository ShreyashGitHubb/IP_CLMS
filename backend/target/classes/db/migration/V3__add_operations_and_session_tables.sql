CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_sessions_user (user_id),
  INDEX idx_auth_sessions_expiry (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

SET @add_password_column = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'users'
     AND column_name = 'must_change_password') = 0,
  'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);
PREPARE add_password_column_stmt FROM @add_password_column;
EXECUTE add_password_column_stmt;
DEALLOCATE PREPARE add_password_column_stmt;

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  equipment_id BIGINT NOT NULL,
  opened_by BIGINT NOT NULL,
  assigned_technician VARCHAR(120) NULL,
  title VARCHAR(160) NOT NULL,
  details TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  repair_cost DECIMAL(12,2) NULL,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_maintenance_status (status),
  INDEX idx_maintenance_equipment (equipment_id),
  CONSTRAINT fk_maintenance_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  CONSTRAINT fk_maintenance_user FOREIGN KEY (opened_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lab_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_by BIGINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  details TEXT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lab_events_start (starts_at),
  CONSTRAINT fk_lab_events_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  message VARCHAR(500) NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_created (user_id, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);