# bodyweight-training-log

A standalone web app for no-equipment bodyweight training. It logs your workouts and builds the next session from your pain check, past results, RPE, and per-exercise notes. No account or external service is required, and your data stays on your own machine.

## ⚠️ 注意 — 必ず読んでください / Caution — read this first

> **このアプリとリポジトリは、専門家が作成したものではありません。作者個人が自分用に作ったものです。**
>
> - トレーニング内容、痛みの判定基準、負荷の調整方法などについて、**医学的・科学的なエビデンスや正確性の保証は一切ありません**。参考文献として挙げている資料の解釈や数値の当てはめも、個人の判断によるものです。
> - このリポジトリは **あくまでUIと実装の参考** として公開しています。見た目や仕組みの参考に使うことを想定したもので、そのままの内容で運動や健康判断を行うことを推奨するものではありません。
> - 実際に使う場合は、**自分のデータ、自分の信頼できる資料、必要に応じて専門家の助言で内容を補完・検証してから** 使ってください。
> - このアプリは医療アドバイスの代わりにはなりません。警告サインに当てはまる場合は運動を中止し、医療機関に相談してください。
> - このプログラムの使用によって生じたいかなる損害・不利益についても、作者は一切の責任を負いません。利用は自己責任でお願いします。（MIT ライセンスに含まれる無保証・免責条項の再確認です。）

> **This app and repository were not created by a professional or expert. They were built by an individual, for personal use.**
>
> - There is **no guarantee of medical or scientific evidence or accuracy** for the training content, the pain criteria, or the load-adjustment rules. How the cited references are interpreted and applied is one person's judgment.
> - This repository is published **as a UI and implementation reference only**. It is not a recommendation to train or make health decisions based on its content as-is.
> - If you use it, **supplement and verify the content with your own data, sources you trust, and professional advice where needed**.
> - This app does not replace medical advice. If a warning sign applies to you, stop and talk to a medical professional.
> - The author takes no responsibility or liability for any damage or loss arising from the use of this program. Use it at your own risk. (This restates the warranty disclaimer already in the MIT License.)

## Install and run

All you need is [Bun](https://bun.sh). There are no package dependencies, so `bun install` is not required.

```bash
git clone https://github.com/yugotaniguchi/bodyweight-training-log.git
cd bodyweight-training-log
bun run server.ts
```

Open http://localhost:3000 in your browser. To use a different port, run `PORT=8080 bun run server.ts`.

On a phone, the browser's "Add to Home Screen" installs it like an app: the app ships a web app manifest (`自重トレーニング記録` / `自重トレ`, standalone display, near-black theme) and icons drawn as its ring-gauge motif. The icon PNGs are embedded in the server as base64 (`src/icons.ts`) and served at the usual `/icon-*.png` paths, so the repository itself stays text-only. There is intentionally **no service worker** — the app is useless without its server, so an offline shell would only pretend otherwise.

### Optional token authentication

By default there is no login at all. If you want a password gate — for example when the app is reachable from your LAN — start the server with a token:

```bash
BTL_TOKEN=your-secret-token bun run server.ts
```

With `BTL_TOKEN` set, every page and API route requires login: the browser is redirected to a minimal token form, and a correct token sets an HttpOnly cookie (30 days) that opens the app. A wrong token gets one generic refusal. With the variable unset, nothing changes — no login anywhere. (This is a simple shared-token gate for personal use, not an account system; still do not expose the app directly to the internet.)

### Run with Docker

```bash
docker compose up --build
```

The app is then available at http://localhost:3000, and data is kept in `./data`.

### Development and tests

```bash
bun test          # logic + validation unit tests, and API / scenario / auth tests against a real server
bun --watch run server.ts
```

## How to use it

1. **Settings**: Enter your profile (age, sex, height, weight, and so on) via the small gear button fixed at the top-right — a muted line icon, shown only on the condition and settings screens; settings is not a tab. A quiet **← ホームに戻る** button at the top-left of the settings screen takes you back. All the form fields share one size and style, labels above fields on a regular grid. The app ships with no one's data in it. The settings screen also holds the UI language switch （日本語 / English) and the theme switch （ダーク / ライト / システム — see the theme paragraph below).
2. **Condition**: First tap any warning signs (red flags) that apply — they are chips at the top. Then set muscle soreness by body part and joint pain (lower back, shoulders, elbows, wrists, hips, knees, ankles) from 0 to 5 by tapping the tiles: each tile shows the level as a big numeral, a level word, and 5 tick segments that light up teal, and the tile background deepens through dark teal shades as the level rises. Dark-teal legend badges above each grid summarise the thresholds. If the same pain has been recorded for many days in a row, a caution or see-a-doctor note appears here (it never blocks a start — only red flags do). The one primary button, **保存してワークアウトを開始**, does everything: it saves the check, creates today's session on the spot if none exists yet, and takes you to the workout tab (if creation is blocked by a warning sign or a rest day, the workout tab shows the reason). Saving is also how a changed check takes effect mid-workout: **every save rebuilds the day's planned session around what you have already recorded** — recorded exercises stay exactly as they are, and the remaining slots are re-planned under the new assessment (a newly excluded part drops out, a newly reduced one gets the reduced target, a cleared one comes back; on a warning-sign or full-rest day only the recorded part stays). A completed session is never rebuilt.
3. **Workout**: "Create today's workout" builds a session from today's condition and your history. Sessions rotate A (push + legs) → B (back + posterior legs + core) → C (full body). The first 6 sessions are an introductory period with easier variations and fewer sets. A session belongs to the day it was started: if midnight passes with a session unfinished, this tab keeps showing that session — labelled with its own date — and you can record and finish it as that day's session; it never merges into the new day, whose condition check and session are separate. All dates are judged by the server's clock (Asia/Tokyo), never the device's. If you open this tab before entering today's condition, it shows a short note and a **コンディションを入力** button back to the condition tab instead of the create button. The workout screen opens with a **week dot row** (Mon–Sun: a filled teal dot for days with a completed session, a teal ring for today — no day numbers), a **ring gauge** (completed exercises as a big central numeral, with the total under it), the session title with how many exercises remain, and three metrics: exercise count, completed/total sets, and cumulative completed sessions. The tabs are real browser history entries with their own URLs (`/`, `/workout`, `/report`, `/settings`), so Back/Forward move between screens and each screen's scroll position is restored when you return to it.
4. **Logging**: Each exercise is a card headed by its variation name, with the total target at the top-right. The set fields — black boxes in an even row — start out **pre-filled with the target** (reps, or seconds for timed exercises): keep them, or overwrite with what you actually did. The RPE select likewise starts at that exercise's most recent recorded RPE when one exists (the note field is never pre-filled). RPE is a select with exactly ten options — `未入力`, then `6（かなり楽）`, `6.5（楽）`, `7（やや楽）`, `7.5（少しきつい）`, `8（きつい）`, `8.5（かなりきつい）`, `9（とてもきつい）`, `9.5（ほぼ限界）`, `10（限界）` — and only the number is saved. Unilateral exercises (シングルレッグRDL and リバースランジ — the latter's variations include スプリットスクワット and ブルガリアンスクワット) show **two inputs per set, labelled 左 and 右**, and are recorded per side; the set is stored as a left/right pair, the exercise total is both sides added together, and the report shows each set's sides (左11 / 右10). Each exercise also has a note field that affects only that exercise; there is no session-wide note. Until you save a card, its typed values are kept as a **draft in the browser** (localStorage, keyed by date and session), so a reload or an accidental tab switch loses nothing; the draft is restored onto unrecorded cards only, and it disappears once the exercise is saved or the session is completed or cancelled. The card's **記録して完了** button saves that exercise and advances the gauge; a recorded exercise's button becomes 記録を更新. Timed exercises (planks and the like) have a countdown timer on the card — start it at the target seconds, pause or reset as needed, and watch the remaining-time bar; it beeps and turns teal when time is up. The timer is end-time based (it stores the finish moment and always recomputes the remainder), so locking the screen or backgrounding the tab cannot make it drift. The timer never writes to the record: what you type is what gets saved. At the bottom, **今日のトレーニングを完了する** finishes the day, and the underlined **このワークアウトを取り消す** link deletes today's session (after an inline confirmation) so you can start over from the pain check.
5. **Report (results live here too)**: There is no separate results screen. Finishing a session takes you to **レポート**, a quiet list, newest first: the date in one line (`11/13(金)`) on the left, the rotation and one row per exercise in the middle (name in white, variation and RPE word in gray, logged sets right-aligned), any per-exercise notes in small gray, and the session's total reps as a big number on the right. Entries are separated by hairlines, not cards. Above the list sit two quiet summaries — **月別** (sessions and total reps per month, newest first) and **部位別** (performed count and logged total per muscle group) — and a **search field** that filters the entries by exercise name or exercise note (while you search, the summaries step aside). The `記録を編集` button under each entry reopens the entry **with the same exercise cards as the workout tab** — same heading and target block, same set inputs (left/right inputs for unilateral exercises included), the same ten-option RPE select, the same note field — pre-filled with the recorded values and saved per card （記録して完了 / 記録を更新）; `編集を終わる` returns the entry to the list. Edits update the totals and feed into the next session's decisions.

**Loading and failure states**: The app talks only to its own local server, so the fallback UI is deliberately small. The first load shows `読み込み中…`; if it fails, the reason appears with a hint that the server may not be running (including its start command, `bun run server.ts`) and a **再読み込み** button instead of a blank screen. Every button that sends data is disabled while its request runs, and if a save fails, the reason shows as a short error line right under the button and the button works again — nothing fails silently, gets stuck, or submits twice.

**Input validation**: The same rules are checked in the browser before sending and again on the server for every write, so even a hand-crafted request cannot store a broken value — the server answers HTTP 400 with the reason and stores nothing (no silent clamping or truncation). Set reps are integers 0–999 (for a unilateral exercise, each side of a set pair is an integer 0–999); RPE is empty or 6–10 in 0.5 steps; pain levels are integers 0–5; an exercise note is at most 200 characters (longer is a save error); the profile requires an age (integer 10–100), a height (integer 100–250 cm), and a weight (20–300 kg), and its free-text fields are capped at 200 characters; dates are YYYY-MM-DD only. Numeric fields bring up the numeric keypad on iOS/Android (`inputmode="numeric"` / `"decimal"`) while staying `type="text"`, which avoids the old `type="number"` leading-zero display bug. There is no database or SQL, so SQL injection does not apply; user-entered text (notes, profile fields) is always escaped when rendered, so a tag typed into a note displays as literal text and never runs.

**Language**: Settings holds a language switch, 日本語 / English, with Japanese as the default. The choice is saved server-side in the store (`lang`), so it survives reloads and restarts and is the same in every browser — and switching re-renders the whole UI in place, without a reload. All client wording (tabs, headings, buttons, labels, placeholders, empty states, error and network-failure messages, confirm dialogs) comes from a string dictionary with both languages; the texts the server generates — assessment reasons, guidance, progression notes, validation and error reasons — are produced from matching server-side templates in the same language, and so is the login page when token auth is on. Dates keep their MM/DD(weekday) shape with the weekday localized (11/13（金） in Japanese, 11/13(Fri) in English); body-part, joint, muscle-group and difficulty-level words have English display equivalents, while exercise and variation names are training data and are deliberately not translated. Progression notes already saved inside a session keep the language they were generated in; new sessions use the current language.

The app has **dark and light themes** over one teal colour family, chosen in Settings （ダーク / ライト / システム; the default is システム, following the OS `prefers-color-scheme`). The choice is saved server-side in the store (`theme`), applies immediately with no reload, and is mirrored to localStorage so the right theme paints first, with no flash. The dark theme is the original measured look — near-black background, white text, gray secondary text, one bright teal accent (`#2dd4bf`). The light theme keeps the family on white: white cards, near-black text, and a deeper teal accent (`#0f766e`, since the dark accent is only ~1.9:1 on white). Both themes meet universal-design contrast — normal text at least 4.5:1, large numerals at least 3:1 (verified pairs are listed in DESIGN.md) — and the login page and the PWA `theme-color` follow the theme too (the manifest colours stay `#0f0f0f`). The design rules live in [DESIGN.md](DESIGN.md), originally measured from the original space. Every screen opens with a header: the date (only ever shown as `M/D（曜）`) and the purpose line (`器具なし / 筋力・筋肥大`) on the left, and on the right a huge **Day N** numeral (N = days since your first recorded session) over the cumulative rep count from your session history, with a small, muted **gear button** at the very top-right for settings (shown only on the condition and settings screens). The Workout screen carries a **week dot row** — seven dots for Mon–Sun with no day numbers (never week boxes). All large numerals (Day count, gauge, metrics, pain-tile levels, totals, timers, history dates) use the **Barlow Condensed** typeface, falling back to the system font when it cannot be loaded. Dates appear in only two places in the whole app: the header and the history list.

## How the next workout is decided

Priority order: **pain rules > exercise notes > zero-rep swaps > RPE adjustment**.

- **Exercises you cannot do at all**: If you logged 0 on every set, or the exercise note says you could not do it, the next session first drops that exercise one step down its difficulty ladder (for example, push-ups → knee push-ups). If it is already at the easiest step, it is swapped for another exercise for the same body part, or a simpler one such as wall push-ups. The reason is shown in the workout's adjustment notes.
- **Exercise notes**: Notes are read per exercise. "Hard" holds progression and reduces the load, "easy" adds more, "just right" keeps things as they are, and "pain" or "discomfort" reduces the load. A note never affects other exercises.
- **RPE and completion rate**: The size of the change depends on the previous RPE and the completion rate (actual ÷ target). Low RPE with the target met adds more (+3 reps, or +25% for timed exercises), the mid range (RPE 7–8.5) adds +1 (+10% for timed), and high RPE keeps the load or reduces it. Variations also move: one step up the ladder when RPE is low and the target was met or beaten, one step down when RPE is high and completion was low — at most one step per session. Timed exercises change by percentage, rounded to 5-second steps.
- **Unilateral exercises are judged on the weaker side**: for an exercise recorded as left/right pairs, the completion rate counts each set by its smaller side, so a strong side cannot mask a lagging one.
- **Re-saving the condition check rebuilds the remaining menu**: recorded exercises are fixed premises — the rest of the session is re-planned around them under the newest pain assessment (see step 2 above). Completed sessions are never rebuilt.
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

- This is a local app for personal use. It ships without authentication (an optional shared-token gate can be enabled — see "Optional token authentication" above), so do not expose it directly to the internet. Run it on your own computer or home network.
- Dates are judged by the current day in Asia/Tokyo — the server's clock is the only clock; the device's date is never used.
- The pain rules are guidance based on public sources, not a diagnosis.

## Data storage and reset

- Data is stored in `data/store.json` in the folder where you start the server. It is not tracked by Git.
- Writes are atomic (write to a temp file, then rename), and before each overwrite the previous contents are kept as backup generations next to the store: `data/store.backup.1.json` (newest) to `store.backup.3.json`. If the store file is ever found corrupted, the server restores the newest backup that parses and notes the recovery in its log. The server also keeps an event log at `data/server.log` (startup, recoveries, API errors, auth events — never your stored data), rotated at ~256 KB into a single `server.log.1`.
- Every profile save also records its changes (field, before → after, with the time) in the store's profile history, shown read-only on the settings screen under **プロフィール履歴**; the history is part of exports and imports like everything else.
- To reset, use the delete button on the settings screen (behind the gear button) — its confirmation appears as a separate block under the button — or delete `data/store.json` together with its `store.backup.*.json` files and restart.
- To back up, just copy `data/store.json` — or use the settings screen's **エクスポート** button, which downloads the whole store as one JSON file.
- To restore or move your data, use **インポート** on the same screen: pick the JSON file, confirm in the inline block (never a native dialog), and the store is replaced. The file is fully checked first — top-level keys, every record's types, and the same validation rules as normal writes — and a bad file is refused with a reason and replaces nothing. (Exports written before profile history existed import with an empty history; exports written before the theme setting existed import fine too — the theme is an optional field and then defaults to システム.)

## Recreate the look in Muse

The standalone app above is plain HTML/CSS. Its look is specified in [DESIGN.md](DESIGN.md) — dark and light themes over one teal accent family. **Follow DESIGN.md exactly; it is self-contained and needs no other instructions.** No external reference (design gallery, account-level instructions, or anything else) is required, and where anything disagrees with DESIGN.md, DESIGN.md wins. If you use [Muse](https://muse.ai) and want a space that looks like the original, copy the prompt below and paste it into Muse together with your request to build the space. The specific values matter — without them you will get a generic fitness-app look instead.

```text
Build a bodyweight training log space. Match this design exactly:
Follow DESIGN.md in this repository exactly — it is self-contained and
needs no other instructions. It is the only design authority: do not
consult external galleries or examples, and if anything (including this
prompt) disagrees with DESIGN.md, DESIGN.md wins.

Theme (this is the most common mistake — do not get it wrong):
- TWO themes over one teal family, chosen by a settings-screen switch
  （ダーク / ライト / システム）; the default is システム (follow the OS
  prefers-color-scheme). The setting is stored server-side (theme;
  absent means システム）, mirrored to localStorage so it applies
  before first paint with no flash, and switching applies at once
  with no reload. Every colour is a CSS variable with a value per
  theme; the resolved theme sits on <html data-theme="dark|light">.
- DARK (the original): background #0f0f0f (near black), cards #232323,
  card-2 #1a1a1a, border #2d2d2d, text #f0f0f0 (white), secondary text
  #9ca3af (gray), accent bright teal #2dd4bf, text on the accent
  #052e2b (near-black), badge #19534c, unlit tick #292929.
- LIGHT: background #f2f2f0, cards white #ffffff, border #d5d5d1,
  text #1c1e1c (near black), secondary text #5b6066, accent DEEP teal
  #0f766e (the dark accent is only ~1.9:1 on white — never use it on
  light), text on the accent #ffffff, badge #115e59, unlit tick
  #cfd2cd. Notice boxes also have light values (warning border
  #dc2626 / fill #fdeeee / text #7f1d1d; OK fill #e6f4f1 / text
  #0b4f45; caution border #b45309 / fill #fdf3e0 / text #7c2d12;
  error text #b91c1c).
- Contrast (universal design, both themes): normal text at least
  4.5:1, large numerals at least 3:1. Colour is never the only
  channel (levels are also a numeral, a word, and ticks; selection
  also changes border/fill). The :focus-visible outline is the
  accent, visible in both themes.
- No second accent colour, no decorative gradients. Pain levels are
  NEVER a yellow-to-red heat scale. Red appears only in warning /
  red-flag surfaces and destructive actions.

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
   thin #2d2d2d outline, #1a1a1a fill, WHITE #f0f0f0 label text (the
   full text colour, not gray), 13px, wrapping in rows with gap 8px.
   Selected chip: #2dd4bf border, #19534c fill, white text. (Values
   shown for the dark theme; the light theme uses its token set.)
2. 今日の筋肉痛は？（部位ごと）— heading, gray description
   (タップで強度が上がります（5の次は0に戻ります）), legend badges, tile grid.
3. 今日の関節痛は？（関節ごと）— same structure; the description notes
   joints use a stricter standard than muscle.
4. A primary CTA at the bottom: full width, padding 16px (58px tall),
   radius 8px, #2dd4bf fill, bold 16px #052e2b text. It always reads
   保存してワークアウトを開始: one tap saves the condition check,
   creates today's session first if none exists yet, and switches to
   the ワークアウト tab (if creation is blocked by a warning sign or
   a rest day, the ワークアウト tab's empty state shows the reason).
   Every pain save also rebuilds the day's planned session around
   the exercises already recorded (recorded ones are fixed; the rest
   is re-planned under the new assessment; a completed session is
   never rebuilt). When today's session is completed the CTA reads
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
  the level word in 12px WHITE (0 なし / 1 軽い / 2 普通 / 3 強い /
  4 かなり強い / 5 激しい） at the left, and 5 tick segments at the
  right — each tick 14×5px, radius 2px, gap 3px; the first "level"
  ticks light in #2dd4bf, the rest stay #292929.
- Tile background deepens through dark teal shades with the level:
  0 #232323, 1 #17312c, 2 #17453c, 3 #1a5a4c, 4 #20806c, 5 #2dd4bf.
  At level 5 the numeral and level word turn #052e2b, lit ticks turn
  #052e2b, and unlit ticks become rgba(5,46,43,0.25); the part name
  stays white at every level. Light-theme ramp: 0 #ffffff,
  1 #e2f2ec, 2 #c2e7d9, 3 #93cfb6, 4 #57ab8d, 5 #0f766e, with
  near-black #1c1e1c numeral / word / part name at levels 0–4 and
  white at level 5.

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
  Barlow Condensed numeral in WHITE #f0f0f0 (the same bright colour as
  the card's other numerals), with 合計回 / 合計秒 in small gray under
  it. Set inputs: one cell per set — a small centred gray label
  (1セット目, 2セット目, …) over a near-black #0f0f0f box, radius 8px,
  centred bold white digits, cells evenly split across the card.
  UNILATERAL exercises (a per-side flag on the exercise definition —
  rep-based only, currently シングルレッグRDL and リバースランジ） get TWO
  inputs per set instead of one, side by side, each under a short
  label 左 (left) / 右 (right) (English: L / R); the set is stored as
  a {l, r} pair, the exercise total is both sides summed, the report
  shows 左11 / 右10 per set, and the next session's completion rate
  for such an exercise is judged on the WEAKER side. The set inputs of an exercise that has not been recorded yet
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
  THE SAME exercise cards as the Workout screen (same layout, set
  inputs — left/right pairs included —, RPE select, and note field),
  pre-filled with the recorded values; each card saves itself with
  its own 記録して完了 / 記録を更新 button, and a 編集を終わる pill under
  the cards returns the entry to the list form. There is no separate
  edit form and no 修正を保存 button. RPE words: 6 かなり楽，
  6.5 楽， 7 やや楽， 7.5 少しきつい, 8 きつい, 8.5 かなりきつい, 9 とてもきつい,
  9.5 ほぼ限界， 10 限界.
- Settings (via the gear button): a quiet ← ホームに戻る back button at
  the top-left, then the profile form (uniform grid fields), the
  言語 switch （日本語 / English) and the テーマ switch （ダーク / ライト /
  システム） as .btn rows with the current choice in the active
  (badge-fill) style, and
  the data reset with the stacked confirmation described above.

Fallback UI (loading and failure — keep it this small; the app talks
only to its own API): the app area shows 読み込み中… until the first
state load finishes; if that load fails, it shows the reason as red
error text (#f87171) with a full-width #2dd4bf 再読み込み button that
retries — never a blank screen. Every button that sends a request is
disabled while its request runs (disabled buttons render at opacity
0.55, no label change, no spinner); if the request fails, the reason
appears as a short red error line (14px) directly after the button and
the button is re-enabled. A network-level failure is always worded
通信に失敗しました。接続を確認してもう一度お試しください。; a server refusal
shows the server's reason. Generation failures keep their existing
spot: the error line under the 今日のワークアウトを作る button on the
workout empty state.

Input validation, escaping, numeric keyboards: validate on both the
client (reason shown in the same error line, before sending) and the
server (invalid write → HTTP 400 with the reason, nothing stored, no
silent clamping or truncation). Rules: set reps are integers 0–999 (each side of a unilateral pair
is an integer 0–999);
RPE is empty or 6–10 in 0.5 steps; pain levels are integers 0–5;
exercise notes are at most 200 characters (longer is a save error);
profile age is required (integer 10–100), height required (integer
100–250 cm), weight required (20–300 kg, decimals allowed), profile
free-text fields at most 200 characters; dates are YYYY-MM-DD only.
User-entered text is always escaped when rendered (there is no SQL
anywhere, so the injection risk is markup injection — a tag typed
into a note must display as literal text, never run). Numeric fields
stay type="text" (type="number" once displayed a typed 1 as 01) and
summon the phone keypad with inputmode: set inputs and the integer
profile fields (age, height) use inputmode="numeric" with
pattern="[0-9]*"; decimal fields (weight)
use inputmode="decimal".

Draft persistence: while a workout card is being filled in, keep its
raw values (set fields, RPE, note) in localStorage under a key naming
the date and session (btl-draft:{date}:{session id}); restore them
only onto unrecorded cards (saved server values win), and drop them
when the exercise is saved, the session is completed or cancelled,
the data is reset or imported, or they belong to another day/session
(pruned on load). A unilateral set drafts as an {l, r} pair of raw
strings. The server data format does not change.

Data export / import (settings, データ section): an エクスポート button
downloads the whole store as JSON, and an インポート button picks a
JSON file and — after an inline warning-coloured confirmation block
(「{file name}」で現在のデータをすべて置き換えます。元に戻せません。 with
インポートする / キャンセル, never a native dialog) — replaces the store.
The imported file is fully validated first (all top-level keys, every
record's types, the validation rules above wherever they fit — logged
sets may be plain numbers or {l, r} pairs); a bad file is refused
with a reason and replaces nothing. The store's lang and theme are
optional fields on import (absent is fine, an unknown value is
refused).

PWA: serve a web app manifest (name 自重トレーニング記録, short name
自重トレ, display standalone, background_color and theme_color
#0f0f0f) as application/manifest+json, with PNG icons (192, 512, a
512 maskable variant, a 180 apple-touch-icon) showing the ring-gauge
motif — a #2d2d2d track circle and a #2dd4bf arc with round caps and
a centre dot on #0f0f0f. Embed the icon PNGs as base64 in the server
code (src/icons.ts) and serve them decoded as image/png at the
/icon-192.png, /icon-512.png, /icon-maskable-512.png and
/apple-touch-icon.png paths, rather than shipping binary icon files.
Link the manifest and apple-touch-icon in the
head, set theme-color to the resolved theme's page background
(#0f0f0f dark / #f2f2f0 light; the manifest's own colours stay
#0f0f0f), and add the mobile-web-app-capable
metas. Do NOT add a service worker: the app needs its server, so an
offline shell would be a lie.

Countdown timers are end-time based: on start, store the end
timestamp and always recompute the remaining seconds from it (pause
freezes the remainder, resume recomputes the end). Re-sync when the
page becomes visible again, so a locked screen or a backgrounded tab
cannot drift the count; if the end passed meanwhile, show the
finished state.

Accessibility minimum: every input is labelled without changing the
look (set inputs carry aria-label "{exercise} {n}セット目", with the
side appended on a unilateral pair input, RPE/note fields use label
for, settings fields use label for/id);
pain tiles are buttons whose aria-label states the part and current
level (e.g. 胸：レベル2（普通）); warning-sign chips carry aria-pressed;
the active nav segment carries aria-current="page"; and
:focus-visible draws a 2px accent outline (nothing changes at rest).

Navigation and scrolling: the views are real history entries with
paths — コンディション /, ワークアウト /workout, レポート /report,
設定 /settings. Switching views pushes an entry (the initial one is a
replaceState, and a deep link opens that view), so Back/Forward move
between views; the scroll position is stored per entry and restored
on return, while a fresh navigation starts at the top.

Dates and sessions: the server's Asia/Tokyo date is the only "today"
— the client never derives a date from the device clock. A session
belongs to the day it was started: if midnight passes with a session
unfinished, the workout screen keeps showing it (its title block
gains a {M/D（曜）}のセッション line in the header date form) and it
can be recorded and completed as that day's session, never merged
into the new day. Condition records are always the current day's.

Report extras: under the レポート heading, a full-width search field
(placeholder 種目名・メモで検索) filters the entries live by exercise
name, variation, or per-exercise note and hides the summaries while
a query is present (no match: 該当する記録がありません。). The
summaries are two quiet blocks of two-column rows: 月別 —
{YYYY}年{M}月 with {n}回 ／ {total}レップ, newest month first; 部位別 —
the muscle group with {n}回 ／ {total} (performed count and raw sum
of logged sets, seconds for timed exercises), ordered by total
descending. These month labels and the settings profile-history
timestamp ({M/D（曜）} {HH:MM}) are the only additions to the two
allowed date forms, and both are built from the header form.

RPE prefill: an unrecorded workout card's RPE select starts at that
exercise's most recent recorded RPE from any earlier session, or
未入力 when there is none. The note is never pre-filled, and the
prefill alone does not make the card recorded.

Settings extras: under the profile form, a プロフィール履歴 section
(only when entries exist) lists each profile save newest first: the
moment as {M/D（曜）} {HH:MM}, then one line per changed field,
{label}： {from} → {to} with 未入力 for unset values. Read-only.

Load-failure hint: the initial-load failure view adds, between the
reason and the 再読み込み button, one small line:
サーバーが起動していない可能性があります。起動コマンド： bun run server.ts

Phone fit: the viewport uses viewport-fit=cover and the safe-area
insets are ADDED to the existing spacing (bottom body padding, the
fixed gear's top/right offsets) — on a device without insets every
measurement stays exactly as specified. Long exercise and variation
names wrap inside their cards (overflow-wrap: anywhere); font sizes
never change to fit.

Server behaviour worth matching if you rebuild the backend too:
store writes are atomic (temp file + rename) with up to three backup
generations (store.backup.1.json … store.backup.3.json) rotated
before each overwrite; a store file that exists but does not parse
is restored from the newest usable backup and the recovery logged;
a timestamped event log (data/server.log, ~256 KB rotation, no
stored personal data) records startup, recoveries, API errors and
auth events. Optional token auth: only when the BTL_TOKEN
environment variable is set — every page and API is then gated
(pages redirect to a minimal /login form in the saved theme's tokens,
label トークン, button ログイン, one generic refusal トークンが違います;
APIs answer 401), and a correct token sets an HttpOnly cookie
(30 days) holding only a hash. Unset, there is no login at all.

Internationalization: a language switch in Settings （日本語 / English,
Japanese by default) is stored server-side in the store (lang; absent
means Japanese; imports accept a missing lang and refuse an unknown
one). The theme switch sits next to it （テーマ: ダーク / ライト /
システム, stored as theme; absent means システム） and its labels are
dictionary strings like everything else (Theme / Dark / Light /
System). Every UI string — tabs, headings, buttons, labels, placeholders,
empty states, error and network messages, confirm dialogs — lives in
a client dictionary with ja and en entries and re-renders in place on
switch, with no reload. Server-generated text (assessment reasons,
guidance, progression notes, validation and error reasons) and the
login page come from matching server-side templates in the same
language. Dates keep the MM/DD(weekday) shape with the weekday
localized: 11/13（金） in Japanese, 11/13(Fri) in English. Body-part,
joint, muscle-group and level words have English display equivalents;
exercise and variation names are training data and are NOT
translated. Progression notes already saved in a session keep the
language they were generated in.

Labels are in Japanese by default, with an English dictionary
alongside (see Internationalization above). Do not change the workout
logic, the pain rules, or any saved data while doing design work.
```

## License

MIT License — see `LICENSE`.

> **お願い**：このコードは MIT ライセンスです。使ってもらえると嬉しいので、このコード（編集したものを含みます）を GitHub などの公開の場所で使ったり公開したりする際は、一言教えていただけるとうれしいです。これはライセンス上の義務ではなく、お願いです。ライセンスの条件は LICENSE ファイルの MIT の条文が優先します。
>
> **A request from the author**: this code is under the MIT License, and I would be happy for you to use it — so if you use this code (including a modified version) or publish it in a public place such as GitHub, a quick heads-up would be appreciated. This is a courtesy request, not a license condition; the MIT terms in LICENSE govern.
