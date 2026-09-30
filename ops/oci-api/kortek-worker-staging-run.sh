#!/usr/bin/env bash
set -Eeuo pipefail

credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials required}
test -r "$credentials_dir/runtime-env"
set -a
source "$credentials_dir/runtime-env"
set +a

# Fail closed if this unit is ever pointed at production credentials.
[[ ${NODE_ENV:-} == production && ${DEPLOY_ENV:-} == staging ]]
[[ ${DATABASE_URL:-} =~ ^postgresql://kortek_runtime\.prirlabbnlcuvnzuaczp: ]]
[[ ${WEB_PUBLIC_ORIGIN:-} == https://qa.booking.kortek.cloud ]]
[[ ${API_PUBLIC_ORIGIN:-} == https://api.staging.booking.kortek.cloud ]]
[[ ${NOTIFICATIONS_EMAIL_ENABLED:-} == true ]]
[[ ${NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED:-} == true ]]
[[ -n ${RESEND_API_KEY:-} && -n ${RESEND_WEBHOOK_SECRET:-} ]]
[[ -n ${NOTIFICATIONS_EMAIL_FROM:-} && -n ${NOTIFICATIONS_EMAIL_REPLY_TO:-} ]]
[[ ${#NOTIFICATIONS_ABUSE_SECRET} -ge 32 ]]

exec podman run --rm --replace --name kortek-email-worker-staging \
  --network host --read-only --cap-drop ALL --security-opt no-new-privileges \
  --cpus 0.25 --memory 384m --memory-swap 384m --pids-limit 64 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e NODE_ENV -e DEPLOY_ENV -e DATABASE_URL \
  -e NOTIFICATIONS_EMAIL_ENABLED -e NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED \
  -e NOTIFICATIONS_EMAIL_FROM -e NOTIFICATIONS_EMAIL_REPLY_TO \
  -e NOTIFICATIONS_ABUSE_SECRET -e RESEND_API_KEY -e RESEND_WEBHOOK_SECRET \
  -e NODE_OPTIONS=--max-old-space-size=256 \
  -v /home/opc/kortek-api-staging/supabase-ca.crt:/srv/kortek/apps/api/prisma/supabase-ca.crt:ro,z \
  --entrypoint node \
  "${KORTEK_API_IMAGE:?immutable staging image required}" \
  dist/notifications/email-worker.cli.js
