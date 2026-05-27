#!/bin/bash
# Backup self-financial-dashboard SQLite DB daily
# Keeps only the last 7 days of backups

DB_PATH="/Users/user/hermes-workspace/self-financial-dashboard/data/financial.db"
BACKUP_DIR="/Users/user/hermes-workspace/self-financial-dashboard/backups"
DATE=$(date +%Y%m%d)
BACKUP_FILE="${BACKUP_DIR}/financial_${DATE}.db"

# Ensure backup dir exists
mkdir -p "$BACKUP_DIR"

# Create a clean, consistent SQLite backup
sqlite3 "$DB_PATH" ".backup ${BACKUP_FILE}"

# Verify backup is not malformed
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "[$(date -Iseconds)] Backup OK: ${BACKUP_FILE} ($(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null) bytes)"
else
    echo "[$(date -Iseconds)] Backup FAILED integrity check: ${BACKUP_FILE}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Delete backups older than 7 days
find "$BACKUP_DIR" -name "financial_*.db" -type f -mtime +7 -delete

echo "[$(date -Iseconds)] Cleanup done. Remaining backups:"
ls -1 "$BACKUP_DIR"