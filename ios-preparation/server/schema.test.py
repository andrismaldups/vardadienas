"""Draft schema constraint checks on SQLite fixtures, NOT a live D1 migration."""
import pathlib
import sqlite3
import unittest


class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        # Minimal fixture only: the actual live schema still needs inspection.
        self.db.executescript('''
          CREATE TABLE app_installations(id TEXT PRIMARY KEY, token_hash TEXT);
          CREATE TABLE favorite_names(installation_id TEXT, name TEXT);
          INSERT INTO app_installations VALUES ('phone-1','hash-1'),('phone-2','hash-2');
          INSERT INTO favorite_names VALUES ('phone-1','Andris');
        ''')
        self.db.executescript(pathlib.Path(__file__).with_name('apple-purchases.schema.draft.sql').read_text())
        for env in ['Production', 'Sandbox']:
            self.db.execute('INSERT INTO apple_app_purchases VALUES (?,?,?,?,?,?,?)',
                            (env, 'test.app', 'purchase-1', 1000, 'active', 1100, 1050))

    def tearDown(self):
        self.db.close()

    def renewal(self, env='Production', tx='renew-1', revoked=None, owner='purchase-1'):
        self.db.execute('INSERT INTO apple_renewal_transactions VALUES (?,?,?,?,?,?,?,?,?)',
                        (env, 'test.app', owner, tx, 'push.3years', 2000, revoked, 2200, 2100))

    def link(self, phone='phone-1', owner='purchase-1'):
        self.db.execute('INSERT INTO apple_installation_links VALUES (?,?,?,?,?)',
                        (phone, 'Production', 'test.app', owner, 2300))

    def test_duplicate_transaction_cannot_be_stored_twice(self):
        self.renewal()
        with self.assertRaises(sqlite3.IntegrityError):
            self.renewal()
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM apple_renewal_transactions').fetchone()[0], 1)

    def test_test_and_production_histories_are_separate(self):
        self.renewal()
        self.renewal(env='Sandbox')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM apple_renewal_transactions').fetchone()[0], 2)

    def test_renewal_cannot_reference_missing_app_purchase(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.renewal(owner='other-purchase')

    def test_invalid_revocation_chronology_is_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.renewal(revoked=1999)
        self.renewal(revoked=2001)

    def test_deleting_one_installation_preserves_purchase_and_other_installation(self):
        self.link()
        self.link(phone='phone-2')
        self.renewal()
        self.db.execute("DELETE FROM app_installations WHERE id='phone-1'")
        self.assertEqual(self.db.execute('SELECT installation_id FROM apple_installation_links').fetchall(), [('phone-2',)])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM apple_app_purchases WHERE environment='Production'").fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM apple_renewal_transactions').fetchone()[0], 1)

    def test_unknown_installation_cannot_claim_link(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.link(phone='unknown')

    def test_unknown_access_state_cannot_be_marked_as_active(self):
        self.db.execute("UPDATE apple_app_purchases SET access_state='unknown'")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM apple_app_purchases WHERE access_state='active'").fetchone()[0], 0)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE apple_app_purchases SET access_state='yes'")

    def test_adding_schema_preserves_existing_personal_records(self):
        self.assertEqual(self.db.execute('SELECT * FROM favorite_names').fetchall(), [('phone-1', 'Andris')])
        self.assertEqual(self.db.execute('SELECT * FROM app_installations ORDER BY id').fetchall(),
                         [('phone-1', 'hash-1'), ('phone-2', 'hash-2')])


if __name__ == '__main__':
    unittest.main(verbosity=2)
