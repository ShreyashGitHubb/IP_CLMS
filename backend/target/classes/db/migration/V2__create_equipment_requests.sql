CREATE TABLE IF NOT EXISTS equipment_requests (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  equipment_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  due_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  INDEX idx_equipment_requests_user (user_id),
  INDEX idx_equipment_requests_status (status),
  CONSTRAINT fk_equipment_requests_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  CONSTRAINT fk_equipment_requests_user FOREIGN KEY (user_id) REFERENCES users(id)
);