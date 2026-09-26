"""Restore an encrypted production artifact using an independently held key.

Requires local Docker and GPG; no provider credentials or network DB connection.
BACKUP_RECOVERY_PASSPHRASE is removed before starting any child process.
"""

import argparse
import hashlib
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
import uuid


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--checksum", type=Path, required=True)
    parser.add_argument("--counts", type=Path, required=True)
    parser.add_argument("--gpg", required=True)
    args = parser.parse_args()
    phrase = os.environ.pop("BACKUP_RECOVERY_PASSPHRASE", "")
    container = "kortek-local-recovery-" + str(uuid.uuid4())
    started = False
    stage = "inputs"
    begin = time.monotonic()

    def run(command, **kwargs):
        return subprocess.run(command, check=True, timeout=60,
                              stderr=subprocess.DEVNULL, **kwargs)

    def docker_exec(*command):
        return run(["docker", "exec", container, *command],
                   stdout=subprocess.PIPE).stdout

    try:
        if len(phrase) < 32:
            raise ValueError("key required")
        archive = args.archive.resolve(strict=True)
        expected_sha = args.checksum.read_text().split()[0]
        if hashlib.sha256(archive.read_bytes()).hexdigest() != expected_sha:
            raise ValueError("checksum mismatch")
        expected_counts = dict(line.split("|", 1) for line in
                               args.counts.read_text().splitlines() if line)
        if len(expected_counts) != 31:
            raise ValueError("reference incomplete")

        with tempfile.TemporaryDirectory(prefix="kortek-local-recovery-") as work:
            # GPG stdout is connected directly to pg_restore as a binary pipe.
            # No decrypted dump or phrase is written to local files.
            def decrypt_to_restore(extra, stdout):
                decrypt = subprocess.Popen([
                    args.gpg, "--homedir", work, "--batch", "--yes",
                    "--pinentry-mode", "loopback", "--passphrase-fd", "0",
                    "--decrypt", str(archive),
                ], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL)
                restore = None
                try:
                    restore = subprocess.Popen(extra, stdin=decrypt.stdout,
                                               stdout=stdout,
                                               stderr=subprocess.DEVNULL)
                    decrypt.stdout.close()
                    decrypt.stdin.write((phrase + "\n").encode())
                    decrypt.stdin.close()
                    restore_code = restore.wait(timeout=60)
                    decrypt_code = decrypt.wait(timeout=60)
                    if restore_code or decrypt_code:
                        raise ValueError("pipeline failed")
                finally:
                    for process in (restore, decrypt):
                        if process is not None and process.poll() is None:
                            process.kill()
                            process.wait()

            stage = "isolated_postgres"
            child_env = {**os.environ, "POSTGRES_PASSWORD": secrets.token_hex(32)}
            run(["docker", "run", "--rm", "-d", "--network", "none",
                 "--name", container, "--label", "kortek.delivery=base-c1",
                 "--tmpfs", "/var/lib/postgresql/data:rw,size=256m",
                 "-e", "POSTGRES_PASSWORD", "postgres:17"],
                env=child_env, stdout=subprocess.DEVNULL)
            started = True
            for _ in range(30):
                ready = subprocess.run([
                    "docker", "exec", container, "pg_isready", "-U", "postgres",
                    "-d", "postgres"], stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL, timeout=10)
                if ready.returncode == 0:
                    break
                time.sleep(1)
            else:
                raise ValueError("postgres unavailable")
            docker_exec("psql", "-U", "postgres", "-d", "postgres", "-X",
                        "-v", "ON_ERROR_STOP=1", "-qc",
                        "CREATE EXTENSION btree_gist WITH SCHEMA public")

            stage = "archive_list"
            toc = Path(work) / "restore.list"
            with toc.open("wb") as output:
                decrypt_to_restore(["docker", "exec", "-i", container,
                                    "pg_restore", "-l"], output)
            entries = toc.read_text()
            if " SCHEMA - public " not in entries:
                raise ValueError("unexpected schema")
            toc.write_text("\n".join(";" + line if " SCHEMA - public " in line
                                     else line for line in entries.splitlines())
                           + "\n")
            run(["docker", "cp", str(toc), container + ":/tmp/restore.list"],
                stdout=subprocess.DEVNULL)
            stage = "restore"
            decrypt_to_restore([
                "docker", "exec", "-i", container, "pg_restore", "-L",
                "/tmp/restore.list", "--exit-on-error", "--single-transaction",
                "--no-owner", "--no-acl", "-U", "postgres", "-d", "postgres",
            ], subprocess.DEVNULL)

            stage = "verification"
            sql = r"""
SELECT format('SELECT %L || ''|'' || count(*) FROM public.%I', tablename, tablename)
FROM pg_tables WHERE schemaname='public' ORDER BY tablename
\gexec
"""
            result = run(["docker", "exec", "-i", container, "psql", "-U",
                          "postgres", "-d", "postgres", "-X", "-Atq",
                          "-v", "ON_ERROR_STOP=1"], input=sql.encode(),
                         stdout=subprocess.PIPE).stdout.decode()
            actual = dict(line.split("|", 1) for line in result.splitlines() if line)
            if actual != expected_counts:
                raise ValueError("table counts differ")
            finished = docker_exec(
                "psql", "-U", "postgres", "-d", "postgres", "-X", "-Atqc",
                'SELECT count(*) FROM public."_prisma_migrations" '
                'WHERE finished_at IS NOT NULL').decode().strip()
            if finished != "26":
                raise ValueError("migration ledger differs")
            print("LOCAL_RECOVERY_OK tables=31 matched=31 finished_migrations=26 "
                  f"sha256={expected_sha} duration_seconds={time.monotonic()-begin:.1f}")
    except Exception:
        print(f"LOCAL_RECOVERY_FAILED stage={stage}", file=sys.stderr)
        return 1
    finally:
        phrase = ""
        if started:
            cleanup = subprocess.run(["docker", "stop", "--time", "10", container],
                                     stdout=subprocess.DEVNULL,
                                     stderr=subprocess.DEVNULL, timeout=30)
            if cleanup.returncode:
                print("LOCAL_RECOVERY_CLEANUP_FAILED", file=sys.stderr)
                return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
