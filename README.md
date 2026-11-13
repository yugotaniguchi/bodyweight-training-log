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

1. **Settings**: Enter your profile (age, sex, height, weight, and so on) in the Settings tab. The app ships with no one's data in it.
2. **Pain check**: First tap any warning signs (red flags) that apply — they are chips at the top. Then set muscle soreness by body part and joint pain (lower back, shoulders, elbows, wrists, hips, knees, ankles) from 0 to 5 by tapping the tiles: each tile shows the level as a big numeral, a level word, and 5 tick segments that light up teal, and the tile background deepens through dark teal shades as the level rises. Dark-teal legend badges above each grid summarise the thresholds. If the same pain has been recorded for many days in a row, a caution or see-a-doctor note appears here (it never blocks a start — only red flags do).
3. **Workout menu**: "Create today's workout" builds a session from today's condition and your history. Sessions rotate A (push + legs) → B (back + posterior legs + core) → C (full body). The first 6 sessions are an introductory period with easier variations and fewer sets.
4. **Logging**: For each exercise, enter the reps you did (seconds for timed exercises), RPE, and completion. The rep fields do not keep a leading zero. Each exercise also has a note field that affects only that exercise; there is no session-wide note. Timed exercises (planks and the like) have a countdown timer on the card — start it at the target seconds, pause or reset as needed, and watch the remaining-time bar; it beeps and turns teal when time is up. The timer never writes to the record: what you type is what gets saved.
5. **Results and history**: The Results tab shows the day's totals. In History you can open a past session and fix sets, RPE, completion, and exercise notes. Edits update the totals and feed into the next session's decisions.

The app is **dark-themed** — near-black background, white text, gray secondary text, one bright teal accent — and follows the design rules in [DESIGN.md](DESIGN.md), which were measured from the original space. Every screen opens with a header: the date and the purpose line (`器具なし / 筋力・筋肥大`) on the left, and on the right a huge **Day N** numeral (N = days since your first recorded session) over the cumulative rep count from your session history. Under it, a row of **week dots (Mon–Sun, current week)** shows which days have a completed session (filled teal; today gets a strong outline). The Menu and Results screens open with a **ring gauge** — completed exercises out of the total, with the big number in the centre — and three metrics under it: exercise count, set count, and total reps. All large numerals (Day count, gauge, metrics, pain-tile levels, totals, timers, history dates) use the **Barlow Condensed** typeface, falling back to the system font when it cannot be loaded.

## How the next workout is decided

Priority order: **pain rules > exercise notes > zero-rep swaps > RPE adjustment**.

- **Exercises you cannot do at all**: If you logged 0 on every set, or the exercise note says you could not do it, the next session first drops that exercise one step down its difficulty ladder (for example, push-ups → knee push-ups). If it is already at the easiest step, it is swapped for another exercise for the same body part, or a simpler one such as wall push-ups. The reason is shown in the workout's adjustment notes.
- **Exercise notes**: Notes are read per exercise. "Hard" holds progression and reduces the load, "easy" adds more, "just right" keeps things as they are, and "pain" or "discomfort" reduces the load. A note never affects other exercises.
- **RPE and completion rate**: The size of the change depends on the previous RPE and the completion rate (actual ÷ target). Low RPE with the target met adds more (+3 reps, or +25% for timed exercises), the mid range (RPE 7–8.5) adds +1 (+10% for timed), and high RPE keeps the load or reduces it. Variations also move: one step up the ladder when RPE is low and the target was met or beaten, one step down when RPE is high and completion was low — at most one step per session. Timed exercises change by percentage, rounded to 5-second steps.
- **Joint → muscle-part mapping**: Joint pain also reaches exercises through an explicit mapping, on top of the joints each exercise loads directly. Lower back → legs and core (squats, hinges, leg raises, planks); shoulders → all pushing work; elbows → pushing and pulling work; wrists → pushing and plank work; hips, knees, and ankles → leg work (knees and ankles include calf jumps). Level 2 reduces the mapped parts, level 3 or higher excludes them, and the menu note names the joint and the mapped part.
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
- To reset, use "Reset all data" in the Settings tab, or delete `data/store.json` and restart.
- To back up, just copy `data/store.json`.

## Recreate the look in Muse

The standalone app above is plain HTML/CSS. Its look is specified in [DESIGN.md](DESIGN.md) — a dark theme with one bright teal accent, measured from screenshots of the original space. If you use [Muse](https://muse.ai) and want a space that looks like the original, copy the prompt below and paste it into Muse together with your request to build the space. The specific values matter — without them you will get a generic fitness-app look instead.

```text
Build a bodyweight training log space. Match this design exactly:
Follow DESIGN.md in this repository for the exact tokens — it was measured
from the original space's screenshots and wins over anything below if they
differ.

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
- Right: the word "Day" in small bold gray, then the day count as a huge
  Barlow Condensed numeral in white; under it, small gray
  累計 ○○ レップ (cumulative reps summed from the session history).

Navigation:
- A row of segment buttons (radius about 8px, small gaps) — NOT pills and
  NOT a sidebar. Active segment: #2dd4bf fill with #052e2b bold text.
  Inactive: #232323 fill, white text. Labels: 痛みの記録 / メニュー /
  これまでの記録 (plus 結果 / 設定 if the app has those views; wrapping is
  fine).

Typography:
- Body: system-ui, sans-serif, 15–16px, line height about 1.6.
- ALL large numerals use Barlow Condensed (Google Fonts; system-ui
  fallback): the Day number, pain-tile level numbers, ring-gauge centre,
  the three metrics, totals, timer digits, history dates.
- Headings bold white (about 17px); descriptions small gray. Keep text
  minimal — show things as UI (badges, ticks, bars, gauges), explain only
  where a decision needs it.

Pain check screen (in this order):
1. まず、警告サインの確認 — heading, gray description, then the red flags as
   CHIPS (not checkboxes): pill shape, thin #2d2d2d outline, #1a1a1a fill,
   gray label text, wrapping in rows.
2. 今日の筋肉痛は？（部位ごと）— heading, gray description
   (タップで強度が上がります（5の次は0に戻ります）), legend badges, tile grid.
3. 今日の関節痛は？（関節ごと）— same structure; the description notes
   joints use a stricter standard than muscle.
4. A primary CTA at the bottom: full width, large height, radius about
   8px, #2dd4bf fill, bold #052e2b text (on this screen in the original
   it reads 今日の結果を見る）.

Legend badges (small dark-teal #19534c pills, white bold text, above each
tile grid):
- Muscle: 0–1 通常 / 2 軽減 / 3以上 除外 / 4以上 ×2部位 休養
- Joints: 0–1 通常 / 2 軽減 / 3以上 除外 / サインあり 受診目安

Pain tiles (2-column grid, gap about 8px):
- Card #232323, radius about 10–12px; each tap adds 1 (0–5, then back
  to 0). Muscle parts (10): 胸・肩・上腕・前腕・背中・脚（前）・脚（後ろ）・
  お尻・ふくらはぎ・腹筋・体幹. Joints (7): 腰・肩・肘・手首・股関節・膝・足首.
- Inside each tile: part name bold white at top-left; under it the level
  word in small gray (0 なし / 1 軽い / 2 普通 / 3 強い / 4 かなり強い /
  5 激しい）; top-right the level as a large Barlow Condensed numeral in
  white; bottom-right 5 small tick segments — the first "level" ticks
  light in #2dd4bf, the rest stay #292929.
- Tile background deepens through dark teal shades with the level:
  1 #17312c, 2 #17453c, 3 #1a5a4c, 4 #20806c, 5 #2dd4bf with #052e2b
  text. Level 0 is the plain card colour.

Required progress elements (do not omit):
- Week dots under the header on every screen: 7 cells Mon–Sun of the
  current week (Asia/Tokyo, Monday start), weekday + date number. A day
  with a completed session is filled #2dd4bf (dark text); today gets an
  accent outline.
- A ring gauge at the top of the Menu and Result screens: SVG circle,
  track #2d2d2d, arc #2dd4bf, completed/total fraction in Barlow Condensed
  at the centre. Under it exactly three metrics in the same numeral font:
  exercise count, set count, total reps.

Other components:
- Cards: #232323 fill, thin #2d2d2d outline, radius 12px, padding 14px.
- Ordinary buttons: #232323 fill, white text, radius 8px.
- Inputs: #1a1a1a fill, #2d2d2d outline, white text, radius 8px, 16px font.
- Warning (red flag) box: red border #ef4444, dark red fill #2a0f0f,
  pale red text #fecaca — the only red in the UI.

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
- Menu: one card per exercise — name, variation, target sets × reps (or
  seconds), a short form cue, set inputs, an RPE input, and a per-exercise
  note field. Adjustment reasons are shown as a short note, not a
  paragraph. Timed exercises (seconds) also get a countdown timer on the
  card: starts from the target seconds, start / pause / reset buttons and
  a remaining-time bar; on zero it turns teal and beeps (WebAudio). The
  timer never writes to the record — the inputs stay manual.
- Result: the ring gauge and three metrics first, then the day's totals
  as big numbers, per-exercise results, and the next rotation.
- History: a quiet list by date (dates in Barlow Condensed); each session
  opens for viewing and editing.

Labels are in Japanese. Do not change the workout logic, the pain rules,
or any saved data while doing design work.
```

## License

MIT License — see `LICENSE`.
