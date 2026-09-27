#!/usr/bin/env bash
set -Eeuo pipefail
credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials required}
test -r "$credentials_dir/runtime-env"
# Root-owned credential file, never a repository dotenv or a log/argument.
set -a
source "$credentials_dir/runtime-env"
set +a
exec podman run --rm --replace --name kortek-api \
  --network host --read-only --cap-drop ALL --security-opt no-new-privileges \
  --cpus 1.5 --memory 2g --memory-swap 2g --pids-limit 128 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e NODE_ENV -e DEPLOY_ENV -e APP_RELEASE -e HOST -e PORT \
  -e DATABASE_URL -e JWT_SECRET -e RATE_LIMIT_SECRET \
  -e WEB_PUBLIC_ORIGIN -e API_PUBLIC_ORIGIN -e CORS_ALLOWED_ORIGINS \
  -e CLERK_SECRET_KEY -e CLERK_PUBLISHABLE_KEY -e CLERK_AUTHORIZED_PARTIES \
  -e CLERK_INVITATION_REDIRECT_URL -e PUBLIC_BOOKING_CLOSED \
  -e REQUIRE_INTERNAL_MFA -e NOTIFICATIONS_EMAIL_ENABLED \
  -e NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED \
  -e CLOUDINARY_CLOUD_NAME -e CLOUDINARY_API_KEY -e CLOUDINARY_API_SECRET \
  -e NODE_OPTIONS=--max-old-space-size=1536 \
  -v /home/opc/kortek-api/supabase-ca.crt:/srv/kortek/apps/api/prisma/supabase-ca.crt:ro,z \
  "${KORTEK_API_IMAGE:?immutable image required}"
