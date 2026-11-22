-- DRAFT ONLY: not deployed. Verify the live D1 schema and deletion behavior first.
-- Millisecond timestamps; only the trusted Apple verifier writes these records.
-- app_installations(id) is an EXISTING table; verify its key/type before applying.
CREATE TABLE apple_app_purchases (
  environment TEXT NOT NULL CHECK (environment IN ('Production', 'Sandbox')),
  bundle_id TEXT NOT NULL,
  app_transaction_id TEXT NOT NULL,
  purchase_date_ms INTEGER NOT NULL CHECK (purchase_date_ms >= 0),
  access_state TEXT NOT NULL CHECK (access_state IN ('active', 'revoked', 'unknown')),
  verified_at_ms INTEGER NOT NULL CHECK (verified_at_ms >= 0),
  signed_at_ms INTEGER NOT NULL CHECK (signed_at_ms >= 0),
  PRIMARY KEY (environment, bundle_id, app_transaction_id)
);

CREATE TABLE apple_renewal_transactions (
  environment TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  app_transaction_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  purchase_date_ms INTEGER NOT NULL CHECK (purchase_date_ms >= 0),
  revoked_at_ms INTEGER CHECK (revoked_at_ms IS NULL OR revoked_at_ms >= purchase_date_ms),
  verified_at_ms INTEGER NOT NULL CHECK (verified_at_ms >= 0),
  signed_at_ms INTEGER NOT NULL CHECK (signed_at_ms >= 0),
  PRIMARY KEY (environment, bundle_id, transaction_id),
  FOREIGN KEY (environment, bundle_id, app_transaction_id)
    REFERENCES apple_app_purchases(environment, bundle_id, app_transaction_id)
);
CREATE INDEX apple_renewal_history ON apple_renewal_transactions
  (environment, bundle_id, app_transaction_id, purchase_date_ms, transaction_id);

CREATE TABLE apple_installation_links (
  installation_id TEXT PRIMARY KEY NOT NULL
    REFERENCES app_installations(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  app_transaction_id TEXT NOT NULL,
  linked_at_ms INTEGER NOT NULL CHECK (linked_at_ms >= 0),
  FOREIGN KEY (environment, bundle_id, app_transaction_id)
    REFERENCES apple_app_purchases(environment, bundle_id, app_transaction_id)
);
CREATE INDEX apple_purchase_installations ON apple_installation_links
  (environment, bundle_id, app_transaction_id);
