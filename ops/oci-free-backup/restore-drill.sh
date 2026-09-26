#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

namespace=idujavz2hijf
bucket=kortek-booking-encrypted-backups
region=us-ashburn-1
credentials_dir=${CREDENTIALS_DIRECTORY:-/etc/kortek-backup}
workdir=$(mktemp -d "${STATE_DIRECTORY:-/tmp}/kortek-restore.XXXXXX")
container=
stage=listing
cleanup() {
  status=$?
  if (( status != 0 )); then
    echo "RESTORE_DRILL_FAILED stage=$stage status=$status" >&2
  fi
  if [[ -n "$container" ]]; then podman stop "$container" > /dev/null 2>&1 || true; fi
  rm -rf "$workdir"
}
trap cleanup EXIT
export GNUPGHOME="$workdir/gnupg"
mkdir -m 0700 "$GNUPGHOME"
cd "$workdir"

oci os object list --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --all --output json > bucket.json
name=$(python3 -c 'import json; d=json.load(open("bucket.json")); a=[o["name"] for o in d.get("data",[]) if o["name"].endswith(".dump.gpg")]; print(max(a) if a else "")')
test -n "$name"
stage=download
oci os object get --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --name "$name" \
  --file backup.dump.gpg --output json > /dev/null
oci os object get --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --name "${name}.sha256" \
  --file backup.dump.gpg.sha256 --output json > /dev/null
sha256sum --check backup.dump.gpg.sha256

stage=isolated_postgres
export POSTGRES_PASSWORD
POSTGRES_PASSWORD=$(openssl rand -hex 32)
container="kortek-restore-$(cat /proc/sys/kernel/random/uuid)"
podman run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD docker.io/library/postgres:17 > /dev/null
for attempt in $(seq 1 30); do
  if podman exec "$container" pg_isready -U postgres -d postgres > /dev/null 2>&1; then break; fi
  sleep 1
done
podman exec "$container" pg_isready -U postgres -d postgres > /dev/null
podman exec "$container" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 \
  -q -c 'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public' > /dev/null

stage=restore
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file "$credentials_dir/encryption-passphrase" \
  --decrypt backup.dump.gpg 2> /dev/null \
  | podman run --rm -i --network none docker.io/library/postgres:17 pg_restore -l \
    > restore.list
grep -q ' SCHEMA - public ' restore.list
sed -i '/ SCHEMA - public /s/^/;/' restore.list
podman cp restore.list "$container:/tmp/restore.list"
if gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file "$credentials_dir/encryption-passphrase" \
  --decrypt backup.dump.gpg 2> decrypt.stderr \
  | podman exec -i "$container" pg_restore -L /tmp/restore.list \
      --exit-on-error --single-transaction --no-owner --no-acl \
      -U postgres -d postgres 2> restore.stderr; then
  :
else
  result=("${PIPESTATUS[@]}")
  printf 'RESTORE_PIPELINE_FAILED statuses=%s\n' "${result[*]}" >&2
  exit 1
fi

stage=verification
podman exec -i "$container" psql -U postgres -d postgres -X -Atq -v ON_ERROR_STOP=1 \
  > counts.txt <<'SQL'
SELECT format('SELECT %L || ''|'' || count(*) FROM public.%I', tablename, tablename)
FROM pg_tables WHERE schemaname='public' ORDER BY tablename
\gexec
SQL
tables=$(wc -l < counts.txt)
migrations=$(grep '^_prisma_migrations|' counts.txt | cut -d '|' -f 2)
bookings=$(grep '^Booking|' counts.txt | cut -d '|' -f 2)
test "$tables" -eq 31
test "$migrations" -ge 26
test "$bookings" -ge 1
if [[ -n "${STATE_DIRECTORY:-}" ]]; then
  install -m 0600 counts.txt "$STATE_DIRECTORY/latest-restore-counts.txt"
fi
printf 'RESTORE_DRILL_OK object=%s tables=%s migration_rows=%s bookings=%s sha256=%s\n' \
  "$name" "$tables" "$migrations" "$bookings" \
  "$(cut -d ' ' -f 1 backup.dump.gpg.sha256)"
