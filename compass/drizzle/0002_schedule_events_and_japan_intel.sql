-- Schedule events table
CREATE TABLE `schedule_events` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_item_id` text NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`reason` text,
	`from_status` text,
	`to_status` text,
	`payload_json` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`schedule_item_id`) REFERENCES `schedule_items`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Add new columns to schedule_items
ALTER TABLE `schedule_items` ADD `quick_complete` integer NOT NULL DEFAULT 0;
ALTER TABLE `schedule_items` ADD `delay_reason` text;
ALTER TABLE `schedule_items` ADD `skip_reason` text;
ALTER TABLE `schedule_items` ADD `cancel_reason` text;

-- Japan intel sources
CREATE TABLE `japan_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`category` text NOT NULL,
	`authority_level` text NOT NULL,
	`enabled` integer NOT NULL DEFAULT 1,
	`check_frequency` text NOT NULL DEFAULT 'daily',
	`last_checked_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer NOT NULL DEFAULT (unixepoch())
);

-- Japan intel items
CREATE TABLE `japan_intel_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` integer,
	`fetched_at` integer NOT NULL DEFAULT (unixepoch()),
	`category` text NOT NULL,
	`language` text,
	`raw_text` text,
	`summary_zh` text,
	`impact_level` text NOT NULL DEFAULT 'low',
	`relevance_score` integer NOT NULL DEFAULT 0,
	`tags_json` text,
	`content_hash` text NOT NULL,
	`is_major_update` integer NOT NULL DEFAULT 0,
	`is_archived` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`source_id`) REFERENCES `japan_sources`(`id`) ON UPDATE no action ON DELETE no action
);

-- Japan intel digests
CREATE TABLE `japan_intel_digests` (
	`id` text PRIMARY KEY NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`title` text NOT NULL,
	`body_markdown` text NOT NULL,
	`item_ids_json` text NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);

-- Japan intel alerts
CREATE TABLE `japan_intel_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`reason` text NOT NULL,
	`severity` text NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`item_id`) REFERENCES `japan_intel_items`(`id`) ON UPDATE no action ON DELETE no action
);

-- Japan intel email logs
CREATE TABLE `japan_intel_email_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`body_markdown` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`sent_at` integer
);
