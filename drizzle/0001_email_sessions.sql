CREATE TABLE auth_attempts (
 id TEXT PRIMARY KEY NOT NULL,
 email_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 consumed_at TEXT
);
--> statement-breakpoint
CREATE INDEX auth_attempt_expiry ON auth_attempts(expires_at);
--> statement-breakpoint
CREATE TABLE auth_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL,
 revoked_at TEXT
);
--> statement-breakpoint
CREATE INDEX auth_session_user ON auth_sessions(user_id);
--> statement-breakpoint
CREATE TABLE workspace_onboarding (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE auth_rate_limits (
 key TEXT PRIMARY KEY NOT NULL,
 hits INTEGER NOT NULL,
 expires_at TEXT NOT NULL
);
--> statement-breakpoint
