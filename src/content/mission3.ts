import type { Mission } from './types';

/**
 * Mission 3: The Checkout Redesign. The dataset and its planted patterns are described in
 * scripts/README.md; numbers quoted here are checked against the CSV in unit3.test.ts.
 */
export const theCheckoutRedesign: Mission = {
  id: 'the-checkout-redesign',
  title: 'The Checkout Redesign',
  brief:
    'You are the analyst at Haatbox, an online grocery app. Arjun, the product manager, ran a new checkout against the old one for two weeks. The new one converts better, and he wants to roll it out to everyone on Monday.\n\nBefore anyone ships, check `checkout.csv`: 14 days of visitors and orders for each checkout. Is the difference real? Is it big enough? And was the test fair? Then tell Arjun what to do.',
  dataset: {
    fileName: 'checkout.csv',
    url: 'data/checkout.csv',
    columns: [
      { name: 'date', description: 'Day of the test, from 2026-08-03 to 2026-08-16' },
      { name: 'day', description: 'Day of the week, Mon to Sun' },
      { name: 'variant', description: 'Which checkout: old or new' },
      { name: 'visitors', description: 'Visitors who reached that checkout that day' },
      { name: 'orders', description: 'Visitors who placed an order' },
    ],
  },
  facts: ['days', 'visitors', 'oldRate', 'newRate', 'oldWeekendShare', 'newWeekendShare'],
  summary: {
    whatYouDid: [
      { text: 'Measured both checkouts over {days} days and {visitors} visitors' },
      {
        text: 'Found the new checkout converting at {newRate} against {oldRate}, far beyond chance',
      },
      {
        text: 'Spotted that {newWeekendShare} of its visitors came at weekends, against {oldWeekendShare} for the old one',
      },
      { text: 'Showed that, day for day, the two checkouts convert the same' },
      { text: 'Called it: re-run the test fairly before shipping' },
      { text: 'Charted the daily pattern', requiresTask: 'daily-chart' },
      { text: 'Wrote a recommendation the product manager could act on' },
    ],
    portfolio: [
      { text: 'A/B test review (Python, pandas), practice project' },
      {
        text: '• Analysed a two-week checkout experiment with {visitors} visitors, computing conversion rates and a two-proportion z-test.',
      },
      {
        text: '• Showed the apparent lift ({newRate} against {oldRate}) came from unequal weekend traffic, not the redesign, by comparing like with like.',
      },
      {
        text: '• Recommended a fair re-run with an even split over full weeks before any rollout.',
      },
    ],
  },
  tasks: [
    {
      id: 'conversion',
      kind: 'code',
      title: 'Compare the checkouts',
      instructions:
        'Read `checkout.csv` into `df`. Work out each checkout’s conversion rate (orders ÷ visitors, over all 14 days) and store both in `conversion`, labelled old and new.',
      starterCode: `import pandas as pd

df = pd.read_csv(____)

# Add up visitors and orders for each checkout
by_variant = df.groupby("variant")[["visitors", "orders"]].sum()

conversion = ____
conversion
`,
      creates: ['df', 'conversion'],
      hints: {
        nudge:
          'A conversion rate is orders divided by visitors. `by_variant` already holds the totals.',
        method: 'Divide the `orders` column of `by_variant` by its `visitors` column.',
        example: 'conversion = by_variant["orders"] / by_variant["____"]',
      },
    },
    {
      id: 'significance',
      kind: 'code',
      title: 'Could it be chance?',
      instructions:
        'Run a two-proportion z-test. Store the z statistic in `z` and the two-sided p-value in `p_value`. The starter code has the standard error; fill in the blanks.',
      starterCode: `from math import erfc, sqrt

old = by_variant.loc["old"]
new = by_variant.loc["new"]

# The conversion rate if both checkouts were the same, and its standard error
pooled = (old["orders"] + new["orders"]) / (old["visitors"] + new["visitors"])
se = sqrt(pooled * (1 - pooled) * (1 / old["visitors"] + 1 / new["visitors"]))

z = (conversion["new"] - conversion["old"]) / ____
p_value = erfc(abs(____) / sqrt(2))

print(f"z = {z:.2f}, p = {p_value:.2g}")
`,
      creates: ['z', 'p_value'],
      hints: {
        nudge: 'z measures the gap in standard errors: the difference divided by `se`.',
        method:
          'Divide the difference in conversion by `se`. Then `erfc(abs(z) / sqrt(2))` turns z into a two-sided p-value.',
        example:
          'z = (conversion["new"] - conversion["old"]) / se\np_value = erfc(abs(____) / sqrt(2))',
      },
    },
    {
      id: 'weekend-question',
      kind: 'question',
      title: 'Cross-examine the win',
      instructions:
        'Arjun and Kavya both have an explanation for the lift. Look at the exhibit before you believe either of them.',
      question: {
        id: 'u3-mission-courtroom',
        type: 'courtroom',
        prompt: 'What is really behind the new checkout’s lift?',
        evidence:
          'The new checkout converts at 4.7% and the old one at 3.8%, with a p-value far below 0.05.',
        witnesses: [
          {
            name: 'Arjun, product manager',
            claim: 'The new design is simply easier, so more people finish buying.',
          },
          {
            name: 'Kavya, engineer',
            claim: 'The new checkout loads faster on phones, and speed sells.',
          },
        ],
        table: {
          caption: 'Visitors and conversion by day type',
          columns: ['day type', 'conversion, all visitors', 'old checkout', 'new checkout'],
          rows: [
            ['weekday', '3.5%', '49,075', '12,398'],
            ['weekend', '5.5%', '12,126', '18,193'],
          ],
        },
        suspects: [
          {
            text: 'The phones people used',
            note: 'Both checkouts ran on the same mix of phones, so phones cannot separate them.',
          },
          {
            text: 'The day of the week: the new checkout got most of the weekend visitors',
            note: 'Weekends convert at 5.5% whatever the checkout, and 59% of the new checkout’s visitors came at weekends.',
          },
          {
            text: 'Grocery prices that fortnight',
            note: 'Prices were the same for both checkouts, so they cannot explain a gap between them.',
          },
        ],
        confounderIndex: 1,
        explanation:
          'Weekends convert better for everyone, and the new checkout got three times the weekend share. The common mistake is trusting a significant result without checking that both groups saw the same kind of days.',
      },
    },
    {
      id: 'by-day-type',
      kind: 'code',
      title: 'Compare like with like',
      instructions:
        'Mark the weekend rows, then work out the conversion rate for each day type and checkout. Store the four rates in `by_day_type`.',
      starterCode: `df["weekend"] = df["day"].isin(["Sat", "Sun"])

by_day = df.groupby(["weekend", "variant"])[["visitors", "orders"]].sum()
by_day_type = ____
by_day_type
`,
      creates: ['by_day_type'],
      hints: {
        nudge: 'The same idea as task 1, grouped by day type and checkout together.',
        method: 'Divide `by_day["orders"]` by `by_day["visitors"]`: one rate for each pair.',
        example: 'by_day_type = by_day["orders"] / by_day["____"]',
      },
    },
    {
      id: 'the-call',
      kind: 'question',
      title: 'Make the call',
      instructions:
        'Arjun wants to ship on Monday. Put everything together: the overall numbers, the p-value and what you found day by day.',
      question: {
        id: 'u3-mission-verdict',
        type: 'ab_verdict',
        prompt: 'Should Haatbox roll out the new checkout?',
        test: 'Old checkout vs new checkout, 3 to 16 August',
        control: { name: 'Old checkout', visitors: 61201, conversions: 2356 },
        variant: { name: 'New checkout', visitors: 30591, conversions: 1433 },
        minWorthwhileLift: 0.3,
        context:
          'Day for day, the two checkouts convert the same. The new one got 59% of its visitors at weekends, against 20% for the old one.',
        issue: 'confounded',
        verdict: 'wait',
        consequences: {
          ship: 'You roll out the new checkout. Conversion does not move: the “win” was the weekend all along.',
          kill: 'You scrap a redesign that did no harm and might have helped a little. Nobody learns whether it works.',
          wait: 'You re-run the test with a 50/50 split for two full weeks. Both checkouts see the same days, so the answer can be trusted.',
        },
        explanation:
          'The overall gap is real, but the design did not cause it: an unfair split means the test cannot say whether the checkout helps. The common mistake is shipping on a tiny p-value from a test that compared different days.',
      },
    },
    {
      id: 'recommendation',
      kind: 'written',
      title: 'Reply to Arjun',
      instructions:
        'Write Arjun a short reply he can act on. Give your call, the reason in plain words, and what to do next.',
      placeholder: 'For example: “Not yet. The new checkout looks better because …. Let’s ….”',
      suggestedSentences: { min: 3, max: 5 },
      minWords: 30,
      selfReview: [
        { id: 'call', label: 'I say clearly not to roll it out yet' },
        { id: 'weekend', label: 'I explain the weekend traffic problem in plain words' },
        { id: 'rerun', label: 'I propose a fair re-run: an even split over full weeks' },
        { id: 'plain', label: 'I explain any statistics in words a product manager would use' },
      ],
      modelAnswer:
        'Not yet. The new checkout looks better overall (4.7% against 3.8%), but the test wasn’t fair: 59% of its visitors came at weekends, when everyone buys more, while most of the old checkout’s visitors came on weekdays. Compared day for day, the two convert the same: about 3.4% on weekdays and 5.5% at weekends. I suggest re-running the test with a 50/50 split for two full weeks, so both checkouts see the same days, and deciding then.',
    },
    {
      id: 'daily-chart',
      kind: 'code',
      stretch: true,
      title: 'Draw the daily pattern',
      instructions:
        'Draw each checkout’s daily conversion rate, so the weekend jumps are easy to see. Give the chart a title.',
      starterCode: `import matplotlib.pyplot as plt

df["rate"] = df["orders"] / df["visitors"]
daily = df.pivot(index="date", columns="variant", values="rate")

fig, ax = plt.subplots(figsize=(7, 3.5))
____

ax.set_title("____")
plt.show()
`,
      creates: [],
      hints: {
        nudge: 'A DataFrame with one column per checkout can draw both lines at once.',
        method: '`daily.plot(ax=ax, marker="o")` draws one line for each checkout.',
        example: 'daily.plot(ax=ax, marker="o")\nax.set_title("____")\nplt.show()',
      },
    },
  ],
};
