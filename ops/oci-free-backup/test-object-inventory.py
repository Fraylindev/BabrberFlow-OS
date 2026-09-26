import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', pathlib.Path(__file__).with_name('object-inventory.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NOW = 1790430000


class InventoryTest(unittest.TestCase):
    def test_aggregate_excludes_object_names_and_counts_checksum_storage(self):
        value = module.snapshot([
            {'name': 'PRIVATE/backup.dump.gpg', 'size': 40, 'time-created': '2026-09-26T10:00:00Z'},
            {'name': 'PRIVATE/backup.dump.gpg.sha256', 'size': 60, 'time-created': '2026-09-26T10:01:00Z'},
        ], NOW)
        self.assertEqual(value['bucket_bytes'], 100)
        self.assertNotIn('PRIVATE', json.dumps(value))
        first = module.metrics(value, NOW)[0]
        self.assertEqual(module.metrics(value, NOW + 3600)[0], first + 1)

    def test_empty_bucket_is_not_a_fresh_backup(self):
        self.assertEqual(module.metrics(module.snapshot([], NOW), NOW), (999.0, 0))

    def test_hourly_refresh_with_atomic_state(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'inventory.json'
            self.assertTrue(module.needs_refresh(path, NOW))
            module.store(path, module.snapshot([], NOW))
            self.assertFalse(module.needs_refresh(path, NOW + 3599))
            self.assertTrue(module.needs_refresh(path, NOW + 3600))
            self.assertEqual(len(list(path.parent.iterdir())), 1)

    def test_corrupt_or_clock_invalid_cache_requires_new_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'inventory.json'
            path.write_text('PRIVATE_invalid_json')
            self.assertTrue(module.needs_refresh(path, NOW))
            module.store(path, module.snapshot([], NOW + 400))
            self.assertTrue(module.needs_refresh(path, NOW))

    def test_rejects_invalid_sizes_dates_and_nonfinite_state(self):
        for item in [
            {'name': 'backup.dump.gpg', 'size': -1, 'time-created': '2026-09-26T10:00:00Z'},
            {'name': 'backup.dump.gpg', 'size': 2, 'time-created': 'PRIVATE_invalid_date'},
        ]:
            with self.assertRaises(ValueError):
                module.snapshot([item], NOW)
        with self.assertRaises(ValueError):
            module.metrics(dict(version=1, collected_at=float('nan'),
                newest_backup_at=None, bucket_bytes=0), NOW)


if __name__ == '__main__':
    unittest.main()
