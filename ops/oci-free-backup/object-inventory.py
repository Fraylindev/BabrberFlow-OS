"""Cache numeric bucket inventory hourly, without retaining object names."""
import datetime
import json
import math
import os
import pathlib
import sys
import tempfile
import time

FIELDS = {'version', 'collected_at', 'newest_backup_at', 'bucket_bytes'}


def snapshot(objects, now):
    backups = []
    size = 0
    for item in objects:
        amount = item['size']
        if type(amount) is not int or amount < 0:
            raise ValueError('Invalid inventory')
        size += amount
        if item['name'].endswith('.dump.gpg'):
            created = datetime.datetime.fromisoformat(item['time-created'].replace('Z', '+00:00'))
            if created.tzinfo is None:
                raise ValueError('Invalid inventory')
            backups.append(created.timestamp())
    result = dict(version=1, collected_at=now,
        newest_backup_at=max(backups) if backups else None, bucket_bytes=size)
    validate(result, now)
    return result


def validate(value, now):
    if set(value) != FIELDS or value['version'] != 1:
        raise ValueError('Invalid inventory')
    if type(value['bucket_bytes']) is not int or value['bucket_bytes'] < 0:
        raise ValueError('Invalid inventory')
    for field in ('collected_at', 'newest_backup_at'):
        number = value[field]
        if field == 'newest_backup_at' and number is None:
            continue
        if type(number) not in (int, float) or not math.isfinite(number) or number < 0 or number > now + 300:
            raise ValueError('Invalid inventory')
    return value


def load(path, now):
    return validate(json.loads(path.read_text()), now)


def needs_refresh(path, now):
    try:
        return now - load(path, now)['collected_at'] >= 3600
    except (OSError, ValueError, TypeError, KeyError):
        return True


def store(path, value):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, delete=False) as handle:
            temporary = pathlib.Path(handle.name)
            json.dump(value, handle, allow_nan=False)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def metrics(value, now):
    validate(value, now)
    backup = value['newest_backup_at']
    age = max(0, now - backup) / 3600 if backup is not None else 999.0
    return round(age, 2), value['bucket_bytes']


if __name__ == '__main__':
    try:
        mode, filename = sys.argv[1:]
        path = pathlib.Path(filename)
        now = time.time()
        if mode == '--needs-refresh':
            sys.exit(0 if needs_refresh(path, now) else 1)
        elif mode == '--store':
            store(path, snapshot(json.load(sys.stdin)['data'], now))
        elif mode == '--metrics':
            print(*metrics(load(path, now), now))
        else:
            raise ValueError('Invalid inventory mode')
    except (OSError, ValueError, TypeError, KeyError):
        print('OBJECT_INVENTORY_INVALID', file=sys.stderr)
        sys.exit(1)
