#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

namespace=idujavz2hijf
bucket=kortek-booking-encrypted-backups
region=us-ashburn-1
project=ilaoolpcrlmqkftirjog
host=aws-0-us-east-1.pooler.supabase.com
credentials_dir=${CREDENTIALS_DIRECTORY:-/etc/kortek-backup}
workdir=$(mktemp -d "${STATE_DIRECTORY:-/tmp}/kortek-backup.XXXXXX")
trap 'status=$?; if (( status != 0 )); then echo "BACKUP_FAILED stage=${stage:-initial} status=$status" >&2; fi; rm -rf "$workdir"' EXIT
stage=credentials
export GNUPGHOME="$workdir/gnupg"
mkdir -m 0700 "$GNUPGHOME"

test -r "$credentials_dir/database-password"
test -r "$credentials_dir/encryption-passphrase"
cp /usr/local/share/kortek/supabase-ca.crt "$workdir/supabase-ca.crt"
export PGPASSWORD
PGPASSWORD=$(cat "$credentials_dir/database-password")

cd "$workdir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
nonce=$(cat /proc/sys/kernel/random/uuid)
name="daily/${stamp}-${nonce}.dump.gpg"

# pg_dump streams directly into AES-256 encryption: no plaintext dump on disk.
if podman run --rm --network host \
  -e PGPASSWORD -e PGSSLMODE=verify-full \
  -e PGSSLROOTCERT=/tmp/supabase-ca.crt \
  -v "$workdir/supabase-ca.crt:/tmp/supabase-ca.crt:ro,Z" \
  docker.io/library/postgres:17 \
  pg_dump --format=custom --schema=public --no-owner --no-acl \
    -h "$host" -p 5432 -U "kortek_backup.$project" -d postgres \
    2> dump.stderr \
  | gpg --batch --yes --pinentry-mode loopback \
      --passphrase-file "$credentials_dir/encryption-passphrase" \
      --symmetric --cipher-algo AES256 --output backup.dump.gpg \
      2> encryption.stderr; then
  :
else
  result=("${PIPESTATUS[@]}")
  printf 'BACKUP_DUMP_PIPELINE_FAILED statuses=%s\n' "${result[*]}" >&2
  exit 1
fi

stage=encrypted_archive
test -s backup.dump.gpg
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file "$credentials_dir/encryption-passphrase" \
  --decrypt backup.dump.gpg 2>/dev/null \
  | podman run --rm -i --network none docker.io/library/postgres:17 pg_restore -l \
    > restore.list
stage=archive_validation
test -s restore.list
sha256sum backup.dump.gpg > backup.dump.gpg.sha256

bytes=$(stat -c %s backup.dump.gpg)
test "$bytes" -le 450000000
oci os object list --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --all --output json \
  > bucket.json
stage=capacity
existing_bytes=$(python3 -c 'import json; d=json.load(open("bucket.json")); print(sum(int(o.get("size",0)) for o in d.get("data",[])))')
if (( existing_bytes + bytes + 1024 >= 8000000000 )); then
  echo 'BACKUP_CAPACITY_ALERT: encrypted bucket would exceed the 8 GB safety cap' >&2
  exit 1
fi

oci os object put --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --name "$name" \
  --file backup.dump.gpg --no-multipart --output json > /dev/null
stage=encrypted_upload
oci os object put --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --name "${name}.sha256" \
  --file backup.dump.gpg.sha256 --no-multipart --output json > /dev/null
stage=checksum_upload
remote_size=$(oci os object head --auth instance_principal \
  --namespace "$namespace" --bucket-name "$bucket" --region "$region" \
  --name "$name" --output json \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["content-length"])')
if [[ "$remote_size" != "$bytes" ]]; then
  echo 'BACKUP_UPLOAD_VERIFICATION_FAILED' >&2
  exit 1
fi
printf 'BACKUP_OK object=%s bytes=%s sha256=%s\n' \
  "$name" "$bytes" "$(cut -d ' ' -f 1 backup.dump.gpg.sha256)"
