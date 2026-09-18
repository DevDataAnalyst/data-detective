# Data Detective

A prototype of a gamified web app for learning data skills. It tests one idea: that short
Duolingo-style lessons and a real hands-on mission belong together.
Try it here : https://data-detective-omega.vercel.app/

There are three units. Each one opens with a message from a manager or a client, teaches in
seven 3–5 minute lessons, and ends with a case on a real dataset where the obvious answer is
wrong. In each mission the learner writes real Python (pandas) in the browser, then writes a
recommendation for someone who is not technical.

1. **Data Detective** (descriptive statistics). _The Late Delivery Mystery_: work out from 600
   messy delivery records where deliveries are genuinely slow.
2. **The Churn Culprit** (probability and Bayes' theorem). _The False Alarm_: a founder panics
   about record cancellations, but students leave before their summer break every April.
3. **Ship It or Skip It** (hypothesis tests and A/B testing). _The Checkout Redesign_: a new
   checkout wins "significantly", but only because its visitors came at the weekend.

- Lessons: nine question types, with instant feedback, XP, a daily goal and a streak. Five of
  them are built on real analyst work: triage a vague request, spot the lying chart, find the
  lurking variable in a courtroom, build a metric, and call an A/B test (ship it, kill it, or
  wait).
- Test out: a 10-question checkpoint in each unit, for people who already know the topic.
- Boss battle: a 60-second round of questions the learner has already got right.
- Mission: Python and pandas running in the browser through Pyodide, with hidden checks, three
  levels of hints, and a portfolio summary at the end. Finishing a unit opens the next one.
- Daily challenge at `/daily`: one lying chart or courtroom case a day, the same for everyone,
  with no lessons or sign-up needed and a result card to share.
- Light and dark mode: it follows the device by default, with a toggle in the top bar and a
  choice on the profile page.
- Professor Ponku, the mascot, turns up at the moments that matter: waving hello, thinking
  through a hint, a thumbs up for a right answer, celebrating a finished lesson or mission, and
  napping when a streak needs attention. The app's colours come from the mascot's palette. The
  art, palette and brand guide are in [design/mascot](design/mascot/README.md).
- Everything is stored on the learner's device. There is no backend, no account and no analytics
  service.

Live prototype: https://data-detective-omega.vercel.app/
<img width="665" height="923" alt="image" src="https://github.com/user-attachments/assets/dc3f9f60-34c5-4cdd-9a5d-a4577e014b8c" />

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
| datasets         | `npm run generate:data` (the three missions' CSVs)                |

The end-to-end tests need browsers once: `npx playwright install chromium`. To use a Chrome that
is already installed instead, run them as `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Each run starts
with an empty browser cache, so the journey test downloads Python (about 25 MB) again each time
and takes a few minutes.

To measure how long the mission takes to load Python:

```bash
RUN_SLOW_NETWORK=1 npm run test:e2e:slow
```

Measured on a connection of about 1.4 Mbit/s (close to Chrome's "Slow 4G" profile): **143 seconds**
from opening the mission to being able to run code, with a cold cache. The browser caches the
download, so opening the mission again is nearly instant. The workspace explains the wait, shows
what it is doing, and lets the learner read the tasks and write code while it loads.

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

## Regenerate the datasets

The missions' datasets in `public/data/` are generated, not hand-written. Each generator plants
the patterns its mission is about: missing values, outliers, a slow city and a dinner rush in
`deliveries.csv`; a seasonal wave of student cancellations in `churn.csv`; and a weekday/weekend
mix-up in `checkout.csv`. They are documented in [scripts/README.md](scripts/README.md).

```bash
npm run generate:data
```

The mission's answers are worked out from the CSV when Python loads, so regenerating the data does
not break grading. Re-run `npm test` afterwards: the reference-answer tests will tell you if any
documented number changed.

## Add a new unit

Content is data. A unit is a typed object, and no component needs to change to add one.

1. Write `src/content/unit4.ts` following the types in `src/content/types.ts`: a unit has an
   opening `hook` message, lessons (6–8 questions each, at least three question types), a
   10-question checkpoint, and a mission id.
2. Numbers in prompts and explanations use placeholders like `{mean}`, filled from the question's
   own data, so nothing is typed in twice.
3. Add a mission in the same shape as `src/content/mission3.ts`: tasks with starter code, the
   variables each task creates, three hint levels, the dataset facts it quotes, and the summary
   lines.
4. Add the unit to `courseUnits` in `src/content/index.ts` and the mission to
   `src/content/missions.ts`, and add `validateUnit` and `validateMission` to the content tests.
   Validation runs in the test suite and fails the build on any problem: wrong answers, missing
   explanations, unknown placeholders, questions that are too long, and more. Units open in
   order, so the new one opens once the one before it is finished.
5. Each mission's grading is its own Python module, such as
   `src/mission/python/checks_checkout.py`, listed in `checkModules.ts`. Each task gets a check
   that inspects the learner's variables and returns a specific, non-revealing message.

`CLAUDE.md` in this folder is the working brief: conventions, content rules and the decisions
behind the game logic.

## Daily challenge

`/daily` shows one question a day: a lying chart one day, a courtroom case the next. Everyone gets
the same question on the same date, and it needs no account or lessons, so it works as a link to
share. The learner gets one try against the clock, then sees the full answer and a result card
("I spotted the lying chart in 8 seconds — can you?") that they can share, download as an image
or copy as text. Results are kept on the device and earn no XP.

The questions are in `src/content/daily.ts`, checked by the same validation as the course. Days
take them in order and start again after the last, so add new questions at the end: earlier days
keep their questions.

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

The summary is broken down by unit. The export holds ids, counts and times, including daily
challenge answers and shares. The only free text in it is the optional "What would you change?"
note at the end of the mission.
