# bodyweight-training-log

A standalone web app for no-equipment bodyweight training. It logs your workouts and builds the next session from your pain check, past results, RPE, and per-exercise notes. No account or external service is required, and your data stays on your own machine.

> This app does not replace medical advice. If a warning sign applies to you, stop and talk to a medical professional.

## Install and run

All you need is [Bun](https://bun.sh). There are no package dependencies, so `bun install` is not required.

```bash
git clone https://github.com/yugotaniguchi/bodyweight-training-log.git
cd bodyweight-training-log
bun run server.ts
```

Open http://localhost:3000 in your browser. To use a different port, run `PORT=8080 bun run server.ts`.

### Run with Docker

```bash
docker compose up --build
```

The app is then available at http://localhost:3000, and data is kept in `./data`.

### Development and tests

```bash
bun test          # unit tests for the workout logic
bun --watch run server.ts
```

## How to use it

1. **Settings**: Enter your profile (age, sex, height, weight, and so on) via the small gear button fixed at the top-right — a muted line icon, shown only on the condition and settings screens; settings is not a tab. A quiet **← ホームに戻る** button at the top-left of the settings screen takes you back. All the form fields share one size and style, labels above fields on a regular grid. The app ships with no one's data in it.
2. **Condition**: First tap any warning signs (red flags) that apply — they are chips at the top. Then set muscle soreness by body part and joint pain (lower back, shoulders, elbows, wrists, hips, knees, ankles) from 0 to 5 by tapping the tiles: each tile shows the level as a big numeral, a level word, and 5 tick segments that light up teal, and the tile background deepens through dark teal shades as the level rises. Dark-teal legend badges above each grid summarise the thresholds. If the same pain has been recorded for many days in a row, a caution or see-a-doctor note appears here (it never blocks a start — only red flags do). Tapping **コンディションを保存** saves the check; once saved, the button turns into **ワークアウトを開始**, which creates today's session on the spot if none exists yet and takes you to the workout tab (if creation is blocked by a warning sign or a rest day, the workout tab shows the reason). Changing any pain value after saving flips it back to コンディションを保存, so unsaved changes are always visible.
3. **Workout**: "Create today's workout" builds a session from today's condition and your history. Sessions rotate A (push + legs) → B (back + posterior legs + core) → C (full body). The first 6 sessions are an introductory period with easier variations and fewer sets. If you open this tab before entering today's condition, it shows a short note and a **コンディションを入力** button back to the condition tab instead of the create button. The workout screen opens with a **week dot row** (Mon–Sun: a filled teal dot for days with a completed session, a teal ring for today — no day numbers), a **ring gauge** (completed exercises as a big central numeral, with the total under it), the session title with how many exercises remain, and three metrics: exercise count, completed/total sets, and cumulative completed sessions.
4. **Logging**: Each exercise is a card headed by its variation name, with the total target at the top-right. The set fields — black boxes in an even row — start out **pre-filled with the target** (reps, or seconds for timed exercises): keep them, or overwrite with what you actually did. RPE is a select with exactly ten options — `未入力`, then `6（かなり楽）`, `6.5（楽）`, `7（やや楽）`, `7.5（少しきつい）`, `8（きつい）`, `8.5（かなりきつい）`, `9（とてもきつい）`, `9.5（ほぼ限界）`, `10（限界）` — and only the number is saved. Each exercise also has a note field that affects only that exercise; there is no session-wide note. The card's **記録して完了** button saves that exercise and advances the gauge; a recorded exercise's button becomes 記録を更新. Timed exercises (planks and the like) have a countdown timer on the card — start it at the target seconds, pause or reset as needed, and watch the remaining-time bar; it beeps and turns teal when time is up. The timer never writes to the record: what you type is what gets saved. At the bottom, **今日のトレーニングを完了する** finishes the day, and the underlined **このワークアウトを取り消す** link deletes today's session (after an inline confirmation) so you can start over from the pain check.
5. **Report (results live here too)**: There is no separate results screen. Finishing a session takes you to **レポート**, a quiet list, newest first: the date in one line (`11/13(金)`) on the left, the rotation and one row per exercise in the middle (name in white, variation and RPE word in gray, logged sets right-aligned), any per-exercise notes in small gray, and the session's total reps as a big number on the right. Entries are separated by hairlines, not cards. The `記録を編集` button under each entry lets you fix sets, RPE, completion, and exercise notes afterwards; edits update the totals and feed into the next session's decisions.

The app is **dark-themed** — near-black background, white text, gray secondary text, one bright teal accent — and follows the design rules in [DESIGN.md](DESIGN.md), which were measured from the original space. Every screen opens with a header: the date (only ever shown as `M/D（曜）`) and the purpose line (`器具なし / 筋力・筋肥大`) on the left, and on the right a huge **Day N** numeral (N = days since your first recorded session) over the cumulative rep count from your session history, with a small, muted **gear button** at the very top-right for settings (shown only on the condition and settings screens). The Workout screen carries a **week dot row** — seven dots for Mon–Sun with no day numbers (never week boxes). All large numerals (Day count, gauge, metrics, pain-tile levels, totals, timers, history dates) use the **Barlow Condensed** typeface, falling back to the system font when it cannot be loaded. Dates appear in only two places in the whole app: the header and the history list.

## How the next workout is decided

Priority order: **pain rules > exercise notes > zero-rep swaps > RPE adjustment**.

- **Exercises you cannot do at all**: If you logged 0 on every set, or the exercise note says you could not do it, the next session first drops that exercise one step down its difficulty ladder (for example, push-ups → knee push-ups). If it is already at the easiest step, it is swapped for another exercise for the same body part, or a simpler one such as wall push-ups. The reason is shown in the workout's adjustment notes.
- **Exercise notes**: Notes are read per exercise. "Hard" holds progression and reduces the load, "easy" adds more, "just right" keeps things as they are, and "pain" or "discomfort" reduces the load. A note never affects other exercises.
- **RPE and completion rate**: The size of the change depends on the previous RPE and the completion rate (actual ÷ target). Low RPE with the target met adds more (+3 reps, or +25% for timed exercises), the mid range (RPE 7–8.5) adds +1 (+10% for timed), and high RPE keeps the load or reduces it. Variations also move: one step up the ladder when RPE is low and the target was met or beaten, one step down when RPE is high and completion was low — at most one step per session. Timed exercises change by percentage, rounded to 5-second steps.
- **Joint → muscle-part mapping**: Joint pain also reaches exercises through an explicit mapping, on top of the joints each exercise loads directly. Lower back → legs and core (squats, hinges, leg raises, planks); shoulders → all pushing work; elbows → pushing and pulling work; wrists → pushing and plank work; hips, knees, and ankles → leg work (knees and ankles include calf jumps). Level 2 reduces the mapped parts, level 3 or higher excludes them, and the workout note names the joint and the mapped part.
- **24-hour rule, auto-judged**: Every pain check is kept in a dated history. After a completed session, the app compares the pain recorded the next day with the level from just before that session. If a part the session used has not come back down, it is flagged as overloaded: the next session reduces that part and does not progress it, whatever the RPE step would have said, and the adjustment note says why.
- **Duration check**: The history also counts how many days in a row each pain has stayed unresolved. Muscle soreness at 5+ days and joint pain at 14+ days show see-a-doctor guidance; joint pain at 7+ days shows a caution. These are notices only — they never block a start.

## Decision rules and references

- If any red flag applies, the day is a **no-start day**; treat it as a sign to seek medical care.
- Muscle soreness: level 2 means train with a reduced load and no progression; level 3 or higher excludes that body part.
- Joint pain is judged more strictly: level 2 reduces the load, level 3 or higher excludes it. It applies both to the joints an exercise loads and, through the joint → muscle-part mapping above, to the muscle parts those joints serve.
- A full rest day happens only when level 4 or higher soreness is present in **2 or more body parts**.
- **24-hour rule** (checked automatically against the pain history): If pain has not returned to its baseline by the next morning, the previous load was probably too high, and that part is reduced next time. Soreness that does not improve in 5 days, or joint pain that does not improve in 1–2 weeks, is a sign to get checked; the app counts these durations and shows the guidance.
- Muscle soreness (DOMS) usually starts 12–24 hours after exercise, peaks at 24–72 hours, and settles within 3–5 days.

References:

- ACSM position stands (progression models for resistance training; on hypertrophy, there is no need to train to failure — stopping with 2–3 reps left is fine)
- ACSM material on delayed onset muscle soreness (DOMS)
- Silbernagel et al. 2007, Am J Sports Med (pain-monitoring model)
- NHS, "Joint pain" and "Back pain"
- CDC/NIOSH, "Rhabdomyolysis"

Note: the numeric pain thresholds above convert ideas from general-audience sources onto a 0–5 scale. That conversion has not been medically validated.

## Limitations

- This is a local app for personal use. It has no login or authentication, so do not expose it directly to the internet. Run it on your own computer or home network.
- Dates are judged by the current day in Asia/Tokyo.
- The pain rules are guidance based on public sources, not a diagnosis.

## Data storage and reset

- Data is stored in `data/store.json` in the folder where you start the server. It is not tracked by Git.
- To reset, use the delete button on the settings screen (behind the gear button) — its confirmation appears as a separate block under the button — or delete `data/store.json` and restart.
- To back up, just copy `data/store.json`.

## Recreate the look in Muse

The standalone app above is plain HTML/CSS. Its look is specified in [DESIGN.md](DESIGN.md) — a dark theme with one bright teal accent. **Follow DESIGN.md exactly; it is self-contained and needs no other instructions.** No external reference (design gallery, account-level instructions, or anything else) is required, and where anything disagrees with DESIGN.md, DESIGN.md wins. If you use [Muse](https://muse.ai) and want a space that looks like the original, copy the prompt below and paste it into Muse together with your request to build the space. The specific values matter — without them you will get a generic fitness-app look instead.

```text
Build a bodyweight training log space. Match this design exactly:
Follow DESIGN.md in this repository exactly — it is self-contained and
needs no other instructions. It is the only design authority: do not
consult external galleries or examples, and if anything (including this
prompt) disagrees with DESIGN.md, DESIGN.md wins.

Theme (this is the most common mistake — do not get it wrong):
- DARK theme only. Background #0f0f0f (near black), cards #232323, text
  #f0f0f0 (white), secondary text #9ca3af (gray). Never a light theme or a
  white background.
- Exactly one accent: bright teal #2dd4bf. Text on the accent is #052e2b
  (near-black). No second accent colour, no decorative gradients.
- Pain levels are NEVER a yellow-to-red heat scale. Red appears only in
  warning / red-flag surfaces.

Header (top of every screen):
- Left: the date in small gray (format 11/13（金）), under it the purpose
  line in bold white: 器具なし / 筋力・筋肥大.
- Right: the word "Day" in small bold gray, then the day count as a
  52px Barlow Condensed numeral in white. The day count is the calendar
  days since the first recorded session's date, counting that day as
  Day 1. Under it, small gray 累計 ○○ レップ (cumulative reps summed
  from the session history).
- A small gear button for Settings, deliberately inconspicuous: a
  thin line-drawn SVG gear icon (18px, gray #9ca3af stroke, no fill —
  never the ⚙ emoji) in a 34×34px round button (#232323 fill, 1px
  #2d2d2d border), fixed at the top-right of the viewport (position:
  fixed, top 10px, right 10px, stays while scrolling). It keeps the
  same muted style in every state — no hover or active colour change.
  It is shown ONLY on the condition screen and the settings screen,
  never on the workout or report screens. Settings is never a
  navigation segment; the header keeps 44px of right padding clear of
  the gear. The settings screen has a quiet ← ホームに戻る button at
  its top-left that returns to the condition screen.

Navigation:
- A row of exactly 3 segment buttons (radius 8px, gap 6px, padding
  10px 6px, 14px weight 600) — NOT pills and NOT a sidebar. Active
  segment: #2dd4bf fill with #052e2b bold text. Inactive: #232323 fill,
  white text. Labels: コンディション / ワークアウト / レポート. There is no
  Result segment — results are merged into レポート (see Screens).

Typography:
- Body: system-ui, sans-serif, 15–16px, line height about 1.6.
- ALL large numerals use Barlow Condensed (Google Fonts; system-ui
  fallback): the Day number, pain-tile level numbers, ring-gauge centre,
  the three metrics, totals, timer digits, history dates.
- Headings bold white (17px); descriptions 13px gray. Keep text
  minimal — show things as UI (badges, ticks, bars, gauges), explain
  only where a decision needs it, and only in the two places
  DESIGN.md allows (the condition-screen description lines and the
  判定基準について footer section at the bottom of the page).

Condition screen (in this order):
1. まず、警告サインの確認 — heading, gray description, then the red flags as
   CHIPS (not checkboxes): pill shape (radius 999px, padding 7px 12px),
   thin #2d2d2d outline, #1a1a1a fill, gray #9ca3af label text, 13px,
   wrapping in rows with gap 8px. Selected chip: #2dd4bf border,
   #19534c fill, white text.
2. 今日の筋肉痛は？（部位ごと）— heading, gray description
   (タップで強度が上がります（5の次は0に戻ります）), legend badges, tile grid.
3. 今日の関節痛は？（関節ごと）— same structure; the description notes
   joints use a stricter standard than muscle.
4. A primary CTA at the bottom: full width, padding 16px (58px tall),
   radius 8px, #2dd4bf fill, bold 16px #052e2b text. It reads
   コンディションを保存 while there are unsaved pain edits; once the save
   succeeds it turns into ワークアウトを開始, which creates today's
   session first if none exists yet and then switches to the
   ワークアウト tab (if creation is blocked by a warning sign or a
   rest day, the ワークアウト tab's empty state shows the reason), and
   editing any pain value after saving flips it back to
   コンディションを保存. When today's session is completed it reads
   今日の結果を見る and leads to レポート. Under it, the assessment
   box (care / rest-day / OK), then any guidance and 24-hour-rule
   notice boxes.

Legend badges (small dark-teal #19534c pills, white bold text, above each
tile grid):
- Muscle: 0–1 通常 / 2 軽減 / 3以上 除外 / 4以上 ×2部位 休養
- Joints: 0–1 通常 / 2 軽減 / 3以上 除外 / サインあり 受診目安

Pain tiles (2-column grid, gap 8px):
- Card #232323, radius 11px, padding 10px 12px, min-height 74px, no
  border; each tap adds 1 (0–5, then back to 0). Muscle parts (10):
  胸・肩・上腕・前腕・背中・脚（前）・脚（後ろ）・お尻・ふくらはぎ・腹筋・体幹.
  Joints (7): 腰・肩・肘・手首・股関節・膝・足首.
- Inside each tile: part name (15px bold white) at top-left, the level
  as a 34px Barlow Condensed numeral in white at top-right; second row:
  the level word in 12px gray (0 なし / 1 軽い / 2 普通 / 3 強い /
  4 かなり強い / 5 激しい） at the left, and 5 tick segments at the
  right — each tick 14×5px, radius 2px, gap 3px; the first "level"
  ticks light in #2dd4bf, the rest stay #292929.
- Tile background deepens through dark teal shades with the level:
  0 #232323, 1 #17312c, 2 #17453c, 3 #1a5a4c, 4 #20806c, 5 #2dd4bf.
  At level 5 the numeral and level word turn #052e2b, lit ticks turn
  #052e2b, and unlit ticks become rgba(5,46,43,0.25); the part name
  stays white at every level.

Required progress elements (do not omit):
- A week dot row at the top of the Workout screen: the seven weekday
  letters (Mon–Sun) spread evenly in 34px-wide cells, each letter
  (12px gray) over a dot, with NO day numbers. An ordinary day's dot
  is a 9px circle with a 2px #333333 outline. A day with a completed
  session gets a filled #2dd4bf dot. Today gets a #2dd4bf bold letter
  and an 18px circle with a 2px #2dd4bf outline (filled #2dd4bf if
  today also has a completed session). Do NOT turn this into week
  boxes (letters + day numbers in bordered boxes) — the boxes are not
  part of the original design.
- A ring gauge under the dot row: a 150×150px SVG ring (radius 62,
  stroke width 13, track #2d2d2d, arc #2dd4bf, round line cap),
  centred, with the completed-exercise COUNT as a 62px Barlow
  Condensed numeral at the centre and "／ total 種目完了" in 12px gray
  under it. Then the session title centred in bold white
  (rotation letter + title, e.g. B 背中 + 脚裏 + 体幹） with あと○種目
  (exercises remaining) in small gray under it; adjustment notes sit
  quietly under the title in small text. Then exactly three metrics in
  the same numeral font, divided by hairlines: exercise count （種目）,
  completed sets / total sets （セット）, and cumulative completed
  sessions （累計回）.

Other components:
- Cards: #232323 fill, thin #2d2d2d outline, radius 12px, padding 14px.
- Ordinary buttons: #232323 fill, white text, radius 8px.
- Forms are uniform on the settings/profile screen: every field (text,
  numeric, select, textarea) has the same height (42px), radius (8px),
  padding, #1a1a1a fill, #2d2d2d outline, white text and 16px font;
  labels sit above fields in a regular grid with even gaps. The
  workout cards follow their own spec above (black fields, uniform
  within the card).
- Dates appear ONLY in two shapes: the header's M/D（曜） and the
  history list's single-line MM/DD(曜） date (e.g. 11/13(金）). Never
  print a full date (YYYY-MM-DD etc.) anywhere, including inside
  reason texts.
- The settings screen's delete confirmation is a separate block stacked
  below the delete button in normal flow (with a cancel button) — never
  overlaid on the button, never a native confirm() dialog.
- Notice boxes (1px border, radius 10px, padding 10px). Warning
  (red flag / care / rest day): border #ef4444, fill #2a0f0f, text
  #fecaca — red is used only here and in destructive actions. OK box
  (start allowed, session completed): border #19534c, fill #0b2420,
  text #99f6e4. Caution box (duration and 24-hour-rule guidance only):
  border #92400e, fill #241a08, text #fde68a. Error text: #f87171.

Decision engine (required, not optional decoration):
- Keep a dated pain history (per muscle part and per joint) and judge the
  24-hour rule automatically: if a part used by the last completed session
  has not returned to its pre-session pain level by the next day, flag it
  as overloaded — reduce it next session, do not progress it, and show
  the reason in the adjustment notes.
- Count consecutive unresolved days per part: muscle soreness at 5+ days
  and joint pain at 14+ days show see-a-doctor guidance, joint pain at 7+
  days shows a caution. Guidance never blocks a start; only red flags do.
- Apply joint pain through an explicit joint-to-muscle-part table as well
  as the joints each exercise loads directly: lower back → legs and core
  (squats, hinges, leg raises, planks); shoulders → all pushing; elbows →
  pushing and pulling; wrists → pushing and planks; hips, knees, ankles →
  legs (knees and ankles include calf jumps). Level 2 reduces the mapped
  parts, level 3+ excludes them, with the reason shown.

Screens:
- Workout: with no session yet, the screen shows either a short note
  with a コンディションを入力 button (today's condition not entered yet —
  this takes priority over the create guidance) or the text
  今日のセッションはまだありません。 with a 今日のワークアウトを作る CTA and an
  error line under it. Otherwise: the week dot row, ring gauge, title,
  and metrics above, then
  one card per exercise on a #1a1a1a fill (darker than the pain tiles),
  radius 12px, no border, padding 18px 20px. Card layout: top-left the
  muscle group in small gray; under it the VARIATION name as the large
  bold white heading (the variation alone, e.g.
  プローンWレイズ（トップで止める）, スーパーマンホールド, 膝曲げレッグレイズ —
  if the variation equals the exercise name, the name alone); under
  that 目標 ○セット × ○回 (or ○秒） in small gray, then the form cue in
  small gray. Top-right: the total target (target × sets) as a large
  Barlow Condensed numeral in gray #9ca3af, with 合計回 / 合計秒 in
  small gray under it. Set inputs: one cell per set — a small centred
  gray label (1セット目, 2セット目, …) over a near-black #0f0f0f box,
  radius 8px, centred bold white digits, cells evenly split across the
  card. The set inputs of an exercise that has not been recorded yet
  are pre-filled with the target reps/seconds; the user keeps or
  overwrites them, and saving reads the input values. Then a hairline
  divider; きつさ RPE as a label plus a black select with exactly ten
  options — 未入力, 6（かなり楽）, 6.5（楽）, 7（やや楽）, 7.5（少しきつい）,
  8（きつい）, 8.5（かなりきつい）, 9（とてもきつい）, 9.5（ほぼ限界）,
  10（限界） — shown in the same value（word） form when selected, with
  no 6 以下 option; the saved value is the bare number. Then
  この種目のメモ（任意） as a bold small label over a
  black input (placeholder 例：フォームが崩れた／左側がきつかった）, with
  次回、この種目にだけ反映されます。 in small gray under it. Timed
  exercises (seconds) also get a countdown timer on the card, styled
  as a black box: starts from the target seconds, start / pause /
  reset buttons and a remaining-time bar; on zero it turns teal and
  beeps (WebAudio). The timer never writes to the record — the inputs
  stay manual. The card ends with a full-width #2dd4bf button
  記録して完了 (dark bold text) that saves the sets / RPE / note with
  completed = true and updates the gauge and metrics; a recorded
  exercise's button reads 記録を更新 — that label is the only
  distinction. After the last card, a finish-area card (#1a1a1a) holds
  a full-width #2dd4bf button 今日のトレーニングを完了する and, under
  it, a centred underlined gray link このワークアウトを取り消す; cancelling
  asks inline (取り消す / やめる in place, never a native dialog), then
  deletes today's session and returns to the condition state.
- Report (results are merged into this screen — there is no separate
  Result screen; completing a session and the condition screen's
  今日の結果を見る CTA both land here): a quiet list, newest first,
  entries separated by hairlines, NOT cards. Each entry — left: the
  date as a single line, 11/13(金） (zero-padded month/day, weekday in
  half-width parentheses; numerals in Barlow Condensed at 17px, sized
  to sit with the 16px list text); centre: the rotation name in bold
  white (e.g. A 押す + 脚）, any pain adjustment note in small #2dd4bf
  text, then one row per exercise: name in white, variation and
  （RPE 8 きつい） in gray on the same line, the logged sets right-aligned
  (6 / 6 回, 41 / 41 秒, sets joined with " / "), and any per-exercise
  note under its exercise in small gray as 種目メモ： …; right: the
  session total as a large Barlow Condensed numeral plus a small レップ.
  Under each entry, a small dark pill 記録を編集 button (padding
  5px 14px, radius 999px, 12px bold) replaces the rows in place with
  one generic card per exercise (#232323 fill, 1px #2d2d2d border,
  radius 12px, padding 14px): heading 名前（バリエーション）, a small gray
  target line and cue, generic set inputs (64px wide), an RPE text
  input (76px) labelled RPE（1〜10、あと何回できたか）, a 完了 checkbox,
  and a full-width note input; a 修正を保存 pill under the cards saves. RPE words: 6 かなり楽，
  6.5 楽， 7 やや楽， 7.5 少しきつい, 8 きつい, 8.5 かなりきつい, 9 とてもきつい,
  9.5 ほぼ限界， 10 限界.
- Settings (via the gear button): a quiet ← ホームに戻る back button at
  the top-left, then the profile form (uniform grid fields) and
  the data reset with the stacked confirmation described above.

Labels are in Japanese. Do not change the workout logic, the pain rules,
or any saved data while doing design work.
```

## License

MIT License — see `LICENSE`.
