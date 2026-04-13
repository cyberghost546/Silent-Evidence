#!/bin/bash
# ============================================================
#  AnimeVerse — MySQL Database Backup Script
# ============================================================
#
# Creates a timestamped SQL dump of the silent_evidence database.
# Keeps the last N backups and deletes older ones automatically.
#
# Usage (local XAMPP):
#   bash scripts/backup-db.sh
#
# Usage (Docker):
#   bash scripts/backup-db.sh --docker
#
# Schedule with cron (daily at 2 AM):
#   0 2 * * * cd /path/to/Social-Media && bash scripts/backup-db.sh
#
# Environment variables (optional — defaults work for XAMPP):
#   DB_HOST     — MySQL host (default: localhost)
#   DB_PORT     — MySQL port (default: 3306)
#   DB_USER     — MySQL user (default: root)
#   DB_PASS     — MySQL password (default: empty)
#   DB_NAME     — database name (default: silent_evidence)
#   BACKUP_DIR  — where to store backups (default: ./backups)
#   KEEP_DAYS   — how many days of backups to keep (default: 7)

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
DB_NAME="${DB_NAME:-silent_evidence}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

# Timestamp for the backup filename (e.g. 2026-03-29_140000)
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
FILENAME="${DB_NAME}_${TIMESTAMP}.sql"

# ── Create backup directory if it doesn't exist ───────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup of '${DB_NAME}' database..."

# ── Determine if running in Docker mode ───────────────────────────────────
# In Docker mode, we exec into the db container to run mysqldump
if [[ "${1:-}" == "--docker" ]]; then
  echo "[backup] Running in Docker mode..."
  docker exec silent_evidence_db mysqldump \
    -u root \
    -p"${MYSQL_ROOT_PASSWORD:-secret}" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    "$DB_NAME" > "${BACKUP_DIR}/${FILENAME}"
else
  # ── Local mode (XAMPP or standalone MySQL) ────────────────────────────
  # Try common mysqldump locations on Windows (XAMPP) and Linux/Mac
  MYSQLDUMP=""
  for path in \
    "C:/xampp/mysql/bin/mysqldump" \
    "/usr/bin/mysqldump" \
    "/usr/local/bin/mysqldump" \
    "mysqldump"; do
    if command -v "$path" &>/dev/null || [ -f "$path" ]; then
      MYSQLDUMP="$path"
      break
    fi
  done

  if [ -z "$MYSQLDUMP" ]; then
    echo "[backup] ERROR: mysqldump not found. Install MySQL or set PATH."
    exit 1
  fi

  # Build the password flag only if a password is set
  PASS_FLAG=""
  if [ -n "$DB_PASS" ]; then
    PASS_FLAG="-p${DB_PASS}"
  fi

  # Run the dump with options for a consistent backup:
  # --single-transaction: consistent snapshot without locking tables (InnoDB)
  # --routines: include stored procedures and functions
  # --triggers: include triggers
  # --add-drop-table: makes restoring easier — drops existing tables first
  "$MYSQLDUMP" \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    $PASS_FLAG \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    "$DB_NAME" > "${BACKUP_DIR}/${FILENAME}"
fi

# ── Compress the backup to save disk space ────────────────────────────────
gzip "${BACKUP_DIR}/${FILENAME}"
FINAL_FILE="${BACKUP_DIR}/${FILENAME}.gz"
FILE_SIZE=$(du -h "$FINAL_FILE" | cut -f1)

echo "[backup] Saved: ${FINAL_FILE} (${FILE_SIZE})"

# ── Clean up old backups (keep only the last KEEP_DAYS days) ──────────────
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$KEEP_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[backup] Cleaned up ${DELETED} backup(s) older than ${KEEP_DAYS} days."
fi

echo "[backup] Done!"
