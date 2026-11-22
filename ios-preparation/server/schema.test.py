"""Draft schema constraint checks on SQLite fixtures, NOT a live D1 migration."""
import pathlib
import json
import sqlite3
import unittest


class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        # Observed D1 schema transcribed from the supplied screenshots.
        self.db.executescript(pathlib.Path(__file__).with_name('existing-schema.fixture.sql').read_text())
        self.db.executescript('''
          INSERT INTO app_installations(id,token_hash) VALUES ('phone-1','hash-1'),('phone-2','hash-2');
          INSERT INTO favorite_names(installation_id,name,name_day) VALUES
            ('phone-1','Fixture One','01.01.'),('phone-2','Fixture Two','02.01.');
          INSERT INTO birthdays(id,installation_id,name,day,month,year) VALUES
            ('birthday-1','phone-1','Fixture Person One',1,1,1980),
            ('birthday-2','phone-2','Fixture Person Two',2,1,1981);
          INSERT INTO push_subscriptions(id,endpoint,p256dh,auth,installation_id) VALUES
            (101,'https://example.invalid/one','test-key','test-auth','phone-1'),
            (102,'https://example.invalid/two','test-key','test-auth','phone-2');
          INSERT INTO reminder_settings(subscription_id,enabled) VALUES(101,1),(102,1);
          INSERT INTO reminder_delivery_log(subscription_id,reminder_date,reminder_type) VALUES
            (101,'2026-11-22','morning'),(102,'2026-11-22','morning');
          INSERT INTO birthday_delivery_log(subscription_id,reminder_date,reminder_type) VALUES
            (101,'2026-11-22','morning'),(102,'2026-11-22','morning');
        ''')
        self.existing_tables = [row[0] for row in self.db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        self.original_schema = self.db.execute(
            "SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").fetchall()
        self.original_rows = {name: self.db.execute(f'SELECT * FROM {name} ORDER BY 1').fetchall()
                              for name in self.existing_tables}
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

    def delete_like_worker(self, phone='phone-1'):
        statements = json.loads(pathlib.Path(__file__).with_name('legacy-deletion-batch.fixture.json').read_text())['statements']
        self.db.commit()
        # SQLite transaction simulation of D1's atomic batch, using the supplied Worker SQL.
        with self.db:
            for index, sql in enumerate(statements):
                self.db.execute(sql, (phone, 'deletion-hash') if index == 0 else (phone,))

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
        self.delete_like_worker()
        self.assertEqual(self.db.execute('SELECT installation_id FROM apple_installation_links').fetchall(), [('phone-2',)])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM apple_app_purchases WHERE environment='Production'").fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM apple_renewal_transactions').fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT installation_id FROM favorite_names').fetchall(), [('phone-2',)])
        self.assertEqual(self.db.execute('SELECT installation_id FROM birthdays').fetchall(), [('phone-2',)])
        for name in ['reminder_settings','reminder_delivery_log','birthday_delivery_log']:
            self.assertEqual(self.db.execute(f'SELECT subscription_id FROM {name}').fetchall(), [(102,)])
        self.assertEqual(self.db.execute('SELECT installation_id FROM installation_deletion_receipts').fetchall(), [('phone-1',)])

    def test_unknown_installation_cannot_claim_link(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.link(phone='unknown')

    def test_unknown_access_state_cannot_be_marked_as_active(self):
        self.db.execute("UPDATE apple_app_purchases SET access_state='unknown'")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM apple_app_purchases WHERE access_state='active'").fetchone()[0], 0)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE apple_app_purchases SET access_state='yes'")

    def test_adding_schema_preserves_existing_personal_records(self):
        for name, rows in self.original_rows.items():
            self.assertEqual(self.db.execute(f'SELECT * FROM {name} ORDER BY 1').fetchall(), rows)
        for kind, name, sql in self.original_schema:
            self.assertEqual(self.db.execute('SELECT sql FROM sqlite_master WHERE type=? AND name=?',
                                            (kind,name)).fetchone()[0], sql)
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_failed_deletion_rolls_back_personal_data_and_purchase_links(self):
        self.link()
        self.db.execute('''CREATE TRIGGER block_fixture_deletion BEFORE DELETE ON app_installations
                           BEGIN SELECT RAISE(ABORT,'simulated storage failure'); END''')
        with self.assertRaises(sqlite3.IntegrityError):
            self.delete_like_worker()
        self.assertEqual(self.db.execute('SELECT installation_id FROM apple_installation_links').fetchall(), [('phone-1',)])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM installation_deletion_receipts').fetchone()[0], 0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM birthdays').fetchone()[0], 2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM favorite_names').fetchone()[0], 2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM push_subscriptions').fetchone()[0], 2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
