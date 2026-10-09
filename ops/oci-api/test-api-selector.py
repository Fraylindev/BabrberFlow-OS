"""Exercise the real wrapper with synthetic credentials and a fake Podman."""
import hashlib, os, pathlib, subprocess, tempfile, shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASH = shutil.which('bash') if os.name != 'nt' else r'C:\Program Files\Git\bin\bash.exe'
WRAPPER = ROOT / 'ops/oci-api/api-run.sh'
IMAGE = 'sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775'
RELEASE = '8e1501e89a132e1b01d3633b1b3f896a8cbe5800'

temporary_root = ROOT / '.tmp/p7/selector-tests'
temporary_root.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(dir=temporary_root) as directory:
    root = pathlib.Path(directory)
    assert root.resolve().is_relative_to(temporary_root.resolve())
    credential = root / 'runtime-env'
    credential.write_text('KORTEK_API_IMAGE=old-image\nAPP_RELEASE=old-release\n'
                          'PUBLIC_BOOKING_CLOSED=true\nNOTIFICATIONS_EMAIL_ENABLED=false\n', newline='\n')
    digest = hashlib.sha256(credential.read_bytes()).hexdigest()
    mock = root / 'podman'
    mock.write_text('#!/usr/bin/env bash\n'
                    'printf "%s\\0" "$APP_RELEASE" "$PUBLIC_BOOKING_CLOSED" '
                    '"$NOTIFICATIONS_EMAIL_ENABLED" "$@"\n', newline='\n')
    mock.chmod(0o755)
    def execute(overrides):
        env = dict(os.environ)
        for name in ['KORTEK_API_IMAGE_OVERRIDE', 'APP_RELEASE_OVERRIDE']:
            env.pop(name, None)
        env.update(overrides)
        env['CREDENTIALS_DIRECTORY'] = root.as_posix()
        env['PATH'] = root.as_posix() + os.pathsep + env['PATH']
        return subprocess.run([BASH, str(WRAPPER)], env=env, capture_output=True)
    subprocess.run([BASH, '-n', str(WRAPPER)], check=True)
    baseline = execute({})
    assert baseline.returncode == 0, baseline.stderr
    baseline_fields = baseline.stdout.split(b'\0')[:-1]
    assert baseline_fields[:3] == [b'old-release', b'true', b'false']
    valid = execute({'KORTEK_API_IMAGE_OVERRIDE': IMAGE, 'APP_RELEASE_OVERRIDE': RELEASE})
    assert valid.returncode == 0, valid.stderr
    fields = valid.stdout.split(b'\0')[:-1]
    assert fields[:3] == [RELEASE.encode(), b'true', b'false']
    assert fields[-1] == IMAGE.encode()
    assert fields[3:-1] == baseline_fields[3:-1], 'Podman controls changed'
    invalid = [
        {'KORTEK_API_IMAGE_OVERRIDE': IMAGE},
        {'APP_RELEASE_OVERRIDE': RELEASE},
        {'KORTEK_API_IMAGE_OVERRIDE': '', 'APP_RELEASE_OVERRIDE': ''},
        {'KORTEK_API_IMAGE_OVERRIDE': 'other-image', 'APP_RELEASE_OVERRIDE': RELEASE},
        {'KORTEK_API_IMAGE_OVERRIDE': IMAGE, 'APP_RELEASE_OVERRIDE': 'other-release'},
        {'KORTEK_API_IMAGE_OVERRIDE': IMAGE + ' ', 'APP_RELEASE_OVERRIDE': RELEASE},
        {'KORTEK_API_IMAGE_OVERRIDE': IMAGE, 'APP_RELEASE_OVERRIDE': RELEASE + '\n'},
    ]
    for case in invalid:
        result = execute(case)
        assert result.returncode == 64 and not result.stdout
        assert result.stderr == b'KORTEK_API_SELECTOR_INVALID\n'
    assert hashlib.sha256(credential.read_bytes()).hexdigest() == digest
    print('PASS: fallback, approved pair, seven rejections, unchanged flags/Podman args/credential')
