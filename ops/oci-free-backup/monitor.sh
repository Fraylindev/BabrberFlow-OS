#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

namespace=idujavz2hijf
bucket=kortek-booking-encrypted-backups
region=us-ashburn-1
project=ilaoolpcrlmqkftirjog
credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials are required}
workdir=$(mktemp -d "${STATE_DIRECTORY:-/tmp}/kortek-monitor.XXXXXX")
trap 'rm -rf "$workdir"' EXIT
cd "$workdir"

if systemctl is-active --quiet kortek-email-worker.service; then
  worker_up=1
else
  worker_up=0
fi
if podman logs --since 180s kortek-email-worker 2>/dev/null \
  | grep -q '^EMAIL_WORKER_HEARTBEAT$'; then
  worker_heartbeat=1
else
  worker_heartbeat=0
fi

inventory_file="${STATE_DIRECTORY:?systemd state directory is required}/bucket-inventory.json"
if python3 /usr/local/libexec/kortek-object-inventory.py --needs-refresh "$inventory_file"; then
  oci os object list --auth instance_principal --namespace "$namespace" \
    --bucket-name "$bucket" --region "$region" --all --output json > bucket.json
  python3 /usr/local/libexec/kortek-object-inventory.py --store "$inventory_file" < bucket.json
fi
read -r backup_age_hours bucket_bytes < <(
  python3 /usr/local/libexec/kortek-object-inventory.py --metrics "$inventory_file"
)

restore_age_hours=$(python3 - <<'PY'
import os, time
p='/var/lib/kortek-backup/latest-restore-counts.txt'
print(f'{(time.time()-os.path.getmtime(p))/3600:.2f}' if os.path.isfile(p) else '999')
PY
)

db_up=0
db_bytes=0
db_connections=0
email_pending_over_10m=0
email_uncertain_open=0
email_failed_5m=0
email_paused=1
export PGPASSWORD
PGPASSWORD=$(cat "$credentials_dir/database-password")
if query=$(podman run --rm --network host \
    -e PGPASSWORD -e PGSSLMODE=verify-full \
    -e PGSSLROOTCERT=/tmp/supabase-ca.crt \
    -v /home/opc/kortek-worker/supabase-ca.crt:/tmp/supabase-ca.crt:ro,z \
    docker.io/library/postgres:17 \
    psql -h aws-0-us-east-1.pooler.supabase.com -p 5432 \
      -U "kortek_backup.$project" -d postgres -X -Atq -v ON_ERROR_STOP=1 \
      -c "SELECT pg_database_size(current_database()),
        (SELECT count(*) FROM pg_stat_activity),
        (SELECT count(*) FROM public.\"EmailOutbox\" WHERE status IN ('PENDING','RETRY') AND \"nextAttemptAt\" < now() - interval '10 minutes' AND \"closedAt\" IS NULL),
        (SELECT count(*) FROM public.\"EmailOutbox\" WHERE status='UNCERTAIN' AND \"closedAt\" IS NULL),
        (SELECT count(*) FROM public.\"EmailOutbox\" WHERE status='FAILED' AND \"closedAt\" > now() - interval '5 minutes'),
        (SELECT CASE WHEN paused THEN 1 ELSE 0 END FROM public.\"EmailChannelControl\" WHERE id='EMAIL')" \
    2> database.stderr); then
  IFS='|' read -r db_bytes db_connections email_pending_over_10m \
    email_uncertain_open email_failed_5m email_paused <<< "$query"
  db_up=1
else
  echo 'MONITOR_DATABASE_UNAVAILABLE' >&2
fi

cat > metrics.tsv <<EOF
worker_up $worker_up
worker_heartbeat $worker_heartbeat
database_up $db_up
backup_age_hours $backup_age_hours
restore_age_hours $restore_age_hours
bucket_bytes $bucket_bytes
database_bytes $db_bytes
database_connections $db_connections
email_pending_over_10m $email_pending_over_10m
email_uncertain_open $email_uncertain_open
email_failed_5m $email_failed_5m
email_paused $email_paused
EOF
python3 /usr/local/libexec/kortek-collect-errors.py >> metrics.tsv
python3 /usr/local/libexec/kortek-public-http-probe.py >> metrics.tsv
python3 - <<'PY'
import datetime, json
timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
compartment='ocid1.tenancy.oc1..aaaaaaaamqwszort7cp63tyzpuo5oj7ofk3vghyhjnftovpxqg7qhvquyx5q'
metrics=[]
for line in open('metrics.tsv'):
    name, value=line.split()
    metrics.append({'compartmentId':compartment,'namespace':'kortek_booking',
      'name':name,'dimensions':{'environment':'production','instance':'kortek-free-services'},
      'datapoints':[{'timestamp':timestamp,'value':float(value)}]})
json.dump(metrics,open('metrics.json','w'))
PY
oci monitoring metric-data post --auth instance_principal --region "$region" \
  --endpoint "https://telemetry-ingestion.${region}.oraclecloud.com" \
  --metric-data file://metrics.json --batch-atomicity ATOMIC \
  --output json > response.json
python3 - <<'PY'
import json
d=json.load(open('response.json'))
if d.get('data', {}).get('failed-metrics-count', 0) != 0:
    raise SystemExit('MONITOR_METRIC_INGESTION_FAILED')
PY
printf 'MONITOR_OK worker=%s heartbeat=%s database=%s backup_age_h=%s restore_age_h=%s bucket_bytes=%s email_paused=%s\n' \
  "$worker_up" "$worker_heartbeat" "$db_up" "$backup_age_hours" \
  "$restore_age_hours" "$bucket_bytes" "$email_paused"
