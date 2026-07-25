#!/bin/bash
BACKUP_DIR="/opt/homeme/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="homeme-mongo"
DB_NAME="homeme"
KEEP_DAYS=30
mkdir -p $BACKUP_DIR
echo "[$(date)] Starting backup..."
docker exec $CONTAINER mongodump --db $DB_NAME --out /tmp/backup_$DATE --quiet
docker cp $CONTAINER:/tmp/backup_$DATE $BACKUP_DIR/
docker exec $CONTAINER rm -rf /tmp/backup_$DATE
cd $BACKUP_DIR
tar -czf backup_$DATE.tar.gz backup_$DATE/ && rm -rf backup_$DATE/
SIZE=$(du -sh backup_$DATE.tar.gz | cut -f1)
echo "[$(date)] Backup: backup_$DATE.tar.gz ($SIZE)"
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Done. Kept last $KEEP_DAYS days."
