#!/usr/bin/env bash
# A single failure while EMAIL is disabled; never pause monitoring or alter data.
set -Eeuo pipefail
grep -q -- '-e NOTIFICATIONS_EMAIL_ENABLED=false' /usr/local/libexec/kortek-worker-run.sh
systemctl is-active --quiet kortek-email-worker.service
previous_restarts=$(systemctl show kortek-email-worker.service -p NRestarts --value)
recover() { sudo -n systemctl start kortek-email-worker.service; }
trap recover EXIT INT TERM
echo "ERROR_DRILL_STARTED $(date -u +%FT%TZ)"
sudo -n systemctl kill --kill-whom=main --signal=KILL kortek-email-worker.service
recovered=false
for attempt in $(seq 1 30); do
  restarts=$(systemctl show kortek-email-worker.service -p NRestarts --value)
  if (( restarts > previous_restarts )) && systemctl is-active --quiet kortek-email-worker.service &&
    podman logs --since 45s kortek-email-worker 2>/dev/null | grep -q '^EMAIL_WORKER_HEARTBEAT$'; then
    recovered=true
    break
  fi
  sleep 2
done
test "$recovered" = true
sudo -n systemctl start kortek-monitor.service
python3 /usr/local/libexec/kortek-collect-errors.py
echo "ERROR_DRILL_RECOVERED $(date -u +%FT%TZ)"
