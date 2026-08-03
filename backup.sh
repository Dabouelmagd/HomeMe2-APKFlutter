#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/homeme"
mkdir -p "$BACKUP_DIR"
echo "🔄 Backup: $DATE"
docker exec homeme-mongo mongodump --db homeme --out /tmp/homeme_backup_$DATE --quiet
docker cp homeme-mongo:/tmp/homeme_backup_$DATE "$BACKUP_DIR/db_$DATE"
docker exec homeme-mongo rm -rf /tmp/homeme_backup_$DATE
cd "$BACKUP_DIR" && ls -t | tail -n +6 | xargs -r rm -rf
echo "✅ Saved: $BACKUP_DIR/db_$DATE ($(du -sh $BACKUP_DIR/db_$DATE | cut -f1))"
