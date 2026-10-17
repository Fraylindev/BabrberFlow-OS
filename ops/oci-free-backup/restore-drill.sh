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
code=command_failed
cleanup() {
  status=$?
  if (( status != 0 )); then
    echo "RESTORE_DRILL_FAILED stage=$stage status=$status" >&2
  fi
  # Keep only an allowlisted diagnostic; raw stderr can contain PII or secrets.
  # Do not refresh latest-restore-counts.txt on failure (monitor success marker).
  if [[ -n "${STATE_DIRECTORY:-}" ]]; then
    if printf 'timestamp=%s\nstage=%s\nstatus=%s\ncode=%s\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$stage" "$status" "$code" \
      > "$workdir/result.txt" &&
      install -m 0600 "$workdir/result.txt" "$STATE_DIRECTORY/.restore-result-$$" &&
      mv -f "$STATE_DIRECTORY/.restore-result-$$" "$STATE_DIRECTORY/latest-restore-result.txt"
    then
      :
    else
      echo RESTORE_RESULT_WRITE_FAILED >&2
    fi
  fi
  if [[ -n "$container" ]]; then podman stop "$container" > /dev/null 2>&1 || true; fi
  rm -rf "$workdir"
}
trap cleanup EXIT
export GNUPGHOME="$workdir/gnupg"
mkdir -m 0700 "$GNUPGHOME"
cd "$workdir"

oci os object list --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --all --output json > bucket.json 2> listing.stderr
name=$(python3 -c 'import json; d=json.load(open("bucket.json")); a=[o["name"] for o in d.get("data",[]) if o["name"].endswith(".dump.gpg")]; print(max(a) if a else "")')
test -n "$name"
stage=download
oci os object get --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --name "$name" \
  --file backup.dump.gpg --output json > /dev/null 2> download.stderr
oci os object get --auth instance_principal --namespace "$namespace" \
  --bucket-name "$bucket" --region "$region" --name "${name}.sha256" \
  --file backup.dump.gpg.sha256 --output json > /dev/null 2> checksum-download.stderr
stage=checksum
sha256sum --check backup.dump.gpg.sha256 > checksum.stdout 2> checksum.stderr

stage=isolated_postgres
export POSTGRES_PASSWORD
POSTGRES_PASSWORD=$(openssl rand -hex 32)
container="kortek-restore-$(cat /proc/sys/kernel/random/uuid)"
podman run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD docker.io/library/postgres:17 > /dev/null 2> postgres.stderr
for attempt in $(seq 1 30); do
  if podman exec "$container" pg_isready -U postgres -d postgres > /dev/null 2>&1; then break; fi
  sleep 1
done
podman exec "$container" pg_isready -U postgres -d postgres > /dev/null 2> readiness.stderr
podman exec "$container" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 \
  -q -c 'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public' > /dev/null 2> extension.stderr

stage=archive_listing
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file "$credentials_dir/encryption-passphrase" \
  --decrypt backup.dump.gpg 2> list-decrypt.stderr \
  | podman run --rm -i --network none docker.io/library/postgres:17 pg_restore -l \
    > restore.list 2> list-restore.stderr
stage=archive_schema
grep -q ' SCHEMA - public ' restore.list
sed -i '/ SCHEMA - public /s/^/;/' restore.list
podman cp restore.list "$container:/tmp/restore.list" 2> copy.stderr
stage=restore
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
  > counts.txt 2> counts.stderr <<'SQL'
SELECT format('SELECT %L || ''|'' || count(*) FROM public.%I', tablename, tablename)
FROM pg_tables WHERE schemaname='public' ORDER BY tablename
\gexec
SQL
# A rolled-back attempt is historical; an unfinished, non-rolled-back one is not.
podman exec -i "$container" psql -U postgres -d postgres -X -Atq -v ON_ERROR_STOP=1 \
  > ledger.txt 2> ledger.stderr <<'SQL'
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL),
       count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)
FROM public._prisma_migrations;
SQL
code=verification_failed
python3 - restore.list counts.txt ledger.txt <<'PY'
import pathlib, re, sys

def fail():
    raise SystemExit('RESTORE_VERIFICATION_FAILED')

try:
    # Prisma identifiers are deliberately restricted; fail closed on other TABLE entries.
    expected = []
    for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
        if re.match(r'^\d+; \d+ \d+ TABLE (?!DATA )', line):
            match = re.fullmatch(r'\d+; \d+ \d+ TABLE public ([A-Za-z_][A-Za-z_0-9]*) \S+', line)
            if not match:
                fail()
            expected.append(match[1])
    counts = {}
    for line in pathlib.Path(sys.argv[2]).read_text().splitlines():
        match = re.fullmatch(r'([A-Za-z_][A-Za-z_0-9]*)\|([0-9]+)', line)
        if not match or match[1] in counts:
            fail()
        counts[match[1]] = int(match[2])
    # Minimum public schema at migration 26, plus exact coverage of the archive TOC.
    baseline = set("""Organization MediaAsset MediaGalleryOrder MediaPromotion MediaPurgeJob
        MediaOperation CmsPage CmsOperation User Membership TeamInvitation Professional
        ProfessionalWeeklySchedule ProfessionalAvailabilityBlock GalleryImage Client Service
        Booking Payment ProfessionalService Notification BookingEmailPreference BookingEmailEvent
        EmailOutbox EmailWebhookReceipt EmailAbuseBucket EmailChannelControl AuditLog Invoice
        SecurityRateBucket _prisma_migrations""".split())
    if len(expected) != len(set(expected)) or set(expected) != set(counts):
        fail()
    if not baseline <= set(counts):
        fail()
    ledger = re.fullmatch(r'([0-9]+)\|([0-9]+)\s*', pathlib.Path(sys.argv[3]).read_text())
    if not ledger or int(ledger[1]) < 26 or int(ledger[2]) != 0:
        fail()
except (OSError, ValueError):
    fail()
PY
tables=$(wc -l < counts.txt)
migrations=$(grep '^_prisma_migrations|' counts.txt | cut -d '|' -f 2)
bookings=$(grep '^Booking|' counts.txt | cut -d '|' -f 2)
code=command_failed
stage=record_success
if [[ -n "${STATE_DIRECTORY:-}" ]]; then
  install -m 0600 counts.txt "$workdir/verified-counts.txt"
  mv -f "$workdir/verified-counts.txt" "$STATE_DIRECTORY/latest-restore-counts.txt"
fi
stage=complete
code=ok
printf 'RESTORE_DRILL_OK object=%s tables=%s migration_rows=%s bookings=%s sha256=%s\n' \
  "$name" "$tables" "$migrations" "$bookings" \
  "$(cut -d ' ' -f 1 backup.dump.gpg.sha256)"
