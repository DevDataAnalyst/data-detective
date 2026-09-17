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
| data      | `npm run generate:data` (rewrites `public/data/deliveries.csv`)         |
| lint      | `npm run lint` (ESLint, then Prettier check); `npm run format` to fix   |
| typecheck | `npm run typecheck`                                                     |
| preview   | `npm run preview` (serves the production build locally)                 |

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
- Quartiles follow pandas (linear interpolation). Content must also be right under the textbook
  "halves" methods: exact answers must agree, estimates must fall within the tolerance. The same
  goes for population vs sample standard deviation.
- Statistics helpers live in `src/game/stats.ts`.

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

- Mission content is `src/content/mission1.ts` (validated by `validateMission`). The dataset is
  generated by `npm run generate:data`; its planted patterns are documented in `scripts/README.md`.
- Python runs in a module Web Worker (`src/mission/python/pyodide.worker.ts`) with Pyodide 314.0.7
  from jsDelivr. `runner.py` runs learner code notebook style and returns JSON (stdout, tables,
  images, trimmed errors). `PythonRuntime` owns the worker.
- Time limits: 10 seconds once learner code starts; package downloads (such as matplotlib) get
  up to 3 minutes and do not count toward the 10 seconds. A timeout ends the worker, starts a new
  one and replays each task's last working code, as does every page load.
- The workspace is lazy-loaded from `MissionPage`, so lessons never download CodeMirror.
- Tests use a fake worker (see `MissionWorkspace.test.tsx`). `src/test/setup.ts` polyfills the
  Range geometry CodeMirror needs in jsdom.
- When editing files through shell heredocs, backslashes can be swallowed. Prefer the Edit tool
  for regexes.

## Mission grading and completion

- Hidden checks live in `src/mission/python/checks.py`. At load, `compute_reference` works out
  every reference answer from the CSV (never hard-coded), and `reference_summary()` sends the
  dataset facts (orders, outliers, slowest city…) to the page. After each run with a `taskId`, the
  worker calls `check_task`, which returns `{passed, message}` and never raises. Messages point at
  what to fix without giving the answer. `npm run test:python` runs every check against correct
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
- Mission content can quote only the facts in `MISSION_FACTS` (`src/content/validate.ts`).

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

## Build steps

- [x] 1. Scaffold
- [x] 2. Content model
- [x] 3. Lesson player
- [x] 4. Path map
- [x] 5. XP and streaks
- [x] 6. Mission workspace
- [x] 7. Mission grading
- [x] 8. Test-out checkpoint
- [ ] 9. Polish
- [ ] 10. Validation instrumentation
- [ ] 11. QA and deploy
