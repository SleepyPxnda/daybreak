ALTER TABLE `konto` RENAME TO `account`;--> statement-breakpoint
ALTER TABLE `tag` RENAME TO `day`;--> statement-breakpoint
ALTER TABLE `notiz` RENAME TO `note`;--> statement-breakpoint
ALTER TABLE `aufgabe` RENAME TO `task`;--> statement-breakpoint
ALTER TABLE `vorlage` RENAME TO `template`;--> statement-breakpoint
ALTER TABLE `vorlage_ausnahme` RENAME TO `template_exception`;--> statement-breakpoint
ALTER TABLE `urlaubsanspruch` RENAME TO `vacation_entitlement`;--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "farbe" TO "color";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "aliase" TO "aliases";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "erstellt_am" TO "created_at";--> statement-breakpoint
ALTER TABLE `day` RENAME COLUMN "datum" TO "date";--> statement-breakpoint
ALTER TABLE `day` RENAME COLUMN "typ" TO "type";--> statement-breakpoint
ALTER TABLE `day` RENAME COLUMN "soll_override" TO "target_override";--> statement-breakpoint
ALTER TABLE `day` RENAME COLUMN "notiz" TO "note";--> statement-breakpoint
ALTER TABLE `day` RENAME COLUMN "bestaetigt" TO "confirmed";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "titel" TO "title";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "inhalt" TO "content";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "aufgabe_id" TO "task_id";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "konto_id" TO "account_id";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "angepinnt" TO "pinned";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "erstellt_am" TO "created_at";--> statement-breakpoint
ALTER TABLE `note` RENAME COLUMN "geaendert_am" TO "updated_at";--> statement-breakpoint
ALTER TABLE `task` RENAME COLUMN "konto_id" TO "account_id";--> statement-breakpoint
ALTER TABLE `task` RENAME COLUMN "titel" TO "title";--> statement-breakpoint
ALTER TABLE `task` RENAME COLUMN "schaetzung_min" TO "estimate_min";--> statement-breakpoint
ALTER TABLE `task` RENAME COLUMN "erstellt_am" TO "created_at";--> statement-breakpoint
ALTER TABLE `task` RENAME COLUMN "abgeschlossen_am" TO "closed_at";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "aufgabe_id" TO "task_id";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "konto_id" TO "account_id";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "ende" TO "end";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "wochentage" TO "weekdays";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "intervall_wochen" TO "interval_weeks";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "gueltig_ab" TO "valid_from";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "gueltig_bis" TO "valid_until";--> statement-breakpoint
ALTER TABLE `template` RENAME COLUMN "aktiv" TO "active";--> statement-breakpoint
ALTER TABLE `template_exception` RENAME COLUMN "vorlage_id" TO "template_id";--> statement-breakpoint
ALTER TABLE `template_exception` RENAME COLUMN "datum" TO "date";--> statement-breakpoint
ALTER TABLE `vacation_entitlement` RENAME COLUMN "jahr" TO "year";--> statement-breakpoint
ALTER TABLE `vacation_entitlement` RENAME COLUMN "art" TO "kind";--> statement-breakpoint
ALTER TABLE `vacation_entitlement` RENAME COLUMN "bezeichnung" TO "label";--> statement-breakpoint
ALTER TABLE `vacation_entitlement` RENAME COLUMN "tage" TO "days";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "datum" TO "date";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "ende" TO "end";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "aufgabe_id" TO "task_id";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "konto_id" TO "account_id";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "notiz" TO "note";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "vorlage_id" TO "template_id";--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN "erstellt_am" TO "created_at";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "art" TO "kind";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "wer" TO "person";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "nachfassen_am" TO "follow_up_date";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "aufgabe_id" TO "task_id";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "konto_id" TO "account_id";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "faellig_am" TO "due_date";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "sortierung" TO "sort_order";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "erledigt_am" TO "done_at";--> statement-breakpoint
ALTER TABLE `todo` RENAME COLUMN "erstellt_am" TO "created_at";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_account`("id", "name", "color", "aliases", "status", "created_at") SELECT "id", "name", "color", "aliases", "status", "created_at" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_note` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`task_id` integer,
	`account_id` integer,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_note`("id", "title", "content", "tags", "task_id", "account_id", "pinned", "created_at", "updated_at") SELECT "id", "title", "content", "tags", "task_id", "account_id", "pinned", "created_at", "updated_at" FROM `note`;--> statement-breakpoint
DROP TABLE `note`;--> statement-breakpoint
ALTER TABLE `__new_note` RENAME TO `note`;--> statement-breakpoint
CREATE INDEX `note_updated_idx` ON `note` (`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`key` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`estimate_min` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`closed_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_task`("id", "account_id", "key", "title", "status", "estimate_min", "created_at", "closed_at") SELECT "id", "account_id", "key", "title", "status", "estimate_min", "created_at", "closed_at" FROM `task`;--> statement-breakpoint
DROP TABLE `task`;--> statement-breakpoint
ALTER TABLE `__new_task` RENAME TO `task`;--> statement-breakpoint
CREATE UNIQUE INDEX `task_key_unique` ON `task` (`key`);--> statement-breakpoint
CREATE INDEX `task_account_status_idx` ON `task` (`account_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`task_id` integer,
	`account_id` integer,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`weekdays` text NOT NULL,
	`interval_weeks` integer DEFAULT 1 NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_template`("id", "name", "task_id", "account_id", "start", "end", "weekdays", "interval_weeks", "valid_from", "valid_until", "active") SELECT "id", "name", "task_id", "account_id", "start", "end", "weekdays", "interval_weeks", "valid_from", "valid_until", "active" FROM `template`;--> statement-breakpoint
DROP TABLE `template`;--> statement-breakpoint
ALTER TABLE `__new_template` RENAME TO `template`;--> statement-breakpoint
CREATE TABLE `__new_template_exception` (
	`template_id` integer NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`template_id`, `date`),
	FOREIGN KEY (`template_id`) REFERENCES `template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_template_exception`("template_id", "date") SELECT "template_id", "date" FROM `template_exception`;--> statement-breakpoint
DROP TABLE `template_exception`;--> statement-breakpoint
ALTER TABLE `__new_template_exception` RENAME TO `template_exception`;--> statement-breakpoint
CREATE TABLE `__new_block` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`task_id` integer,
	`account_id` integer,
	`note` text,
	`template_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `template`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_block`("id", "date", "start", "end", "kind", "status", "task_id", "account_id", "note", "template_id", "created_at") SELECT "id", "date", "start", "end", "kind", "status", "task_id", "account_id", "note", "template_id", "created_at" FROM `block`;--> statement-breakpoint
DROP TABLE `block`;--> statement-breakpoint
ALTER TABLE `__new_block` RENAME TO `block`;--> statement-breakpoint
CREATE INDEX `block_date_idx` ON `block` (`date`);--> statement-breakpoint
CREATE INDEX `block_task_idx` ON `block` (`task_id`);--> statement-breakpoint
CREATE INDEX `block_account_idx` ON `block` (`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `block_template_date_uq` ON `block` (`template_id`,`date`);--> statement-breakpoint
CREATE TABLE `__new_todo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`person` text,
	`follow_up_date` text,
	`task_id` integer,
	`account_id` integer,
	`due_date` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`done_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_todo`("id", "kind", "text", "person", "follow_up_date", "task_id", "account_id", "due_date", "sort_order", "done_at", "created_at") SELECT "id", "kind", "text", "person", "follow_up_date", "task_id", "account_id", "due_date", "sort_order", "done_at", "created_at" FROM `todo`;--> statement-breakpoint
DROP TABLE `todo`;--> statement-breakpoint
ALTER TABLE `__new_todo` RENAME TO `todo`;--> statement-breakpoint
CREATE INDEX `todo_kind_done_idx` ON `todo` (`kind`,`done_at`);