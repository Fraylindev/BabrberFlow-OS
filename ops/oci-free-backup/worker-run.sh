#!/usr/bin/env bash
set -Eeuo pipefail

credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials are required}
test -r "$credentials_dir/database-url"
export DATABASE_URL
DATABASE_URL=$(cat "$credentials_dir/database-url")

exec podman run --rm --replace --name kortek-email-worker \
  --network host \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e DATABASE_URL \
  -e NOTIFICATIONS_EMAIL_ENABLED=false \
  -e NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=false \
  -v /home/opc/kortek-worker/supabase-ca.crt:/srv/kortek/apps/api/prisma/supabase-ca.crt:ro,z \
  localhost/kortek-worker:c1
