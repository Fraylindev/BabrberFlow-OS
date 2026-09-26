import importlib.util
import json
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('collector', pathlib.Path(__file__).with_name('collect-errors.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


def event(status=500, **changes):
    payload = dict(event='HTTP_REQUEST', timestamp='2026-09-26T00:00:00Z',
        requestId='a1b2', environment='production', release='6c3caa0', route='/bookings/:id',
        method='GET', status=status, durationMs=120, errorClass='UnexpectedError')
    payload.update(changes)
    return json.dumps(payload)


class CollectorTest(unittest.TestCase):
    def test_fixed_codes_and_safe_http(self):
        result = collector.aggregate(['EMAIL_WORKER_CYCLE_FAILED',
            'BACKUP_FAILED stage=encrypted_upload status=1',
            'RESTORE_DRILL_FAILED stage=restore status=1', event(), event(429)])
        self.assertEqual(result['operational_errors_5m'], 3)
        self.assertEqual(result['http_requests_5m'], 2)
        self.assertEqual(result['http_5xx_5m'], 1)
        self.assertEqual(result['http_429_5m'], 1)
        self.assertEqual(result['http_p95_ms_5m'], 120)

    def test_rejects_raw_private_data_and_extra_fields(self):
        marker = 'PRIVATE_password_email_token_notes_signed_url'
        result = collector.aggregate([marker, event(password=marker),
            'BACKUP_FAILED stage=' + marker + ' status=1', '{malformed',
            event(durationMs=float('nan'))])
        self.assertEqual(sum(result.values()), 0)
        self.assertNotIn(marker, json.dumps(result))

    def test_environment_is_separate(self):
        self.assertEqual(collector.aggregate([event(environment='staging')])['http_requests_5m'], 0)

    def test_supervisor_failure_does_not_require_the_process_to_log(self):
        result = collector.aggregate(['kortek-email-worker.service: Main process exited, code=exited, status=137/n/a',
            'other.service: Main process exited, code=exited, status=1/FAILURE'])
        self.assertEqual(result['supervisor_errors_5m'], 1)
        self.assertEqual(result['operational_errors_5m'], 1)


if __name__ == '__main__':
    unittest.main()
