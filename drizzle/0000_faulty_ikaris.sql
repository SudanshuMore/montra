CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`name` text NOT NULL,
	`mask` text,
	`bank` text NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`supported` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_scope` ON `accounts` (`org_id`,`connection_id`,`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_scope` ON `accounts` (`org_id`,`id`);--> statement-breakpoint
CREATE TABLE `allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`document_id` text NOT NULL,
	`amount` text NOT NULL,
	`units` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`revision_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "allocation_positive" CHECK("allocations"."units" > 0)
);
--> statement-breakpoint
CREATE INDEX `allocation_transaction` ON `allocations` (`org_id`,`transaction_id`);--> statement-breakpoint
CREATE INDEX `allocation_document` ON `allocations` (`org_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`resource_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_org_time` ON `audit_events` (`org_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `authorizations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`authorized_by` text NOT NULL,
	`method` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `authorization_connection` ON `authorizations` (`org_id`,`connection_id`);--> statement-breakpoint
CREATE TABLE `balance_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` text NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`source_at` text,
	`retrieved_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `balance_account` ON `balance_snapshots` (`org_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`last_attempt` text,
	`last_success` text,
	`data_through` text,
	`checkpoint` text,
	`generation` integer DEFAULT 0 NOT NULL,
	`scenario` text DEFAULT 'normal' NOT NULL,
	`exception` text,
	`next_scheduled` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connection_scope` ON `connections` (`org_id`,`id`);--> statement-breakpoint
CREATE TABLE `deletion_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`document_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`due_at` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`amount` text NOT NULL,
	`units` integer NOT NULL,
	`currency` text NOT NULL,
	`scan_status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `document_account` ON `documents` (`org_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `download_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`document_id` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`country` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_scope` ON `entities` (`org_id`,`id`);--> statement-breakpoint
CREATE TABLE `account_grants` (
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	PRIMARY KEY(`org_id`, `user_id`, `account_id`),
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`due_at` text NOT NULL,
	`lease_until` text,
	`lease_token` text,
	`checkpoint` text,
	`created_at` text NOT NULL,
	`finished_at` text,
	`error_code` text,
	`pages` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_sync` ON `sync_runs` (`connection_id`) WHERE "sync_runs"."state" in ('queued','retry','running');--> statement-breakpoint
CREATE INDEX `due_jobs` ON `sync_runs` (`org_id`,`state`,`due_at`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`all_accounts` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`org_id`, `user_id`),
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "membership_role" CHECK("memberships"."role" in ('administrator','finance_viewer','evidence_reviewer'))
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`demo` integer DEFAULT 1 NOT NULL,
	`retention_days` integer DEFAULT 365 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`account_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`statement_hash` text NOT NULL,
	`report` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `match_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`allocation_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`decision` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`allocation_id`) REFERENCES `allocations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_allocation` ON `match_reviews` (`org_id`,`allocation_id`);--> statement-breakpoint
CREATE TABLE `source_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`source_id` text NOT NULL,
	`hash` text NOT NULL,
	`payload` text NOT NULL,
	`source_at` text,
	`retrieved_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revision_hash` ON `source_revisions` (`org_id`,`source_id`,`hash`);--> statement-breakpoint
CREATE TABLE `source_records` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_identity` ON `source_records` (`org_id`,`account_id`,`provider_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`account_id` text NOT NULL,
	`source_id` text NOT NULL,
	`revision_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`amount` text NOT NULL,
	`units` integer NOT NULL,
	`currency` text NOT NULL,
	`direction` text NOT NULL,
	`status` text NOT NULL,
	`narration` text NOT NULL,
	`counterparty` text,
	`booked_at` text,
	`source_at` text,
	`retrieved_at` text NOT NULL,
	`reversal_of` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revision_id`) REFERENCES `source_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transaction_direction" CHECK("transactions"."direction" in ('debit','credit')),
	CONSTRAINT "transaction_units" CHECK("transactions"."units" >= 0 AND "transactions"."units" <= 9000000000000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_source` ON `transactions` (`org_id`,`account_id`,`provider_id`);--> statement-breakpoint
CREATE INDEX `transaction_period` ON `transactions` (`org_id`,`account_id`,`booked_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL
);
