#!/usr/bin/env bash
set -Eeuo pipefail
# Only the owner-approved P5 pair may override the credential's selectors.
selector_requested=${KORTEK_API_IMAGE_OVERRIDE+x}${APP_RELEASE_OVERRIDE+x}
image_override=${KORTEK_API_IMAGE_OVERRIDE-}
release_override=${APP_RELEASE_OVERRIDE-}
credentials_dir=${CREDENTIALS_DIRECTORY:?systemd credentials required}
test -r "$credentials_dir/runtime-env"
# Root-owned credential file, never a repository dotenv or a log/argument.
set -a
source "$credentials_dir/runtime-env"
set +a
if [[ -n "$selector_requested" ]]; then
  if [[ "$image_override" != 'sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775' ||
        "$release_override" != '8e1501e89a132e1b01d3633b1b3f896a8cbe5800' ]]; then
    printf '%s\n' 'KORTEK_API_SELECTOR_INVALID' >&2
    exit 64
  fi
  export KORTEK_API_IMAGE="$image_override" APP_RELEASE="$release_override"
fi
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
