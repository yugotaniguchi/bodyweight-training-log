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
2. **Pain check**: Set muscle soreness by body part and joint pain (lower back, shoulders, elbows, wrists, hips, knees, ankles) from 0 to 5 by tapping. Tick any warning signs (red flags) that apply.
3. **Workout menu**: "Create today's workout" builds a session from today's condition and your history. Sessions rotate A (push + legs) → B (back + posterior legs + core) → C (full body). The first 6 sessions are an introductory period with easier variations and fewer sets.
4. **Logging**: For each exercise, enter the reps you did (seconds for timed exercises), RPE, and completion. The rep fields do not keep a leading zero. Each exercise also has a note field that affects only that exercise; there is no session-wide note.
5. **Results and history**: The Results tab shows the day's totals. In History you can open a past session and fix sets, RPE, completion, and exercise notes. Edits update the totals and feed into the next session's decisions.

## How the next workout is decided

Priority order: **pain rules > exercise notes > zero-rep swaps > RPE adjustment**.

- **Exercises you cannot do at all**: If you logged 0 on every set, or the exercise note says you could not do it, the next session first drops that exercise one step down its difficulty ladder (for example, push-ups → knee push-ups). If it is already at the easiest step, it is swapped for another exercise for the same body part, or a simpler one such as wall push-ups. The reason is shown in the workout's adjustment notes.
- **Exercise notes**: Notes are read per exercise. "Hard" holds progression and reduces the load, "easy" adds more, "just right" keeps things as they are, and "pain" or "discomfort" reduces the load. A note never affects other exercises.
- **RPE and completion rate**: The size of the change depends on the previous RPE and the completion rate (actual ÷ target). Low RPE with the target met adds more (+3 reps, or +25% for timed exercises), the mid range (RPE 7–8.5) adds +1 (+10% for timed), and high RPE keeps the load or reduces it. Variations also move: one step up the ladder when RPE is low and the target was met or beaten, one step down when RPE is high and completion was low — at most one step per session. Timed exercises change by percentage, rounded to 5-second steps.

## Decision rules and references

- If any red flag applies, the day is a **no-start day**; treat it as a sign to seek medical care.
- Muscle soreness: level 2 means train with a reduced load and no progression; level 3 or higher excludes that body part.
- Joint pain is judged more strictly: level 2 reduces the load, level 3 or higher excludes it.
- A full rest day happens only when level 4 or higher soreness is present in **2 or more body parts**.
- **24-hour rule**: If pain has not returned to its baseline by the next morning, the previous load was probably too high. Soreness that does not improve in 5 days, or joint pain that does not improve in 1–2 weeks, is a sign to get checked.
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
- Font: system-ui, sans-serif. Body text 15–16px, line height about 1.6.
  Numbers (totals, counts, progress) are large and easy to scan.
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

Pain check UI:
- Muscle soreness (by body part) and joint pain (lower back, shoulders,
  elbows, wrists, hips, knees, ankles) are set by tapping: each tap adds 1,
  from 0 to 5. Each part is a tappable tile showing the part name and the
  current level as a big number.
- The tile color deepens with the level: level 1 #fef9c3, level 2 #fde68a,
  level 3 #fdba74, level 4 #fca5a5, level 5 #ef4444 with white text.
  Level 0 is plain/transparent.
- Warning (red flag) state: a box with red border (#ef4444), pale red
  background (#fef2f2), dark red text (#7f1d1d).

Screens:
- Menu: one card per exercise — name, variation, target sets × reps (or
  seconds), a short form cue, set inputs, an RPE input, and a per-exercise
  note field. Adjustment reasons for the next session are shown as a short
  note, not a paragraph.
- Result: the day's totals as big numbers, per-exercise results, and the
  next rotation.
- History: a quiet list by date; each session opens for viewing and editing.

Labels are in Japanese. Do not change the workout logic, the pain rules, or
any saved data while doing design work.
```

## License

MIT License — see `LICENSE`.
