import type { Mission } from './types';

/**
 * Mission 2: The False Alarm. The dataset and its planted patterns are described in
 * scripts/README.md; numbers quoted here are checked against the CSV in unit2.test.ts.
 */
export const theFalseAlarm: Mission = {
  id: 'the-false-alarm',
  title: 'The False Alarm',
  brief:
    'You are the first analyst at Kathakar, an audiobook subscription app. On Friday evening the founder, Ritika, messages you in a panic: 200 subscribers cancelled in April, the most ever, and investors call on Monday.\n\nFirst, pin down a question the data can answer. Then use `churn.csv`, 28 months of subscribers and cancellations for three kinds of subscriber, to find out whether April was really unusual and who drove it. A colleague already has a theory. Test it, then write Ritika a clear reply.',
  dataset: {
    fileName: 'churn.csv',
    url: 'data/churn.csv',
    columns: [
      { name: 'month', description: 'Month, from 2024-01 to 2026-04' },
      { name: 'segment', description: 'student, professional or family' },
      { name: 'subscribers_start', description: 'Subscribers at the start of the month' },
      { name: 'new_signups', description: 'New subscribers who joined that month' },
      { name: 'cancelled', description: 'Subscribers who cancelled that month' },
    ],
  },
  facts: [
    'lostLastMonth',
    'lastMonth',
    'lastRate',
    'baseRate',
    'studentAprilRate',
    'studentUsualRate',
    'months',
  ],
  summary: {
    whatYouDid: [
      { text: 'Turned a panicked message into a question the data could answer' },
      { text: 'Worked out a churn rate of {lastRate} in {lastMonth}, against a usual {baseRate}' },
      {
        text: 'Found the spike came from students, {studentAprilRate} of whom cancelled that month',
      },
      {
        text: 'Showed students cancel like this every April, against about {studentUsualRate} in other months',
      },
      { text: 'Rejected the claim that the new home screen caused it' },
      { text: 'Charted the pattern across {months} months', requiresTask: 'student-chart' },
      { text: 'Wrote a reply the founder could take to her investors' },
    ],
    portfolio: [
      { text: 'Subscription churn investigation (Python, pandas), practice project' },
      {
        text: '• Turned a founder’s alarm about {lostLastMonth} cancellations into a testable question, comparing churn rates with a {months}-month baseline.',
      },
      {
        text: '• Found the spike came from one segment’s seasonal pattern (students before their summer break), not from a recent product redesign.',
      },
      {
        text: '• Recommended a seasonal retention plan and tracking churn by segment every month.',
      },
    ],
  },
  tasks: [
    {
      id: 'pin-the-question',
      kind: 'question',
      title: 'Pin down the question',
      instructions:
        'Ritika’s message is urgent but vague. Before you touch the data, choose the question you can actually answer with `churn.csv`.\n\nThis task needs no Python, so you can do it while Python loads.',
      question: {
        id: 'u2-mission-triage',
        type: 'inbox_triage',
        prompt: 'Which question should you take to the data?',
        message: {
          from: 'Ritika',
          role: 'Founder, Kathakar',
          channel: 'chat',
          text: 'We lost **200 subscribers** in April, our worst month ever! Is this normal or should I panic? Investors call on Monday.',
        },
        data: {
          caption: 'churn.csv',
          columns: ['month', 'segment', 'subscribers_start', 'new_signups', 'cancelled'],
        },
        candidates: [
          {
            question: 'Why did each of the 200 subscribers cancel?',
            flaw: 'data_not_available',
            note: 'The file counts cancellations but records no reasons. That needs an exit survey.',
          },
          {
            question:
              'Is April’s churn rate unusual compared with earlier months, and which segments drove it?',
            note: 'Monthly cancellations and subscribers for each segment give exactly these rates.',
          },
          {
            question: 'Which segment lost the most subscribers in April?',
            flaw: 'wrong_metric',
            note: 'Raw counts favour the biggest segment. Compare rates, not counts.',
          },
        ],
        answerableIndex: 1,
        explanation:
          'It turns panic into a comparison you can compute: a rate against a baseline, split by segment. The common mistake is starting from the count of 200, which ignores how many subscribers there were.',
      },
    },
    {
      id: 'churn-rate',
      kind: 'code',
      title: 'Is April unusual?',
      instructions:
        'Read `churn.csv` into `df`. Work out April 2026’s churn rate for all subscribers (cancellations ÷ subscribers at the start) and store it in `april_rate`. Then store the rate for every earlier month combined in `base_rate`.\n\nKeep both as fractions, such as 0.05.',
      starterCode: `import pandas as pd

df = pd.read_csv(____)

# Every subscriber in April 2026
april = df[df["month"] == "2026-04"]
april_rate = ____

# Every month before April 2026, all together
before = df[df["month"] < "2026-04"]
base_rate = ____

print(f"April: {april_rate:.1%}   Usual: {base_rate:.1%}")
`,
      creates: ['df', 'april_rate', 'base_rate'],
      hints: {
        nudge:
          'A churn rate is cancellations divided by the subscribers you started with. Add up each column first.',
        method:
          '`april["cancelled"].sum()` adds up April’s cancellations; divide it by `april["subscribers_start"].sum()`. Do the same with `before`.',
        example:
          'april_rate = april["cancelled"].sum() / april["____"].sum()\nbase_rate = before["cancelled"].sum() / before["subscribers_start"].____()',
      },
    },
    {
      id: 'by-segment',
      kind: 'code',
      title: 'Who is leaving?',
      instructions:
        'Split April 2026 by segment. Store each segment’s churn rate in `segment_rates`: one rate per segment, as a fraction.',
      starterCode: `# April 2026, added up for each segment
by_segment = april.groupby("segment")[["cancelled", "subscribers_start"]].sum()

segment_rates = ____
segment_rates
`,
      creates: ['segment_rates'],
      hints: {
        nudge:
          '`by_segment` already holds each segment’s totals. A rate is one of its columns divided by the other.',
        method: 'Divide the `cancelled` column of `by_segment` by its `subscribers_start` column.',
        example: 'segment_rates = by_segment["cancelled"] / by_segment["____"]',
      },
    },
    {
      id: 'every-april',
      kind: 'code',
      title: 'Is it new?',
      instructions:
        'Students cancelled far more than anyone else. Is that new, or does it happen every year? Store the students’ churn rate for each April in the data in `student_aprils`, one rate per April.',
      starterCode: `students = df[df["segment"] == "student"]

# Keep only April rows: their month ends in "-04"
student_april_rows = students[students["month"].str.endswith(____)]

by_month = student_april_rows.groupby("month")[["cancelled", "subscribers_start"]].sum()
student_aprils = ____
student_aprils
`,
      creates: ['student_aprils'],
      hints: {
        nudge:
          'Every April label ends the same way. Keep those rows, then work out the rate as in the last task.',
        method:
          '`students["month"].str.endswith("-04")` is True for April rows. Then divide `cancelled` by `subscribers_start` in `by_month`.',
        example:
          'student_april_rows = students[students["month"].str.endswith("____")]\nstudent_aprils = by_month["cancelled"] / by_month["subscribers_start"]',
      },
    },
    {
      id: 'redesign-claim',
      kind: 'question',
      title: 'Cross-examine the redesign theory',
      instructions:
        'Kabir from product has a theory about April, and Meenal from support has another. Use what you found to name what is really behind the spike.',
      question: {
        id: 'u2-mission-courtroom',
        type: 'courtroom',
        prompt: 'What is really behind April’s spike?',
        evidence:
          'The new home screen launched in March 2026. In April, 200 subscribers cancelled, the most ever.',
        witnesses: [
          {
            name: 'Kabir, product lead',
            claim: 'The new home screen confused people, so they cancelled.',
          },
          {
            name: 'Meenal, support lead',
            claim: 'People were still angry about January’s price rise, and they finally left.',
          },
        ],
        table: {
          caption: 'Churn rate in April, by segment',
          columns: ['segment', 'April 2025', 'April 2026'],
          rows: [
            ['student', '7.7%', '8.0%'],
            ['professional', '2.4%', '2.6%'],
            ['family', '2.0%', '2.2%'],
          ],
        },
        suspects: [
          {
            text: 'The new home screen',
            note: 'If the redesign drove people away, professionals and families would have left too. Their churn stayed ordinary.',
          },
          {
            text: 'The time of year: students leave before their summer break',
            note: 'Students cancel about 8% every April, before and after the redesign. That alone explains the spike.',
          },
          {
            text: 'January’s price rise',
            note: 'February and March were ordinary months, so a January price rise cannot explain April.',
          },
        ],
        confounderIndex: 1,
        explanation:
          'Every April, students cancel before the summer break, redesign or not. The common mistake is blaming whatever changed most recently without checking whether the pattern existed before it.',
      },
    },
    {
      id: 'recommendation',
      kind: 'written',
      title: 'Reply to Ritika',
      instructions:
        'Write Ritika a short reply she can take to the investor call. Say whether April is a real problem, who drove it, whether the new home screen is to blame, and what to do next.',
      placeholder: 'For example: “April’s spike is … Students …. The new home screen ….”',
      suggestedSentences: { min: 3, max: 5 },
      minWords: 30,
      selfReview: [
        { id: 'verdict', label: 'I say clearly whether April is a real problem' },
        {
          id: 'segment',
          label: 'I name the student segment and the April pattern behind the spike',
        },
        { id: 'redesign', label: 'I say whether the new home screen is to blame, and why' },
        { id: 'next-step', label: 'I suggest a next step, such as a plan for students' },
      ],
      modelAnswer:
        'No need to panic: April’s spike is our usual seasonal pattern, not a new problem. Almost all of it came from students, who cancel before their summer break every April: about 8% of them left this April, just like the last two Aprils, while professionals and families churned at their normal rates. The new home screen is not to blame, since no other segment changed after it launched. Next, I suggest a student plan before the summer, such as a cheaper pause option in March and a win-back offer in July, and tracking churn by segment every month so a real problem stands out.',
    },
    {
      id: 'student-chart',
      kind: 'code',
      stretch: true,
      title: 'Show the pattern',
      instructions:
        'Draw the students’ churn rate for every month, so the April spikes are easy to see. Give the chart a title.',
      starterCode: `import matplotlib.pyplot as plt

students = df[df["segment"] == "student"].set_index("month")
student_rates = students["cancelled"] / students["subscribers_start"]

fig, ax = plt.subplots(figsize=(7, 3.5))
____

ax.set_title("____")
plt.show()
`,
      creates: [],
      hints: {
        nudge: 'A Series can draw itself: call `.plot()` on `student_rates` and point it at `ax`.',
        method:
          '`student_rates.plot(ax=ax)` draws a line through every month; `ax.set_title("...")` adds the title.',
        example: 'student_rates.plot(ax=ax, marker="o")\nax.set_title("____")\nplt.show()',
      },
    },
  ],
};
