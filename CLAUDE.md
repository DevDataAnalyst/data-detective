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

_To be filled in once the project is scaffolded (build step 1)._

| Task  | Command |
| ----- | ------- |
| dev   |         |
| build |         |
| test  |         |
| lint  |         |

## Build steps

- [ ] 1. Scaffold
- [ ] 2. Content model
- [ ] 3. Lesson player
- [ ] 4. Path map
- [ ] 5. XP and streaks
- [ ] 6. Mission workspace
- [ ] 7. Mission grading
- [ ] 8. Test-out checkpoint
- [ ] 9. Polish
- [ ] 10. Validation instrumentation
- [ ] 11. QA and deploy
