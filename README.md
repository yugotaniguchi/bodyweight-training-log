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
2. **Pain check**: Set muscle soreness by body part and joint pain (lower back, shoulders, elbows, wrists, hips, knees, ankles) from 0 to 5 by tapping. The tiles deepen through teal shades as the level rises. Tick any warning signs (red flags) that apply. If the same pain has been recorded for many days in a row, a caution or see-a-doctor note appears here (it never blocks a start — only red flags do).
3. **Workout menu**: "Create today's workout" builds a session from today's condition and your history. Sessions rotate A (push + legs) → B (back + posterior legs + core) → C (full body). The first 6 sessions are an introductory period with easier variations and fewer sets.
4. **Logging**: For each exercise, enter the reps you did (seconds for timed exercises), RPE, and completion. The rep fields do not keep a leading zero. Each exercise also has a note field that affects only that exercise; there is no session-wide note. Timed exercises (planks and the like) have a countdown timer on the card — start it at the target seconds, pause or reset as needed, and watch the remaining-time bar; it beeps and turns teal when time is up. The timer never writes to the record: what you type is what gets saved.
5. **Results and history**: The Results tab shows the day's totals. In History you can open a past session and fix sets, RPE, completion, and exercise notes. Edits update the totals and feed into the next session's decisions.

At the top of every screen, a row of **week dots (Mon–Sun, current week)** shows which days have a completed session (filled teal; today gets a strong outline), next to a **"Day N"** label counting days since your first recorded session. The Menu and Results screens open with a **ring gauge** — completed exercises out of the total, with the big number in the centre — and three metrics under it: exercise count, set count, and total reps. All large numerals (gauge, metrics, pain-tile levels, totals, timers, history dates) use the **Barlow Condensed** typeface, falling back to the system font when it cannot be loaded.

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

The standalone app above is plain HTML/CSS. If you use [Muse](https://muse.ai) and want a space that looks like the original this project is based on, copy the prompt below and paste it into Muse together with your request to build the space. The specific values matter — without them you will get a generic fitness-app look instead.

```text
Build a bodyweight training log space. Match this design exactly:

Before designing, open https://recent.design in the live browser and check current
minimal, light, single-accent app examples for direction. Use it as reference
only — do not copy any featured images or artwork into the result.

Visual design:
- Light theme, minimal. Background white / very light neutral, text dark.
  Do not use a dark, heavy "gym" look, gradients, or multiple accent colors.
- Exactly one accent color: teal #0f766e. Use it for the active tab, primary
  buttons, links, progress bars, and the OK/info box border and tint (#f0fdfa
  background, #134e4a text). Everything else stays neutral gray.
- Font: system-ui, sans-serif for body text (15–16px, line height about 1.6).
  All large numerals — the ring-gauge centre, the metrics, pain-tile levels,
  totals, timer digits, history dates — use Barlow Condensed (Google Fonts),
  falling back to system-ui when it cannot be loaded. Numerals are large and
  easy to scan.
- Layout: single column, mobile-first (it is mainly used on an iPhone),
  comfortable side padding, generous spacing between blocks.
- Components: one card per block — thin neutral border (about #8885),
  border radius 12px, padding about 14px. Navigation is a row of pill buttons
  (border radius 999px, thin border); the active pill is filled teal with
  white text. Inputs have radius 8px. Group the main action buttons at the
  bottom of each screen.
- Keep text minimal: show what can be shown as UI — icons, badges, bars,
  buttons, gauges — instead of sentences. Add explanations only where they
  are needed for a decision (the pain rules and references go in one short
  section at the end, small type, muted).

Flow (4 screens, in this order, plus History):
1. Pain check → 2. Workout menu → 3. Result, and a separate History screen.
   Move to the menu when the pain check is done, and to the result when the
   workout is completed. Navigation buttons let the user move between screens
   at any time.

Required header and progress elements (do not omit these):
- Week dots at the top of every screen: 7 dots for Mon–Sun of the current
  week (Asia/Tokyo, week starting Monday). A day with a completed session is
  filled teal; today gets a strong teal outline. Next to the dots, a "Day N"
  label (N = days since the first recorded session) in Barlow Condensed,
  with the total session count under it.
- A ring gauge at the top of the Menu and Result screens: an SVG circle
  showing completed exercises out of the total, the fraction in Barlow
  Condensed at the centre, the arc in teal #0f766e. Under it, exactly three
  metrics in the same numeral font: exercise count, set count, total reps.

Decision engine (required, not optional decoration):
- Keep a dated pain history (per muscle part and per joint) and judge the
  24-hour rule automatically: if a part used by the last completed session
  has not returned to its pre-session pain level by the next day, flag it as
  overloaded — reduce it next session, do not progress it, and show the
  reason in the adjustment notes.
- Count consecutive unresolved days per part: muscle soreness at 5+ days and
  joint pain at 14+ days show see-a-doctor guidance, joint pain at 7+ days
  shows a caution. Guidance never blocks a start; only red flags do.
- Apply joint pain through an explicit joint-to-muscle-part table as well as
  the joints each exercise loads directly: lower back → legs and core
  (squats, hinges, leg raises, planks); shoulders → all pushing; elbows →
  pushing and pulling; wrists → pushing and planks; hips, knees, ankles →
  legs (knees and ankles include calf jumps). Level 2 reduces the mapped
  parts, level 3+ excludes them, with the reason shown.

Pain check UI:
- Muscle soreness (by body part) and joint pain (lower back, shoulders,
  elbows, wrists, hips, knees, ankles) are set by tapping: each tap adds 1,
  from 0 to 5. Each part is a tappable tile showing the part name and the
  current level as a big number.
- The tile color deepens through TEAL shades with the level (never a
  yellow-to-red heat scale): level 1 #f0fdfa, level 2 #ccfbf1, level 3
  #99f6e4, level 4 #5eead4 (dark text), level 5 #0f766e with white text.
  Level 0 is plain/transparent. Red is reserved for the warning box below.
- Warning (red flag) state: a box with red border (#ef4444), pale red
  background (#fef2f2), dark red text (#7f1d1d).

Screens:
- Menu: one card per exercise — name, variation, target sets × reps (or
  seconds), a short form cue, set inputs, an RPE input, and a per-exercise
  note field. Adjustment reasons for the next session are shown as a short
  note, not a paragraph. Timed exercises (seconds) also get a countdown
  timer on the card: it starts from the target seconds, with start / pause /
  reset buttons and a remaining-time bar; on zero it turns teal and beeps
  (WebAudio). The timer never writes to the record — the inputs stay manual.
- Result: the ring gauge and three metrics first, then the day's totals as
  big numbers, per-exercise results, and the next rotation.
- History: a quiet list by date; each session opens for viewing and editing.

Labels are in Japanese. Do not change the workout logic, the pain rules, or
any saved data while doing design work.
```

## License

MIT License — see `LICENSE`.
