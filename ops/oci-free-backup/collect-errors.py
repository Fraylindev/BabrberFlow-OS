#!/usr/bin/env python3
"""Aggregate fixed operational codes and allowlisted HTTP telemetry, never raw logs."""
import argparse
import json
import math
import re
import subprocess
import sys

FIELDS = {'event', 'timestamp', 'requestId', 'environment', 'release', 'route',
          'method', 'status', 'durationMs', 'errorClass'}
CLASSES = {None, 'BadRequestException', 'UnauthorizedException', 'ForbiddenException',
           'NotFoundException', 'ConflictException', 'ServiceUnavailableException',
           'ThrottlerException', 'HttpException', 'UnexpectedError'}


def aggregate(lines, environment='production'):
    counts = dict(worker_errors_5m=0, backup_errors_5m=0, restore_errors_5m=0,
                  supervisor_errors_5m=0,
                  http_requests_5m=0, http_5xx_5m=0, http_429_5m=0, http_p95_ms_5m=0)
    durations = []
    for raw in lines:
        line = raw.strip()
        if line in ('EMAIL_WORKER_CYCLE_FAILED', 'EMAIL_WORKER_START_FAILED'):
            counts['worker_errors_5m'] += 1
        elif re.fullmatch(r'BACKUP_FAILED stage=[a-z_]+ status=[0-9]+', line):
            counts['backup_errors_5m'] += 1
        elif re.fullmatch(r'RESTORE_DRILL_FAILED stage=[a-z_]+ status=[0-9]+', line):
            counts['restore_errors_5m'] += 1
        elif re.fullmatch(r'kortek-(email-worker|backup|restore-drill|api)\.service: Main process exited, code=(exited|killed|dumped), status=[1-9][0-9]*/[A-Za-z0-9/]+', line):
            counts['supervisor_errors_5m'] += 1
        elif line.startswith('{') and len(line) < 2048:
            try:
                event = json.loads(line)
                if not isinstance(event, dict) or set(event) != FIELDS:
                    continue
                if event['event'] != 'HTTP_REQUEST' or event['environment'] != environment:
                    continue
                if event['errorClass'] not in CLASSES:
                    continue
                if not isinstance(event['status'], int) or isinstance(event['status'], bool):
                    continue
                if not 100 <= event['status'] <= 599:
                    continue
                duration = event['durationMs']
                if isinstance(duration, bool) or not isinstance(duration, (int, float)):
                    continue
                if not math.isfinite(duration) or not 0 <= duration <= 3600000:
                    continue
                counts['http_requests_5m'] += 1
                counts['http_5xx_5m'] += int(event['status'] >= 500)
                counts['http_429_5m'] += int(event['status'] == 429)
                durations.append(duration)
            except (ValueError, TypeError):
                continue
    if durations:
        counts['http_p95_ms_5m'] = sorted(durations)[math.ceil(len(durations) * .95) - 1]
    counts['operational_errors_5m'] = sum(counts[key] for key in
        ('worker_errors_5m', 'backup_errors_5m', 'restore_errors_5m', 'supervisor_errors_5m'))
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--stdin', action='store_true')
    parser.add_argument('--environment', choices=['production', 'staging', 'development'],
                        default='production')
    args = parser.parse_args()
    if args.stdin:
        lines = sys.stdin
    else:
        # Restrict sources to supervised Kortek units; no arbitrary user logs.
        result = subprocess.run(['journalctl', '--since', '5 minutes ago', '--no-pager',
            '-o', 'cat', '-u', 'kortek-email-worker.service', '-u', 'kortek-backup.service',
            '-u', 'kortek-restore-drill.service', '-u', 'kortek-api.service'],
            capture_output=True, text=True, timeout=15)
        if result.returncode:
            raise SystemExit('ERROR_COLLECTOR_JOURNAL_UNAVAILABLE')
        lines = result.stdout.splitlines()
    for name, value in aggregate(lines, args.environment).items():
        print(f'{name} {value}')
