# Tester script

Copy this into an email or message to testers. Replace `<LINK>` with the deployed URL.

---

**Subject: 20 minutes to try a data-skills app (and one real Python task)**

Hi — I'm testing a prototype that teaches data skills, and I'd like your honest reaction.

**Link:** `<LINK>`
Works on a phone or a laptop. Nothing to install, no sign-up, no account. Everything stays in
your browser.

**What to do**

1. **Day one (about 15 minutes).** Open the link, answer the two setup questions, and play at
   least three lessons. If the early lessons feel too easy, use **"Already know this? Test out"**
   on the path instead — that's the point of it.
2. **Come back on another day (about 10 minutes).** Play a few more lessons, or finish the unit.
   Coming back a second day matters: I want to know whether the streak and daily goal actually
   bring you back.
3. **Try the mission.** After the seven lessons (or after testing out), open **The Late Delivery
   Mystery**. You write real Python with pandas in the browser on 600 messy delivery records.
   Python takes 15–60 seconds to load the first time, and longer on a slow connection.
   Get as far as you can — even one or two tasks is useful. Use the hints freely; they are free.
4. **Answer the one-tap questions** when they pop up. They take a second and are skippable.

**What I'm trying to learn**

- Do the lessons actually prepare you for the mission, or is the jump too big?
- Do the lessons feel worth your time, or too easy?
- Does anything break or confuse you, especially on a phone?

**How to send your results back**

1. In the app, go to **Profile → Open playtest data**.
2. Press **Export data**. It downloads one small JSON file.
3. Send me the file (reply to this message and attach it).

The file has what you did in the app: which lessons you played, which answers were right first
time, how long things took, how far you got in the mission, and your answers to the one-tap
questions. It has no name, email or anything else about you. The only free text in it is the
optional "What would you change?" box at the end of the mission — so write whatever you want
there. If you'd rather not export a file, press **Copy summary** and paste that to me instead.

**A few things worth knowing**

- Wrong answers cost nothing. Questions you miss come back later in the lesson.
- The mission needs an internet connection the first time it loads Python.
- If you get stuck or annoyed and stop, that is a useful result — please still send the export,
  and tell me where you stopped.

Thanks — 20 minutes from you is worth a lot here.

---

## What to look at when the exports come back

| Question                                   | Working                                                     | Needs changing                                                      |
| ------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Do lessons prepare learners for the mission? | Tasks 1–3 pass with few level-3 hints                       | Many need the fill-in-the-blank hint on tasks the lessons covered     |
| Is the jump from lessons to mission too big? | Most open the mission within a day of the last lesson       | Long gap, or they stop on the loading screen or task 1                |
| Is the lesson layer engaging enough?        | Most finish all seven lessons                               | Drop-off clusters on one lesson or one question type                  |
| Does the streak help or distract?           | They come back on day two and play new lessons              | Lots of repeated practice on old lessons just to hit the daily goal   |
| Which layer feels more valuable?            | Survey says "mission" or "both equally"                     | Lessons rated too easy and skipped, or the mission called irrelevant  |

Every number above comes out of the export: `lessonsCompleted`, `accuracyByType`,
`mission.tasks[].hints`, `mission.gapFromLastLessonMs`, `stoppedAt` and `surveys`.
