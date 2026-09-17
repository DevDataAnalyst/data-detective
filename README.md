# Data Detective

A prototype of a gamified web app for learning data skills. It tests one idea: that short
Duolingo-style lessons and a real hands-on mission belong together.

**Unit 1: Data Detective** teaches descriptive statistics in seven 3–5 minute lessons, then hands
the learner a case: _The Late Delivery Mystery_. In the mission they write real Python (pandas) in
the browser against 600 messy delivery records, work out where deliveries are genuinely slow, and
write a recommendation for an operations manager.

- Lessons: four question types, instant feedback, XP, a daily goal and a streak.
- Test out: a 10-question checkpoint that unlocks the mission for people who already know this.
- Mission: Python and pandas running in the browser through Pyodide, with hidden checks, three
  levels of hints, and a portfolio summary at the end.
- Everything is stored on the learner's device. There is no backend, no account and no analytics
  service.

## Run it locally

Node 22.22 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. The mission downloads Python and pandas (about 25 MB) from the
jsDelivr CDN the first time it opens, so that part needs an internet connection.

| Task             | Command                                                           |
| ---------------- | ----------------------------------------------------------------- |
| dev server       | `npm run dev`                                                     |
| production build | `npm run build` (type-checks, then builds to `dist/`)             |
| preview a build  | `npm run preview`                                                 |
| unit tests       | `npm test`                                                        |
| grading tests    | `npm run test:python` (runs the mission's checks in real Pyodide) |
| end-to-end       | `npm run test:e2e` (Playwright, builds and previews first)        |
| lint and format  | `npm run lint`, `npm run format`                                  |
| dataset          | `npm run generate:data`                                           |

The end-to-end tests need browsers once: `npx playwright install chromium`.

To measure the mission's load time on a throttled connection:

```bash
RUN_SLOW_NETWORK=1 npm run test:e2e:slow
```

## Deploy to Vercel

The app is a static single-page app, so any static host works. For Vercel:

1. Push this folder to a Git repository and import it at [vercel.com/new](https://vercel.com/new).
2. Vercel reads `vercel.json`: build with `npm run build`, serve `dist/`, and rewrite unknown paths
   to `index.html` so direct links such as `/mission` work.
3. No environment variables are needed.

Or from this folder, with the Vercel CLI:

```bash
npx vercel deploy --prod
```

## Regenerate the dataset

`public/data/deliveries.csv` is generated, not hand-written. The generator plants the patterns the
mission is about (missing values, extreme outliers in one city, a genuinely slow city, a dinner
rush) and is documented in [scripts/README.md](scripts/README.md).

```bash
npm run generate:data
```

The mission's answers are worked out from the CSV when Python loads, so regenerating the data does
not break grading. Re-run `npm test` afterwards: the reference-answer tests will tell you if any
documented number changed.

## Add a new unit

Content is data. A unit is a typed object, and no component needs to change to add one.

1. Write `src/content/unit2.ts` following the types in `src/content/types.ts`: a unit has lessons
   (6–8 questions each, at least three question types), a 10-question checkpoint, and a mission id.
2. Numbers in prompts and explanations use placeholders like `{mean}` filled from the question's
   own dataset, so nothing is typed in twice.
3. Add a mission in the same shape as `src/content/mission1.ts` if the unit has one: tasks with
   starter code, the variables each task creates, three hint levels, and the summary lines.
4. Export it from `src/content/index.ts` and add `validateUnit` (and `validateMission`) to the
   content tests. Validation runs in the test suite and fails the build on any problem: wrong
   answers, missing explanations, unknown placeholders, questions that are too long, and more.
5. Mission grading lives in `src/mission/python/checks.py`. Each task gets a check that inspects
   the learner's variables and returns a specific, non-revealing message.

`CLAUDE.md` in this folder is the working brief: conventions, content rules and the decisions
behind the game logic.

## Playtest data

While the prototype is being tested, the app keeps a log on the learner's device of what they did:
lessons started and completed, answers with first-try results and time taken, checkpoint attempts,
how long Python took to load, mission task runs and hints, and the answers to three one-tap
surveys. It never leaves the device by itself.

Testers open **Profile → Open playtest data** (or go to `/playtest`), where they can:

- see the summary the numbers add up to,
- press **Export data** to download a JSON file to send back,
- press **Copy summary** to paste a short version into a message,
- press **Clear playtest data** to delete it.

The export holds ids, counts and times. The only free text in it is the optional "What would you
change?" note at the end of the mission.
