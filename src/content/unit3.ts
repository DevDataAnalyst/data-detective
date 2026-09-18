import type { AbVerdictQuestion, Checkpoint, Lesson, Unit } from './types';

/*
 * Unit 3: Ship It or Skip It (A/B testing and hypothesis testing).
 *
 * Every A/B verdict's right call is recomputed from its numbers by validation (`abDecision`), and
 * other answers from `givens` and `derived` formulas. Numbers taken from the mission dataset
 * (checkout.csv) are checked against it in unit3.test.ts.
 */

const THREE_CALLS_INTRO = 'What is your call?';

const whatIsAHypothesis: Lesson = {
  id: 'what-is-a-hypothesis',
  title: 'What’s a hypothesis?',
  estimatedMinutes: 4,
  intro:
    'A **hypothesis** is a claim you can test with data. You start from the **null hypothesis**: nothing is going on, like “this coin is fair” or “the new checkout converts the same as the old one”.\n\nThe **alternative** is what you suspect instead. A test asks whether the data would be surprising if the null were true. If it would be, you have evidence against the null.',
  questions: [
    {
      id: 'u3-null-coin',
      type: 'multiple_choice',
      prompt: 'You suspect a coin lands heads too often. What is the null hypothesis?',
      options: [
        'The coin is fair: heads comes up half the time',
        'The coin favours heads',
        'The coin favours tails',
        'The coin has two heads',
      ],
      correctIndex: 0,
      explanation:
        'The null is the “nothing special” claim you look for evidence against. The common mistake is making your suspicion the null: you test the coin against fairness, not for bias.',
    },
    {
      id: 'u3-null-checkout',
      type: 'multiple_choice',
      prompt:
        'Arjun thinks the new checkout is better. Which pair is the null and the alternative?',
      options: [
        'Null: both convert the same. Alternative: they convert differently',
        'Null: the new checkout is better. Alternative: it is worse',
        'Null: the old checkout is broken. Alternative: it works',
        'Null: the new checkout is prettier. Alternative: it is not',
      ],
      correctIndex: 0,
      explanation:
        'The null says the change does nothing; the data has to argue you out of it. The common mistake is starting from the result you hope for.',
    },
    {
      id: 'u3-triage-arjun',
      type: 'inbox_triage',
      prompt: 'Which question can the experiment data answer?',
      message: {
        from: 'Arjun',
        role: 'Product manager, Haatbox',
        channel: 'email',
        subject: 'New checkout',
        text: 'The new checkout feels faster and people seem to love it. Can we ship it?',
      },
      data: {
        caption: 'Experiment export',
        columns: ['date', 'variant', 'visitors', 'orders'],
      },
      candidates: [
        {
          question: 'Do people love the new checkout?',
          flaw: 'data_not_available',
          note: 'There is no survey or rating in this data, only visits and orders.',
        },
        {
          question: 'Does the new checkout turn a bigger share of visitors into orders?',
          note: 'Visitors and orders for each variant give each one’s conversion rate.',
        },
        {
          question: 'Is the new checkout faster?',
          flaw: 'data_not_available',
          note: 'Nothing here records load times.',
        },
      ],
      answerableIndex: 1,
      explanation:
        'Conversion is the outcome the business cares about, and the data measures it directly. The common mistake is testing a feeling, like “people love it”, that the data cannot see.',
    },
    {
      id: 'u3-heads-expected',
      type: 'numeric_estimate',
      prompt:
        'A fair coin is tossed {tosses} times. How many heads do you expect if the null hypothesis is true?',
      givens: { tosses: 100 },
      derived: { expected: 'tosses / 2' },
      formula: 'expected',
      answerLabel: 'Expected heads',
      correctValue: 50,
      tolerance: 2,
      explanation:
        'Under the null the coin is fair, so you expect half: {expected}. A test then asks how far the real count is from that. The common mistake is expecting exactly 50 every time: counts wobble.',
    },
    {
      id: 'u3-coin-60',
      type: 'multiple_choice',
      prompt:
        'You get {heads} heads in 100 tosses. The standard error is {se} heads. How many standard errors above the expected {expected} is that?',
      givens: { heads: 60, expected: 50, se: 5 },
      derived: { z: '(heads - expected) / se' },
      options: ['2', '10', '0.6', '60'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'z' },
      explanation:
        '({heads} − {expected}) ÷ {se} = {z}. That distance, in standard errors, is the z statistic. The common mistake is quoting the raw gap of 10 heads, which means nothing without the scale.',
    },
    {
      id: 'u3-build-conversion',
      type: 'build_metric',
      prompt: 'Build the number the test compares.',
      goal: 'What share of visitors who reach the new checkout place an order?',
      metricName: 'Checkout conversion rate',
      cards: [
        { label: 'Orders placed', value: 1433 },
        { label: 'Visitors who reached checkout', value: 30591 },
        { label: 'Items added to baskets', value: 9120 },
        { label: 'App downloads', value: 5200 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 1,
      percent: true,
      explanation:
        'Conversion is orders ÷ visitors who could have ordered: 1,433 ÷ 30,591, about 4.7%. The common mistake is dividing by something wider, like app downloads, which mixes in people who never reached checkout.',
    },
    {
      id: 'u3-evidence-not-proof',
      type: 'multiple_choice',
      prompt: 'A test gives strong evidence against the null. What have you shown?',
      options: [
        'The data would be very surprising if nothing were going on',
        'The alternative is definitely true',
        'The effect is large',
        'The null can never be true',
      ],
      correctIndex: 0,
      explanation:
        'Evidence against the null is not proof of your favourite story, and says nothing about size. The common mistake is reading “significant” as “proven and important”.',
    },
  ],
};

const smallSamples: Lesson = {
  id: 'small-samples-lie',
  title: 'Small samples lie',
  estimatedMinutes: 4,
  intro:
    'A **sample** is the slice of data you happened to see. Small samples swing wildly: a new café with three 5-star reviews may just have three happy friends.\n\nThe bigger the sample, the less a result moves by chance. The **standard error** measures that wobble: for a rate p from n people, it is √(p(1 − p) ÷ n). Quadruple the sample and the wobble halves.',
  questions: [
    {
      id: 'u3-three-reviews',
      type: 'multiple_choice',
      prompt:
        'Café A has 3 reviews averaging 5.0 stars. Café B has 400 reviews averaging 4.6. Whose rating should you trust more?',
      options: [
        'Café B’s: 400 reviews wobble far less than 3',
        'Café A’s: 5.0 is higher',
        'Both equally: an average is an average',
        'Neither: ratings are useless',
      ],
      correctIndex: 0,
      explanation:
        'Three reviews can easily all be friends; 400 cannot. The common mistake is comparing averages without asking how many people each one comes from.',
    },
    {
      id: 'u3-se-small',
      type: 'numeric_estimate',
      prompt:
        'A test page converts {p:%} of {n} visitors. Estimate the standard error of that rate, in percentage points.',
      givens: { p: 0.04, n: 400 },
      derived: { se: 'sqrt(p * (1 - p) / n) * 100' },
      formula: 'se',
      answerLabel: 'Standard error',
      answerSuffix: 'points',
      correctValue: 0.98,
      tolerance: 0.15,
      explanation:
        '√(0.04 × 0.96 ÷ {n}) is about {se:2} points, so the true rate could easily be a point either side. The common mistake is treating {p:%} from {n} visitors as exact.',
    },
    {
      id: 'u3-se-large',
      type: 'multiple_choice',
      prompt: 'Now the same {p:%} comes from {n} visitors. What is the standard error?',
      givens: { p: 0.04, n: 40000 },
      derived: { se: 'sqrt(p * (1 - p) / n) * 100' },
      options: ['About 0.1 points', 'About 1 point', 'About 4 points', 'About 0.01 points'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'se', tolerance: 0.005 },
      explanation:
        'A hundred times the visitors gives a standard error ten times smaller: about {se:2} points. The common mistake is expecting the wobble to shrink as fast as the sample grows.',
    },
    {
      id: 'u3-predict-sd-small',
      type: 'predict_reveal',
      prompt:
        'A tiny test had 50 visitors a day for 10 days. Predict the standard deviation of its daily conversion rates.',
      dataset: {
        label: 'Daily conversion, 50 visitors a day',
        suffix: '%',
        values: [2, 8, 4, 0, 6, 4, 10, 2, 6, 4],
      },
      statistic: 'std_dev',
      slider: { min: 0, max: 8, step: 0.1 },
      trueValue: 2.84,
      tolerance: 0.4,
      reveal: {
        visual: 'sd_band',
        description: 'A band spans one standard deviation either side of the mean.',
      },
      explanation:
        'The daily rates swing by about {std_dev:1} points around {mean:1}%, from 0% to 10%, though nothing changed. The common mistake is reading a good or bad day in a small test as a real change.',
    },
    {
      id: 'u3-quadruple',
      type: 'multiple_choice',
      prompt: 'You test on 4 times as many visitors. What happens to the standard error?',
      options: ['It halves', 'It quarters', 'It doubles', 'It stays the same'],
      correctIndex: 0,
      explanation:
        'The standard error shrinks with the square root of the sample: √4 = 2, so it halves. The common mistake is thinking 4 times the data makes you 4 times as precise.',
    },
    {
      id: 'u3-sample-needed',
      type: 'numeric_estimate',
      prompt:
        'Your standard error is 1 point, and you need 0.5 points. How many times as many visitors do you need?',
      givens: { now: 1, wanted: 0.5 },
      derived: { times: '(now / wanted) ^ 2' },
      formula: 'times',
      answerLabel: 'Times as many visitors',
      correctValue: 4,
      tolerance: 0.5,
      explanation:
        'To halve the standard error you need (1 ÷ 0.5)² = {times} times the visitors. The common mistake is doubling the sample and expecting the wobble to halve.',
    },
    {
      id: 'u3-new-batsman',
      type: 'multiple_choice',
      prompt: 'A new batsman scores 90 in his first IPL innings. What is the fairest conclusion?',
      options: [
        'One innings is far too small a sample to judge his average',
        'He will average about 90',
        'He is the best batsman in the team',
        'He was lucky, so he is bad',
      ],
      correctIndex: 0,
      explanation:
        'One innings tells you very little; averages settle only over many. The common mistake is judging from a tiny sample in either direction, hero or flop.',
    },
  ],
};

const pValues: Lesson = {
  id: 'p-values',
  title: 'What a p-value actually means',
  estimatedMinutes: 5,
  intro:
    'A **p-value** answers one question: if the null hypothesis were true, how often would you see a result at least this extreme, just by chance?\n\nA small p-value (below 0.05, say) means the data would be surprising under the null. It is **not** the chance that the null is true, and not the chance your result is a fluke. That misreading is the most common mistake in statistics.',
  questions: [
    {
      id: 'u3-p-meaning',
      type: 'multiple_choice',
      prompt: 'A checkout test gives p = 0.03. Which statement is correct?',
      options: [
        'If the checkouts were truly the same, a gap this big would turn up about 3% of the time',
        'There is a 3% chance the checkouts are the same',
        'There is a 97% chance the new checkout is better',
        'The new checkout is 3% better',
      ],
      correctIndex: 0,
      explanation:
        'A p-value assumes the null is true and asks how rare your result would be. The common mistake is flipping it into “a 97% chance we are right”, which the p-value never says.',
    },
    {
      id: 'u3-p-from-z',
      type: 'numeric_estimate',
      prompt: 'A test gives z = {z}. What is the two-sided p-value?',
      givens: { z: 2 },
      derived: { p: '2 * (1 - phi(z))' },
      formula: 'p',
      answerLabel: 'Two-sided p-value',
      correctValue: 0.0455,
      tolerance: 0.005,
      explanation:
        'A result 2 standard errors from the null, in either direction, happens about {p:%} of the time by chance: p ≈ {p:4}. The common mistake is forgetting the other tail and halving it.',
    },
    {
      id: 'u3-smallest-p',
      type: 'multiple_choice',
      prompt: 'Which z statistic gives the smallest p-value?',
      options: ['z = 3.1', 'z = 1.2', 'z = 2.0', 'z = 0.4'],
      correctIndex: 0,
      explanation:
        'The further a result is from the null, in standard errors, the rarer it is by chance, so the bigger z gives the smaller p. The common mistake is thinking a bigger z means a weaker result.',
    },
    {
      id: 'u3-build-z',
      type: 'build_metric',
      prompt: 'Build the z statistic.',
      goal: 'How many standard errors apart are the two conversion rates?',
      metricName: 'z',
      cards: [
        { label: 'Difference in conversion (points)', value: 0.8 },
        { label: 'Standard error of the difference (points)', value: 0.14 },
        { label: 'Old conversion rate (%)', value: 3.8 },
        { label: 'Visitors in the test', value: 91792 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 1,
      explanation:
        'z = difference ÷ its standard error: 0.8 ÷ 0.14, about 5.7. The common mistake is dividing by the conversion rate, which gives a relative lift, not a test statistic.',
    },
    {
      id: 'u3-not-certainty',
      type: 'multiple_choice',
      prompt: 'Why doesn’t p = 0.03 mean you are 97% sure the result is real?',
      options: [
        'The p-value is worked out assuming the null is true, so it cannot say how likely the null is',
        'Because 0.03 is too small to mean anything',
        'Because p-values are always wrong',
        'It does mean exactly that',
      ],
      correctIndex: 0,
      explanation:
        'The p-value is P(data this extreme | null), not P(null | data). Swapping the two is the same confusion of the inverse you met with Bayes. It is the most common misreading of all.',
    },
    {
      id: 'u3-twenty-tests',
      type: 'multiple_choice',
      prompt:
        'You test {tests} button colours that all truly perform the same, using a p < {alpha} cut-off. How many false “wins” do you expect?',
      givens: { tests: 20, alpha: 0.05 },
      derived: { false_wins: 'tests * alpha' },
      options: ['About 1', 'None', 'About 5', 'About 10'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'false_wins', tolerance: 0.05 },
      explanation:
        'Each test has a {alpha} chance of a fake win, so {tests} tests give about {false_wins}. The common mistake is running many tests and celebrating the one that crosses the line.',
    },
  ],
};

const tinyButReal: AbVerdictQuestion = {
  id: 'u3-verdict-tiny',
  type: 'ab_verdict',
  prompt: 'A new “Buy again” button was tested on 6 lakh visitors. What is your call?',
  test: 'Without vs with the “Buy again” button',
  control: { name: 'Without', visitors: 300000, conversions: 12000 },
  variant: { name: 'With the button', visitors: 300000, conversions: 12330 },
  minWorthwhileLift: 0.5,
  verdict: 'kill',
  consequences: {
    ship: 'The button ships. The lift is real, but a tenth of a point never repays the months it took.',
    kill: 'You skip it and spend the time on a bigger idea. The right trade.',
    wait: 'More data only makes a tiny lift more certain. It is still tiny.',
  },
  explanation:
    'The lift of {difference} points is significant (p = {p_value:3}) because the test is huge, but it is far below the 0.5 points worth having. The common mistake is treating “significant” as “important”.',
};

const practicalSignificance: Lesson = {
  id: 'practical-significance',
  title: 'Significant isn’t the same as important',
  estimatedMinutes: 4,
  intro:
    'With enough data, even a tiny difference becomes **statistically significant**: very unlikely to be chance. But is it **practically significant**, big enough to matter?\n\nA 0.1-point lift in conversion might be real and still not pay for the work it took. Always ask how big an effect is, not just whether it exists. Confusing the two is a classic mistake.',
  questions: [
    tinyButReal,
    {
      id: 'u3-sig-vs-practical',
      type: 'multiple_choice',
      prompt: 'Which result is statistically significant but not practically significant?',
      options: [
        'A 0.05-point lift with p = 0.001, when only lifts of 0.5 points pay off',
        'A 2-point lift with p = 0.001',
        'A 2-point lift with p = 0.4',
        'No difference, with p = 0.9',
      ],
      correctIndex: 0,
      explanation:
        'p = 0.001 says the lift is real; 0.05 points says it is too small to matter. The common mistake is stopping at the p-value and never asking about size.',
    },
    {
      id: 'u3-extra-orders',
      type: 'numeric_estimate',
      prompt:
        'A lift of {lift} points on {visitors} checkout visitors a month means how many extra orders a month?',
      givens: { lift: 0.1, visitors: 200000 },
      derived: { extra: 'visitors * lift / 100' },
      formula: 'extra',
      answerLabel: 'Extra orders a month',
      correctValue: 200,
      tolerance: 10,
      explanation:
        '{lift} points is {lift} in every 100 visitors: {visitors} × 0.001 = {extra} orders. The common mistake is reading a “0.1% lift” as 0.1% more orders, rather than 0.1 in every 100 visitors.',
    },
    {
      id: 'u3-worth-it',
      type: 'multiple_choice',
      prompt:
        'Each extra order earns ₹{margin} profit, and the redesign costs ₹{cost}. Is a {lift}-point lift on {visitors} visitors a month worth it in the first year?',
      givens: { margin: 50, cost: 500000, lift: 0.1, visitors: 200000 },
      derived: { yearly: 'visitors * lift / 100 * margin * 12' },
      options: [
        'No: it earns about ₹1,20,000 a year against a ₹5,00,000 cost',
        'Yes: any significant lift pays for itself',
        'Yes: it earns about ₹10,00,000 a year',
        'No: it loses ₹5,00,000 at once',
      ],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'yearly' },
      explanation:
        '200 extra orders × ₹{margin} × 12 months = ₹{yearly}, well short of ₹{cost}. The common mistake is shipping every real lift without pricing it.',
    },
    {
      id: 'u3-verdict-clear-ship',
      type: 'ab_verdict',
      prompt: 'A simpler address form ran for two full weeks. What is your call?',
      test: 'Old form vs simpler form',
      control: { name: 'Old form', visitors: 30000, conversions: 1200 },
      variant: { name: 'Simpler form', visitors: 30000, conversions: 1500 },
      minWorthwhileLift: 0.5,
      verdict: 'ship',
      consequences: {
        ship: 'Orders rise by about a point, as the test said. Good call.',
        kill: 'You keep the old form and leave a real, sizeable lift unused.',
        wait: 'Two more weeks with the weaker form, and the answer does not change.',
      },
      explanation:
        'A {difference}-point lift is both clearly real and well above the 0.5 points worth shipping. The common mistake is waiting for ever after a clean, full test has answered the question.',
    },
    {
      id: 'u3-build-relative-lift',
      type: 'build_metric',
      prompt: 'Build the lift a manager will quote.',
      goal: 'By what share did the new version improve on the old one?',
      metricName: 'Relative lift',
      cards: [
        { label: 'Difference in conversion (points)', value: 1 },
        { label: 'Old conversion rate (%)', value: 4 },
        { label: 'New conversion rate (%)', value: 5 },
        { label: 'Visitors in the test', value: 60000 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 1,
      percent: true,
      explanation:
        'Relative lift = difference ÷ old rate = 1 ÷ 4 = 25%. The common mistake is calling a 1-point difference “1% better”, or dividing by the new rate.',
    },
  ],
};

const confidenceIntervals: Lesson = {
  id: 'confidence-intervals',
  title: 'Confidence intervals, intuitively',
  estimatedMinutes: 5,
  intro:
    'Election polls say “42%, with a margin of error of 3 points”. That range, 39% to 45%, is a **95% confidence interval**: a range of plausible values for the truth.\n\nFor a rate, the margin is about 1.96 × √(p(1 − p) ÷ n). If an interval for a difference includes zero, “no difference” is still plausible. The common mistake is treating the single best guess as exact.',
  questions: [
    {
      id: 'u3-poll-range',
      type: 'multiple_choice',
      prompt:
        'A poll in Bengaluru shows {support:%} support, with a margin of error of {margin} points. What is the 95% interval?',
      givens: { support: 0.42, margin: 3 },
      derived: { low: 'support * 100 - margin', high: 'support * 100 + margin' },
      options: ['39% to 45%', '42% to 45%', '41% to 43%', '36% to 48%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'low' },
      explanation:
        'The interval runs the margin either side of the estimate: {low}% to {high}%. The common mistake is only adding the margin, as if the truth could only be higher.',
    },
    {
      id: 'u3-margin',
      type: 'numeric_estimate',
      prompt:
        'A test converts {p:%} of {n} visitors. Estimate the 95% margin of error, in percentage points.',
      givens: { p: 0.05, n: 1900 },
      derived: { margin: '1.96 * sqrt(p * (1 - p) / n) * 100' },
      formula: 'margin',
      answerLabel: 'Margin of error',
      answerSuffix: 'points',
      correctValue: 0.98,
      tolerance: 0.15,
      explanation:
        '1.96 × √(0.05 × 0.95 ÷ {n}) ≈ {margin:2} points, so the true rate is plausibly 4% to 6%. The common mistake is forgetting the 1.96 and quoting one standard error as the margin.',
    },
    {
      id: 'u3-interval-with-zero',
      type: 'multiple_choice',
      prompt:
        'The 95% interval for “new minus old” conversion is −0.2 to +0.6 points. What does that tell you?',
      options: [
        'No difference is still plausible, so the test has not shown a real lift',
        'The new version is definitely better',
        'The new version is 0.6 points better',
        'The old version is definitely better',
      ],
      correctIndex: 0,
      explanation:
        'Zero sits inside the interval, so “no difference” fits the data. The common mistake is quoting the top of the interval as if it were the result.',
    },
    {
      id: 'u3-margin-shrinks',
      type: 'multiple_choice',
      prompt: 'A test has a margin of error of 2 points. Quadruple the visitors, and it becomes?',
      options: ['1 point', '0.5 points', '4 points', '2 points'],
      correctIndex: 0,
      check: { kind: 'formula', formula: '2 / sqrt(4)' },
      explanation:
        'Margins shrink with the square root of the sample: 2 ÷ √4 = 1 point. The common mistake is expecting a quarter of the margin from four times the data.',
    },
    {
      id: 'u3-verdict-wait-interval',
      type: 'ab_verdict',
      prompt: 'A new product page was tried on a thousand visitors each. What is your call?',
      test: 'Old page vs new page',
      control: { name: 'Old page', visitors: 1000, conversions: 40 },
      variant: { name: 'New page', visitors: 1000, conversions: 52 },
      minWorthwhileLift: 0.5,
      verdict: 'wait',
      consequences: {
        ship: 'You ship on thin evidence. The lift shrinks towards nothing once everyone sees it.',
        kill: 'You drop a page that might be worth having, on far too little data.',
        wait: 'You keep testing. With enough visitors, the interval narrows and the answer becomes clear.',
      },
      explanation:
        'The interval runs from {ci_low:1} to {ci_high:1} points: anything from a small loss to a big win fits. The common mistake is deciding on the middle of a wide interval.',
    },
    {
      id: 'u3-interval-meaning',
      type: 'multiple_choice',
      prompt: 'What does a 95% confidence interval promise?',
      options: [
        'Made the same way many times, about 95% of such intervals would contain the true value',
        'There is a 95% chance the data is right',
        '95% of customers fall inside it',
        'The true value is exactly in the middle',
      ],
      correctIndex: 0,
      explanation:
        'The 95% describes the method: most intervals built this way catch the truth. The common mistake is treating the middle of the interval as the exact answer.',
    },
  ],
};

const abMistakes: Lesson = {
  id: 'ab-testing-mistakes',
  title: 'Common A/B testing mistakes',
  estimatedMinutes: 5,
  intro:
    'Three mistakes sink most A/B tests. **Peeking**: checking every day and stopping the moment p dips below 0.05, which turns chance into “wins”. **Uneven days**: if one version gets more weekend traffic, the weekend can make it look better. **Novelty**: people click anything new for a few days, then the lift fades. Plan the length and the split before you start.',
  questions: [
    {
      id: 'u3-peeking',
      type: 'multiple_choice',
      prompt:
        'The team checks the test every morning and stops on the first day p is below 0.05. What is wrong?',
      options: [
        'Every extra look gives chance another go at producing a fake win',
        'Nothing: p below 0.05 is p below 0.05',
        'They should check every hour instead',
        'Morning numbers are less accurate',
      ],
      correctIndex: 0,
      explanation:
        'Look often enough and a chance swing will cross 0.05 at some point. The common mistake is peeking: decide the test length first, then look once.',
    },
    {
      id: 'u3-court-search',
      type: 'courtroom',
      prompt: 'Look at the exhibit. What is really behind the lift?',
      evidence: 'A new search bar lifted conversion from 3.9% to 4.6% in a one-week test.',
      witnesses: [
        { name: 'Neha, designer', claim: 'The search bar helps people find things faster.' },
        {
          name: 'Rohit, marketer',
          claim: 'The new colours that came with it caught people’s eye.',
        },
      ],
      table: {
        caption: 'Visitors by day type',
        columns: ['day type', 'conversion, everyone', 'old version', 'new version'],
        rows: [
          ['weekday', '3.4%', '40,000', '10,000'],
          ['weekend', '5.6%', '10,000', '15,000'],
        ],
      },
      suspects: [
        {
          text: 'Phone brands',
          note: 'Nothing in the exhibit separates phones, and both versions ran on the same ones.',
        },
        {
          text: 'The weather that week',
          note: 'Both versions ran in the same week, so they saw the same weather.',
        },
        {
          text: 'The day of the week: the new version got more weekend visitors',
          note: 'Weekends convert better for everyone, and the new version got 60% of its visitors then.',
        },
      ],
      confounderIndex: 2,
      explanation:
        'The new version got far more weekend traffic, and weekends convert better whatever people see. The common mistake is letting two groups see different days, then crediting the design.',
    },
    {
      id: 'u3-lie-novelty',
      type: 'spot_the_lie',
      prompt: 'Arjun shared this in the product channel. What is misleading about it?',
      claim: { by: 'Arjun from Product', text: 'The new checkout lifts conversion by 2 points!' },
      chart: {
        kind: 'line',
        title: 'Daily lift of the new checkout',
        labels: [
          'D1',
          'D2',
          'D3',
          'D4',
          'D5',
          'D6',
          'D7',
          'D8',
          'D9',
          'D10',
          'D11',
          'D12',
          'D13',
          'D14',
        ],
        series: [
          {
            name: 'Lift',
            values: [2.1, 1.8, 1.5, 0.6, 0.2, -0.1, 0.3, 0.1, -0.2, 0.2, 0, 0.1, -0.1, 0.1],
          },
        ],
        axis: { min: -1, max: 3, label: 'Lift (points)' },
        window: { from: 0, to: 2 },
      },
      trick: 'cherry_picked_range',
      options: [
        'The axis should start at zero',
        'Daily numbers are too noisy to plot',
        'It shows only the first three days, when anything new gets extra clicks',
      ],
      correctIndex: 2,
      explanation:
        'Over two weeks the lift fades to about zero: the early jump was novelty. The common mistake is judging a change by its first days, before the newness wears off.',
    },
    {
      id: 'u3-verdict-peeked',
      type: 'ab_verdict',
      prompt: 'The dashboard shows a clear win for the new banner. What is your call?',
      test: 'Old banner vs new banner',
      control: { name: 'Old banner', visitors: 5000, conversions: 200 },
      variant: { name: 'New banner', visitors: 5000, conversions: 250 },
      minWorthwhileLift: 0.5,
      context:
        'The team checked every morning and stopped on day 3, the first time p dipped below 0.05.',
      issue: 'peeked_early',
      verdict: 'wait',
      consequences: {
        ship: 'You ship a win that was a chance swing caught at the right moment. It fades.',
        kill: 'You throw out a banner that was never properly tested.',
        wait: 'You re-run it for a fixed two weeks and look once at the end. Now the result means something.',
      },
      explanation:
        'p = {p_value:3} looks convincing, but stopping at the first good day makes a fake win likely. The common mistake is peeking: fix the length before you start.',
    },
    {
      id: 'u3-novelty',
      type: 'multiple_choice',
      prompt:
        'A new home screen lifts clicks by 30% in week 1, 5% in week 2 and 1% in week 3. What is the likely story?',
      options: [
        'A novelty effect: people poke at anything new, then go back to normal',
        'The design is getting better over time',
        'Week 1 was a festival',
        'Clicks were measured wrongly in week 3',
      ],
      correctIndex: 0,
      explanation:
        'A lift that fades week by week is the novelty wearing off. The common mistake is reporting week 1 as the effect of the change.',
    },
    {
      id: 'u3-full-weeks',
      type: 'multiple_choice',
      prompt: 'How should you choose how long a checkout test runs?',
      options: [
        'Whole weeks, planned in advance, so both versions see every day of the week equally',
        'Until p drops below 0.05',
        'Exactly three days',
        'Until the product manager is happy',
      ],
      correctIndex: 0,
      explanation:
        'Shoppers behave differently across the week, so run whole weeks and fix the length first. The common mistake is letting the result decide when the test ends.',
    },
  ],
};

const makingTheCall: Lesson = {
  id: 'making-the-call',
  title: 'Making the call',
  estimatedMinutes: 5,
  intro:
    'A good call weighs three things together: **significance** (could this be chance?), **effect size** (is it big enough to matter?) and the **cost of being wrong** (what if you ship a dud, or kill a winner?).\n\nThen say it plainly. A manager needs the decision and the reason, not a p-value on its own.',
  questions: [
    {
      id: 'u3-verdict-ship-final',
      type: 'ab_verdict',
      prompt: 'A one-tap reorder button ran for two full weeks. ' + THREE_CALLS_INTRO,
      test: 'Without vs with one-tap reorder',
      control: { name: 'Without', visitors: 25000, conversions: 1000 },
      variant: { name: 'One-tap reorder', visitors: 25000, conversions: 1200 },
      minWorthwhileLift: 0.5,
      verdict: 'ship',
      consequences: {
        ship: 'Reorders rise just as the test said, and the team moves on to the next idea.',
        kill: 'You keep the old flow and give up a clear, worthwhile lift.',
        wait: 'Another fortnight of testing tells you what you already knew.',
      },
      explanation:
        'A {difference}-point lift, clearly real and above the 0.5 points worth shipping, from a clean two-week test. The common mistake is asking for more data when the evidence is already strong.',
    },
    {
      id: 'u3-verdict-kill-worse',
      type: 'ab_verdict',
      prompt: 'A longer, more detailed product page ran for two weeks. ' + THREE_CALLS_INTRO,
      test: 'Short page vs detailed page',
      control: { name: 'Short page', visitors: 20000, conversions: 1000 },
      variant: { name: 'Detailed page', visitors: 20000, conversions: 860 },
      minWorthwhileLift: 0.5,
      verdict: 'kill',
      consequences: {
        ship: 'You ship a page that loses orders every day. Sales drop.',
        kill: 'You keep the short page and avoid a real loss. Right call.',
        wait: 'More testing just costs more orders to a version that is clearly worse.',
      },
      explanation:
        'The detailed page converts {variant_rate:%} against {control_rate:%}, and that drop is clearly real. The common mistake is hoping a significant loss will turn round with more data.',
    },
    {
      id: 'u3-verdict-wait-final',
      type: 'ab_verdict',
      prompt:
        'A new delivery-slot picker ran for one week on a small share of traffic. ' +
        THREE_CALLS_INTRO,
      test: 'Old picker vs new picker',
      control: { name: 'Old picker', visitors: 3000, conversions: 120 },
      variant: { name: 'New picker', visitors: 3000, conversions: 150 },
      minWorthwhileLift: 0.5,
      verdict: 'wait',
      consequences: {
        ship: 'You ship on a maybe. It might help, or it might have been noise.',
        kill: 'You drop something that could be a real win, without knowing.',
        wait: 'You give it more traffic for another full week. Now the result will be clear either way.',
      },
      explanation:
        'A promising {difference} points, but p = {p_value:2} and the interval ({ci_low:2} to {ci_high:2} points) still includes zero. The common mistake is calling a promising but unproven result a win.',
    },
    {
      id: 'u3-cost-of-wrong',
      type: 'multiple_choice',
      prompt:
        'Shipping a dud costs little and is easy to undo, but missing a winner costs a lot. How should that change a borderline call?',
      options: [
        'Lean towards shipping, and keep measuring after launch',
        'Always demand p below 0.01 first',
        'Never ship a borderline result',
        'Toss a coin',
      ],
      correctIndex: 0,
      explanation:
        'When mistakes in one direction are cheap and easy to undo, you can accept more risk there. The common mistake is using the same 0.05 rule whatever being wrong costs.',
    },
    {
      id: 'u3-plain-words',
      type: 'multiple_choice',
      prompt: 'Which update should Arjun get?',
      options: [
        'Not yet: the new checkout got more weekend visitors, who buy more anyway. Let’s re-run it evenly for two weeks.',
        'p = 0.000000002, z = 5.99, pooled standard error 0.0014.',
        'The results are complicated, so it is hard to say.',
        'Ship it: the numbers look great.',
      ],
      correctIndex: 0,
      explanation:
        'A good update gives the decision, the reason and the next step, in words a manager uses. The common mistake is pasting statistics nobody can act on.',
    },
    {
      id: 'u3-sample-size',
      type: 'numeric_estimate',
      prompt:
        'A rule of thumb: to spot a lift of d from a rate p, test about 16 × p(1 − p) ÷ d² visitors per version. For p = {p:%} and d = {d:%}, how many is that?',
      givens: { p: 0.04, d: 0.01 },
      derived: { visitors: '16 * p * (1 - p) / (d * d)' },
      formula: 'visitors',
      answerLabel: 'Visitors per version',
      correctValue: 6144,
      tolerance: 300,
      explanation:
        '16 × 0.04 × 0.96 ÷ 0.0001 ≈ {visitors} visitors each. Fixing this before you start is what stops peeking. The common mistake is running until the result looks good.',
    },
  ],
};

const checkpoint: Checkpoint = {
  id: 'unit-3-checkpoint',
  title: 'Unit 3 checkpoint',
  passMark: 0.8,
  retakeDelayMinutes: 60,
  items: [
    {
      lessonId: 'what-is-a-hypothesis',
      question: {
        id: 'u3-cp-null-banner',
        type: 'multiple_choice',
        prompt: 'A team thinks a new banner raises sign-ups. What is the null hypothesis?',
        options: [
          'The banner makes no difference to sign-ups',
          'The banner raises sign-ups',
          'The banner lowers sign-ups',
          'Sign-ups are already high',
        ],
        correctIndex: 0,
        explanation:
          'The null is “no difference”; the test looks for evidence against it. The common mistake is making the hoped-for result the null.',
      },
    },
    {
      lessonId: 'what-is-a-hypothesis',
      question: {
        id: 'u3-cp-conversion',
        type: 'multiple_choice',
        prompt:
          'A test page had {visitors} visitors and {orders} orders. What is its conversion rate?',
        givens: { visitors: 2500, orders: 95 },
        derived: { rate: 'orders / visitors' },
        options: ['3.8%', '95%', '2.6%', '38%'],
        correctIndex: 0,
        check: { kind: 'formula', formula: 'rate * 100' },
        explanation:
          '{orders} ÷ {visitors} = {rate:%}. The common mistake is misplacing the decimal point, turning 0.038 into 38%.',
      },
    },
    {
      lessonId: 'small-samples-lie',
      question: {
        id: 'u3-cp-standard-error',
        type: 'numeric_estimate',
        prompt:
          'A rate of {p:%} comes from {n} visitors. What is its standard error, in percentage points?',
        givens: { p: 0.1, n: 900 },
        derived: { se: 'sqrt(p * (1 - p) / n) * 100' },
        formula: 'se',
        answerLabel: 'Standard error',
        answerSuffix: 'points',
        correctValue: 1,
        tolerance: 0.2,
        explanation:
          '√(0.1 × 0.9 ÷ {n}) = {se} point. The common mistake is forgetting the square root, which makes the wobble look tiny.',
      },
    },
    {
      lessonId: 'p-values',
      question: {
        id: 'u3-cp-p-meaning',
        type: 'multiple_choice',
        prompt: 'A new checkout gets p = 0.01. What does that mean?',
        options: [
          'If the checkouts truly converted the same, a gap this big would be rare: about 1 time in 100',
          'There is a 99% chance the new checkout is better',
          'The new checkout is 1% better',
          'There is a 1% chance the result is right',
        ],
        correctIndex: 0,
        explanation:
          'The p-value assumes no difference and asks how rare the result would be. The common mistake is reading it as the chance the null is true.',
      },
    },
    {
      lessonId: 'p-values',
      question: {
        id: 'u3-cp-p-from-z',
        type: 'numeric_estimate',
        prompt: 'A test gives z = {z}. What is the two-sided p-value?',
        givens: { z: 2.5 },
        derived: { p: '2 * (1 - phi(z))' },
        formula: 'p',
        answerLabel: 'Two-sided p-value',
        correctValue: 0.0124,
        tolerance: 0.004,
        explanation:
          'Both tails beyond 2.5 standard errors hold about {p:%} of chance results: p ≈ {p:4}. The common mistake is taking just one tail.',
      },
    },
    {
      lessonId: 'practical-significance',
      question: {
        id: 'u3-cp-verdict-tiny',
        type: 'ab_verdict',
        prompt: 'A new font was tested on 10 lakh visitors. What is your call?',
        test: 'Old font vs new font',
        control: { name: 'Old font', visitors: 500000, conversions: 25000 },
        variant: { name: 'New font', visitors: 500000, conversions: 25600 },
        minWorthwhileLift: 0.5,
        verdict: 'kill',
        consequences: {
          ship: 'The font ships. The lift is real, but far too small to be worth the change.',
          kill: 'You keep the old font and move on to something that matters more.',
          wait: 'More data would only confirm a lift too small to care about.',
        },
        explanation:
          'Real (p = {p_value:3}) but tiny: {difference} points against the 0.5 needed. The common mistake is treating significance as importance.',
      },
    },
    {
      lessonId: 'confidence-intervals',
      question: {
        id: 'u3-cp-interval-zero',
        type: 'multiple_choice',
        prompt: 'The 95% interval for “new minus old” is −0.4 to +1.2 points. What can you say?',
        options: [
          'No difference is still plausible, so a real lift has not been shown',
          'The new version is better by 1.2 points',
          'The new version is worse',
          'The test was run wrongly',
        ],
        correctIndex: 0,
        explanation:
          'The interval includes zero, so the data fits “no difference”. The common mistake is quoting the most flattering end of the interval.',
      },
    },
    {
      lessonId: 'ab-testing-mistakes',
      question: {
        id: 'u3-cp-peeking',
        type: 'multiple_choice',
        prompt: 'Why is stopping a test on the first day p is below 0.05 a mistake?',
        options: [
          'Each extra look gives chance another try at producing a fake win',
          'p-values only work at the end of a month',
          'Early data is always wrong',
          'It is not a mistake',
        ],
        correctIndex: 0,
        explanation:
          'Checking again and again makes a fake win likely at some point. The common mistake is peeking; fix the length first.',
      },
    },
    {
      lessonId: 'ab-testing-mistakes',
      question: {
        id: 'u3-cp-court-weekend',
        type: 'courtroom',
        prompt: 'Which lurking variable explains the result?',
        evidence: 'Version B converted better than version A over one week.',
        witnesses: [
          { name: 'Sameer, designer', claim: 'B’s bigger buttons made buying easier.' },
          { name: 'Lata, copywriter', claim: 'B’s friendlier words made people trust us.' },
        ],
        table: {
          caption: 'Each version’s visitors',
          columns: ['version', 'visitors at the weekend', 'conversion'],
          rows: [
            ['A', '20%', '3.9%'],
            ['B', '55%', '4.6%'],
          ],
        },
        suspects: [
          {
            text: 'The day of the week the visits happened',
            note: 'B got far more weekend visitors, and weekends convert better for everyone.',
          },
          {
            text: 'The colour of the logo',
            note: 'The logo was the same in both versions.',
          },
          {
            text: 'How many products the shop had',
            note: 'Both versions showed the same shop.',
          },
        ],
        confounderIndex: 0,
        explanation:
          'B saw mostly weekend shoppers, who buy more whatever they see. The common mistake is comparing groups that saw different days.',
      },
    },
    {
      lessonId: 'making-the-call',
      question: {
        id: 'u3-cp-verdict-ship',
        type: 'ab_verdict',
        prompt: 'A saved-address shortcut ran for two full weeks. What is your call?',
        test: 'Without vs with saved addresses',
        control: { name: 'Without', visitors: 40000, conversions: 1600 },
        variant: { name: 'Saved addresses', visitors: 40000, conversions: 1880 },
        minWorthwhileLift: 0.5,
        verdict: 'ship',
        consequences: {
          ship: 'Checkouts rise as the test predicted. Well called.',
          kill: 'You bin a clear, worthwhile win.',
          wait: 'You spend two more weeks confirming a clear result.',
        },
        explanation:
          'A {difference}-point lift, clearly real and big enough, from a fair two-week test. The common mistake is endless testing when the answer is in.',
      },
    },
  ],
};

export const unit3: Unit = {
  id: 'unit-3-ship-it-or-skip-it',
  title: 'Ship It or Skip It',
  description: 'A/B testing and hypothesis tests: decide whether a change really works.',
  hook: {
    from: 'Arjun',
    role: 'Product manager, Haatbox',
    channel: 'email',
    subject: 'Checkout redesign: roll out on Monday?',
    text: 'Hi! We redesigned checkout and tested it for two weeks. Early numbers look better: the new version converts at **4.7%** against 3.8% for the old one. Can we roll it out to everyone on Monday?',
  },
  lessons: [
    whatIsAHypothesis,
    smallSamples,
    pValues,
    practicalSignificance,
    confidenceIntervals,
    abMistakes,
    makingTheCall,
  ],
  checkpoint,
  missionId: 'the-checkout-redesign',
};
