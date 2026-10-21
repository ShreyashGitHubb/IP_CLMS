#!/usr/bin/env bash
# ==============================================================================
# CLMS Automated Database and File Backup to S3 (Exp 8 - Backup & Recovery)
# Uses EC2 IAM Instance Profile Role for secure, credential-free S3 transfers
# ==============================================================================

set -euo pipefail

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/data/clms_uploads/backups"
DB_NAME="${DB_NAME:-clms_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-clmsadmin}"
DB_PASS="${DB_PASSWORD:-}"
S3_BUCKET="${S3_BUCKET:-clms-equipment-docs}"

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting CLMS Database Backup..."

# Generate compressed MySQL dump
mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" \
  --single-transaction \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "[$(date)] MySQL dump completed: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# Upload to Amazon S3 bucket (Exp 7 & 8)
echo "[$(date)] Uploading backup to S3: s3://${S3_BUCKET}/database-backups/"
aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/database-backups/"

# Clean up local backups older than 7 days
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup process completed successfully!"
