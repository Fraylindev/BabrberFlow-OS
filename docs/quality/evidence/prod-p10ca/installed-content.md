# P10c-A — Contenido instalado sanitizado

Hashes calculados sobre los bytes originales de cada archivo; no sobre systemctl cat. No existen drop-ins. Los archivos de entorno se muestran solo por nombres/hash en before.json.

## /etc/systemd/system/kortek-api-staging.service

SHA256: `91ce7997af89f16927acae71c6030c60765ab16c43022cfb64e0b143ac6c3a90`

```ini
[Unit]
Description=Kortek Booking staging API (Cutover QA)
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=opc
Group=opc
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
LoadCredential=runtime-env:/etc/kortek-api-staging/runtime-env
ExecStart=/usr/local/libexec/kortek-api-staging-run.sh
ExecStop=/usr/bin/podman stop --time 30 --ignore kortek-api-staging
ExecStopPost=/usr/bin/podman stop --time 30 --ignore kortek-api-staging
Restart=on-failure
RestartSec=15
TimeoutStopSec=45
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## /etc/systemd/system/kortek-api.service

SHA256: `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f`

```ini
[Unit]
Description=Kortek Booking production API
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=opc
Group=opc
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
Environment=KORTEK_API_IMAGE_OVERRIDE=sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775
Environment=APP_RELEASE_OVERRIDE=8e1501e89a132e1b01d3633b1b3f896a8cbe5800
LoadCredential=runtime-env:/etc/kortek-api/runtime-env
ExecStart=/usr/local/libexec/kortek-api-run.sh
ExecStop=/usr/bin/podman stop --time 30 --ignore kortek-api
ExecStopPost=/usr/bin/podman stop --time 30 --ignore kortek-api
Restart=on-failure
RestartSec=15
TimeoutStopSec=45
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## /etc/systemd/system/kortek-email-worker-staging.service

SHA256: `a06049b34039fa7cc8afac0186501543250d44aaf282c07fbeb9b7e5d05bb70f`

```ini
[Unit]
Description=Kortek transactional email worker (Cutover QA only)
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=opc
Group=opc
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
LoadCredential=runtime-env:/etc/kortek-api-staging/runtime-env
ExecStart=/usr/local/libexec/kortek-worker-staging-run.sh
ExecStop=/usr/bin/podman stop --time 30 --ignore kortek-email-worker-staging
ExecStopPost=/usr/bin/podman stop --time 30 --ignore kortek-email-worker-staging
Restart=on-failure
RestartSec=15
TimeoutStopSec=45
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## /etc/systemd/system/kortek-email-worker.service

SHA256: `01b1fc2d63b459b482bf16333afcd0de89275c238ca01956b51503ccb20acbf1`

```ini
[Unit]
Description=Kortek transactional email worker (channel disabled)
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=opc
Group=opc
Environment=XDG_RUNTIME_DIR=/run/user/1000
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
LoadCredential=database-url:/etc/kortek-worker/database-url
ExecStart=/usr/local/libexec/kortek-worker-run.sh
ExecStop=/usr/bin/podman stop --time 30 --ignore kortek-email-worker
ExecStopPost=/usr/bin/podman stop --time 30 --ignore kortek-email-worker
Restart=on-failure
RestartSec=15
TimeoutStopSec=45
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## /usr/local/libexec/kortek-api-run.sh

SHA256: `7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f`

```bash
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
```

## /usr/local/libexec/kortek-api-staging-run.sh

SHA256: `118d2c83c4b800f9e63d72c365d486f47b6f4aaf491ec8221be84305ff27cbf8`

```bash
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
```

## /usr/local/libexec/kortek-worker-run.sh

SHA256: `c1737c618d268897f3a355c11ac86564ba419f12f7a556a0084a94ce9233338b`

```bash
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
```

## /usr/local/libexec/kortek-worker-staging-run.sh

SHA256: `919d73ca08e6485f34a456d88a01e2406537c2c34ac7722e3564f84c06f99ad6`

```bash
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
  "sha256:7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1" \
  dist/notifications/email-worker.cli.js
```
