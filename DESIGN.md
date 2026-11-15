# Design rules — bodyweight-training-log (normative, self-contained)

This document is the **complete and final specification** of how this app
looks. It is self-contained: an implementer with only this repository —
no account-level instructions, no external references, no other documents —
must be able to reproduce the exact same appearance from this file alone.

**Authority.** Every value in this document is normative. Where any other
text (including the README prompt, older descriptions, or external design
examples) disagrees with this document, **this document wins**. No external
reference is required or permitted to change the look: design galleries
such as recent.design are *not* part of the process, and if an external
example suggests something different, follow this document instead.

The colour values were originally measured from screenshots of the
original Muse space; together with the values the standalone app ships,
they are fixed here as the specification.

## Theme

- **Two themes — dark and light — over one teal colour family.** A
  theme setting on the settings screen chooses between them:
  `ダーク` (dark), `ライト` (light), and `システム` (system — follow the
  OS `prefers-color-scheme`). **The default is `システム`.**
- The setting is stored server-side in the store (`theme`; absent
  means `システム`), exactly like the language. Changing it applies
  **immediately, with no reload**: the resolved theme is carried on
  `<html data-theme="dark|light">` and every colour below is a CSS
  variable with a value per theme. To avoid a flash of the wrong
  theme, the setting is also mirrored to `localStorage`
  (`btl-theme`) and a small inline script in the page head resolves
  and applies it before first paint; on load the server value wins
  and re-syncs the mirror. While the setting is `システム`, an OS
  colour-scheme change re-resolves the theme at once.
- The dark token set is the original measured look: near-black
  background, white text, gray secondary text, one bright teal
  accent. The light set keeps the same teal family on white /
  near-white: white cards, near-black text, and a **deeper teal
  accent** (`#0f766e`) — the dark accent `#2dd4bf` reaches only
  ~1.9:1 on white and cannot carry text.
- The theme applies to **every screen** （コンディション / ワークアウト /
  レポート / 設定） and to the token-auth login page, which the server
  renders with the saved theme's tokens (for `システム`, light tokens
  plus a `prefers-color-scheme: dark` override). The PWA
  `theme-color` meta follows the resolved theme (`#0f0f0f` dark /
  `#f2f2f0` light); the manifest's colours stay `#0f0f0f`.
- **Universal-design contrast (normative):** normal text reaches at
  least **4.5:1** against its background in **both** themes, and
  large text / numerals at least **3:1**. Representative verified
  pairs — dark: text on bg 16.8:1, `--sub` on bg 7.6:1, CTA text on
  accent 7.9:1, tile level word on the deepest ramp step 4.8:1;
  light: text on bg 15.0:1, `--sub` on bg 5.7:1, accent on bg
  4.9:1, CTA text on accent 5.5:1, tile level word on the deepest
  ramp step 6.1:1. Colour is never the only channel: pain levels are
  also a numeral, a word, and a tick count; selection states also
  differ by border / fill, not hue alone. The `:focus-visible`
  outline uses `--accent`, clearly visible in both themes.
- Never a yellow-to-red heat scale for pain levels. Never
  multi-colour gradients.
- Functional state colours are not accents: red appears only in warning /
  red-flag surfaces and destructive actions, amber only in guidance
  notice boxes (see "State colours"). Neither is used decoratively.

## Colour tokens (normative)

Each token has a dark value and a light value; components always
reference the token, never a raw hex (the pain-tile ramps below are
the one fixed exception).

| Token | Dark | Light | Used for |
|---|---|---|---|
| `--bg` | `#0f0f0f` | `#f2f2f0` | Page background; field fill inside workout cards (near-black in dark, light gray in light) |
| `--surface` | `#232323` | `#ffffff` | Generic cards, pain tiles (level 0), inactive nav segments, gear button |
| `--surface-2` | `#1a1a1a` | `#ffffff` | Chip fill, generic input fill, workout exercise cards, finish-area card |
| `--border` | `#2d2d2d` | `#d5d5d1` | Borders, hairlines, gauge track, timer bar track |
| `--accent` | `#2dd4bf` | `#0f766e` | Active nav segment, primary CTA, lit ticks, gauge arc, week-dot states |
| `--on-accent` | `#052e2b` | `#ffffff` | Text on top of `--accent` |
| `--badge` | `#19534c` | `#115e59` | Legend badge fill, selected chip fill, OK-box border |
| `--text` | `#f0f0f0` | `#1c1e1c` | Primary text, large numerals, chip labels, card total numerals |
| `--sub` | `#9ca3af` | `#5b6066` | Secondary text: dates, descriptions, "Day" label, total-target label |
| `--tick-off` | `#292929` | `#cfd2cd` | Unlit tick segments on pain tiles (levels 0–4) |
| `--dot-off` | `#333333` | `#b9bbb5` | Week-dot outline for ordinary days |

### Pain-tile level ramp (normative)

The tile background stays at the plain level-0 colour through
level 2 and deepens through teal shades only from level 3 up
(3 → 4 → 5, one step each). These exact values are the
specification. The level word is small text, so it takes a
full-contrast colour in both themes — white on the dark ramp (the
originally measured gray word colour reached only ~1.9:1 on the
deepest step and is superseded by the contrast rule in "Theme"),
near-black on the light ramp. (The judgement criteria are separate
from the colours: level 2 still reduces and level 3+ still
excludes — only the tile background no longer changes at 1–2.)

Dark ramp:

| Level | Tile background | Numeral | Level word | Lit tick | Unlit tick |
|---|---|---|---|---|---|
| 0 | `#232323` | `#f0f0f0` | `#ffffff` | — | `#292929` |
| 1 | `#232323` | `#f0f0f0` | `#ffffff` | `#2dd4bf` | `#292929` |
| 2 | `#232323` | `#f0f0f0` | `#ffffff` | `#2dd4bf` | `#292929` |
| 3 | `#1a5a4c` | `#f0f0f0` | `#ffffff` | `#2dd4bf` | `#292929` |
| 4 | `#20806c` | `#f0f0f0` | `#ffffff` | `#2dd4bf` | `#292929` |
| 5 | `#2dd4bf` | `#052e2b` | `#052e2b` | `#052e2b` | `rgba(5,46,43,0.25)` |

Light ramp:

| Level | Tile background | Numeral | Level word | Lit tick | Unlit tick |
|---|---|---|---|---|---|
| 0 | `#ffffff` | `#1c1e1c` | `#1c1e1c` | — | `#cfd2cd` |
| 1 | `#ffffff` | `#1c1e1c` | `#1c1e1c` | `#0f766e` | `#cfd2cd` |
| 2 | `#ffffff` | `#1c1e1c` | `#1c1e1c` | `#0f766e` | `#cfd2cd` |
| 3 | `#93cfb6` | `#1c1e1c` | `#1c1e1c` | `#0f766e` | `#cfd2cd` |
| 4 | `#57ab8d` | `#1c1e1c` | `#1c1e1c` | `#0f766e` | `#cfd2cd` |
| 5 | `#0f766e` | `#ffffff` | `#ffffff` | `#ffffff` | `rgba(255,255,255,0.35)` |

The part name stays in `--text` at every level, including level 5.

### State colours (normative)

All three notice boxes share: 1px solid border, radius 10px, padding
10px. Values per theme:

| State | Border (dark / light) | Fill (dark / light) | Text (dark / light) | Margin |
|---|---|---|---|---|
| Warning (`.warn`) | `#ef4444` / `#dc2626` | `#2a0f0f` / `#fdeeee` | `#fecaca` / `#7f1d1d` | 10px 0 |
| OK (`.ok`) | `--badge` | `#0b2420` / `#e6f4f1` | `#99f6e4` / `#0b4f45` | 10px 0 |
| Caution / guidance (`.caution`) | `#92400e` / `#b45309` | `#241a08` / `#fdf3e0` | `#fde68a` / `#7c2d12` | 8px 0 |

- Error text (`.error`): `#f87171` dark / `#b91c1c` light.
- Danger button (outline): border = the warning border, text = the
  error colour, on `--surface` fill.
- Danger-solid button: fill `#ef4444` dark / `#dc2626` light, border
  the same, text `#ffffff`, weight 700.
- The data-reset confirmation block reuses the warning colours with
  padding 12px and radius 10px (see Settings).
- The finished countdown timer reuses the OK fill with a 1px
  `--accent` border.

## Typography

- Body: `system-ui, sans-serif`, **16px**, line height **1.6**, on
  `--bg` / `--text`.
- **All large numerals use Barlow Condensed** (Google Fonts, weights
  500/600/700 loaded; rendered weight 600; falls back to system-ui when
  it cannot be loaded): the Day number, pain-tile level numbers,
  ring-gauge centre, the three metrics, totals, timer digits. History
  dates also use Barlow Condensed for their numerals, at 17px (see
  History entries). Letter spacing 0.02em.
- Progress is always shown as a number **plus** a visual element (ring
  gauge, tick segments, remaining-time bar, week dots) — never as prose.
- Headings (`h2`): 17px, bold, `--text`, margin 22px 0 4px.
- Section descriptions (`.desc`): 13px, `--sub`, margin 0 0 10px.
- Small text (`.small`, `.refs`): 13px, `--sub`.

## Text-minimal principle (standing rule)

- Show with UI whatever UI can show — icons, badges, bars, buttons,
  gauges, dots, ticks — instead of sentences. Keep visible text as short
  as the labels listed in this document.
- Explanatory prose is allowed **only** where a decision needs it, in
  exactly two places:
  1. The one-line section descriptions (`.desc`, 13px, `--sub`) directly
     under a condition-screen heading.
  2. The single footer section `判定基準について` at the very bottom of
     the page (after the app area, on every screen): `h2` heading,
     then three groups — a small sub-heading (14px `--text`) and a
     bulleted list (13px `--sub`, line height 1.7) each — ending with
     the references line. Its exact wording and structure are listed
     under "Footer note (`判定基準について`) — wording fixed,
     structure only".
- Do not add explanatory paragraphs anywhere else. Status information is
  carried by the notice boxes and badges, not by new copy.

## Exact UI text — labels (all labels are Japanese)

### Global
- Page title: `自重トレーニング記録`
- Header purpose line: `器具なし / 筋力・筋肥大`
- Header right: `Day` + numeral; under it `累計 {n} レップ`
- Gear button: a thin line-drawn gear icon — inline SVG, gray stroke,
  no fill (aria-label / title: `設定`)
- Nav segments, in order: `コンディション` / `ワークアウト` / `レポート`
- Loading placeholder: `読み込み中…`
- Load-failure retry button: `再読み込み`
- Load-failure server hint (small text between the reason and the
  retry button): `サーバーが起動していない可能性があります。起動コマンド： bun run server.ts`
- Network-failure message (no response at all):
  `通信に失敗しました。接続を確認してもう一度お試しください。`

### Condition screen （コンディション）
- Headings: `まず、警告サインの確認` / `今日の筋肉痛は？（部位ごと）` /
  `今日の関節痛は？（関節ごと）`
- Descriptions (verbatim):
  - `当てはまるものがあれば押してください。1つでも当てはまれば、その日は中止・受診が目安です。`
  - `タップで強度が上がります（5の次は0に戻ります）。`
  - `筋肉痛とは別に記録します。タップで強度が上がります（5の次は0に戻ります）。関節は筋肉より厳しめの基準です。`
- Warning-sign chips (8, verbatim, in this order):
  `しびれ・脱力がある` / `排尿・排便の変化がある（腰まわり）` /
  `股間・肛門まわりの感覚異常がある` / `関節が熱く腫れている／発熱がある` /
  `体重をかけられない／変形がある` /
  `強い筋肉痛・脱力に加え、尿が紅茶色・コーラ色／尿量が減った` /
  `胸の痛みがある` / `大きな事故・転倒の直後である`
- Legend badges, muscle: `0–1 通常` `2 軽減` `3以上 除外` `4以上 ×2部位 休養`
- Legend badges, joints: `0–1 通常` `2 軽減` `3以上 除外` `サインあり 受診目安`
- Muscle parts (10, in order): 胸・肩・上腕・前腕・背中・脚（前）・
  脚（後ろ）・お尻・ふくらはぎ・腹筋・体幹
- Joints (8, in order): 腰・背骨・肩・肘・手首・股関節・膝・足首
- Level words (0–5): `なし` `軽い` `普通` `強い` `かなり強い` `激しい`
- Primary CTA, two states:
  - `保存してワークアウトを開始` — always, while today's session is not
    completed. One button does the whole flow: tap it and the
    condition check is saved first (saving also rebuilds the day's
    planned session around the new assessment — see "Condition
    re-save rebuilds the planned session"), then today's session is
    created if none exists yet (an existing session is never
    recreated), then the app goes to the ワークアウト screen. If
    creation is blocked (warning sign / rest day), it still goes to
    the ワークアウト screen, whose empty state shows the blocking
    reason.
  - `今日の結果を見る` — when today's session is completed; tapping it
    saves any unsaved edits first, then goes to レポート.
- Missing-profile notice (warning box, top of screen):
  `先に右上の歯車ボタンからプロフィールを入力してください（空でも記録はできます）。`
- Assessment box, one of:
  - care: `受診目安：{reasons joined with " / "}`
  - rest day: `完全休養日：{reason}`
  - OK: `開始できます。{reasons joined with " / "}`
- Overload notice heading line: `24時間ルールの自動判定（次回に反映）`,
  followed by the reasons as a bulleted list.

### Workout screen
- Condition-missing state (no session yet AND no condition recorded
  today; shown with priority over the empty state below): text
  `今日のコンディションが未入力です。先に入力してください。`, then a primary CTA
  `コンディションを入力` (goes to the コンディション screen).
- Empty state text: `今日のセッションはまだありません。`
- Empty state CTA: `今日のワークアウトを作る`
- Gauge sub-label: `／ {total} 種目完了`
- Session title: `{title}` (e.g. `背中 + 脚裏 + 体幹`) — the rotation
  letter (A / B / C) is internal data and never shown
- Past-day session label (only when the shown session belongs to an
  earlier day — see "Dates and sessions"): `{M/D（曜）}のセッション`,
  in the header date form, directly under the session title.
- Remaining line: `あと{n}種目`, or `全種目完了` when none remain
- Metrics labels: `種目` / `セット` / `累計回`
- Per set: `{n}セット目`; target line: `目標 {sets}セット × {reps}{unit}`
  (unit is `回` or `秒`)
- Unilateral side labels: `左` / `右` (English: `L` / `R`) — shown over
  the two inputs of each set of a unilateral exercise
- Total label: `合計回` or `合計秒`
- RPE label: `きつさ RPE`; select options — exactly these ten, each
  shown as `value（word）` (the selected option displays in the same
  form; the saved value is the bare number): `未入力`, `6（かなり楽）`,
  `6.5（楽）`, `7（やや楽）`, `7.5（少しきつい）`, `8（きつい）`,
  `8.5（かなりきつい）`, `9（とてもきつい）`, `9.5（ほぼ限界）`, `10（限界）`.
  There is no `6 以下` option.
- Note label: `この種目のメモ（任意）`; placeholder:
  `例：フォームが崩れた／左側がきつかった`; hint: `次回、この種目にだけ反映されます。`
- Timer buttons: `開始` / `一時停止` / `リセット`; timer unit: ` 秒`
- Save button: `記録して完了` (unrecorded) / `記録を更新` (recorded)
- Finish button: `今日のトレーニングを完了する`
- Cancel link: `このワークアウトを取り消す`
- Cancel confirmation text:
  `このワークアウトを取り消しますか？今日のセッションと入力した内容が消えます。`
  Buttons: `取り消す` / `やめる`
- Completed-session box (OK box): `完了済みです。レポートで確認できます。`,
  followed by a primary CTA `レポートを見る` (goes to レポート).

### Report screen
- Heading: `レポート`; empty state: `記録はまだありません。`, followed by a
  primary CTA `ワークアウトへ` (goes to the ワークアウト screen).
- The report is **graphs and a day pager**, not a vertical list (the
  free-word search field is gone). A segmented **日別 / 月別 toggle**
  under the heading switches views: the **daily view** shows the
  trend chart and the day pager; the **monthly view** shows the two
  summaries. Summary headings: `月別` / `部位別`.
  - Monthly: a **vertical bar chart** (oldest month on the left): each
    bar's height is the month's summed session totals relative to the
    largest month, the total sits above the bar, and the label under
    it is `{YYYY}年{M}月` plus the session count `{n}回`.
  - Muscle group: **horizontal bars** ordered by total descending —
    group label, a bar whose width is the total relative to the
    largest group, and the total at the right (performed count and
    the raw sum of logged sets — seconds for timed exercises — as
    before).
  - Day pager: one recorded day at a time (see "History entries"
    below for the pager itself).
- Entry date: a single line `MM/DD(曜)` (zero-padded month and day,
  weekday as one character in half-width parentheses), e.g. `11/13(金)`
- Per-exercise note prefix: `種目メモ： {note}`
- Session total suffix: `レップ`
- Sets display: values joined with ` / `, then a space and the unit
  (`6 / 6 回`, `41 / 41 秒`)
- Edit button: `記録を編集`; exit-editing button: `編集を終わる`
- Edit mode reuses the workout exercise card exactly (same heading /
  target / cue block, set inputs, RPE select, note field — see
  "Workout exercise cards"), with the recorded values as the initial
  values and a per-card save button (`記録して完了` / `記録を更新`, the
  same labels as the workout screen). There is no separate edit form
  and no `修正を保存` button.
- Sets display for a unilateral exercise shows each set's sides:
  `左{l} / 右{r}` (English: `L{l} / R{r}`)
- RPE words (a value takes the word of the highest threshold at or below
  it): below 6 `とても楽`, 6 `かなり楽`, 6.5 `楽`, 7 `やや楽`,
  7.5 `少しきつい`, 8 `きつい`, 8.5 `かなりきつい`, 9 `とてもきつい`,
  9.5 `ほぼ限界`, 10 `限界`. Shown as `（RPE {rpe} {word}）`.

### Settings screen
- Back button (top-left, above the profile heading): `← ホームに戻る`
- Headings: `プロフィール（初回設定）`, `言語`, `テーマ`, `データ`
- Language buttons: `日本語` / `English`
- Theme buttons: `ダーク` / `ライト` / `システム` (English: `Dark` /
  `Light` / `System`, under the heading `Theme`)
- Field labels: `年齢` / `性別` / `身長（cm）` / `体重（kg）` / `補足`
- Sex is a select with exactly three options: `男性` / `女性` /
  `選択しない` (English: `Male` / `Female` / `Prefer not to say`);
  the stored values are `男性` / `女性` / `""` (選択しない)
- Note hint (under the 補足 field, small `--sub` text):
  `既往症・ケガの履歴、常用している薬、アレルギー、体脂肪、運動習慣など、判定やメニューに影響しうる情報を書いてください。`
  (English: "Write anything that could affect the decisions or the
  menu: past conditions and injuries, regular medication, allergies,
  body fat, exercise habits, and so on.")
- There is **no save button**: the profile form autosaves (see
  "Settings screen"). The saved indicator reads `保存済み`
  (English: `Saved`)
- Profile-history heading (only when history exists):
  `プロフィール履歴`. Each entry: the save moment as
  `{M/D（曜）} {HH:MM}` (header date form plus the time, Asia/Tokyo),
  then one line per changed field: `{label}： {from} → {to}`, an
  unset value shown as `未入力`.
- Data note: `保存先はサーバー側の data/store.json です。`
- Data formats line (small `--sub` text):
  `エクスポート：JSON（全データ、復元用）／ CSV（セッション記録の一覧、閲覧用）。インポート：JSONのみ（CSVは取り込めません）。`
  (English: "Export: JSON (all data, for restoring) / CSV (session
  records as a table, for viewing). Import: JSON only (CSV cannot be
  imported).")
- Export buttons: `エクスポート（JSON）` (downloads the whole store as
  JSON) and `エクスポート（CSV）` (downloads the session records as
  CSV — see "Data export / import")
- Import button: `インポート` (opens a JSON file picker)
- Import confirmation text: `「{file name}」で現在のデータをすべて置き換えます。元に戻せません。`
- Import confirmation buttons: `インポートする` / `キャンセル`
- Import file that cannot be parsed as JSON:
  `ファイルの形式が正しくありません`
- Delete button: `データを消す`
- Confirmation text:
  `本当に全データを消しますか？プロフィール・痛みの記録・セッション履歴がすべて消え、元に戻せません。`
- Confirmation buttons: `本当に全データを消す` / `キャンセル`

### Footer note (`判定基準について`) — wording fixed, structure only

Shown at the bottom of every screen, after the app area. **The
wording is fixed**: the sentences below are quoted exactly and must
never be paraphrased, shortened, or added to. Only the layout may
change — the text is grouped under three small sub-headings as
bulleted lists, one bullet per original sentence (list markers and
line breaks are the only additions). The English UI shows the
English sentences (in the client dictionary) in the same structure.

> 判定基準について
>
> **警告サインと休養**
> - 警告サイン（レッドフラッグ）がある日は開始できません。
> - 筋肉痛はレベル2で軽減・3以上で部位除外、関節痛はより厳しく（2で軽減・3以上で除外）判定します。
> - 完全休養はレベル4以上の筋肉痛が2部位以上の日だけです。
>
> **24時間ルール**
> - 24時間ルール：運動中・運動後の痛みが翌朝までに元の水準へ戻らなければ、前回の負荷が高すぎたサインです。
> - 痛みの記録から自動で判定し、過負荷の部位は次回軽減して進行しません（Silbernagelらの痛みモニタリングモデル）。
>
> **継続日数と関節痛**
> - 継続日数チェック：同じ部位の筋肉痛が5日以上、関節痛が2週間改善しない場合は受診目安として注意表示します（関節痛は7日でも注意表示）。
> - 開始を止めるのは警告サインだけです。
> - 関節痛は部位にも効きます（腰→脚・体幹、背骨→背中・腹筋・体幹、肩→押す系、肘→押す系・引く系、手首→押す系・プランク系、股関節・膝・足首→脚系）。
>
> 参考文献：ACSM ポジションスタンド／ACSM 筋肉痛（DOMS）資料、Silbernagel et al. 2007 (Am J Sports Med)、NHS 関節痛・腰痛、CDC/NIOSH 横紋筋融解症。

## Layout (exact)

- Single column, mobile-first (mainly used on an iPhone). Content
  **max-width 680px**, centred, **padding 16px** on all sides.
- Safe areas: the page opts into `viewport-fit=cover`, and the safe
  area insets are **added** to the existing spacing — the bottom body
  padding grows by `env(safe-area-inset-bottom)`, and the fixed gear
  button's top/right offsets grow by the top/right insets. On a
  device without insets every value is exactly the normative one
  above; nothing shrinks.
- Pain tiles: **2-column grid**, gap **8px**.
- The primary CTA sits after the screen's content, full width.
- Vertical rhythm: `h2` sections as above; cards have margin 12px 0.

## Components (exact values and states)

### Header
- Flex row, space-between, gap 12px, margin-bottom 12px,
  **padding-right 44px** (so the Day numeral never sits under the gear).
- Left: date in 13px `--sub`, format `M/D（曜）` (e.g. `11/13（金）`); under
  it the purpose line, 16px bold `--text`: `器具なし / 筋力・筋肥大`.
- Right, right-aligned: `Day` in 14px bold `--sub` (4px right margin),
  then the day count as a **52px Barlow Condensed numeral** in `--text`,
  line height 0.95. The day count is the number of calendar days since
  the first recorded session's date, counting that first day as Day 1
  (Day 1 when there are no sessions yet). Under it, 12px `--sub`:
  `累計 {totalVolume} レップ` — the cumulative reps summed from the
  logged session history.

### Settings gear button
- Settings is **not** a nav segment. The button is deliberately
  inconspicuous: **position fixed, top 10px, right 10px**, z-index 60,
  **34×34px**, radius 50%, 1px solid `--border`, `--surface` fill. It
  sits at the top-right and opens the settings screen.
- Icon: an **inline SVG gear** — thin line drawing, stroke width 1.5,
  **no fill**, **18×18px**, in the button's colour `--sub` (`#9ca3af`).
  Never the ⚙ emoji character.
- **One style in every state**: no hover change, no active change, and
  no change while the settings screen is open. The button is always
  the same muted gray; only its position and shape say it can be
  pressed.
- **Visibility**: present on **every** screen (condition, workout,
  report, and settings), but shown **only while the page is scrolled
  to the very top** (scroll offset within a few px of 0). Scrolling
  down hides it; returning to the top shows it again — on the
  settings screen too. The shown / hidden state follows the scroll
  position itself, so it stays correct across view switches and
  per-entry scroll restoration. While hidden it takes no taps
  (`pointer-events: none`) and is fully transparent
  (`opacity: 0`, `visibility: hidden`); the changeover is a quiet
  0.2s opacity / visibility transition, nothing flashier.

### Segment navigation
- A row of segment buttons: gap **6px**, margin 12px 0, wrap allowed.
  Each button flexes equally (flex 1 1 30%), padding **10px 6px**,
  radius **8px**, no border, font **14px weight 600** — **not** pills.
- Active segment: `--accent` fill, `--on-accent` text.
- Inactive segments: `--surface` fill, `--text`.
- Exactly 3 segments: コンディション / ワークアウト / レポート. There is no
  Result segment (results are merged into レポート) and no
  Settings segment.

### Generic buttons and cards
- `.btn`: padding 9px 14px, radius 8px, 1px solid `--border`,
  `--surface` fill, `--text`, font 15px.
- `.btn.active`: `--badge` fill and border, `#ffffff` text.
- `.card`: `--surface` fill, 1px solid `--border`, radius **12px**,
  padding **14px**, margin 12px 0.

### Warning-sign chips
- Red flags are **chips**, not checkboxes: pill shape (radius 999px),
  padding **7px 12px**, 1px solid `--border`, `--surface-2` fill,
  `--text` label text, font 13px, wrapping in rows with gap 8px.
- State — unselected: as above.
- State — selected: border `--accent`, fill `--badge`, text
  `#ffffff`. Selection is therefore visible from the border and fill
  as well as the text colour.

### Legend badges
- Small pills: `--badge` fill, `#ffffff` bold text, font 12px, padding
  **3px 10px**, radius 999px. One row per pain section, gap 6px, margin
  8px 0 10px, between the section description and the tiles. Texts are
  listed under "Exact UI text — labels".

### Pain tiles
- Grid cell: fill per the level ramp, radius **11px**, padding
  **10px 12px**, min-height **74px**, no border, tappable, left-aligned
  text. Each tap adds 1 to the level; after 5 it wraps to 0.
- Inside, two rows:
  - Row 1: part name (15px, weight 700, `--text`) at the left; the level
    as a **34px Barlow Condensed numeral** (line height 1) at the right.
  - Row 2: the level word (12px, colour per the ramp table) at the
    left; **5 tick segments** at the right — each tick **14×5px**,
    radius 2px, gap 3px; the first *level* ticks are lit, the rest
    unlit, with the colours from the ramp table.

### Week dot row (workout screen only)
- A flex row, space-between, margin **16px 8px 2px**. Seven cells
  （月〜日， Monday first), each **34px** wide: weekday letter over a dot,
  column gap 7px. **No day numbers anywhere in this row.**
- Letter: 12px, line height 1, `--sub`.
- Dot (ordinary day): **9px** circle, 2px solid `--dot-off` (`#333333`)
  outline, no fill.
- State — day with a completed session: dot filled `--accent` with
  `--accent` border.
- State — today: letter is `--accent` and weight 700; the dot becomes an
  **18px** circle with a 2px `--accent` outline and no fill — unless the
  day also has a completed session, in which case the 18px circle is
  filled `--accent`.

### Ring gauge (workout screen)
- **150×150px**, margin 20px auto 4px. SVG ring: radius 62,
  **stroke width 13**, track `--border`, arc `--accent`, arc line cap
  round, arc rotated to start at the top.
- Centre: the completed-exercise **count** as a **62px Barlow Condensed
  numeral** in `--text` (line height 1); under it the sub-label in 12px
  `--sub`, margin-top 3px: `／ {total} 種目完了`.
- The arc shows the fraction completed / total; at 0 completed the arc
  is empty, at all completed it is a full circle.

### Session title block (workout screen)
- Centred, margin-top 12px. Session title: 20px bold `--text`,
  `{title}` — the title only (e.g. `背中 + 脚裏 + 体幹`); the rotation
  letter is never displayed. Long titles wrap inside the block
  (`overflow-wrap: anywhere`); the font size never changes.
- When the shown session belongs to an earlier day, a 12px `--sub`
  line directly under the title names its date in the header form:
  `{M/D（曜）}のセッション` (see "Dates and sessions").
- Under it, 13px `--sub`, margin-top 3px: `あと{n}種目` — or `全種目完了`
  when every exercise is completed.
- Adjustment / progression notes sit at the **bottom of the whole
  menu** (after the exercise cards and the finish area, just before
  the footer note): a bulleted list in a block of max-width 540px,
  centred, margin-top 14px; 12px `--sub`, line height 1.55, list
  padding-left 18px. There is no focus-note line: no
  alternative-workout wording is shown anywhere (the title's
  `（代替）` suffix remains the only marker of an adjusted menu).

### Three metrics (workout screen)
- A flex row, margin **20px 0 8px**; three equal cells, centred, padding
  2px 6px, separated by 1px `--border` hairlines (left border on the
  2nd and 3rd cells).
- Numeral: **32px Barlow Condensed**, `--text`, line height 1.1. Label
  under it: 12px `--sub`.
- Cells, in order: exercise count with label `種目`; sets as
  `{doneSets}/{totalSets}` with label `セット` (doneSets = all sets of
  completed exercises plus any logged sets of uncompleted ones);
  cumulative completed sessions with label `累計回`.

### Workout exercise cards
- Card: fill `--surface-2` (`#1a1a1a`, darker than the pain tiles),
  **no border**, radius 12px, padding **18px 20px**, margin 12px 0.
- Header row (flex, space-between, gap 14px):
  - Left: the muscle group in 12px `--sub`; under it the **variation
    name as the heading**, 21px bold `--text`, line height 1.35,
    margin 2px 0 3px, wrapping inside the card
    (`overflow-wrap: anywhere`) so a long name never overflows (the
    variation alone, e.g.
    `プローンWレイズ（トップで止める）`, `スーパーマンホールド`,
    `膝曲げレッグレイズ`; if the variation equals the exercise name, the
    name alone). Under that, 13px `--sub`: `目標 {sets}セット ×
    {reps}{unit}`. The workout card shows **no form cue under the
    name**; the cue line remains only on history-edit cards.
  - **How-to (i) button** (workout cards only): a 26px circular outline
    button with an italic `i`, sitting next to the exercise name
    (title row, flex). It opens the **guide window**: a centred modal
    (overlay, max width 480px) with the exercise name, a `手順` heading
    and the numbered steps, then a `意識する部位` heading and the focus
    text — both from the catalog's per-exercise guide data (`steps` /
    `focus`), so they follow the user's own menu definition. The ×
    button or a tap on the overlay closes it.
  - Right: the **total target** (target reps × sets, or total seconds)
    as a **36px Barlow Condensed numeral** in `--text` — the same
    bright colour as the card's other numerals; under it the label
    `合計回` / `合計秒` in 11px `--sub`, margin-top 2px.
- Set inputs: a flex row, gap 8px, margin-top 16px; one equal-width
  cell per set. Cell label: centred 12px `--sub`, `{n}セット目`, 5px
  above the input. Input: **height 46px**, fill `--bg`, no border,
  radius 8px, centred, **17px weight 700** `--text` digits.
- **Unilateral exercises** (the exercise definition carries a
  per-side flag; rep-based exercises only, never timed ones —
  currently シングルレッグRDL and リバースランジ, whose variations include
  スプリットスクワット and ブルガリアンスクワット): each set cell holds
  **two inputs side by side** instead of one, each under a short side
  label — `左` over the left input, `右` over the right (English:
  `L` / `R`), 11px `--sub`, centred. The pair is recorded per side
  (see "Left/right recording" under the data rules); the exercise
  total is the sum of both sides.
- A hairline divider (1px `--border`), margin 16px 0 12px.
- RPE row: flex, gap 10px, vertically centred. Label `きつさ RPE` at
  14px. Select: fill `--bg`, no border, **height 40px**, radius 8px,
  14px `--text`, padding 0 10px, min-width 150px. Options as listed
  under "Exact UI text — labels" — exactly the ten `value（word）`
  entries; the saved value is the bare number.
- Note: label `この種目のメモ（任意）` as a block, 14px weight 700,
  margin 16px 0 6px. Input: full width, fill `--bg`, no border,
  **height 44px**, radius 8px, 16px, placeholder
  `例：フォームが崩れた／左側がきつかった`. Hint under it: 12px `--sub`, margin-top 6px:
  `次回、この種目にだけ反映されます。`
- State — unrecorded vs recorded:
  - An exercise counts as **recorded** when it is completed, or has an
    RPE set, or has any logged set ≠ 0. Otherwise it is **unrecorded**.
  - Unrecorded: every set input is **pre-filled with the target**
    (reps, or seconds for timed exercises) so the user can keep or
    overwrite it; the button reads `記録して完了`. The RPE select
    starts at this exercise's **most recent recorded RPE** (from any
    earlier session) when one exists, and at `未入力` when none does;
    the note is never pre-filled. This initial selection does not by
    itself make the card "recorded".
  - Recorded: set inputs show the logged values, with 0 shown as an
    empty field; the button reads `記録を更新`. This label change and
    the input values are the only visual differences.
  - Saving from the card always saves the sets / RPE / note with
    completed = true, and the gauge, metrics and week dots update.

### Countdown timer (timed exercises, on the workout card)
- Placed inside the card after the note hint, margin-top 14px: a box
  with fill `--bg`, radius **10px**, padding 12px.
- Remaining seconds as a **38px Barlow Condensed numeral** in `--text`
  (line height 1), followed by ` 秒` in 14px `--sub`.
- Remaining-time bar: height **8px**, fill `--border`, radius 999px,
  margin 8px 0; the fill is `--accent`, its width the percentage of
  time remaining, transitioning width 0.2s linear.
- Buttons (`.btn`): `開始` / `一時停止` / `リセット`, in a row, gap 8px,
  wrap allowed.
- Timing is **end-time based**: starting stores an end timestamp
  (now + remaining seconds) and the remaining time is always recomputed
  from it, never decremented per tick. If the screen is locked or the
  tab sits in the background and the browser throttles the interval,
  the display snaps to the true remainder on the next tick and when
  the page becomes visible again — or to the finished state if the
  end time passed meanwhile (the beep is attempted; a browser may
  keep a backgrounded page silent).
- State — running: counts down from the target seconds. Paused: holds
  (the remainder is frozen from the end time; resuming recomputes a
  new end time). Reset: back to the target.
- State — finished (0 reached): the box fill becomes the OK fill with a
  1px `--accent` border, and a short beep sounds (880Hz, twice, via
  WebAudio). The timer **never writes to the record**; the set inputs
  stay manual.

### Finish area (workout screen)
- Its own card: fill `--surface-2`, no border, radius 12px, padding
  14px, margin 12px 0 — present only while today's session is not
  completed.
- Inside: a full-width primary CTA with margin-top 0:
  `今日のトレーニングを完了する`.
- Under it, the cancel link: block, centred, margin 14px auto 2px, no
  background or border, 14px `--sub`, underlined: `このワークアウトを取り消す`.
- State — cancelling (after tapping the link): the link is replaced, in
  place, by a centred confirmation: the confirmation text in 13px
  `--sub`, then a centred button row (gap 8px, margin-top 10px) with
  `取り消す` (danger-solid) and `やめる` (`.btn`). No native dialog.
  Confirming deletes today's session and returns to the condition
  state; `やめる` restores the link.
- State — session completed: the finish card is replaced by an OK box:
  `完了済みです。レポートで確認できます。`, followed by a primary CTA
  `レポートを見る` (goes to レポート).
- State — no session yet and no condition recorded today: the text
  `今日のコンディションが未入力です。先に入力してください。`, then a primary CTA
  `コンディションを入力` (goes to the コンディション screen). This state has
  priority over the generate state below.
- State — no session yet (condition recorded): the text
  `今日のセッションはまだありません。`, then a primary CTA
  `今日のワークアウトを作る`, then an error line (`.error`) under it.
  When the user arrives here via `保存してワークアウトを開始` and creation
  was blocked, the error line already shows the blocking reason.

### History entries (results merged in)
- There is no separate Result screen. Completing today's session — and
  the condition screen's `今日の結果を見る` CTA — lands on レポート,
  which is both the result view and the history.
- Heading `レポート`. Below the summary graphs sits the **day
  pager**: one recorded day at a time — days are **not** stacked
  vertically. The shown day changes by **swiping left/right** on the
  day page (left = older day, right = newer day), by the circular
  **‹ › buttons** flanking the pager title (‹ older, › newer; disabled
  at the ends), or by tapping a bar in the **trend chart**.
- Pager header: the date as one line `MM/DD(曜)` (30px Barlow
  Condensed numerals), under it the session title (`{title}` only —
  the rotation letter is never shown), under it the position
  `{n} / {total}` in `--sub`.
- Trend chart: one slim bar per recorded day, chronological (oldest
  left), height relative to the largest day total; the shown day's
  bar is `--accent`, the rest `--border`. Tapping a bar jumps to
  that day. It sits at the **very top of the report, above the
  monthly chart**. The pager region and the trend chart carry
  `touch-action: pan-y`, so horizontal swipes reach the app's touch
  handlers while vertical scrolling stays the browser's.
- Day page: the session total at the top right (30px numeral +
  `レップ`), then a **horizontal bar per exercise**: name in `--text`
  with `（{variation}）` and `（RPE {rpe} {word}）` in `--sub` on the
  same label, a bar whose width is the exercise's logged total
  relative to the day's largest exercise total, and the value plus
  unit at the right. (The old per-set `6 / 6 回` text rows are gone;
  the per-set values live on in the edit cards and the CSV export.)
- A per-exercise note goes directly under its exercise bar: 12px
  `--sub`, `種目メモ： {note}`.
- Under the bars, the edit button: margin-top 8px, padding
  5px 14px, radius 999px, 1px solid `--border`, `--surface` fill, 12px
  weight 700: `記録を編集`.
- State — editing (after tapping `記録を編集`): the day's bars are
  replaced, in place, by **the workout screen's exercise cards** —
  the identical card (see "Workout exercise cards"): muscle group,
  variation heading, target line and cue, the total target at the
  top-right, `{n}セット目` black-box set inputs (two side inputs for
  unilateral exercises), the hairline, the same ten-option RPE
  select, the same note field and hint. Differences from the workout
  screen only: the initial values are the **recorded** values (no
  target pre-fill, no previous-RPE pre-fill, no draft restore), there
  is no countdown timer, and the per-card save button writes through
  the history record endpoint and keeps the exercise's stored
  completion flag (the card has no completion checkbox). Saving
  recomputes the session total and stats as before, and the entry
  stays in edit mode so the remaining cards can be fixed too.
  - Under the cards, a `編集を終わる` button (same pill style as
    `記録を編集`) leaves edit mode and returns the entry to the list
    form.

### Settings screen
- Opened only via the gear button; it replaces the app area (header,
  gear and nav remain; no nav segment is active; the gear keeps its
  one muted style — it has no active state).
- At the top-left of the content, the back button: `← ホームに戻る` —
  no background, no border, 14px `--sub`, a left arrow followed by the
  label, quiet like a text link. Tapping it returns to the condition
  screen (home).
- Heading `プロフィール（初回設定）`, then the form grid: CSS grid,
  columns `repeat(auto-fit, minmax(150px, 1fr))`, gap **12px**, margin
  10px 0. Fields in order: 年齢 / 性別 (a select: 男性 / 女性 /
  選択しない） / 身長（cm） / 体重（kg） (normal width), then 補足 as one
  wide field spanning all columns (textarea, rows 3) with the
  note-contents hint under it (12px `--sub`; see "Exact UI text —
  Settings screen").
- Each field: label above the control — label 13px `--sub`, 4px gap.
- **Autosave — there is no save button.** Any edit to the profile
  form is saved automatically about **1.8 seconds** after the input
  stops (debounced `POST /api/profile`); leaving the screen flushes a
  pending save first. The save never re-renders the form (focus and
  input are kept). Under the grid, one quiet status line (13px): the
  saved indicator `保存済み` in `--accent` bold, shown after a
  successful save and hidden again on the next edit; when validation
  fails, nothing is saved and the reason appears in that same line
  as an error (`.error`) instead.
- Heading `言語`, then a row of two `.btn` (`日本語` / `English`); the
  current language's button carries the `.btn.active` style. Saving
  is server-side (`POST /api/lang`) and re-renders in place.
- Heading `テーマ`, then a row of three `.btn` (`ダーク` / `ライト` /
  `システム`); the current setting's button carries `.btn.active`.
  Saving is server-side (`POST /api/theme`) and the new theme applies
  immediately, with no reload (see "Theme").
- Profile history (only when at least one entry exists): heading
  `プロフィール履歴`, then the entries newest first, each separated by
  a 1px `--border` bottom border: the save moment in 13px `--sub`
  (`{M/D（曜）} {HH:MM}`), then one 14px line per changed field
  (`{label}： {from} → {to}`, unset = `未入力`). Read-only — there is
  no history editing.
- Heading `データ`; small text (13px `--sub`):
  `保存先はサーバー側の data/store.json です。`, then the formats line
  (same size; see "Exact UI text — Settings screen").
- Export / import row: `.btn` in a row (gap 8px, wrap allowed):
  `エクスポート（JSON）` downloads the whole store as a JSON file
  (`GET /api/export`, sent with a download Content-Disposition);
  `エクスポート（CSV）` downloads the session records as a CSV file
  (`GET /api/export.csv` — see "Data export / import"); `インポート`
  opens a JSON file picker (import is JSON only).
- Heading `メニュー定義`; small text (13px `--sub`) explaining that the
  menu (exercises, rotations, substitutes, pain targets) is editable
  as JSON, that changes apply to sessions generated afterwards, and
  that recorded sessions never change. Below it, the current menu
  definition in a monospace textarea (the store's own catalog, or the
  built-in one when none is saved), and a `.btn` row: `保存` (saves the
  edited JSON — fully validated first; a bad definition is refused
  with the specific reason and nothing is stored), `エクスポート`
  (downloads the definition as `menu-catalog.json`), `インポート`
  (opens a JSON file picker and saves the picked definition through
  the same validation), `初期値に戻す` (two-step: the button re-labels
  to `本当に初期値に戻す`, a second tap drops the saved catalog and
  returns to the built-in one). A successful save shows `保存しました`.
  The workout screen carries a `メニュー編集` button (below the
  session content, and on the no-session empty state) that navigates
  to this section of the settings screen.
- State — import chosen (a parseable file was picked): a confirmation
  block in the same style as the reset confirmation below (warning
  colours, stacked in normal flow, no native dialog): the text
  `「{file name}」で現在のデータをすべて置き換えます。元に戻せません。`, then
  `インポートする` (danger-solid, full width), then `キャンセル` (`.btn`,
  full width). Confirming replaces the whole store
  (`POST /api/import`); the file is fully validated first and a bad
  file is refused with a reason and replaces nothing. A file that is
  not JSON at all shows `ファイルの形式が正しくありません` instead of
  opening the confirmation.
- Delete button (`.btn` danger outline): `データを消す`.
- State — confirmation open: a separate block stacked **below** the
  delete button in normal flow, margin-top 14px, warning colours
  (border `#ef4444`, fill `#2a0f0f`, text `#fecaca`), radius 10px,
  padding 12px, its children stacked in a column with gap 8px: the
  confirmation text (13px), then `本当に全データを消す` (danger-solid,
  full width), then `キャンセル` (`.btn`, full width). No absolute
  positioning, no overlay, no native `confirm()` dialog — the block
  must never overlap the `データを消す` button.

### Form uniformity
- Generic controls — every `input` (text/number), `select` and
  `textarea` outside the workout exercise cards — share one geometry:
  **height 42px**, padding 0 10px, radius **8px**, 1px solid
  `--border`, fill `--surface-2`, `--text`, **font 16px** (prevents
  iOS zoom), `box-sizing: border-box`. Textarea exception: height
  auto with min-height 42px, padding 9px 10px, line height 1.5,
  vertical resize only.
- Note inputs: full width. (History editing uses the workout
  exercise cards, whose fields follow the card geometry — there are
  no separate generic set / RPE inputs anymore.)
- Settings fields sit on the regular grid described above; no field is
  sized ad hoc.
- The workout exercise cards deliberately use their own black-field
  geometry (see "Workout exercise cards"), uniform within the card.

### Primary CTA
- Full width (100%, border-box), **padding 16px**, radius **8px**, no
  border, `--accent` fill, **16px weight 700** `--on-accent` text,
  margin-top **20px** (0 when inside the finish-area card). Total
  rendered height is 58px at the standard line height.

### Fallback UI — loading and request failure

The app talks only to its own API, so fallback UI exists only where a
wait or a failure would otherwise leave a blank or unresponsive screen.

- Initial load: the app area shows the loading placeholder
  `読み込み中…` until the state arrives. If the load fails, the area
  shows the reason as error text (`.error`), then the small-text hint
  that the server may not be running — including its start command
  (`サーバーが起動していない可能性があります。起動コマンド： bun run server.ts`) —
  followed by a primary CTA `再読み込み`, which returns to the loading
  placeholder and retries. Never a blank screen.
- Every button that sends a request — the condition CTA in all its
  states, `今日のワークアウトを作る`, the per-exercise record buttons,
  `今日のトレーニングを完了する`, `取り消す`, the history-edit card saves,
  the settings `保存`, and the reset confirmation — is disabled while
  its request runs, so nothing can be submitted twice. Disabled
  buttons render at **opacity 0.55** with the default cursor; no
  label change, no spinner.
- If such a request fails, the reason appears as an error line
  (`.error`, 14px, margin-top 8px) directly after the button, and the
  button is re-enabled. A failure is never silent and never leaves a
  button stuck. Two pre-existing error spots stay as they are instead:
  the workout empty state's error line carries generation failures,
  and a blocked start via `保存してワークアウトを開始` shows its reason there.
- A network-level failure (no response at all) is always worded
  `通信に失敗しました。接続を確認してもう一度お試しください。`; a server
  refusal shows the server's reason text.

## Input validation, escaping, and numeric keyboards

Validation is enforced **twice** with the same rules and the same reason
texts: in the client before sending (the reason appears in the same
error line used for request failures, directly after the button), and
again on the server for every write. An invalid write is refused with
HTTP 400 and the reason; **nothing is stored**, and no value is ever
silently clamped, truncated, or coerced into range.

### Validation rules (normative)

- Set reps / seconds: integers **0–999** only. Negatives, decimals and
  strings are refused. A unilateral exercise's set is stored as a
  left/right pair `{l, r}`; the same 0–999 integer rule applies to
  **each side** (see "Left/right recording").
- RPE: empty (not entered), or **6–10 in 0.5 steps** only.
- Pain levels (soreness and joint pain): integers **0–5** only, checked
  on the server as well as in the tap UI.
- Per-exercise note: at most **200 characters**; a longer note is a
  save error, never a silent truncation.
- Profile: **age required, integer 10–100**; **height required,
  integer 100–250** (cm); **weight required, 20–300** (kg, decimals
  allowed). A required field left empty is an error. **Sex** accepts
  only the select's stored values (`男性` / `女性` / `""` for
  選択しない）; anything else is refused. The single profile note
  field （補足） is capped at **500 characters** (the cap grew when the
  two former 200-character fields — 体脂肪などの補足 / 運動習慣の補足 —
  merged into one). (There is no numeric body-fat field; body fat is
  part of the free-text note.)
- Profile data migration: a store saved with the old shape is
  carried over losslessly on load — the two legacy note fields merge
  into 補足 joined by a newline, and a legacy free-text sex value
  that is not one of the options folds to `""` （選択しない）. Imports
  in the old shape get the same treatment.
- Dates: **YYYY-MM-DD only**, naming a real calendar day. No endpoint
  accepts a date from the client — the server derives "today"
  (Asia/Tokyo) itself; the format rule guards every date that is read
  or written.

### Validation messages (exact UI text)

- `回数は0〜999の整数で入力してください`
- `RPEは6〜10（0.5刻み）で入力してください`
- `痛みレベルは0〜5の整数で入力してください`
- `メモは200文字以内で入力してください`
- `年齢を入力してください` / `年齢は10〜100の整数で入力してください`
- `身長を入力してください` / `身長は100〜250cmの整数で入力してください`
- `体重を入力してください` / `体重は20〜300kgで入力してください`
- `性別は選択肢から選んでください`
- `補足は500文字以内で入力してください`
- `日付はYYYY-MM-DD形式で入力してください`

### Escaping (XSS)

There is no database and no SQL anywhere, so SQL injection does not
apply. The injection surface that does exist — user-entered text
rendered back as HTML — is closed by escaping: **every** user-entered
string (exercise notes, profile fields, and any text derived from
stored data) is inserted into markup only through the escaper, or
assigned via `textContent`. A tag typed into a note is stored as data
and displayed as literal text; it never becomes markup and never runs.

### Numeric keyboards (iOS / Android stock keyboards)

Numeric fields summon the numeric keypad via `inputmode` while staying
`type="text"`:

- Set inputs (workout cards, including history editing): `type="text"` —
  deliberately **not** `type="number"`, which once displayed a typed
  `1` as `01` — with `inputmode="numeric"` and `pattern="[0-9]*"`.
- Integer profile fields (age, height): `inputmode="numeric"` with
  `pattern="[0-9]*"`.
- Decimal fields (weight): `inputmode="decimal"`.

## Draft persistence (workout screen)

Unsaved input on a workout card survives a reload or a stray tab
switch:

- While a workout card is being filled in, its raw values (set fields,
  RPE select, note) are kept in `localStorage` under a key naming the
  session's own date (the day it was started) and the session:
  `btl-draft:{YYYY-MM-DD}:{session id}`, one
  entry per exercise. The server-side data format is unchanged.
- A draft is restored **only onto unrecorded cards**; saved server
  values always win. Restoring a draft never changes the card's
  recorded / unrecorded state or its button label.
- A unilateral exercise's set drafts as a pair of raw strings
  (`{l, r}`), mirroring the stored pair shape; the restore fills the
  two side inputs.
- A draft entry is dropped when its exercise is saved, the whole key
  when the session is completed or cancelled, and all keys on data
  reset or after a data import. On load, drafts belonging to another
  day or another session are pruned, and a completed session keeps no
  drafts.

## Data export / import

Two export formats exist; import is JSON only:

- **JSON export** (`GET /api/export`) returns the whole store as
  pretty-printed JSON with `Content-Disposition: attachment`,
  filename `bodyweight-training-log.json`. This is the backup /
  restore format.
- **CSV export** (`GET /api/export.csv`) returns the session records
  as a human-readable table for viewing — one row per exercise per
  session (chronological), columns: date, rotation, title, status,
  exercise, muscle group, variation, target sets, target reps, unit,
  logged sets (a unilateral pair as `左{l}/右{r}`), exercise total,
  RPE, note. `Content-Type: text/csv; charset=utf-8`, filename
  `bodyweight-training-log.csv`, **UTF-8 with a BOM** (so Excel opens
  it without mojibake), CRLF line endings, RFC 4180 quoting; the
  column headers follow the store's language. CSV is **viewing
  only — it cannot be imported**.
- Import (`POST /api/import`, **JSON only**) replaces the whole store — but only
  after the file passes a full structural check: all top-level keys
  present (`profile`, `pain`, `sessions`, `nextSessionId`,
  `nextExerciseId`), every record type-checked, and the validation
  rules above applied wherever they fit (dates, pain levels, reps,
  RPE, notes, profile). A bad file is answered 400 with the reason
  `インポートファイルの形式が正しくありません` and **nothing is replaced**.
  Records are rebuilt field by field (unknown keys dropped), session
  totals are recomputed, and the id counters are raised past the
  largest imported id when needed so future sessions cannot collide
  with imported ones. An imported profile in the old two-note-field
  shape is merged the same way saved data migrates (see "Validation
  rules"), and a legacy free-text sex value folds to 選択しない.
- On a successful import the client reloads its state from the
  response and re-renders.
- The store also carries `profileHistory` (see Settings). It is part
  of every export; on import it is optional — files written before it
  existed import with an empty history, and a present history is
  type-checked like every other record.
- The store may carry `catalog` — the user's own menu definition (see
  Settings). Absent means the built-in catalog. On import it is
  optional; when present it passes the full catalog validation
  (`parseCatalogImport`): exercises keyed by id with `painPart` in
  `muscleParts` and every `jointParts` entry in `joints`, a non-empty
  `ladder` with `defaultLadder` in range, no `unilateral` on timed
  exercises, rotations exactly A/B/C once each naming only defined
  exercises, substitutes naming only defined exercises (never itself),
  and `jointToMuscleParts` keys in `joints` with values in
  `muscleParts`. An exercise's `steps` / `focus` (the guide window's
  contents) may be omitted and fall back to its cue / muscle group.
  The catalog endpoints mirror the data ones: `GET /api/catalog`
  (the current definition as JSON), `GET /api/catalog/export`
  (download, filename `menu-catalog.json`), `POST /api/catalog`
  (`{ catalog }` or `{ catalogText }` to save — validated first, a bad
  definition answers 400 with the specific reason and stores nothing;
  `{ reset: true }` drops the saved catalog). Catalog changes apply
  to sessions generated afterwards; recorded sessions keep the names
  and targets they were created with.
- Logged sets in an import may be plain numbers or left/right pairs
  (a pair's sides are each checked as reps). The store's `theme` is
  optional on import exactly like `lang`: absent is fine (it then
  defaults to `システム`), present must be one of the three values.

## Data file safety — atomic writes, backups, recovery, server log

- Writes are **atomic**: the new store is written to a temp file and
  renamed over `data/store.json`, so an interrupted write can never
  leave a half-written file.
- Before each overwrite, the previous contents are rotated into
  **backup generations** next to the store file: `store.backup.1.json`
  (newest) through `store.backup.3.json`. Nothing else is kept.
- On load, a store file that exists but does not parse is treated as
  corrupted: the newest backup generation that parses takes its
  place, the main file is restored from it, and the recovery is
  recorded in the server log. A **missing** store file is a fresh
  start, not a recovery — deleting `store.json` (and its backups)
  stays the manual reset.
- The server keeps an event log at `data/server.log`: one line per
  event with an ISO timestamp — startup, store recovery, API errors
  (status, method, path, short reason), and auth events. It never
  contains request bodies or stored personal data. Past ~256 KB it
  rotates to a single `server.log.1`, so at most two files exist.

## Dates and sessions — one clock, sessions belong to their start day

- There is exactly one clock: the **server's Asia/Tokyo date**. The
  server derives "today" itself for every judgement and returns it in
  the state; the client never computes a date from the device clock
  (weekday math is done on the server's date strings, in UTC day
  numbers). The countdown timer's use of the local clock is for
  durations only, never for dates.
- A session **belongs to the day it was started** (its server date)
  and keeps that date forever. If the date moves on while a session
  is still unfinished, the workout screen keeps showing that session
  — titled with its own date, `{M/D（曜）}のセッション` — and it can be
  recorded and completed as that day's session. It never merges into
  the new day: generating a session for the new day creates a
  separate session for that date.
- Condition (pain) records are the opposite: always the current
  server day's. Starting a new day means a fresh condition check for
  that day; yesterday's check is history, used by the 24-hour rule
  and duration guidance.

## Condition re-save rebuilds the planned session

Saving the condition check is not only a record write: **every**
pain save rebuilds the day's planned session against the newest
assessment, treating what is already recorded as fixed premises
("build the rest of the menu around the recorded workout"):

- The target is the session the workout screen works on — today's
  planned session, else the newest still-planned one. A **completed**
  session is never changed by a pain save.
- An exercise counts as **recorded** when it is completed, has an
  RPE, has a non-empty note, or has any logged set ≠ 0. A recorded
  exercise is fixed exactly as it stands — exercise, target, and
  record all stay — and it is never removed from the composition and
  never duplicated by a remaining slot.
- Every unrecorded slot is re-planned with the normal generation
  pipeline (rotation composition, body-part balance, the decision
  engine), treating the recorded exercises as the slots they already
  fill. The newest assessment applies to all remaining slots: an
  exercise that is newly excluded drops out, one newly reduced gets
  the reduced target, and one whose exclusion has cleared is planned
  again. The progression (adjustment) notes are regenerated from
  the newest assessment. (The session data still carries a
  `focusNote` field for compatibility, but it is always empty — no
  focus-note text is generated or displayed.)
- If the new assessment is a warning-sign (care) day or a full-rest
  day, every unrecorded exercise is removed — only the recorded part
  stays — and the blocking reason is left in the progression notes,
  so the workout screen shows why (the usual notes area).
- The session's id, date, rotation, and intro flag never change.

## Left/right recording (unilateral exercises)

- An exercise definition may carry a **unilateral flag** (rep-based
  exercises only — never a timed exercise). Currently flagged:
  シングルレッグRDL (`rdl`) and リバースランジ (`reverseLunge`; its
  variation ladder includes スプリットスクワット and
  ブルガリアンスクワット).
- Data format: a flagged exercise's logged set is stored as a
  **left/right pair** `{l, r}` instead of a plain number. Plain
  number arrays stay valid everywhere else, and a plain number
  already stored on a flagged exercise keeps working — it displays
  as that value on both sides (legacy compatibility). Export /
  import validation accepts both shapes and checks each side as a
  rep count (integer 0–999).
- Display: the exercise total is the **sum of both sides**. The
  report shows each set's sides (`左11 / 右10`; English `L11 / R10`).
- Next-load adjustment: the achievement rate (actual ÷ target) is
  computed from the **weaker side** — a pair set counts by its
  smaller side — so a strong side cannot mask a lagging one.
- Workout-card drafts store the pair's two raw input strings, like
  the record itself.

## Navigation — browser history and scroll positions

- Each view has a path: コンディション `/`, ワークアウト `/workout`,
  レポート `/report`, 設定 `/settings`. Switching views (tabs, the gear,
  and the in-app buttons that change screens) pushes a history entry,
  so the browser's Back / Forward buttons move between views.
- The initial entry is written with `replaceState`: loading the app
  (including a deep link to a view path, which opens that view) adds
  no extra history.
- Scroll positions are kept per history entry: leaving a view stores
  its scroll offset, and returning via Back / Forward restores it. A
  fresh navigation to a view starts at the top.

## Optional token authentication

- Authentication exists only when the server is started with the
  `BTL_TOKEN` environment variable set. Unset, there is no login
  anywhere and the app behaves exactly as specified above.
- When enabled, **every** page and API route is protected: an
  unauthenticated page request redirects to `/login`, and an
  unauthenticated API request is answered 401. `/login` shows a
  minimal form in the app's own tokens, following the theme saved in
  the store (for `システム`, via `prefers-color-scheme`), with one
  password field labelled `トークン` and a primary `ログイン` button.
  A wrong token is refused with the single generic line
  `トークンが違います`.
- A correct token sets an HttpOnly cookie (`SameSite=Lax`, 30 days)
  holding only a hash of the token; it opens all pages and APIs until
  it expires. There is no user account and no logout UI.

## PWA — manifest and icons

- A web app manifest is served at `/manifest.webmanifest` as
  `application/manifest+json`: name `自重トレーニング記録`, short name
  `自重トレ`, `display: standalone`, `background_color` and
  `theme_color` both `#0f0f0f`.
- Icons are PNG: 192 and 512, a 512 maskable variant, and a 180
  apple-touch-icon. They are not files in `public/`: the PNG bytes are
  embedded as base64 constants in `src/icons.ts`, and the server
  decodes them and serves them as `image/png` at the usual paths
  (`/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`,
  `/apple-touch-icon.png`) that the manifest and page head reference.
  The motif is the ring gauge — a `#2d2d2d` track
  circle with a `#2dd4bf` arc (round caps, starting at the top,
  sweeping about 270°) and a teal centre dot — on a `#0f0f0f`
  background; the maskable variant keeps the motif inside the safe
  zone. The 192 icon doubles as the favicon.
- The page head links the manifest and the apple-touch-icon, sets
  `theme-color` to the resolved theme's page background (`#0f0f0f`
  dark / `#f2f2f0` light — the meta starts at `#0f0f0f` and the theme
  machinery keeps it in sync), and declares the
  mobile-web-app-capable metas with app title `自重トレ`. The
  manifest's own colours stay `#0f0f0f` in both themes.
- There is deliberately **no Service Worker**: the app is useless
  without its server, and an offline shell would only pretend
  otherwise.

## Accessibility (minimum)

- Every input has an associated label without changing the visual
  layout: the exercise cards' RPE select and note use `label for`
  (the same cards serve history editing); set inputs carry an
  `aria-label` of `{exercise} {n}セット目`, with the side appended
  (`左` / `右`) on a unilateral exercise's pair inputs, which also
  have a visible side label; the settings fields use `label for`
  with matching ids.
- Pain tiles are real `button` elements whose `aria-label` states the
  part and the current level, e.g. `胸：レベル2（普通）`. Warning-sign
  chips are buttons with `aria-pressed`.
- The active navigation segment carries `aria-current="page"`.
- Keyboard focus is visible: `:focus-visible` draws a 2px `--accent`
  outline with a 2px offset. Nothing changes at rest.
- Tap targets already fixed by this document's normative geometry
  (the 34px gear, the chips at 7px vertical padding, the 12px
  history `記録を編集` pill) are **not** enlarged — the normative sizes
  win over the 44px guideline where they conflict.

## Date display — only two forms
- Dates may appear **only** in these two shapes: (a) the header's
  `M/D（曜）`, (b) the history list's single-line `MM/DD(曜)`. Full
  date strings (`YYYY-MM-DD`, `○年○月○日`, long
  weekday forms, dates inside reason texts) are banned on every screen.
  The week dot row carries weekday letters only — no dates, no day
  numbers, and no week boxes.
- Three defined reuses, all built from form (a), are not new forms:
  the workout screen's past-day session label `{M/D（曜）}のセッション`,
  the settings profile-history timestamp `{M/D（曜）} {HH:MM}`, and
  the report's monthly summary label `{YYYY}年{M}月` (a month, not a
  day — the only place a year is shown).

## Internationalization (ja / en)
- The UI language is a setting on the settings screen （日本語 /
  English), Japanese by default, stored server-side in the store
  (`lang`; absent means Japanese). Switching re-renders every screen
  in place — no reload — and the choice survives restarts and is
  shared by every browser, because the server owns it.
- All UI wording is dictionary-managed: no display string is hardcoded
  in the rendering code. The "Exact UI text" sections above are
  normative **in Japanese**; for every one of those strings an English
  equivalent must exist in the dictionary (and vice versa — no string
  may exist in only one language).
- Server-generated text follows the same setting: assessment reasons,
  duration guidance, progression notes, validation messages, error
  reasons, and the token-auth login page are produced from per-language
  templates on the server (`src/i18n.ts`), never by translating on the
  client. Decision logic (thresholds, branches, amounts) is identical
  in both languages.
- Display words derived from data keys — body parts, joints, muscle
  groups, rotation names, warning-sign labels, difficulty-level words —
  have English display equivalents in the dictionary; the stored keys
  stay Japanese. Exercise and variation names are training data and
  are never translated.
- Weekday notation follows the language while the date shapes above
  stay fixed: Japanese uses the fullwidth form `11/13(金)` /
  `11/13（金）`; English uses the halfwidth form with the three-letter
  English weekday, `11/13(Fri)`. The week dot row's letters and the
  monthly summary label localize the same way (`Fri`, `Nov 2026`).
- Strings frozen into saved data (a session's progression notes, the
  stored profile-history labels) keep the language they were written
  in; only newly generated text uses the current language.
- The PWA manifest (app name, description) stays Japanese regardless
  of the setting.

## Screen compositions

### 1. Condition （コンディション）
1. Missing-profile warning box (only when no profile is saved)
2. Header (date + purpose / Day + cumulative reps)
3. Segment navigation （コンディション active)
4. Settings gear (fixed, top-right — present on every screen,
   visible only while scrolled to the very top)
5. `まず、警告サインの確認` — heading, description, warning-sign chips
6. `今日の筋肉痛は？（部位ごと）` — heading, description, legend badges,
   2-column tiles (10 parts)
7. `今日の関節痛は？（関節ごと）` — heading, description, legend badges,
   2-column tiles (7 joints)
8. Primary CTA （保存してワークアウトを開始 — it saves the condition
   check, rebuilds the day's planned session, creates today's session
   first if none exists, and goes to the workout screen;
   今日の結果を見る when today's session is completed)
9. Assessment box (care warning / rest-day warning / OK box), when an
   assessment exists
10. Guidance caution boxes (duration notices), if any
11. Overload caution box (24-hour rule), if any
12. Footer note `判定基準について` (present on every screen)

### 2. Workout （ワークアウト）
1. Header; segment navigation （ワークアウト active); gear as on every
   screen (visible only at the very top)
2. Week dot row
3. Ring gauge
4. Session title block (title, remaining line)
5. Three metrics
6. One exercise card per exercise (timer inside the card for timed
   exercises)
7. Finish area — or the completed OK box + `レポートを見る` CTA — or, when
   there is no session yet, the condition-missing text +
   `コンディションを入力` CTA (when no condition is recorded today; this
   has priority), otherwise the empty-state text +
   `今日のワークアウトを作る` CTA + error line
8. Adjustment / progression notes (bottom of the menu, after the
   cards and the finish area)
9. Footer note

### 3. Report （レポート）
1. Header; segment navigation （レポート active); gear as on every
   screen (visible only at the very top)
2. Heading `レポート` (or the empty-state text + `ワークアウトへ` CTA)
3. Search field `種目名・メモで検索`; while a query is present, the
   summaries hide and the entries are filtered
4. Summaries `月別` and `部位別` (quiet two-column rows)
5. Entries, newest first, in the list form above; an entry in edit
   mode shows its edit cards in place
6. Footer note

### 4. Settings （設定， via the gear)
1. Header; segment navigation (no segment active); gear in its
   usual muted style (visible only at the very top, as everywhere)
2. Back button `← ホームに戻る` (top-left of the content)
3. Heading `プロフィール（初回設定）`; the uniform form grid (autosaves —
   no `保存` button; the `保存済み` indicator and any error line sit
   under the grid)
4. Heading `言語`; the `日本語` / `English` buttons
5. Heading `テーマ`; the `ダーク` / `ライト` / `システム` buttons
6. Heading `プロフィール履歴` and the entries, when history exists
7. Heading `データ`; the data note and the formats line;
   `エクスポート（JSON）` / `エクスポート（CSV）` / `インポート` (with the
   import confirmation block when a file is chosen); `データを消す`; the
   confirmation block below it when open
8. Footer note

## Scope boundary for design work

- Work that exists to reproduce this look changes **presentation
  only**: markup structure, styles, and the visual states defined
  here.
- It must not change the workout logic, the pain rules or thresholds,
  the decision engine, or any saved data or data format. If a visual
  change seems to require touching those, stop — the visual spec is
  wrong, not the logic.

## Do not

- Do not add a third theme, per-screen theme overrides, or theme
  colours outside the two token sets defined here.
- Do not colour pain levels yellow → orange → red (no heat scale).
- Do not introduce a second accent colour or decorative gradients.
- Do not use red anywhere except warning / red-flag surfaces and
  destructive actions; do not use the caution amber anywhere except
  guidance notice boxes.
- Do not replace the segment navigation with pills or a sidebar.
- Do not add a week strip, week boxes, or day numbers to the workout
  screen — the week dot row (letters + dots only) is the whole of it.
- Do not drop Barlow Condensed for the numerals.
- Do not add explanatory prose outside the two places allowed by the
  text-minimal principle.
