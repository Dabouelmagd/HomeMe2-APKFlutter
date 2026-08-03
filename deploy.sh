#!/bin/bash
set -e
cd /opt/homeme
echo "═══ HomeMe Safe Deploy ═══"
echo "── Step 1: Backup ──"
bash /opt/homeme/backup.sh || { echo "❌ Backup failed — aborted"; exit 1; }
echo "── Step 2: Git Pull ──"
git pull origin main
echo "── Step 3: Build ──"
docker compose -f docker-compose.homeme.yml up -d --build homeme-frontend homeme-backend
echo "── Step 4: Verify ──"
sleep 15
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8002/api/health)
[ "$STATUS" = "200" ] && echo "✅ Deploy complete!" || { echo "❌ Failed (HTTP $STATUS)"; docker logs homeme-backend --tail 20; exit 1; }
