"""Local contract tests: synthetic credentials and fake Podman, never a service/DB.

Run with Python 3; --bash selects Bash (Git Bash on Windows is supported).
Only aggregate results may be exported with --output. Temporary fixtures are removed.
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
MAIL = ['NOTIFICATIONS_EMAIL_FROM', 'NOTIFICATIONS_EMAIL_REPLY_TO',
        'NOTIFICATIONS_ABUSE_SECRET', 'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET']
FLAGS = ['NOTIFICATIONS_EMAIL_ENABLED', 'NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED']
API_IMAGE = 'sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775'
WORKER_IMAGE = 'sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f'
RELEASE = '8e1501e89a132e1b01d3633b1b3f896a8cbe5800'
BASELINE_HASH = '7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bash', default=(r'C:\Program Files\Git\bin\bash.exe'
                                          if os.name == 'nt' else shutil.which('bash')))
    parser.add_argument('--output', type=pathlib.Path)
    args = parser.parse_args()
    assert args.bash, 'BASH_REQUIRED'
    results = []

    def passed(name):
        results.append({'case': name, 'passed': True})

    # Remove precisely five added lines, compare original bytes, not normalized text.
    actual = (HERE / 'api-run.sh').read_bytes()
    baseline = actual
    for name in MAIL:
        line = ('  -e ' + name + ' \\\n').encode()
        assert baseline.count(line) == 1, 'MAIL_ADDITION_NOT_EXACT'
        baseline = baseline.replace(line, b'', 1)
    capture = json.loads((ROOT / 'docs/quality/evidence/prod-p10ca/before.json').read_text())
    captured = capture['files']['/usr/local/libexec/kortek-api-run.sh']['content'].encode()
    assert baseline == captured and hashlib.sha256(baseline).hexdigest() == BASELINE_HASH
    passed('API minus five lines equals installed P7 bytes and SHA256')
    for name in ['api-run.sh', 'worker-run.sh']:
        subprocess.run([args.bash, '-n', str(HERE / name)], check=True, capture_output=True)
        passed('bash -n ' + name)
    unit_lines = (HERE / 'kortek-email-worker.service').read_text().splitlines()
    worker_overrides = dict(line[len('Environment='):].split('=', 1)
                            for line in unit_lines
                            if line.startswith('Environment=KORTEK_WORKER_'))
    assert worker_overrides == {'KORTEK_WORKER_IMAGE_OVERRIDE': WORKER_IMAGE,
                                'KORTEK_WORKER_RELEASE_OVERRIDE': RELEASE}
    assert [line for line in unit_lines if line.startswith('LoadCredential=')] == [
        'LoadCredential=database-url:/etc/kortek-worker/database-url',
        'LoadCredential=runtime-env:/etc/kortek-api/runtime-env']
    assert 'ExecStart=/usr/local/libexec/kortek-worker-run.sh' in unit_lines
    passed('unit immutable selection, both credential paths and ExecStart')

    temporary_parent = ROOT / '.tmp/p10cb1-tests'
    temporary_parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=temporary_parent) as directory:
        root = pathlib.Path(directory)
        assert root.resolve().is_relative_to(temporary_parent.resolve())
        root.chmod(0o700)
        runtime = root / 'runtime-env'
        database = root / 'database-url'
        argv_file = root / 'argv'
        env_file = root / 'env'
        observed_names = ['NODE_ENV', 'DEPLOY_ENV', 'APP_RELEASE', 'DATABASE_URL', *FLAGS, *MAIL]
        mock = root / 'podman'
        mock.write_text('#!/usr/bin/env bash\nset -Eeuo pipefail\n'
                        'printf "%s\\0" "$@" > "$CAPTURE_ARGV"\n'
                        'for name in ' + ' '.join(observed_names) + '; do\n'
                        '  printf "%s\\0%s\\0" "$name" "${!name-}"\n'
                        'done > "$CAPTURE_ENV"\n', newline='\n')
        mock.chmod(0o755)
        # Harmless unique sentinels, no dotenv or real credential is ever read.
        fake_mail = {name: 'synthetic-only-' + name.lower() for name in MAIL}
        worker_db = 'synthetic-worker-database-pool-two'

        def execute(wrapper, overrides, flags='false', changes=None, empty_db=False,
                    missing_db=False, poison=False):
            values = dict(NODE_ENV='production', DEPLOY_ENV='production',
                          WEB_PUBLIC_ORIGIN='https://booking.kortek.cloud',
                          API_PUBLIC_ORIGIN='https://api.booking.kortek.cloud',
                          KORTEK_API_IMAGE='synthetic-old-api-image',
                          APP_RELEASE='synthetic-old-release',
                          DATABASE_URL='synthetic-api-database-pool-four',
                          **fake_mail, **{name: flags for name in FLAGS})
            if changes:
                values.update(changes)
            if poison:
                values.update(KORTEK_API_IMAGE_OVERRIDE='synthetic-poison-api-image',
                              APP_RELEASE_OVERRIDE='synthetic-poison-api-release',
                              KORTEK_WORKER_IMAGE_OVERRIDE='synthetic-poison-worker-image',
                              KORTEK_WORKER_RELEASE_OVERRIDE='synthetic-poison-worker-release')
            import shlex
            runtime.write_text(''.join(k + '=' + shlex.quote(v) + '\n'
                                       for k, v in values.items()), newline='\n')
            database.write_text(('' if empty_db else worker_db + '\n'), newline='\n')
            if missing_db:
                database.unlink()
            before = hashlib.sha256(runtime.read_bytes()).hexdigest()
            db_before = database.read_bytes() if database.exists() else None
            argv_file.unlink(missing_ok=True)
            env_file.unlink(missing_ok=True)
            # Deliberately clean environment: do not inherit application credentials.
            env = {k: v for k, v in os.environ.items()
                   if k in ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'HOME']}
            env.update(overrides, CREDENTIALS_DIRECTORY=root.as_posix(),
                       CAPTURE_ARGV=argv_file.as_posix(), CAPTURE_ENV=env_file.as_posix())
            env['PATH'] = root.as_posix() + os.pathsep + env.get('PATH', '')
            run = subprocess.run([args.bash, str(HERE / wrapper)], env=env,
                                 capture_output=True)
            assert hashlib.sha256(runtime.read_bytes()).hexdigest() == before
            assert (database.read_bytes() if database.exists() else None) == db_before
            assert not run.stdout, 'WRAPPER_STDOUT'
            assert all(v.encode() not in run.stderr for v in fake_mail.values())
            return run, values

        def check_success(wrapper, overrides, flags, expected_image, expected_release,
                          poison=False):
            run, values = execute(wrapper, overrides, flags, poison=poison)
            assert run.returncode == 0 and not run.stderr, 'WRAPPER_FAILED'
            argv = argv_file.read_bytes().split(b'\0')[:-1]
            fields = env_file.read_bytes().split(b'\0')[:-1]
            effective = dict(zip(fields[::2], fields[1::2]))
            for name in MAIL + FLAGS:
                pair = [b'-e', name.encode()]
                assert sum(argv[i:i + 2] == pair for i in range(len(argv) - 1)) == 1
                assert not any(arg.startswith(name.encode() + b'=') for arg in argv)
                assert effective[name.encode()] == values[name].encode()
            # No mail value, flag, DB credential or release is supplied in argv.
            # The selected image is necessarily the final public Podman argument.
            for value in [*fake_mail.values(), flags, values['DATABASE_URL'], worker_db,
                          values['APP_RELEASE']]:
                assert all(value.encode() not in arg for arg in argv)
            assert argv[-1] == expected_image.encode()
            assert effective[b'APP_RELEASE'] == expected_release.encode()
            if wrapper == 'worker-run.sh':
                assert effective[b'DATABASE_URL'] == worker_db.encode()
                for name in ['NODE_ENV', 'DEPLOY_ENV', 'APP_RELEASE', 'DATABASE_URL']:
                    assert [b'-e', name.encode()] in [argv[i:i + 2] for i in range(len(argv)-1)]
            else:
                assert effective[b'DATABASE_URL'] == values['DATABASE_URL'].encode()
                # All original P7 Podman arguments are identical after removing mail pairs.
                filtered = list(argv)
                for name in MAIL:
                    i = filtered.index(name.encode())
                    assert filtered[i-1] == b'-e'
                    del filtered[i-1:i+1]
                original = root / 'original-api.sh'
                original.write_bytes(baseline)
                saved = argv_file.read_bytes()
                env = {k: v for k, v in os.environ.items()
                       if k in ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'HOME']}
                env.update(overrides, CREDENTIALS_DIRECTORY=root.as_posix(),
                           CAPTURE_ARGV=argv_file.as_posix(), CAPTURE_ENV=env_file.as_posix())
                env['PATH'] = root.as_posix() + os.pathsep + env['PATH']
                check = subprocess.run([args.bash, str(original)], env=env, capture_output=True)
                assert check.returncode == 0 and not check.stdout and not check.stderr
                assert argv_file.read_bytes().split(b'\0')[:-1] == filtered
                argv_file.write_bytes(saved)
            passed(wrapper + ' flags=' + flags + (' poisoned source' if poison else ''))

        api_overrides = {'KORTEK_API_IMAGE_OVERRIDE': API_IMAGE, 'APP_RELEASE_OVERRIDE': RELEASE}
        for flags in ['false', 'true']:
            check_success('api-run.sh', api_overrides, flags, API_IMAGE, RELEASE)
            check_success('api-run.sh', {}, flags, 'synthetic-old-api-image', 'synthetic-old-release')
            check_success('worker-run.sh', worker_overrides, flags, WORKER_IMAGE, RELEASE)
        check_success('api-run.sh', api_overrides, 'false', API_IMAGE, RELEASE, poison=True)
        check_success('worker-run.sh', worker_overrides, 'true', WORKER_IMAGE, RELEASE, poison=True)

        for wrapper, good, image_key, release_key in [
            ('api-run.sh', api_overrides, 'KORTEK_API_IMAGE_OVERRIDE', 'APP_RELEASE_OVERRIDE'),
            ('worker-run.sh', worker_overrides, 'KORTEK_WORKER_IMAGE_OVERRIDE', 'KORTEK_WORKER_RELEASE_OVERRIDE'),
        ]:
            invalid = [{image_key: good[image_key]}, {release_key: good[release_key]},
                       {image_key: '', release_key: ''},
                       {**good, image_key: 'synthetic-other-image'},
                       {**good, release_key: 'synthetic-other-release'},
                       {**good, image_key: good[image_key] + ' '},
                       {**good, release_key: good[release_key] + '\n'}]
            if wrapper == 'worker-run.sh':
                invalid.append({})
            for index, overrides in enumerate(invalid):
                run, _ = execute(wrapper, overrides)
                assert run.returncode == 64 and not argv_file.exists()
                code = 'KORTEK_API_SELECTOR_INVALID' if wrapper == 'api-run.sh' else 'KORTEK_WORKER_SELECTOR_INVALID'
                assert run.stderr == (code + '\n').encode()
                passed(wrapper + ' invalid selector ' + str(index + 1))

        invalid_envs = [{'DEPLOY_ENV': 'staging'}, {'DEPLOY_ENV': ''},
                        {'DEPLOY_ENV': 'development'}, {'NODE_ENV': 'development'},
                        {'WEB_PUBLIC_ORIGIN': 'https://qa.booking.kortek.cloud'},
                        {'API_PUBLIC_ORIGIN': 'https://api.staging.booking.kortek.cloud'},
                        {'WEB_PUBLIC_ORIGIN': ''}, {'API_PUBLIC_ORIGIN': ''}]
        for index, changes in enumerate(invalid_envs):
            run, _ = execute('worker-run.sh', worker_overrides, changes=changes)
            assert run.returncode == 64 and not argv_file.exists()
            assert run.stderr == b'KORTEK_WORKER_ENV_INVALID\n'
            passed('worker rejects QA/invalid environment ' + str(index + 1))
        run, _ = execute('worker-run.sh', worker_overrides, empty_db=True)
        assert run.returncode == 64 and not argv_file.exists()
        assert run.stderr == b'KORTEK_WORKER_ENV_INVALID\n'
        passed('worker rejects empty dedicated database credential')
        run, _ = execute('worker-run.sh', worker_overrides, missing_db=True)
        assert run.returncode != 0 and not argv_file.exists() and not run.stderr
        passed('worker rejects missing dedicated database credential')
    assert not root.exists(), 'FIXTURE_CLEANUP_FAILED'
    passed('temporary synthetic fixtures removed')
    result = {'passed': True, 'cases': results, 'count': len(results),
              'baseline_api_sha256': BASELINE_HASH,
              'files_sha256': {name: hashlib.sha256((HERE/name).read_bytes()).hexdigest()
                               for name in ['api-run.sh', 'worker-run.sh', 'kortek-email-worker.service']},
              'real_podman': False, 'database_access': False, 'remote_access': False}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print('PASS: ' + str(len(results)) + ' cases; fake Podman; synthetic fixtures removed')


if __name__ == '__main__':
    main()
