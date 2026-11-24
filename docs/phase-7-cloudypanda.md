# Phase 7 – Redesign to the cloudypanda brand system

daybreak is part of the **cloudypanda** tool family. This phase moves the whole UI to its brand system. The basis is the design-system artifact "cloudypanda" and the draft "daybreak · Redesign", in which all pages exist as mockups. Functions, API and data model stay unchanged.

## Usage

Almost nothing changes in how the app is used:
- **Header bar on every page.** It contains the quick input (`Ctrl K`) and the hours balance as a pill ("Konto ±h:mm · heute ist / soll"). Before, the hours balance was only on "Heute", and the quick input in the sidebar.
- **Sidebar in two groups.** "Zeit" contains Heute, Woche, Übersicht and Kalender. "Arbeit" contains Merker & Daily, Notizen and Konten & Aufgaben. Einstellungen sits at the bottom. The task detail page marks "Konten & Aufgaben" as active.
- **Today.** The timeline is a card with a header. Zoom controls and progress ("Gebucht", bar, "geplant") sit inside it. "Wie gestern" and "Tagesabschluss" are in one row with the quick input.

## Business rules & decisions

- **Tokens.** The tokens come from the brand system, the complete table is in the brand system. The layers are:
  - `surface` `#0f1115`: page.
  - `surface-raised` `#181b21`: sidebar, card headers, fields.
  - `surface-overlay` `#20242c`: menus, dialogs.

  Hairlines in `line`, borders of controls in `line-strong`. No shadows.
- **Accent.** The only accent is `accent-daybreak` (amber `#e8a042`). It is used on the icon, the tool name, the one primary button, active states and links. Active states are `bg-primary/12 text-primary`.
- **Brand status colors** (`--positive`, `--negative`, `--warning`, `--info`, each with a `*-subtle` surface) replace the earlier use of pastel tones as status:
  - Due reminders and "nachfassen" are now warning instead of "butter".
  - The vacation notice is now info instead of "mint".

  Status is always shown with a symbol and a word.
- **Account colors.** The eight pastel tones stay because their keys are stored in the DB. They appear only as a dot, bar or tinted surface (`accountColorClasses().surface`: surface 18 %, border 55 %, text `ink`). The dark `-fg` text colors are gone.
- **Calendar categories.**
  - Vacation, sick and flex day: tinted surface with a border in mint, peach and sky respectively. Half vacation: half a diagonal. Unconfirmed: dashed border only.
  - Holiday: a neutral ring instead of rose.
  - Today: accent surface. Selection: accent tint.
- **Font.** Geist for the UI, Geist Mono for numbers, times, IDs and the "daybreak" wordmark. Both are self-hosted via `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`; Montserrat is removed. `.tabular-nums` sets mono globally.
- **Buttons.** They follow the default shadcn-vue style (radius 8 px, `outline` for secondary actions, 3 px focus ring). The brand actually prescribes borderless buttons; the deviation is deliberately wanted. `shadow-xs` is left out.
- **Other components.**
  - Fields: `h-9`, `rounded-md`, border `line-strong` on `surface-raised`.
  - Cards: border `line`, body `surface`, header strip `surface-raised`.
- **Logo and tab title.**
  - `AppLogo.vue` is the daybreak icon of the brand (cloud plus line sun, colors via tokens).
  - `public/favicon.svg` is the original file of the brand.
  - Tab title: `<page> · daybreak`, default `daybreak · cloudypanda`.
- **Display only: task status "In Arbeit" (in progress).** Only "open" and "closed" are stored. On the accounts and task pages, an open task with booked time is called "In Arbeit".
- **Empty states.** They may make a small weather joke, for example "Klarer Himmel – …" (clear sky). Error messages may not.

## Data model & API

No changes. Only CSS tokens in `app/assets/css/main.css` are new:
- `--warning`, `--info` and the `*-subtle` surfaces
- `--line-strong`, `--secondary-hover`
- the Tailwind colors `raised`, `overlay`, `line-strong`

## Open

- **Light mode.** The brand provides "light" as an alternative; v1 stays dark.
- **Account colors in the brand tone.** The pastel tones could move closer to the brand tones. This needs coordination, because the accents of other tools are reserved.
- **Calendar, blocker plus category.** A day with a blocker and vacation at once has not been visually checked separately.
