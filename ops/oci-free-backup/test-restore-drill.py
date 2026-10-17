"""Offline restore flow regression tests. OCI/Podman are always local doubles.
Run: python -B ops/oci-free-backup/test-restore-drill.py
Optional real disposable PostgreSQL: --pg-bin <PostgreSQL bin directory>.
No .env, operational credentials, existing database, or remote endpoint is read.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent
BASELINE = """Organization MediaAsset MediaGalleryOrder MediaPromotion MediaPurgeJob
MediaOperation CmsPage CmsOperation User Membership TeamInvitation Professional
ProfessionalWeeklySchedule ProfessionalAvailabilityBlock GalleryImage Client Service
Booking Payment ProfessionalService Notification BookingEmailPreference BookingEmailEvent
EmailOutbox EmailWebhookReceipt EmailAbuseBucket EmailChannelControl AuditLog Invoice
SecurityRateBucket _prisma_migrations""".split()
EXTRA = "BusinessSchedule BusinessScheduleDay BusinessScheduleWindow BusinessClosure BusinessScheduleRevision CustomerOperation".split()
BASH = shutil.which('bash') if os.name != 'nt' else 'C:/Program Files/Git/bin/bash.exe'
PG_BIN = None

# This bridge deliberately implements a closed set of commands. It never calls OCI/Podman.
BRIDGE = r'''import json, os, pathlib, shutil, subprocess, sys
root = pathlib.Path(os.environ['RESTORE_TEST_ROOT'])
config = json.loads((root / 'config.json').read_text())
tool, *args = sys.argv[1:]
with (root / 'calls.txt').open('a') as log:
    log.write(tool + ' ' + ' '.join(args) + '\n')
def error():
    print('PRIVATE_SENTINEL must never reach retained diagnostics', file=sys.stderr)
    sys.exit(9)
if tool == 'oci':
    assert args[:2] == ['os', 'object']
    if args[2] == 'list':
        if config.get('failure') == 'listing': error()
        print(json.dumps({'data': [{'name': 'daily/20300101.dump.gpg'}]}))
    elif args[2] == 'get':
        if config.get('failure') == 'download': error()
        name = args[args.index('--file') + 1]
        shutil.copyfile(root / ('input.dump' if name.endswith('.gpg') else 'input.sha256'), name)
    else: raise AssertionError(args)
elif tool == 'gpg':
    if config.get('failure') == 'decrypt': error()
    sys.stdout.buffer.write((root / 'input.dump').read_bytes())
elif tool == 'podman':
    if args[0] == 'stop':
        sys.exit(0)
    if args[0] == 'cp':
        shutil.copyfile(args[1], root / 'restore.list')
        sys.exit(0)
    if args[0] == 'run' and '-d' in args:
        print('disposable-container-double')
        sys.exit(0)
    if 'pg_isready' in args:
        if config.get('failure') == 'readiness': error()
        sys.exit(0)
    if 'pg_restore' in args:
        listing = '-l' in args
        if config.get('failure') == ('archive_listing' if listing else 'restore'): error()
        if os.environ.get('RESTORE_TEST_PG_BIN'):
            cmd = [str(pathlib.Path(os.environ['RESTORE_TEST_PG_BIN']) / 'pg_restore')]
            if listing:
                cmd += ['-l']
            else:
                cmd += ['-L', str(root / 'restore.list'), '--exit-on-error', '--single-transaction',
                        '--no-owner', '--no-acl', '-h', '127.0.0.1', '-p', os.environ['RESTORE_TEST_PORT'],
                        '-U', 'restore_test', '-d', 'restore_target']
            sys.exit(subprocess.run(cmd, input=sys.stdin.buffer.read()).returncode)
        sys.stdin.buffer.read()
        if listing: sys.stdout.write((root / 'toc.txt').read_text())
    elif 'psql' in args:
        if os.environ.get('RESTORE_TEST_PG_BIN'):
            # The extension bootstrap is independently harmless in this local synthetic schema.
            if '-c' in args: sys.exit(0)
            cmd = [str(pathlib.Path(os.environ['RESTORE_TEST_PG_BIN']) / 'psql'),
                   '-h', '127.0.0.1', '-p', os.environ['RESTORE_TEST_PORT'], '-U', 'restore_test',
                   '-d', 'restore_target', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1']
            sys.exit(subprocess.run(cmd, input=sys.stdin.buffer.read()).returncode)
        if '-c' not in args:
            sql = sys.stdin.read()
            if config.get('failure') == 'query': error()
            sys.stdout.write((root / ('ledger.txt' if 'finished_at' in sql else 'counts.txt')).read_text())
    else: raise AssertionError(args)
else: raise AssertionError(tool)
'''


class RestoreFlow(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='kortek-restore-test-')
        self.root = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)
        (self.root / 'bin').mkdir()
        (self.root / 'state').mkdir()
        (self.root / 'credentials').mkdir()
        (self.root / 'credentials/encryption-passphrase').write_text('disposable-only')
        (self.root / 'bridge.py').write_text(BRIDGE)
        for tool in ('oci', 'gpg', 'podman'):
            path = self.root / 'bin' / tool
            path.write_text('#!/bin/bash\nexec "$RESTORE_TEST_PYTHON" "$RESTORE_TEST_BRIDGE" ' + tool + ' "$@"\n', newline='\n')
            path.chmod(0o700)
        (self.root / 'bin/python3').write_text('#!/bin/bash\nexec "$RESTORE_TEST_PYTHON" "$@"\n', newline='\n')
        (self.root / 'bin/python3').chmod(0o700)
        (self.root / 'bin/cat').write_text('#!/bin/bash\nif [[ "$1" == /proc/sys/kernel/random/uuid ]]; then echo 00000000-0000-4000-8000-000000000001; else /usr/bin/cat "$@"; fi\n', newline='\n')
        (self.root / 'bin/cat').chmod(0o700)
        self.env = {k: v for k, v in os.environ.items() if k.upper() not in ('PATH', 'BASH_ENV', 'ENV') and not k.upper().startswith(('PG', 'OCI_', 'DATABASE_', 'CREDENTIALS_', 'STATE_', 'GNUPG', 'RESTORE_TEST_'))}
        self.env.update(PATH=str(self.root / 'bin') + os.pathsep + os.environ['PATH'],
                        RESTORE_TEST_BRIDGE=str(self.root / 'bridge.py'), RESTORE_TEST_ROOT=str(self.root),
                        STATE_DIRECTORY=str(self.root / 'state'), CREDENTIALS_DIRECTORY=str(self.root / 'credentials'),
                        PGPASSFILE=str(self.root / 'no-operational-pgpass'),
                        PGSERVICEFILE=str(self.root / 'no-operational-pgservice'))
        bin_path = (self.root / 'bin').as_posix()
        if os.name == 'nt':
            bin_path = '/' + bin_path[0].lower() + bin_path[2:]
        self.env.update(RESTORE_TEST_BIN=bin_path, RESTORE_TEST_PYTHON=sys.executable)
        self.launch = [BASH, '--noprofile', '--norc', '-c',
                       'export PATH="$RESTORE_TEST_BIN:/usr/bin:/mingw64/bin"; exec /bin/bash "$@"', 'restore-test']
        resolved = subprocess.run(self.launch + ['-c', 'command -v oci; command -v podman; command -v gpg; command -v python3'],
                                  env=self.env, capture_output=True, text=True, timeout=10)
        self.assertEqual(resolved.returncode, 0)
        self.assertEqual(len(resolved.stdout.splitlines()), 4)
        for path in resolved.stdout.splitlines():
            self.assertIn(self.root.name + '/bin/', path.replace('\\', '/'))
        self.script = self.root / 'restore-drill.sh'
        self.script.write_text((ROOT / 'restore-drill.sh').read_text(), newline='\n')

    def fixture(self, extra=False, bookings=0, failure=None, missing=None, ledger='26|0\n'):
        tables = BASELINE + (EXTRA if extra else [])
        counts = {name: (26 if name == '_prisma_migrations' else bookings if name == 'Booking' else 0) for name in tables}
        if missing: counts.pop(missing)
        (self.root / 'config.json').write_text(json.dumps(dict(failure=failure)))
        (self.root / 'toc.txt').write_text('1; 2615 2200 SCHEMA - public postgres\n' + ''.join(
            f'{i+2}; 1259 {i+100} TABLE public {name} postgres\n' for i, name in enumerate(tables)) + ''.join(f'{i+200}; 0 {i+100} TABLE DATA public {name} postgres\n' for i, name in enumerate(tables)))
        (self.root / 'counts.txt').write_text(''.join(f'{name}|{count}\n' for name, count in counts.items()))
        (self.root / 'ledger.txt').write_text(ledger)
        (self.root / 'input.dump').write_bytes(b'disposable archive double')
        self.checksum()

    def checksum(self):
        import hashlib
        digest = hashlib.sha256((self.root / 'input.dump').read_bytes()).hexdigest()
        (self.root / 'input.sha256').write_text(digest + '  backup.dump.gpg\n', newline='\n')

    def run_flow(self, success=True, stage=None):
        marker = self.root / 'state/latest-restore-counts.txt'
        marker.write_text('previous verified success')
        before = marker.stat().st_mtime_ns
        result = subprocess.run(self.launch + [str(self.script)], env=self.env, capture_output=True, text=True, timeout=45)
        diagnostic = (self.root / 'state/latest-restore-result.txt').read_text()
        self.assertNotIn('PRIVATE_SENTINEL', diagnostic + result.stdout + result.stderr)
        self.assertEqual(list((self.root / 'state').glob('kortek-restore.*')), [])
        self.assertEqual(result.returncode == 0, success, result.stderr)
        if success:
            self.assertIn('RESTORE_DRILL_OK', result.stdout)
            self.assertIn('stage=complete', diagnostic)
            self.assertIn('code=ok', diagnostic)
            self.assertNotEqual(marker.read_text(), 'previous verified success')
        else:
            self.assertNotIn('RESTORE_DRILL_OK', result.stdout)
            self.assertIn('RESTORE_DRILL_FAILED', result.stderr)
            self.assertIn('stage=' + stage, diagnostic)
            self.assertEqual(marker.read_text(), 'previous verified success')
            self.assertEqual(marker.stat().st_mtime_ns, before)
        return result

    def test_empty_booking_31_tables(self):
        self.fixture()
        self.run_flow()

    def test_empty_booking_37_tables(self):
        self.fixture(extra=True)
        self.run_flow()

    def test_nonempty_booking(self):
        self.fixture(bookings=25)
        self.run_flow()

    def test_malformed_counts(self):
        self.fixture()
        counts = self.root / 'counts.txt'
        counts.write_text(counts.read_text().replace('Booking|0', 'Booking|-1'))
        self.run_flow(False, 'verification')

    def test_marker_write_failure(self):
        self.fixture()
        install = self.root / 'bin/install'
        install.write_text('#!/bin/bash\nif [[ "$*" == *counts.txt* ]]; then exit 9; fi\nexec /usr/bin/install "$@"\n', newline='\n')
        install.chmod(0o700)
        self.run_flow(False, 'record_success')

    def test_failures_do_not_refresh_success(self):
        for failure, stage in [('listing', 'listing'), ('download', 'download'), ('decrypt', 'archive_listing'),
                               ('archive_listing', 'archive_listing'), ('restore', 'restore'), ('query', 'verification')]:
            with self.subTest(failure=failure):
                self.fixture(failure=failure)
                self.run_flow(False, stage)

    def test_checksum_mismatch(self):
        self.fixture()
        (self.root / 'input.dump').write_bytes(b'corrupt')
        self.run_flow(False, 'checksum')

    def test_table_missing(self):
        self.fixture(missing='Client')
        self.run_flow(False, 'verification')

    def test_missing_baseline_even_when_toc_matches(self):
        self.fixture(missing='Client')
        toc = self.root / 'toc.txt'
        toc.write_text(''.join(line for line in toc.read_text().splitlines(True) if ' TABLE public Client ' not in line))
        self.run_flow(False, 'verification')

    def test_bad_ledger(self):
        for ledger in ('25|0\n', '26|1\n', 'nonsense\n'):
            with self.subTest(ledger=ledger):
                self.fixture(ledger=ledger)
                self.run_flow(False, 'verification')

    def test_duplicate_counts_and_toc(self):
        for filename, entry in [('counts.txt', 'Booking|0\n'), ('toc.txt', '999; 1259 999 TABLE public Booking postgres\n')]:
            self.fixture()
            with (self.root / filename).open('a') as handle: handle.write(entry)
            self.run_flow(False, 'verification')

    def test_real_postgres_dump_restore(self):
        if not PG_BIN:
            self.skipTest('pass --pg-bin for real disposable PostgreSQL')
        # A fresh cluster with loopback only; never use default service ports or application env.
        data = self.root / 'pgdata'
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = str(sock.getsockname()[1])
        def pg(tool, *args, **kwargs):
            # Windows background PostgreSQL can inherit PIPE handles and keep communicate open.
            with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
                result = subprocess.run([str(Path(PG_BIN) / tool), *args], stdout=output, stderr=errors, timeout=45, env=self.env, **kwargs)
                output.seek(0)
                errors.seek(0)
                self.assertEqual(result.returncode, 0, errors.read().decode(errors='replace'))
                return output.read()
        pg('initdb', '-D', str(data), '-U', 'restore_test', '-A', 'trust', '--no-locale', '-E', 'UTF8')
        try:
            pg('pg_ctl', '-D', str(data), '-l', str(self.root / 'postgres.log'), '-o', f'-h 127.0.0.1 -p {port}', '-w', 'start')
            connection = ['-h', '127.0.0.1', '-p', port, '-U', 'restore_test']
            for extra in (False, True):
                with self.subTest(tables=37 if extra else 31):
                    self.fixture(extra=extra)
                    for db in ('restore_source', 'restore_target'):
                        pg('dropdb', *connection, '--if-exists', db)
                        pg('createdb', *connection, db)
                    sql = ''.join(f'CREATE TABLE public."{name}" (id integer);' for name in BASELINE + (EXTRA if extra else []) if name != '_prisma_migrations')
                    sql += 'CREATE TABLE public._prisma_migrations (id integer, finished_at timestamptz, rolled_back_at timestamptz);'
                    sql += 'INSERT INTO public._prisma_migrations SELECT n, now(), NULL FROM generate_series(1,26) n;'
                    pg('psql', *connection, '-d', 'restore_source', '-X', '-v', 'ON_ERROR_STOP=1', '-c', sql)
                    archive = pg('pg_dump', *connection, '-d', 'restore_source', '-Fc', '-n', 'public', '--no-owner', '--no-acl')
                    (self.root / 'input.dump').write_bytes(archive)
                    self.checksum()
                    self.env.update(RESTORE_TEST_PG_BIN=PG_BIN, RESTORE_TEST_PORT=port)
                    self.run_flow()
        finally:
            if (data / 'postmaster.pid').exists():
                pg('pg_ctl', '-D', str(data), '-m', 'immediate', '-w', 'stop')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pg-bin')
    args, remaining = parser.parse_known_args()
    PG_BIN = args.pg_bin
    unittest.main(argv=[sys.argv[0], *remaining])
