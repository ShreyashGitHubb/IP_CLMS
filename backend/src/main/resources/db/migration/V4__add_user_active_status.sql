SET @add_active_column = IF(
	(SELECT COUNT(*) FROM information_schema.columns
	 WHERE table_schema = DATABASE()
		 AND table_name = 'users'
		 AND column_name = 'active') = 0,
	'ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE',
	'SELECT 1'
);
PREPARE add_active_column_stmt FROM @add_active_column;
EXECUTE add_active_column_stmt;
DEALLOCATE PREPARE add_active_column_stmt;