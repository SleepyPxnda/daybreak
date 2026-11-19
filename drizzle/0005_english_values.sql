-- Stored enum values, account colours and settings keys: German -> English (data only; names are changed in 0004).
UPDATE `account` SET `status` = CASE `status` WHEN 'aktiv' THEN 'active' WHEN 'archiviert' THEN 'archived' ELSE `status` END;--> statement-breakpoint
UPDATE `account` SET `color` = CASE `color` WHEN 'lavendel' THEN 'lavender' WHEN 'pfirsich' THEN 'peach' WHEN 'himmel' THEN 'sky' WHEN 'salbei' THEN 'sage' WHEN 'flieder' THEN 'lilac' ELSE `color` END;--> statement-breakpoint
UPDATE `task` SET `status` = CASE `status` WHEN 'offen' THEN 'open' WHEN 'abgeschlossen' THEN 'closed' ELSE `status` END;--> statement-breakpoint
UPDATE `block` SET `kind` = CASE `kind` WHEN 'arbeit' THEN 'work' WHEN 'pause' THEN 'break' ELSE `kind` END, `status` = CASE `status` WHEN 'geplant' THEN 'planned' WHEN 'gebucht' THEN 'booked' ELSE `status` END;--> statement-breakpoint
UPDATE `day` SET `type` = CASE `type` WHEN 'arbeit' THEN 'work' WHEN 'urlaub' THEN 'vacation' WHEN 'halb_urlaub' THEN 'half_vacation' WHEN 'krank' THEN 'sick' WHEN 'gleittag' THEN 'flex_day' ELSE `type` END;--> statement-breakpoint
UPDATE `todo` SET `kind` = CASE `kind` WHEN 'merker' THEN 'reminder' WHEN 'daily' THEN 'daily_topic' WHEN 'warten' THEN 'waiting_for' ELSE `kind` END;--> statement-breakpoint
UPDATE `vacation_entitlement` SET `kind` = CASE `kind` WHEN 'grund' THEN 'base' WHEN 'zusatz' THEN 'extra' WHEN 'rest' THEN 'carryover' ELSE `kind` END;--> statement-breakpoint
UPDATE `settings` SET `value` = json_object('date', json_extract(`value`, '$.datum'), 'balanceMin', json_extract(`value`, '$.saldoMin')) WHERE `key` = 'stundenkontoStart';--> statement-breakpoint
UPDATE `settings` SET `key` = CASE `key`
  WHEN 'sollProTagMin' THEN 'targetPerDayMin'
  WHEN 'arbeitstage' THEN 'workdays'
  WHEN 'bundesland' THEN 'federalState'
  WHEN 'arbeitsbeginn' THEN 'workStart'
  WHEN 'timelineVon' THEN 'timelineFrom'
  WHEN 'timelineBis' THEN 'timelineTo'
  WHEN 'stundenkontoStart' THEN 'balanceStart'
  WHEN 'urlaubErinnerungTage' THEN 'vacationNoticeDays'
  WHEN 'urlaubErinnerungText' THEN 'vacationNoticeText'
  WHEN 'erinnerungenAktiv' THEN 'bookingNotificationsEnabled'
  WHEN 'erinnerungLueckeMin' THEN 'bookingNotificationGapMin'
  WHEN 'erinnerungFeierabend' THEN 'bookingNotificationEndOfDay'
  WHEN 'urlaubVorbelegt' THEN 'vacationPrefilled'
  ELSE `key` END;
