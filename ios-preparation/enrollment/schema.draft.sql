-- Isolated draft, requires existing-schema.fixture.sql + apple-purchases.schema.draft.sql.
-- NOT deployed to D1.
CREATE TABLE ios_enrollment_challenges (
 id TEXT PRIMARY KEY, installation_id TEXT NOT NULL UNIQUE, bundle_id TEXT NOT NULL, app_id TEXT NOT NULL,
 identity_environment TEXT NOT NULL CHECK(identity_environment IN ('Sandbox','Production')),
 apple_environment TEXT NOT NULL CHECK(apple_environment IN ('Sandbox','Production')),
 attest_environment TEXT NOT NULL CHECK(attest_environment IN ('development','production')),
 nonce_hash TEXT NOT NULL, expires_at_ms INTEGER NOT NULL, consumed_at_ms INTEGER,
 CHECK(identity_environment!='Production' OR (apple_environment='Production' AND attest_environment='production'))
);
CREATE TABLE ios_native_credentials (
 installation_id TEXT PRIMARY KEY REFERENCES app_installations(id) ON DELETE CASCADE,
 bundle_id TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('Sandbox','Production')),
 token_hash TEXT NOT NULL CHECK(length(token_hash)=64), revoked_at_ms INTEGER
);
CREATE TABLE ios_appattest_keys (
 key_id TEXT PRIMARY KEY, installation_id TEXT NOT NULL UNIQUE REFERENCES app_installations(id) ON DELETE CASCADE,
 app_id TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('development','production')),
 public_key_pem TEXT NOT NULL, counter INTEGER NOT NULL CHECK(counter>=0)
);
CREATE TABLE ios_recovery_challenges (
 id TEXT PRIMARY KEY, key_id TEXT NOT NULL REFERENCES ios_appattest_keys(key_id) ON DELETE CASCADE,
 installation_id TEXT NOT NULL REFERENCES app_installations(id) ON DELETE CASCADE,
 nonce_hash TEXT NOT NULL, base_counter INTEGER NOT NULL, base_token_hash TEXT NOT NULL,
 expires_at_ms INTEGER NOT NULL, consumed_at_ms INTEGER
);
