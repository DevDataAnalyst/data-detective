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

| Task      | Command                                                                |
| --------- | ---------------------------------------------------------------------- |
| dev       | `npm run dev` (Vite dev server on http://localhost:5173)               |
| build     | `npm run build` (type-checks with `tsc -b`, then builds to `dist/`)    |
| test      | `npm test` (Vitest, single run); `npm run test:watch` while developing |
| lint      | `npm run lint` (ESLint, then Prettier check); `npm run format` to fix  |
| typecheck | `npm run typecheck`                                                    |
| preview   | `npm run preview` (serves the production build locally)                |

## Project structure

- `src/content`: typed course content (units, lessons, questions, missions). No React here.
- `src/game`: pure game logic (XP, streaks, unlocking, grading, lesson sessions) with unit tests.
- `src/storage`: the only code that touches localStorage.
- `src/components`: shared UI components.
- `src/pages`: one component per route.
- `src/mission`: the Python mission workspace (Pyodide worker, editor, grading).

## Conventions

- Routes are defined in `src/routes.tsx` using React Router 8 (`react-router`; `RouterProvider`
  comes from `react-router/dom` in the app and from `react-router` in tests).
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

## Build steps

- [x] 1. Scaffold
- [x] 2. Content model
- [x] 3. Lesson player
- [x] 4. Path map
- [x] 5. XP and streaks
- [ ] 6. Mission workspace
- [ ] 7. Mission grading
- [ ] 8. Test-out checkpoint
- [ ] 9. Polish
- [ ] 10. Validation instrumentation
- [ ] 11. QA and deploy
