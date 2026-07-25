#!/bin/bash
BACKUP_FILE=$1
BACKUP_DIR="/opt/homeme/backups/mongodb"
CONTAINER="homeme-mongo"
DB_NAME="homeme"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: bash restore_mongo.sh <backup.tar.gz>"
    ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null
    exit 1
fi
echo "WARNING: This replaces the current database!"
read -p "Type 'yes' to confirm: " C
[ "$C" != "yes" ] && echo "Cancelled." && exit 0
TEMP="/tmp/restore_$(date +%s)"
mkdir -p $TEMP && tar -xzf $BACKUP_FILE -C $TEMP
docker cp $TEMP/$(ls $TEMP) $CONTAINER:/tmp/restore_data
docker exec $CONTAINER mongorestore --db $DB_NAME --drop /tmp/restore_data/$DB_NAME --quiet
docker exec $CONTAINER rm -rf /tmp/restore_data && rm -rf $TEMP
echo "Restore complete!"
