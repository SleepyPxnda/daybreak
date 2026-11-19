# Phase 6 – Booking notifications

Browser notifications that remind you to book when too little has been entered today – sparing, no spam. (In the UI they are called "Browser-Erinnerungen".)

## Usage

- Turn on **Settings → "Browser-Erinnerungen ans Buchen"**. The browser asks for permission; if it is denied, the switch stays off.
- **Erinnern nach (Stunden ohne Buchung)** (notify after hours without a booking) – default 2 h.
- **Feierabend-Erinnerung ab** (end-of-day notification from) – default 16:30.
- A click on a notification brings daybreak to the front and opens "Heute"; the end-of-day notification opens the **day closing** directly (`/?dayClosing=1`).

## Business rules & decisions

The rules are a pure function `checkBookingNotification` in `shared/utils/bookingNotification.ts` (tests: `tests/bookingNotification.test.ts`):

- Only on days with a **target > 0** (no weekend, holiday, vacation, sick) and only as long as **booked < target**.
- **Gap:** if the end of the last *booked* block (or the work start, if nothing is booked yet) is at least the set interval ago → "Seit 11:15 nichts gebucht – kurz nachtragen?". After that, the earliest again after another interval. Planned blocks do not count.
- **End of day:** from the set time of day → "Heute 6:15 von 8:00 gebucht – Tagesabschluss machen?". At most twice: at that time and one hour later. From the end of day on, there are no more gap notifications.
- Booking later resolves the condition by itself – no "done", no snooze.
- If daybreak is currently in the foreground (visible + focused), **no** notification is shown, but the notification counts as done.
- Deliberately **only with an open tab** (Notification API + timer, check every 5 min). No service worker / web push.

## Data model & API

- New settings keys (key/value, no migration): `bookingNotificationsEnabled` (bool, default off), `bookingNotificationGapMin` (30–480, 15-minute grid, default 120), `bookingNotificationEndOfDay` (time of day, default 990 = 16:30).
- Client: `app/composables/useBookingNotifications.ts`, included in the default layout; loads `/api/blocks` and `/api/days` for today.
- The times of the last notifications per kind are stored in `localStorage` (`daybreak-booking-notifications`, per day) so that a reload does not notify again.

## Open / known limits

- Notifications work only in a **secure context** (HTTPS or `localhost`). When accessed via `http://<IP>` in the LAN, the browser does not offer them.
- Several open daybreak tabs share the `localStorage` state; simultaneous checks can notify twice in the edge case (same `tag` → the browser replaces the older notification).
