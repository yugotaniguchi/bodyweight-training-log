# Design rules — bodyweight-training-log

These rules describe the look of the original Muse space this project is
based on. They were derived from screenshots of the running space, with
colours **measured** from the screenshot pixels (PIL sampling, medians over
several points) — not guessed. Anything that could not be measured is
marked **(inferred)**. When this file and any other description disagree,
this file wins.

Screenshots measured: the pain-check screen of the original space
(top half and joint-pain section + call-to-action).

## Theme

- **Dark theme only.** Near-black background, white text, gray secondary
  text, one bright teal accent.
- Never a light theme. Never a yellow-to-red heat scale. Never multi-colour
  gradients. Red appears only in warning / red-flag surfaces.

## Colour tokens (measured)

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#0f0f0f` | Page background |
| `--surface` | `#232323` | Cards, pain tiles (level 0), inactive nav segments |
| `--surface-2` | `#1a1a1a` | Chip fill, input fill |
| `--border` | `#2d2d2d` | Chip borders, hairlines, gauge track |
| `--accent` | `#2dd4bf` | Active nav segment, primary CTA, lit ticks, gauge arc, week-box today outline / done-day numbers |
| `--on-accent` | `#052e2b` | Text on top of `--accent` (near-black teal) |
| `--badge` | `#19534c` | Legend badge fill (a `#17423c` variant also appears) |
| `--text` | `#f0f0f0` | Primary text, large numerals |
| `--sub` | `#9ca3af` | Secondary text: dates, descriptions, chip labels, "Day" label |
| `--tick-off` | `#292929` | Unlit tick segments on tiles (approx. measured) |

### Pain-tile level colours (inferred)

All screenshot tiles were at level 0, so the level ramp cannot be measured.
Per the standing rule "the tile deepens through teal shades as the level
rises", the ramp below is **inferred** — a dark ramp from the card colour
toward the accent:

| Level | Tile background | Text |
|---|---|---|
| 0 | `#232323` (= `--surface`) | `--text` |
| 1 | `#17312c` | `--text` |
| 2 | `#17453c` | `--text` |
| 3 | `#1a5a4c` | `--text` |
| 4 | `#20806c` | `--text` |
| 5 | `#2dd4bf` (= `--accent`) | `--on-accent` |

### Warning colours (inferred)

No active warning state appears in the screenshots. Carried over in the
same dark idiom: red border `#ef4444`, dark red fill `#2a0f0f`, pale red
text `#fecaca`. This is the one place red is allowed.

## Typography

- Body: `system-ui, sans-serif`, 15–16px, line height about 1.6.
- **All large numerals use Barlow Condensed** (Google Fonts, weights
  500–700; falls back to system-ui offline): the Day number, pain-tile
  level numbers, ring-gauge centre, the three metrics, totals, timer
  digits, history dates.
- Headings: bold, `--text`, about 17px. Section descriptions: small,
  `--sub`.
- Keep text minimal: prefer UI (badges, ticks, bars, gauges) over
  sentences. Explanations only where a decision needs them.

## Layout

- Single column, mobile-first (mainly used on an iPhone). In the
  screenshots the content column is about 640px wide; the standalone app
  caps content at 680px with 16px side padding.
- Pain tiles: **2-column grid**, gap about 8px.
- Section spacing is generous; the primary CTA sits at the bottom of the
  screen, full width.

## Components

### Header
- Left: date in small gray (`11/13（金）` format), under it the purpose
  line in bold white: `器具なし / 筋力・筋肥大`.
- Right, right-aligned: the word `Day` in small bold gray, then the day
  count as a **huge Barlow Condensed numeral** in white; under it, small
  gray `累計 ○○ レップ` (cumulative reps, summed from the logged session
  history).

### Segment navigation
- A row of segment buttons, small gaps (about 6px), corner radius about
  8px — **not** pills.
- Active segment: `--accent` fill, `--on-accent` bold text.
- Inactive segments: `--surface` fill, `--text`.
- Exactly 3 segments: 痛みの記録 / メニュー / これまでの記録. There is no
  separate Result segment (results are merged into これまでの記録， below)
  and no Settings segment.

### Settings gear button
- Settings is **not** a nav segment. A round gear button (⚙) is fixed at
  the top-right of the viewport (`position: fixed`, stays while
  scrolling) and opens the settings screen (profile + data reset). The
  header keeps clear space on its right side so the Day numeral never
  sits under the gear.

### Warning-sign chips
- Red flags are **chips**, not checkboxes: pill shape, thin `--border`
  outline, `--surface-2` fill, `--sub` label text, wrapping in rows.
- Selected state **(inferred)**: accent outline / badge fill, since no
  selected chip appears in the screenshots.

### Legend badges
- Small pills with `--badge` fill and white bold text, one row per pain
  section, placed between the section description and the tiles.
- Muscle soreness: `0–1 通常` `2 軽減` `3以上 除外` `4以上 ×2部位 休養`
- Joint pain: `0–1 通常` `2 軽減` `3以上 除外` `サインあり 受診目安`

### Pain tiles
- Card: `--surface` fill, radius about 10–12px, tappable; each tap adds 1
  (0–5, then back to 0).
- Inside: part name in bold white at the top-left; under it the level word
  in small gray (level 0 = `なし`; 1 `軽い`, 2 `普通`, 3 `強い`, 4 `かなり強い`,
  5 `激しい`).
- Top-right: the level as a large Barlow Condensed numeral in white.
- Bottom-right: **5 small tick segments**; the first *level* ticks light
  up in `--accent`, the rest stay `--tick-off`.
- Tile background deepens through the inferred teal ramp above as the
  level rises.

### Ring gauge and metrics (inferred placement)
- Not visible in the pain-screen screenshots; kept from the original
  space's menu screen: an SVG ring (track `--border`, arc `--accent`)
  with the completed/total fraction in Barlow Condensed at the centre,
  and three metrics under it — exercise count, set count, total reps —
  in the same numeral font. (There is no separate result screen; the
  merged history list below carries the totals.)

### Week boxes
- 7 equal-width boxes in a row, Mon–Sun of the current week (Asia/Tokyo,
  Monday start), matching the original's week strip: each box has a thin
  `--border` outline, radius about 10px, dark `--surface-2` fill; the
  weekday letter sits on top in small gray, and the day number below it
  in large bold white (Barlow Condensed).
- A day with a completed session shows its number in `--accent` (a quiet
  distinction, no fill change). Today's box is the only one with an
  `--accent` outline, and its weekday letter is also `--accent`.
- No date label of any kind under or beside the boxes.

### History screen (results merged in)
- There is no separate Result screen. Completing today's session — and
  the pain screen's `今日の結果を見る` CTA — lands on これまでの記録，
  which is both the result view and the history.
- Heading: `これまでの記録`. Entries newest first, separated by hairline
  dividers (`--border`) — **no card frames**, a quiet list.
- Each entry: left column with the day number as a huge Barlow Condensed
  numeral in white, under it two small gray lines, `M月` then `（曜）`.
  Centre: the rotation name in bold white (e.g. `A 押す + 脚`); any pain
  adjustment note in small `--accent` text on one line under it. Each
  exercise is one row: name in white, then variation and
  `（RPE 8 きつい）` in gray in the same line; the logged sets are
  right-aligned (`6 / 6 回`, `41 / 41 秒`, multi-set joined with ` / `).
  A per-exercise note goes under its exercise as small gray
  `種目メモ： …`. Top-right of the entry: the session's total reps as a
  large Barlow Condensed numeral with a small `レップ` after it.
- Under each entry, a small dark pill `記録を編集` button; it opens the
  existing per-exercise editing (sets / RPE / completion / note) for
  that session in place.
- RPE words follow the original's mapping: 6 かなり楽， 6.5 楽， 7 やや楽，
  7.5 少しきつい, 8 きつい, 8.5 かなりきつい, 9 とてもきつい, 9.5 ほぼ限界，
  10 限界 (values in between take the next word up).

### Primary CTA
- Full width, large height (about 56px), radius about 8px, `--accent`
  fill, bold `--on-accent` text. On the original's pain screen it reads
  `今日の結果を見る`.

### Cards, buttons, inputs
- Cards: `--surface` fill (a thin `--border` outline is acceptable),
  radius 12px, padding about 14px.
- Ordinary buttons: `--surface` fill, `--text`, radius 8px.
- Inputs: `--surface-2` fill, `--border` outline, `--text`, radius 8px,
  16px font (prevents iOS zoom).

### Form uniformity
- On any screen with several fields (profile/settings, and the menu's
  set and RPE inputs), all fields share one geometry: same height
  (42px), radius (8px), padding, border, fill and 16px font — text,
  numeric, select and textarea alike (textarea keeps the same styling,
  with a matching min-height). Labels sit above their fields in a
  regular grid (equal columns, even gaps); no field is sized ad hoc.

### Menu inputs start from the target
- On the menu screen, each set input of an exercise that has not been
  recorded yet is **pre-filled with the generated target** (reps, or
  seconds for timed exercises). The user saves as-is or overwrites;
  saving reads the input values exactly as before.

### Date display — only three forms
- Dates may appear **only** in these three shapes: (a) the header's
  `M/D（曜）`, (b) the day numbers inside the week boxes, (c) the history
  list's day number + `M月` / `（曜）`. Full date strings (`YYYY-MM-DD`,
  `○年○月○日`, long weekday forms, labels under the week boxes, dates
  inside reason texts) are banned on every screen.

### Delete confirmation never overlaps
- The settings screen's `データを消す` button opens its confirmation as
  a separate block stacked **below** the button in normal flow (with
  `本当に全データを消す` and a cancel button). No absolute positioning,
  no overlay, no native `confirm()` dialog.

## Screen composition — pain check

1. Header (date + purpose / Day + cumulative reps)
2. Segment navigation
3. `まず、警告サインの確認` — heading, gray description, red-flag chips
4. `今日の筋肉痛は？（部位ごと）` — heading, gray description, legend badges,
   2-column tiles (10 parts: 胸・肩・上腕・前腕・背中・脚（前）・脚（後ろ）・お尻・
   ふくらはぎ・腹筋・体幹）
5. `今日の関節痛は？（関節ごと）` — heading, gray description noting joints
   use a stricter standard, legend badges, 2-column tiles (7 joints:
   腰・肩・肘・手首・股関節・膝・足首）
6. Primary CTA at the bottom

Menu, history, and settings screens reuse the same tokens: exercise
cards and the ring gauge with metrics on the menu, the quiet date-led
history list (results merged in), a gear button instead of a settings
segment, and uniform dark form fields on settings.

## Do not

- Do not use a light theme or a white background.
- Do not colour pain levels yellow → orange → red (no heat scale).
- Do not introduce a second accent colour or decorative gradients.
- Do not use red anywhere except warning / red-flag surfaces.
- Do not replace the segment navigation with pills or a sidebar.
- Do not drop Barlow Condensed for the numerals.

## Inferred items (not measurable from the screenshots)

- Pain-tile level 1–5 background ramp (all tiles were level 0).
- Selected state of the warning chips.
- Warning-box colours (no active warning was shown).
- Ring-gauge styling details (not on the pain screen). The week boxes
  follow the original's week strip as later screenshotted (box form).
- Exact pixel sizes for the CTA height and tile radius (estimated from
  proportions).
