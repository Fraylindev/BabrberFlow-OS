#!/usr/bin/env bash
set -Eeuo pipefail

# Capture the systemd selection before loading the shared API credential.
image_override=${KORTEK_WORKER_IMAGE_OVERRIDE-}
release_override=${KORTEK_WORKER_RELEASE_OVERRIDE-}
credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials are required}
test -r "$credentials_dir/runtime-env"
test -r "$credentials_dir/database-url"
set -a
source "$credentials_dir/runtime-env"
set +a

if [[ "$image_override" != 'sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f' ||
      "$release_override" != '8e1501e89a132e1b01d3633b1b3f896a8cbe5800' ]]; then
  printf '%s\n' 'KORTEK_WORKER_SELECTOR_INVALID' >&2
  exit 64
fi
export KORTEK_WORKER_IMAGE="$image_override" APP_RELEASE="$release_override"
# Preserve the worker's dedicated connection/pool, never the API DATABASE_URL.
export DATABASE_URL
DATABASE_URL=$(cat "$credentials_dir/database-url")

if [[ ${NODE_ENV:-} != production || ${DEPLOY_ENV:-} != production ||
      ${WEB_PUBLIC_ORIGIN:-} != https://booking.kortek.cloud ||
      ${API_PUBLIC_ORIGIN:-} != https://api.booking.kortek.cloud ||
      -z ${DATABASE_URL:-} ]]; then
  printf '%s\n' 'KORTEK_WORKER_ENV_INVALID' >&2
  exit 64
fi

exec podman run --rm --replace --name kortek-email-worker \
  --network host \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e NODE_ENV -e DEPLOY_ENV -e APP_RELEASE -e DATABASE_URL \
  -e NOTIFICATIONS_EMAIL_ENABLED -e NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED \
  -e NOTIFICATIONS_EMAIL_FROM -e NOTIFICATIONS_EMAIL_REPLY_TO \
  -e NOTIFICATIONS_ABUSE_SECRET -e RESEND_API_KEY -e RESEND_WEBHOOK_SECRET \
  -v /home/opc/kortek-worker/supabase-ca.crt:/srv/kortek/apps/api/prisma/supabase-ca.crt:ro,z \
  "${KORTEK_WORKER_IMAGE:?immutable worker image required}"
