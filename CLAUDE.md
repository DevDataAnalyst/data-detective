# Data skills learning app: Unit 1 prototype

## What this is

A prototype of a gamified web app that teaches statistics, data analytics and machine learning
foundations to engineering graduates in India who are looking for jobs but lack data skills.
Many learners will use phones, and some have slow connections.

## Prototype goal

Build ONE unit to test whether two layers feel right together:

1. **Lesson layer (Duolingo style):** short 3–5 minute lessons on a single guided path, instant
   feedback, XP, a daily goal and a streak.
2. **Mission layer:** at the end of the unit, the learner writes real Python (pandas) in the browser
   on a messy dataset and makes a business recommendation. The mission is worth far more XP than
   lessons, so progress comes from real skills, not streak-chasing.

Unit 1 is **"Data Detective"** (descriptive statistics). The mission is **"The Late Delivery
Mystery"**.

The build stops at a testable prototype, not a full product. Prefer the simplest thing that lets
testers experience both layers.

## Tech decisions

- Vite + React + TypeScript (strict) + Tailwind CSS
- Pyodide (loaded from the jsDelivr CDN, lazy-loaded only when the mission opens) for Python and
  pandas in the browser
- CodeMirror 6 for the code editor
- Vitest + React Testing Library for tests
- localStorage for all progress, behind a single storage module so it can be swapped for a backend
  later
- No backend, no auth, no analytics services

## Principles

- **Content is data.** Lessons, questions and missions live in typed JSON/TS content files, so new
  units can be added without changing components.
- **Mobile first.** Must work well at 360px width, with touch targets at least 44px.
- **Accessible.** Keyboard navigable, visible focus, sufficient colour contrast, respects
  `prefers-reduced-motion`.
- **Encouraging, not punishing.** No "hearts" or lives that block learning. Wrong answers show an
  explanation and the learner retries.
- **Plain, friendly copy** in sentence case. No claims about jobs, placement or salaries anywhere in
  the app.
- **Game logic is pure.** XP, streaks, unlocking and grading live in pure functions with unit tests,
  separate from UI components.

## Commands

Run from the project root. Needs Node 22.22 or newer.

| Task      | Command                                                                 |
| --------- | ----------------------------------------------------------------------- |
| dev       | `npm run dev` (Vite dev server on http://localhost:5173)                |
| build     | `npm run build` (type-checks with `tsc -b`, then builds to `dist/`)     |
| test      | `npm test` (Vitest, single run); `npm run test:watch` while developing  |
| python    | `npm run test:python` (grading checks in real Pyodide; slow, networked) |
| data      | `npm run generate:data` (rewrites the three CSVs in `public/data/`)     |
| lint      | `npm run lint` (ESLint, then Prettier check); `npm run format` to fix   |
| typecheck | `npm run typecheck`                                                     |
| preview   | `npm run preview` (serves the production build locally)                 |
| e2e       | `npm run test:e2e` (Playwright; builds, previews, needs the network)    |

## Project structure

- `src/content`: typed course content (units, lessons, questions, missions). No React here.
- `src/game`: pure game logic (XP, streaks, unlocking, grading, lesson sessions) with unit tests.
- `src/storage`: the only code that touches localStorage.
- `src/components`: shared UI components.
- `src/pages`: one component per route.
- `src/mission`: the Python mission workspace (Pyodide worker, editor, grading).

## Conventions

- Routes are defined in `src/routes.tsx` using React Router 8 (`react-router`; `RouterProvider`
  comes from `react-router/dom` in the app and from `react-router` in tests). `RootLayout` holds
  `ScrollRestoration`, so new pages open at the top.
- Tailwind CSS v4: design tokens live in the `@theme` block in `src/index.css` (there is no
  `tailwind.config` file). Use the semantic colours: `correct`, `incorrect` (amber, never red),
  `locked`, `current`, `xp` and `streak`.
- Colours must work in light and dark mode, which only remaps tokens (see "Dark mode" below):
  cards and panels use `bg-surface`, never `bg-white`; text in a semantic colour uses the ink
  steps (`text-current-ink-700`, `text-correct-ink-800`), never `text-current-700`; the plain
  500–700 steps are for solid fills that carry white text, and for icons.
- Tests sit next to the code they test as `*.test.ts(x)`. Import `describe`/`it`/`expect` from
  `vitest` explicitly (no globals).
- TypeScript is pinned to 6.0.x because typescript-eslint does not support TypeScript 7 yet.

## Content rules

- Types are in `src/content/types.ts`; Unit 1 is `src/content/unit1.ts`. `validateUnit` in
  `src/content/validate.ts` runs in the test suite, and any issue fails the build.
- Never trust a typed-in number. Numeric answers are recomputed from the question's data:
  `numeric_estimate` and `predict_reveal` name their `statistic`, `tap_outlier` indices must match
  the 1.5 × IQR rule, and a multiple choice question whose correct option is a number needs a
  `check`.
- Numbers quoted in prompts and explanations use placeholders like `{mean}` or `{std_dev:1}`,
  filled from the question's `dataset` by `fillTemplate`.
- Probability and testing questions name their numbers in `givens` and work the rest out in
  `derived` formulas (`src/content/formula.ts`: + − × ÷ ^, brackets, sqrt, abs, min, max and phi,
  the normal CDF). Text quotes them as `{caught}` or `{answer:%}` (a fraction as a percentage).
  Multiple choice answers use `check: { kind: 'formula', formula, tolerance }`, and numeric
  estimates can use a `formula` (with an `answerLabel`) instead of a statistic. Validation
  recomputes every one of them.
- Quartiles follow pandas (linear interpolation). Content must also be right under the textbook
  "halves" methods: exact answers must agree, estimates must fall within the tolerance. The same
  goes for population vs sample standard deviation.
- Statistics helpers live in `src/game/stats.ts`.

## Challenge question types

- Five types frame questions as analyst work: `inbox_triage` (a vague ask as a chat or email
  `StoryMessage`, plus three candidate questions; exactly one is answerable, the others name a
  `flaw`), `spot_the_lie` (a `ClaimChart` drawn as SVG plus the `trick` it plays), `courtroom`
  (two witnesses read opposite causes into one correlation; the learner picks the lurking
  variable, optionally from a `table` exhibit), `build_metric` (numerator and denominator
  cards, some of them distractors) and `ab_verdict` (an A/B test's counts; the learner calls
  ship, kill or wait and sees the `consequences` of the call they picked).
- An A/B verdict is recomputed by `abDecision` in `src/game/abTest.ts` from the counts, the
  `minWorthwhileLift` (percentage points) and an optional `issue` (peeking, a confounder, a
  novelty effect, too short), which always means wait. A p-value within 0.005 of 0.05 is
  rejected, so no call hangs on rounding. Its text can quote `{p_value}`, `{z}`, `{difference}`,
  `{relative_lift:%}`, `{ci_low}`, `{ci_high}`, `{control_rate:%}` and `{variant_rate:%}`.
- Their rules live in `src/content/validateChallenges.ts`. A chart's trick is recomputed from its
  data in `src/game/charts.ts` (`chartTricks`): a truncated bar axis must exaggerate differences
  at least 1.5×, a `window` must hide points that change the story, a dual axis needs two scales.
  One trick per chart. After answering, `honestChart` draws the fair version.
- `ChoiceCards` is the shared pick-one list (number keys, reveal states, a note per option); the
  three pick-one types and multiple choice all use it. `BuildMetric` supports dragging, tapping and
  the keyboard: a card fills the next empty box, a filled box gives its card back, and focus moves
  to the finished fraction so Enter checks.
- `/dev/question-preview` (development builds only) plays the placeholder questions in
  `src/dev/previewQuestions.ts` through the real lesson player.

## Lesson player

- `src/game/lessonSession.ts` is the reducer (wrong answers re-queue at the end); `src/game/grading.ts`
  grades every question type. The React side is `src/components/lesson/LessonPlayer.tsx`.
- One component per question type in `src/components/questions`, all taking `QuestionProps`
  (`reveal` shows the right answer, `locked` stops changes). Reuse them outside lessons.
- Charts are plain SVG. `src/components/charts/dotPlotLayout.ts` holds the pure layout maths.
  Interactive dots keep 44px targets by stacking, so tap-outlier plots can get tall on phones.
- Keyboard: number keys pick options, Enter checks and continues (buttons keep native Enter), Space
  toggles dots. Test keyboard flows with Testing Library; the browser pane's key presses don't
  activate buttons.

## Progress and storage

- The saved progress shape and its pure updates live in `src/game/progress.ts`; unlock rules in
  `src/game/unlocks.ts`.
- `src/storage/progressStore.ts` persists progress under one versioned localStorage key, parses
  defensively and falls back to memory when storage is blocked. Components read it with
  `useProgress()` and write with `useProgressStore().update(...)`.
- Tests render the whole app with `renderApp()` from `src/test/renderApp.tsx`, which gives each test
  its own in-memory storage.
- Development-only UI is wrapped in `import.meta.env.DEV` so it is stripped from production builds.

## XP, daily goal and streaks

- XP amounts come only from `src/game/xp.ts`; streak and daily goal rules from `src/game/streak.ts`;
  `src/game/rewards.ts` combines them. UI code calls `useRewards()` and never adds XP itself.
- Dates are local calendar `DateKey`s (YYYY-MM-DD). Pure functions take `today`/`now`; the app
  reads time from `src/storage/clock.ts`, which has a dev-only day offset (profile page).
- Decision: the mission's 100 base XP is paid as 20 XP per required code task when first passed,
  so any mission progress meets the 20 XP daily goal. Stretch tasks pay 15 XP each, up to 30.
  Completing the mission grants the streak freeze.
- `RootLayout` persists the day rollover (used freezes, resets) and shows the goal celebration.

## Mission workspace

- Missions are `src/content/mission1.ts`, `mission2.ts` and `mission3.ts` (validated by
  `validateMission`). Their datasets are generated by `npm run generate:data`; the planted
  patterns are documented in `scripts/README.md`. Every number content quotes from a dataset is
  checked against the CSV in tests (`src/test/deliveriesReference.ts`, `churnReference.ts` and
  `checkoutReference.ts`).
- Tasks are `code`, `written` (the recommendation) or `question`: a challenge question checked in
  the browser, so it works while Python loads. Code and question tasks are the graded tasks: they
  open in order, pay the mission XP between them and must pass before the recommendation opens. A
  wrong answer shows `wrongAnswerNote` (the picked candidate's flaw or suspect's note), never the
  right answer. Counts say "code tasks" only when every graded task is code (`gradedTasksLabel`).
- Python runs in a module Web Worker (`src/mission/python/pyodide.worker.ts`) with Pyodide 314.0.7
  from jsDelivr. `runner.py` runs learner code notebook style and returns JSON (stdout, tables,
  images, trimmed errors). `PythonRuntime` owns the worker.
- Time limits: 10 seconds once learner code starts; package downloads (such as matplotlib) get
  up to 3 minutes and do not count toward the 10 seconds. A timeout ends the worker, starts a new
  one and replays each task's last working code, as does every page load.
- The workspace is lazy-loaded from `MissionPage`, so lessons never download CodeMirror.
- A mission's `dataset.url` (such as `data/churn.csv`) is relative to the app's root. The
  workspace resolves it against `import.meta.env.BASE_URL`, never the page: missions live at
  `/units/…/mission`, where a page-relative URL fetches `index.html` instead of the data.
- Tests use a fake worker (see `MissionWorkspace.test.tsx`). `src/test/setup.ts` polyfills the
  Range geometry CodeMirror needs in jsdom.
- When editing files through shell heredocs, backslashes can be swallowed. Prefer the Edit tool
  for regexes.

## Mission grading and completion

- Hidden checks live in one Python module per mission (`checks.py`, `checks_churn.py`,
  `checks_checkout.py`), listed in `src/mission/python/checkModules.ts`; the worker loads the one
  for the open mission. At load, `compute_reference` works out every reference answer from the
  CSV (never hard-coded), and `reference_summary()` sends the dataset facts to the page. Each
  mission lists its `facts`, the only placeholders its summary lines may use, and a Python test
  checks the two agree. After each run with a `taskId`, the worker calls `check_task`, which
  returns `{passed, message}` and never raises. Messages point at what to fix without giving the
  answer. `npm run test:python` runs every check against correct
  and deliberately wrong solutions in Pyodide under Node (needs the network the first time).
- `src/mission/grading.ts` turns a run into feedback (an error comes first; a passed task stays
  passed). Unlock order, the suggested task and task status are pure functions in
  `src/game/missionRules.ts`: code tasks open one after another, the recommendation after every
  code task, stretch tasks after the last code task.
- Hints have three levels in the content (nudge, method, example with a `____` blank). Opened
  levels are saved as `hintsShown`; hints never cost XP.
- The recommendation has no automatic grading: the learner ticks a self-review checklist, sends
  it, then sees the model answer. Sending calls `completeMission`, which saves the text and ticks
  and grants the streak freeze.
- `/mission/summary` is the mission complete screen. It does not load Python. Its "what you did"
  and portfolio lines are content (`mission.summary`), filled with the saved dataset facts; lines
  can depend on stretch tasks with `requiresTask`/`unlessTask`. Validation keeps the portfolio
  block to 3–4 lines.
- Mission summaries can quote only the facts their mission lists in `facts`.

## Test-out checkpoint

- Rules are in `src/game/checkpoint.ts`: scoring (`correctNeeded` from the content's `passMark`),
  the retake wait (`checkpointAvailability`, using the content's `retakeDelayMinutes` and a passed
  in `now`) and the session reducer (each question once, no re-queue, no feedback until the end).
- `finishCheckpoint` in `src/game/rewards.ts` records every finished attempt. A pass marks all
  lessons done with `testedOut: true` (lessons already played keep their record), opens the
  mission and pays checkpoint XP once. A fail changes no lessons. Leaving part way records nothing.
- Decision: lessons still unlock in order after a failed attempt. Results list the missed topics
  with links to lessons that are open; locked ones say what opens them, and the suggested start is
  the first open missed lesson, else the next lesson on the path (`reviewStartLessonId`).
- The page is `/checkpoint` (full screen). Time-dependent screens read `useNow()` from
  `src/storage/clock.ts`; tests fake `Date` with `vi.setSystemTime`.
- `src/test/answerQuestion.ts` has `answerCorrectly` and `answerIncorrectly` for any question type.

## Boss battle

- Every unit ends with a timed round before its mission (`/units/:unitId/boss`). It opens with
  the mission and never blocks it. Rules are pure, in `src/game/bossBattle.ts`: the pool is every
  question answered right at least once in the unit (`masteredQuestionIds`: questions of lessons
  played to the end, plus checkpoint questions answered right, saved as `correctQuestionIds`);
  `selectBossQuestions` takes up to 12, seeded and mixed by type; the session reducer starts the
  clock, moves on after every answer (no re-queue) and ends when time runs out or all are
  answered; `scoreBoss` gives correct, answered and accuracy.
- XP is `bossBattleXp` in `src/game/xp.ts`: 3 per right answer, +5 for 80% accuracy over 5 or
  more answers, paid for the first round of the day in each unit (later rounds are practice).
  `finishBossBattle` in `src/game/rewards.ts` also keeps plays and the best score.
- The clock is `Date.now()` checked four times a second, so tests fake `Date` and move it with
  `vi.setSystemTime`. The countdown is always a number (`role="timer"`); only the draining bar
  animates, and not under reduced motion. Screen readers hear 30 and 10 seconds left. Learners can
  pick 2 minutes instead of 60 seconds for the same XP.
- Boss answers are logged with `source: 'boss'` and never count as first tries.

## Onboarding, accessibility and error states

- First visit goes to `/welcome`: three screens (welcome, why they are here, daily goal), then
  straight into lesson 1. `isOnboarded` in `src/game/progress.ts` treats anyone with earlier
  progress as done, so the flow never interrupts a returning learner. `renderApp` in tests marks
  onboarding done unless `onboarded: false`.
- Daily goals are `DAILY_GOAL_CHOICES` (10, 20, 40 XP). `setDailyGoal` re-checks today, so
  lowering the goal below XP already earned counts that day toward the streak at once. The goal
  can be changed again on the profile page.
- `src/test/accessibility.test.tsx` runs axe-core over every screen and state (onboarding, path
  and popovers, lesson, checkpoint questions of each type and results, mission workspace, both
  summaries, profile, notices, 404). It hides `.hidden` elements so it audits the phone layout.
  jsdom cannot measure contrast, so colours are checked by hand against the tokens: text needs
  4.5:1, so use `streak-700` on white and `streak-800` on `streak-100`, never `streak-600`.
- Colour is never the only signal: icons and text carry status on the path, task list, feedback
  panels and charts; the active bottom-nav tab also has a bar; the streak chip adds a tick.
- `RootLayout` shows two notices: progress not being saved (storage blocked, or a save that
  failed) and offline. The mission retries loading Python by itself when the connection returns.
- The mission route is code split. Keep CodeMirror and Pyodide out of the initial bundle: the
  lesson layer must never download them.

## Brand: Professor Ponku

- The mascot is Professor Ponku; the art and the brand guide are in `design/mascot/` (full-size
  transparent PNGs, the original sheet, and `cut-poses.py`, which made them).
- The official palette is Ponku's: `ponku-teal`, `ponku-coral`, `ponku-brown`, `ponku-espresso`,
  `ponku-sky` and `ponku-cream` in `src/index.css`. The app's scales are built from it: `current`
  is teal, `streak` coral, `xp` brown, and `slate` is redefined as warm neutrals from cream (page)
  to espresso (text). `correct` and `incorrect` stay green and amber on purpose.
- Show Ponku with `<Mascot pose="…" className="h-24 w-auto" />` (`src/components/Mascot.tsx`).
  It is decorative (`alt=""`: the text beside it carries the meaning), lazy unless `eager`, and
  sized by a height class. Each pose belongs to a moment: waving to welcome, thinking for hints,
  intros, wrong answers and empty states, thumbs up for right answers, celebrating when something
  is finished, notes and report in the mission, sleeping for streak reminders. Keep to one Ponku
  per screen area so it stays a treat, not wallpaper.
- The `mascot` class gives Ponku a soft light edge in dark mode, where the espresso outline would
  otherwise disappear. The favicon and top bar logo are Ponku's face (`public/favicon.png`).

## Dark mode

- `data-theme="dark"` on `<html>` switches every theme token at once (`:root[data-theme='dark']`
  in `src/index.css`): the slate neutrals and `surface` flip, the 50–200 tints darken, ink and
  syntax colours lighten. Components have no `dark:` classes; the `dark:` variant exists for
  one-offs. Code blocks use `bg-code text-code-ink` and stay dark in both themes; the dialog
  backdrop uses `scrim`.
- `src/storage/theme.ts` holds the choice: "system" (the default, follows the device and changes
  with it), "light" or "dark", saved under `data-detective:theme`. `index.html` runs the same rule
  before the first paint so dark mode never flashes white; keep the two in step.
- The top bar has the toggle (`ThemeToggle`, a toggle button named "Dark mode"); the profile page
  has the full choice, including "Match my device". The editor's colours are CSS variables, so
  CodeMirror follows the theme without being rebuilt.
- `src/test/themeContrast.test.ts` reads the tokens from `src/index.css` and checks the text and
  icon pairs components use, in both themes. Add a pair there when you add a new combination.

## Playtest instrumentation

- `src/storage/events.ts` is a local event log under its own key, capped at 2000 events. Nothing
  is ever sent anywhere: no analytics service, no network calls. Components record with
  `useEvents()`; outside a provider that is a throwaway log, so recording never needs a guard.
- Events are recorded where the thing happens: the lesson and checkpoint players, the mission
  workspace, `useRewards` (daily goal and streak) and onboarding. Leaving a lesson, the checkpoint
  or the mission part way through is recorded on unmount, which is how abandonment is detected.
- `summarizePlaytest` in `src/game/playtest.ts` turns the log into the prototype's questions:
  lessons completed, first-try accuracy by question type, median lesson time, where the learner
  stopped, the gap from the last lesson to opening the mission, task runs and hint levels, and
  survey answers. It is pure, so it is tested against a handmade log.
- Three one-tap surveys, each asked once (`useSurveyPending`): after the third lesson, when the
  mission first opens, and on the mission summary, where an optional note is the only free text.
- `/playtest` (linked from the profile) shows the summary and exports `{summary, events}` as JSON.
  Keep it that way: event fields are ids, numbers and flags, never anything a learner typed.

## End-to-end tests

- `e2e/` holds Playwright tests that run against the production build (`playwright.config.ts`
  builds and previews on port 4173). They use the real editor and real Pyodide from the CDN, so
  they need the network and take minutes, unlike `npm test`. `PLAYWRIGHT_CHANNEL=chrome` runs them
  in an installed Chrome instead of the bundled Chromium.
- `journey.spec.ts` is the whole path: onboarding, lesson 1, testing out, and the first three
  mission tasks with correct code. `responsive.spec.ts` checks 360, 768 and 1280px for horizontal
  overflow and saves screenshots. `daily.spec.ts` covers the daily challenge and its share card.
  `missions.spec.ts` opens every unit's mission at its real address, loads its dataset in real
  Pyodide and passes its first code task: the fake worker in unit tests cannot catch a dataset
  that fails to load. `python-load.spec.ts` measures how long Python takes to load, on this
  connection and on a Slow 4G profile, and only runs with `RUN_SLOW_NETWORK=1`.
- Playwright reuses a server already on port 4173 without rebuilding. If a test cannot find
  something new, stop any leftover `vite preview` so it builds afresh.
- Helpers in `e2e/helpers.ts` answer any question type and write code into CodeMirror (typing it,
  then checking the text, because the editor closes brackets by itself).
- Measured Python load, cold cache, on a ~1.4 Mbit/s connection (about Chrome's "Slow 4G"): 143
  seconds from opening the mission to a usable Run button. Keep that number in mind before adding
  anything else to the worker's start-up.

## Units and the path

- `courseUnits` (`src/content/index.ts`) lists the units in order; `validateCourse` keeps lesson,
  question and checkpoint ids unique course-wide. Each unit's pages live under `/units/:unitId/`
  (`checkpoint`, `boss`, `mission`, `mission/summary`; helpers in `src/content/paths.ts`). The old
  `/checkpoint`, `/mission` and `/mission/summary` links redirect to Unit 1.
- Units open in order (`unitUnlocks` in `src/game/unlocks.ts`): a unit opens once the unit before
  it is finished, by completing its mission or passing its checkpoint. `courseStanding` in
  `src/game/course.ts` works out each unit's standing; pages read it through `useUnitRoute`, and
  every unit page (lessons too) refuses a locked unit with `unitLockReason`.
- The path shows every unit in order: its banner, test-out card and map (lessons, boss battle,
  mission), with a milestone between units. A unit's `hook` appears once, as a chat card, when the
  unit opens; dismissing it saves the unit id in `hooksSeen`. The path opens on the current unit by
  putting its anchor (`#unit-2`) in the URL, so the router's scroll restoration scrolls there.
- `/profile` and `/playtest` break the numbers down by unit. `summarizeUnits` in
  `src/game/playtest.ts` assigns lesson and checkpoint events by id, boss answers to the round
  being played and mission task events to the mission open at the time (task ids repeat across
  missions).

- Unit 1, "Data Detective" (`unit1.ts`), descriptive statistics, mission "The Late Delivery
  Mystery". It has no opening message (`hook: null`).
- Unit 2, "The Churn Culprit" (`unit2.ts`), probability and Bayes' theorem, mission "The False
  Alarm" (`mission2.ts`, `public/data/churn.csv`). It opens with a chat `hook` from Ritika, the
  founder of Kathakar, an audiobook subscription app. The twist: April's record 200 cancellations
  are students leaving before their summer break, as they do every April.
- Unit 3, "Ship It or Skip It" (`unit3.ts`), hypothesis tests and A/B testing, mission "The
  Checkout Redesign" (`mission3.ts`, `public/data/checkout.csv`). It opens with an email `hook`
  from Arjun, the product manager at Haatbox, an online grocery app. The twist: the new checkout's
  significant lift is the weekend. It got 60% of its visitors at weekends against 20% for the
  old one, and within each day type the two convert the same, so the call is wait.
- Every explanation names the common mistake. Question ids are unique across the course.

## Daily challenge

- `/daily` (a "Daily" tab in the app shell) plays one question a day from `src/content/daily.ts`:
  lying charts and courtroom cases, alternating. `validateDailyQuestions` checks them like course
  questions and keeps their ids apart from the course's. They stand alone, for visitors who have
  never opened a lesson.
- `dailyQuestionFor` in `src/game/daily.ts` picks by the local date: the days since
  `DAILY_LAUNCH` index the list and wrap round, so everyone gets the same question on a date. Add
  questions at the end, so days already played keep theirs. `dailyNumber` is #1 on launch day;
  `dailyNumberText` leaves the number out before then.
- One try a day: the clock starts on "Start the clock", and the first check is saved in
  `progress.daily` by `saveDailyResult` (the first result stands; 60 days are kept). It pays no
  XP and touches no streak or lesson, and newcomers are not sent to onboarding.
- The share card (`src/components/daily/ShareCard.tsx`) is a 1080 × 1350 SVG with fixed colours,
  laid out by the pure `layoutShareCard`. SVG text does not wrap, so lines are broken using a
  cautious glyph-width estimate, and tests check that every daily question fits. Its chart is
  `ClaimChartShapes` with a `ChartPalette` instead of theme classes.
- `renderShareImage` draws the SVG onto a canvas, then Ponku on top, since an SVG drawn as an
  image cannot load pictures. The PNG is made as soon as the result shows, because some phones
  only allow sharing straight after a tap. Share sends the file through the Web Share API when
  `navigator.canShare` allows it, and text otherwise; download is a plain link to the image; copy
  falls back to a text box when the clipboard is blocked.
- Events are `daily_answered` and `daily_shared`. `e2e/daily.spec.ts` checks that two visitors
  get the same question, and that at 360px the card fits the screen and saves as a 1080 × 1350
  PNG in a real browser.

## Build steps

- [x] 1. Scaffold
- [x] 2. Content model
- [x] 3. Lesson player
- [x] 4. Path map
- [x] 5. XP and streaks
- [x] 6. Mission workspace
- [x] 7. Mission grading
- [x] 8. Test-out checkpoint
- [x] 9. Polish
- [x] 10. Validation instrumentation
- [x] 11. QA and deploy
