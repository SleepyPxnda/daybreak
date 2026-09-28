CREATE TABLE `aufgabe` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`konto_id` integer NOT NULL,
	`key` text,
	`titel` text NOT NULL,
	`status` text DEFAULT 'offen' NOT NULL,
	`schaetzung_min` integer,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`abgeschlossen_am` text,
	FOREIGN KEY (`konto_id`) REFERENCES `konto`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aufgabe_key_unique` ON `aufgabe` (`key`);--> statement-breakpoint
CREATE INDEX `aufgabe_konto_status_idx` ON `aufgabe` (`konto_id`,`status`);--> statement-breakpoint
CREATE TABLE `block` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`datum` text NOT NULL,
	`start` integer NOT NULL,
	`ende` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`aufgabe_id` integer,
	`konto_id` integer,
	`notiz` text,
	`vorlage_id` integer,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`aufgabe_id`) REFERENCES `aufgabe`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`konto_id`) REFERENCES `konto`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vorlage_id`) REFERENCES `vorlage`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `block_datum_idx` ON `block` (`datum`);--> statement-breakpoint
CREATE INDEX `block_aufgabe_idx` ON `block` (`aufgabe_id`);--> statement-breakpoint
CREATE INDEX `block_konto_idx` ON `block` (`konto_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `block_vorlage_datum_uq` ON `block` (`vorlage_id`,`datum`);--> statement-breakpoint
CREATE TABLE `konto` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`farbe` text NOT NULL,
	`aliase` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'aktiv' NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notiz` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titel` text NOT NULL,
	`inhalt` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`aufgabe_id` integer,
	`konto_id` integer,
	`angepinnt` integer DEFAULT false NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`geaendert_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`aufgabe_id`) REFERENCES `aufgabe`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`konto_id`) REFERENCES `konto`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notiz_geaendert_idx` ON `notiz` (`geaendert_am`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`datum` text PRIMARY KEY NOT NULL,
	`typ` text NOT NULL,
	`soll_override` integer,
	`notiz` text
);
--> statement-breakpoint
CREATE TABLE `todo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`art` text NOT NULL,
	`text` text NOT NULL,
	`wer` text,
	`nachfassen_am` text,
	`aufgabe_id` integer,
	`konto_id` integer,
	`faellig_am` text,
	`sortierung` integer DEFAULT 0 NOT NULL,
	`erledigt_am` text,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`aufgabe_id`) REFERENCES `aufgabe`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`konto_id`) REFERENCES `konto`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `todo_art_erledigt_idx` ON `todo` (`art`,`erledigt_am`);--> statement-breakpoint
CREATE TABLE `urlaubsanspruch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jahr` integer NOT NULL,
	`art` text NOT NULL,
	`bezeichnung` text NOT NULL,
	`tage` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vorlage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aufgabe_id` integer,
	`konto_id` integer,
	`start` integer NOT NULL,
	`ende` integer NOT NULL,
	`wochentage` text NOT NULL,
	`intervall_wochen` integer DEFAULT 1 NOT NULL,
	`gueltig_ab` text NOT NULL,
	`gueltig_bis` text,
	`aktiv` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`aufgabe_id`) REFERENCES `aufgabe`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`konto_id`) REFERENCES `konto`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vorlage_ausnahme` (
	`vorlage_id` integer NOT NULL,
	`datum` text NOT NULL,
	PRIMARY KEY(`vorlage_id`, `datum`),
	FOREIGN KEY (`vorlage_id`) REFERENCES `vorlage`(`id`) ON UPDATE no action ON DELETE cascade
);
