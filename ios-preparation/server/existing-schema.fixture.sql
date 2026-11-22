-- Transcribed from user-provided D1 Console screenshots, 22.11.2026.
-- Structure only. No live personal records. Not a production setup script.
CREATE TABLE app_installations (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  installation_id TEXT REFERENCES app_installations(id)
);
CREATE TABLE birthday_delivery_log (
  subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  reminder_date TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('evening','morning')),
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(subscription_id, reminder_date, reminder_type)
);
CREATE TABLE birthdays (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES app_installations(id),
  name TEXT NOT NULL,
  day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 31),
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  year INTEGER CHECK(year BETWEEN 1 AND 9999),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE favorite_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id TEXT NOT NULL, name TEXT NOT NULL, name_day TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(installation_id, name),
  FOREIGN KEY(installation_id) REFERENCES app_installations(id)
);
CREATE TABLE installation_deletion_receipts (
  installation_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE reminder_delivery_log (
  subscription_id INTEGER NOT NULL, reminder_date TEXT NOT NULL, reminder_type TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(subscription_id, reminder_date, reminder_type)
);
CREATE TABLE reminder_settings (
  subscription_id INTEGER PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  evening_enabled INTEGER NOT NULL DEFAULT 0,
  evening_time TEXT NOT NULL DEFAULT '18:00',
  morning_enabled INTEGER NOT NULL DEFAULT 0,
  morning_time TEXT NOT NULL DEFAULT '07:00',
  target TEXT NOT NULL DEFAULT 'favorites',
  birthdays_enabled INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'Europe/Riga',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);
CREATE INDEX idx_birthdays_installation_date ON birthdays(installation_id, month, day);
CREATE INDEX idx_installation_deletion_receipts_expiry ON installation_deletion_receipts(expires_at);
