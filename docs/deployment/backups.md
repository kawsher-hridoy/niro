# Deployment — Backups

> **Phase F4.** Skip for dev (no real data).

## What we back up

1. **Postgres data** — every table. Daily `pg_dump`.
2. **Blob storage** — patient documents. Daily `rclone sync` to a separate location.

What we don't back up:
- `.venv/`, `node_modules/`, build outputs, logs (reproducible).

## Schedule

`niro-backup.timer` runs every night at 03:30 local time. Why 03:30:
- Low traffic.
- Avoid 00:00 / 03:00 hour-boundary congestion.

## Procedure

```bash
#!/bin/bash
# /opt/niro/scripts/backup.sh

set -euo pipefail

DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/var/backups/niro/$DATE"
mkdir -p "$BACKUP_DIR"

# 1. Postgres dump
docker compose exec -T postgres pg_dump -U niro -d niro -Fc > "$BACKUP_DIR/niro.dump"

# 2. Blob sync
rclone sync /var/niro/blobs "b2:niro-blobs-backup/$DATE/" --transfers 4

# 3. Encrypt the SQL dump (blobs are already encrypted at rest)
age -r "$(cat /etc/niro/backup-recipient.txt)" -o "$BACKUP_DIR/niro.dump.age" "$BACKUP_DIR/niro.dump"
rm "$BACKUP_DIR/niro.dump"

# 4. Upload encrypted dump to B2
rclone copy "$BACKUP_DIR/niro.dump.age" "b2:niro-sql-backup/"

# 5. Local rotation — keep last 14 days
find /var/backups/niro/ -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "Backup completed at $(date)"
```

## age (encryption)

Generate a key pair on a secure machine (NOT the VPS):

```bash
age-keygen -o niro-backup.key
# Public key (recipient): goes on the VPS at /etc/niro/backup-recipient.txt
# Private key: kept offline, in a password manager
```

The VPS only has the public key. Even if compromised, attacker cannot
decrypt the backups.

## Restore procedure (test before relying on it)

Run this monthly on a staging machine to verify backups work.

```bash
# 1. Download the latest dump from B2
rclone copy b2:niro-sql-backup/<filename>.age .

# 2. Decrypt
age -d -i niro-backup.key -o niro.dump niro.dump.age

# 3. Restore to a fresh DB
docker compose exec postgres dropdb -U niro niro_restore || true
docker compose exec postgres createdb -U niro niro_restore
docker compose exec -T postgres pg_restore -U niro -d niro_restore < niro.dump

# 4. Verify
docker compose exec postgres psql -U niro -d niro_restore -c "SELECT COUNT(*) FROM users;"

# 5. Restore blobs
rclone copy b2:niro-blobs-backup/<date>/ /var/niro/blobs-restore/
```

## Retention

- Local: 14 days (latest, on the VPS itself).
- B2: 90 days (set bucket lifecycle policy).
- Offline copy: monthly snapshot, kept indefinitely on the maintainer's hardware.

## To be added

- [ ] Phase F4: actual backup.sh + systemd unit + timer
- [ ] Phase F4: first restore test, logged in `build-log.md`
- [ ] Phase F: alerting if backup fails (cron + email or healthchecks.io)
