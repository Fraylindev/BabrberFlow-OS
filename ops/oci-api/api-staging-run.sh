#!/usr/bin/env bash
set -Eeuo pipefail

credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials required}
test -r "$credentials_dir/runtime-env"
set -a
source "$credentials_dir/runtime-env"
set +a

# Keep staging on the QA database, test Clerk instance and loopback listener.
[[ ${NODE_ENV:-} == production ]]
[[ ${DEPLOY_ENV:-} == staging ]]
[[ ${HOST:-} == 127.0.0.1 && ${PORT:-} == 3001 ]]
[[ ${DATABASE_URL:-} =~ ^postgresql://kortek_runtime\.prirlabbnlcuvnzuaczp: ]]
[[ ${CLERK_SECRET_KEY:-} == sk_test_* ]]
[[ ${CLERK_PUBLISHABLE_KEY:-} == pk_test_* ]]
[[ ${WEB_PUBLIC_ORIGIN:-} == https://qa.booking.kortek.cloud ]]
[[ ${API_PUBLIC_ORIGIN:-} == https://api.staging.booking.kortek.cloud ]]
[[ ${CORS_ALLOWED_ORIGINS:-} == https://qa.booking.kortek.cloud ]]
[[ ${CLERK_AUTHORIZED_PARTIES:-} == https://qa.booking.kortek.cloud ]]
[[ ${PUBLIC_BOOKING_CLOSED:-} == false ]]
[[ ${NOTIFICATIONS_EMAIL_ENABLED:-} == true ]]
[[ ${NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED:-} == true ]]

exec podman run --rm --replace --name kortek-api-staging \
  --network host --read-only --cap-drop ALL --security-opt no-new-privileges \
  --cpus 0.5 --memory 1g --memory-swap 1g --pids-limit 96 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e NODE_ENV -e DEPLOY_ENV -e APP_RELEASE -e HOST -e PORT \
  -e DATABASE_URL -e JWT_SECRET -e RATE_LIMIT_SECRET \
  -e WEB_PUBLIC_ORIGIN -e API_PUBLIC_ORIGIN -e CORS_ALLOWED_ORIGINS \
  -e CLERK_SECRET_KEY -e CLERK_PUBLISHABLE_KEY -e CLERK_AUTHORIZED_PARTIES \
  -e CLERK_INVITATION_REDIRECT_URL -e PUBLIC_BOOKING_CLOSED \
  -e REQUIRE_INTERNAL_MFA -e NOTIFICATIONS_EMAIL_ENABLED \
  -e NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED \
  -e NOTIFICATIONS_EMAIL_FROM -e NOTIFICATIONS_EMAIL_REPLY_TO \
  -e NOTIFICATIONS_ABUSE_SECRET -e RESEND_API_KEY -e RESEND_WEBHOOK_SECRET \
  -e CLOUDINARY_CLOUD_NAME -e CLOUDINARY_API_KEY -e CLOUDINARY_API_SECRET \
  -e NODE_OPTIONS=--max-old-space-size=768 \
  -v /home/opc/kortek-api-staging/supabase-ca.crt:/srv/kortek/apps/api/prisma/supabase-ca.crt:ro,z \
  "${KORTEK_API_IMAGE:?immutable image required}"
