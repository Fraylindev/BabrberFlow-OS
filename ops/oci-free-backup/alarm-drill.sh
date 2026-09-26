#!/usr/bin/env bash
# D9: a bounded failure rehearsal, only while the EMAIL process is disabled.
set -Eeuo pipefail
grep -q -- '-e NOTIFICATIONS_EMAIL_ENABLED=false' /usr/local/libexec/kortek-worker-run.sh
systemctl is-active --quiet kortek-email-worker.service
recover() {
  sudo -n systemctl start kortek-email-worker.service
  sudo -n systemctl start kortek-monitor.service
  echo "ALARM_DRILL_RECOVERED $(date -u +%FT%TZ)"
}
trap recover EXIT INT TERM
sudo -n systemctl stop kortek-email-worker.service
echo "ALARM_DRILL_STOPPED $(date -u +%FT%TZ)"
for cycle in $(seq 1 8); do
  sudo -n systemctl start kortek-monitor.service
  printf 'ALARM_DRILL_SAMPLE cycle=%s time=%s\n' "$cycle" "$(date -u +%FT%TZ)"
  sleep 55
done
