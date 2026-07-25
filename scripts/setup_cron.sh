#!/bin/bash
# Run once on server to setup daily backup at 2 AM
SCRIPT_PATH="/opt/homeme/scripts/backup_mongo.sh"
LOG_PATH="/opt/homeme/backups/backup.log"
CRON_JOB="0 2 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1"
(crontab -l 2>/dev/null | grep -v backup_mongo; echo "$CRON_JOB") | crontab -
echo "Cron job added: daily backup at 2 AM"
crontab -l | grep backup
