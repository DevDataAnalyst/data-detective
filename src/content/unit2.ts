import type { Checkpoint, Lesson, NumberDataset, Unit } from './types';

/*
 * Unit 2: The Churn Culprit (probability and Bayes' theorem).
 *
 * Probability answers are recomputed by validation from each question's `givens` and `derived`
 * formulas. Numbers taken from the mission dataset (churn.csv) are checked against it in
 * unit2.test.ts.
 */

/** Kathakar's monthly churn rate, May 2024 to April 2026 (from churn.csv, to 0.1%). */
const MONTHLY_CHURN: NumberDataset = {
  label: 'Monthly churn rate',
  suffix: '%',
  display: 'dot_plot',
  values: [
    2.5, 2.5, 2.5, 2.5, 2.8, 2.7, 2.6, 2.8, 2.4, 2.7, 2.9, 3.7, 2.6, 2.4, 2.5, 2.7, 2.5, 2.6, 2.9,
    2.8, 2.4, 2.6, 2.3, 4,
  ],
};

const RESUME_SCREEN = {
  caption: '1,000 applicants and an automatic resume screen',
  columns: ['candidate', 'passed the screen', 'rejected', 'total'],
  rows: [
    ['strong', 90, 10, 100],
    ['not strong', 90, 810, 900],
    ['total', 180, 820, 1000],
  ],
};

const CHURN_MODEL = {
  givens: { people: 1000, base: 0.05, hit_rate: 0.8, false_alarm: 0.1 },
  derived: {
    leavers: 'people * base',
    stayers: 'people - leavers',
    caught: 'leavers * hit_rate',
    false_flags: 'stayers * false_alarm',
    flagged: 'caught + false_flags',
    answer: 'caught / flagged',
  },
};

const CAMPAIGN = {
  givens: { discount: 50, offered: 1000, without: 0.2, with_offer: 0.12, value: 600 },
  derived: {
    leave_without: 'offered * without',
    leave_with: 'offered * with_offer',
    saved: 'leave_without - leave_with',
    gain: 'saved * value',
    cost: 'discount * offered',
  },
};

const whatIsProbability: Lesson = {
  id: 'what-is-probability',
  title: 'What is probability, really?',
  estimatedMinutes: 4,
  intro:
    'A **probability** is a number from 0 to 1 that says how often something happens in the long run. 0 means never, 1 means always, and 0.7 (70%) means about 7 times in 10.\n\nYou estimate one with a **rate**: how many times it happened ÷ how many chances it had. A count on its own, like “200 people left”, is not a probability until you know out of how many.',
  questions: [
    {
      id: 'u2-rain-70',
      type: 'multiple_choice',
      prompt:
        'A weather app says there is a 70% chance of rain in Mumbai tomorrow. What does that mean?',
      options: [
        'On days like tomorrow, it rains about 7 times in 10',
        'It will rain for about 70% of the day',
        'About 70% of Mumbai will get rain',
        'It will definitely rain, just not heavily',
      ],
      correctIndex: 0,
      explanation:
        'A probability describes how often something happens over many similar situations. The common mistake is reading it as a share of the day or of the city, or as a promise.',
    },
    {
      id: 'u2-ipl-win',
      type: 'multiple_choice',
      prompt:
        'In their last {matches} IPL matches against Mumbai, Chennai won {wins}. What is a fair estimate of Chennai winning the next one?',
      givens: { matches: 40, wins: 26 },
      derived: { chance: 'wins / matches' },
      options: ['65%', '26%', '40%', '50%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'chance * 100' },
      explanation:
        '{wins} wins from {matches} matches is {chance:%}. The common mistake is saying 50% because there are two possible results: two outcomes are not always equally likely.',
    },
    {
      id: 'u2-mock-pass',
      type: 'numeric_estimate',
      prompt:
        'Of {students} students who took a mock exam, {passed} passed. Estimate the chance that a similar student passes.',
      givens: { students: 250, passed: 190 },
      derived: { share: 'passed / students' },
      formula: 'share * 100',
      answerLabel: 'Chance of passing',
      answerSuffix: '%',
      correctValue: 76,
      tolerance: 3,
      explanation:
        '{passed} ÷ {students} is {share:%}: the passes out of all the chances. The common mistake is dividing by the number who failed instead of by everyone who sat the exam.',
    },
    {
      id: 'u2-build-churn',
      type: 'build_metric',
      prompt: 'Build the number Ritika should look at.',
      goal: 'What share of the subscribers we had at the start of April cancelled during April?',
      metricName: 'April churn rate',
      cards: [
        { label: 'Cancellations in April', value: 200 },
        { label: 'New sign-ups in April', value: 151 },
        { label: 'Subscribers at the start of April', value: 5022 },
        { label: 'App downloads in April', value: 3900 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 2,
      percent: true,
      explanation:
        'Churn rate is cancellations ÷ subscribers at the start: 200 ÷ 5,022, about 4%. The common mistake is comparing cancellations with new sign-ups, which mixes two different groups of people.',
    },
    {
      id: 'u2-triage-ritika',
      type: 'inbox_triage',
      prompt: 'Ritika wants an answer. Which question can the subscription data answer?',
      message: {
        from: 'Ritika',
        role: 'Founder, Kathakar',
        channel: 'chat',
        text: 'We lost **200 subscribers** last month, our worst month ever! Is this normal or should I panic?',
      },
      data: {
        caption: 'Subscription data',
        columns: ['month', 'segment', 'subscribers_start', 'cancelled'],
      },
      candidates: [
        {
          question: 'Should I panic?',
          flaw: 'too_vague',
          note: 'Panic is a feeling, not a measure. Say what you would compare.',
        },
        {
          question: 'Is April’s churn rate higher than the usual monthly rate?',
          note: 'Cancellations and subscribers give a rate for every month to compare.',
        },
        {
          question: 'Which app feature made people leave?',
          flaw: 'data_not_available',
          note: 'The data has no feature usage and no reasons for leaving.',
        },
      ],
      answerableIndex: 1,
      explanation:
        'A rate compared with a baseline turns “should I panic?” into something you can work out. The common mistake is answering the feeling before defining what “normal” means.',
    },
    {
      id: 'u2-count-vs-rate',
      type: 'multiple_choice',
      prompt: 'Which statement tells the founder the most about churn?',
      options: [
        'About 4 in every 100 subscribers cancelled in April',
        '200 subscribers cancelled in April',
        'Churn felt high in April',
        'Lots of students cancelled',
      ],
      correctIndex: 0,
      check: { kind: 'formula', formula: '200 / 5022 * 100', tolerance: 0.05 },
      explanation:
        'A rate says how many out of how many, so it can be compared across months. The common mistake is reporting a raw count: 200 is a lot for 1,000 subscribers, but little for 50,000.',
    },
    {
      id: 'u2-dice',
      type: 'multiple_choice',
      prompt: 'You roll a normal six-sided die. What is the chance of rolling a 5 or a 6?',
      givens: { good_faces: 2, faces: 6 },
      derived: { chance: 'good_faces / faces' },
      options: ['About 33%', 'About 17%', '50%', 'About 67%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'chance * 100', tolerance: 0.5 },
      explanation:
        'Two of the six equally likely faces work: 2 ÷ 6 is about {chance:%}. The common mistake is thinking that two outcomes, win or lose, always make 50%.',
    },
  ],
};

const independentEvents: Lesson = {
  id: 'independent-events',
  title: 'Independent or dependent?',
  estimatedMinutes: 4,
  intro:
    'Two events are **independent** when one tells you nothing about the other, like two coin tosses. Then the chance of both is the two chances multiplied.\n\nThey are **dependent** when one changes the other’s chances, like picking fruit from a box without putting it back.\n\nThe classic mistake is the **gambler’s fallacy**: thinking a coin that landed heads five times is “due” a tail. Coins have no memory.',
  questions: [
    {
      id: 'u2-coin-streak',
      type: 'multiple_choice',
      prompt:
        'A fair coin has landed heads 5 times in a row. What is the chance the next toss is heads?',
      options: [
        '50%',
        'Lower, because tails is due after so many heads',
        'Higher, because heads is on a hot streak',
        'About 3%',
      ],
      correctIndex: 0,
      check: { kind: 'formula', formula: '1 / 2 * 100' },
      explanation:
        'Each toss is independent, so the coin has no memory: heads stays at 50%. The common mistake is the gambler’s fallacy, expecting a streak to be balanced out.',
    },
    {
      id: 'u2-rain-due',
      type: 'multiple_choice',
      prompt:
        'It hasn’t rained in Chennai for 5 days. A friend says rain is due today. What is wrong with that?',
      options: [
        'Dry days don’t build up a debt of rain; a dry spell often continues',
        'Nothing: after 5 dry days, rain is certain',
        'Rain can only be predicted by satellites',
        'Chennai never gets rain',
      ],
      correctIndex: 0,
      explanation:
        'Weather keeps no tally, so rain is never “due”. Today depends on today’s conditions, and a dry spell often means more dry days. The mistake is the gambler’s fallacy.',
    },
    {
      id: 'u2-both-late',
      type: 'numeric_estimate',
      prompt:
        'A rider is late on {late:%} of orders, and a restaurant is slow on {slow:%} of orders, independently. Estimate the chance an order has both.',
      givens: { late: 0.1, slow: 0.2 },
      derived: { both: 'late * slow', either_sum: 'late + slow' },
      formula: 'both * 100',
      answerLabel: 'Chance of both',
      answerSuffix: '%',
      correctValue: 2,
      tolerance: 0.5,
      explanation:
        'For independent events, multiply: {late:%} × {slow:%} = {both:%}. The common mistake is adding them ({either_sum:%}), which is a rough answer to a different question: the chance of either.',
    },
    {
      id: 'u2-mangoes',
      type: 'multiple_choice',
      prompt:
        'A box has {mangoes} mangoes and {ripe} are ripe. You pick two without looking, one after the other. What is the chance both are ripe?',
      givens: { mangoes: 5, ripe: 3 },
      derived: {
        ripe_left: 'ripe - 1',
        left: 'mangoes - 1',
        both: '(ripe / mangoes) * (ripe_left / left)',
      },
      options: ['30%', '36%', '60%', '9%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'both * 100' },
      explanation:
        'Once a ripe mango is gone, only {ripe_left} of {left} are ripe, so the picks are dependent: {ripe}/{mangoes} × {ripe_left}/{left} = {both:%}. The common mistake is working out 3/5 × 3/5, as if the first mango went back.',
    },
    {
      id: 'u2-dependent-pair',
      type: 'multiple_choice',
      prompt: 'Which pair of events is dependent?',
      options: [
        'A family cancels its plan, and the children’s profiles on it stop too',
        'Two strangers in different cities cancel in the same month',
        'Two separate coin tosses both land heads',
        'Rolling a 6 on two different dice',
      ],
      correctIndex: 0,
      explanation:
        'Profiles on a family plan end when the plan ends, so one event drives the other. The common mistake is treating linked subscribers as independent, which makes one decision look like several.',
    },
    {
      id: 'u2-court-umbrellas',
      type: 'courtroom',
      prompt: 'Which lurking variable explains the evidence?',
      evidence: 'In Bengaluru, days when more umbrellas are sold have longer traffic jams.',
      witnesses: [
        { name: 'Ravi, commuter', claim: 'Umbrella sellers block the roads and cause the jams.' },
        {
          name: 'Pooja, shopkeeper',
          claim: 'Stuck in traffic, people buy umbrellas to pass the time.',
        },
      ],
      suspects: [
        { text: 'Rain', note: 'Rain sends people to buy umbrellas and slows every road at once.' },
        { text: 'Weekends', note: 'Weekends change traffic, but not umbrella sales on their own.' },
        { text: 'Petrol prices', note: 'Prices change slowly and do not follow umbrella sales.' },
      ],
      confounderIndex: 0,
      explanation:
        'The two are linked, but neither causes the other: rain drives both. The common mistake is assuming that when two things move together, one must cause the other.',
    },
  ],
};

const conditionalProbability: Lesson = {
  id: 'conditional-probability',
  title: 'Conditional probability',
  estimatedMinutes: 5,
  intro:
    'A **conditional probability** is a chance *given* something you already know. P(A | B) means “the chance of A, among the cases where B happened”.\n\nOrder matters. The chance a strong candidate passes a resume screen is not the chance that someone who passed is strong. Mixing them up is the **confusion of the inverse**, one of the most common mistakes in data work.',
  questions: [
    {
      id: 'u2-screen-sensitivity',
      type: 'multiple_choice',
      prompt: 'What is P(passes the screen | strong)?',
      table: RESUME_SCREEN,
      givens: { strong_passed: 90, strong: 100 },
      derived: { chance: 'strong_passed / strong' },
      options: ['90%', '50%', '18%', '10%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'chance * 100' },
      explanation:
        'Among the {strong} strong candidates, {strong_passed} passed: {chance:%}. “Given strong” means you only look at that row. The common mistake is dividing by all 1,000 applicants.',
    },
    {
      id: 'u2-screen-ppv',
      type: 'multiple_choice',
      prompt: 'Now flip it. What is P(strong | passes the screen)?',
      table: RESUME_SCREEN,
      givens: { strong_passed: 90, passed: 180 },
      derived: { chance: 'strong_passed / passed' },
      options: ['50%', '90%', '10%', '18%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'chance * 100' },
      explanation:
        'Among the {passed} who passed, {strong_passed} are strong: {chance:%}. The common mistake is the confusion of the inverse: assuming it is 90% too, because the screen passes 90% of strong candidates.',
    },
    {
      id: 'u2-screen-pass-rate',
      type: 'numeric_estimate',
      prompt: 'Using the same table, what share of all applicants pass the screen?',
      givens: { passed: 180, applicants: 1000 },
      derived: { share: 'passed / applicants' },
      formula: 'share * 100',
      answerLabel: 'Share who pass',
      answerSuffix: '%',
      correctValue: 18,
      tolerance: 2,
      explanation:
        '{passed} of {applicants} applicants pass: {share:%}. Here nothing is given, so you divide by everyone. The common mistake is reading a number from the wrong row or column of the table.',
    },
    {
      id: 'u2-build-precision',
      type: 'build_metric',
      prompt: 'Build the number a hiring manager actually cares about.',
      goal: 'Of the resumes the screen passes, what share are strong candidates?',
      metricName: 'Precision of the screen',
      cards: [
        { label: 'Strong candidates who passed', value: 90 },
        { label: 'Everyone who passed', value: 180 },
        { label: 'All strong candidates', value: 100 },
        { label: 'All applicants', value: 1000 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 1,
      percent: true,
      explanation:
        'Precision is strong-and-passed ÷ everyone who passed: 90 ÷ 180 = 50%. The common mistake is dividing by all strong candidates, which gives the screen’s hit rate (90%), a different question.',
    },
    {
      id: 'u2-churn-given-student',
      type: 'multiple_choice',
      prompt:
        'Kathakar had {students} students at the start of April 2026, and {student_cancelled} of them cancelled. Which of these is P(cancelled | student)?',
      givens: { students: 1380, student_cancelled: 111, cancelled: 200 },
      derived: { rate: 'student_cancelled / students', flipped: 'student_cancelled / cancelled' },
      options: [
        'The share of students who cancelled',
        'The share of cancellations that were students',
        'The share of subscribers who are students',
        'The share of all subscribers who cancelled',
      ],
      correctIndex: 0,
      explanation:
        '“Given student” means only students count: {student_cancelled} of {students} is {rate:%}. The common mistake is flipping it into the share of cancellations that were students ({flipped:%}).',
    },
    {
      id: 'u2-bar-means-given',
      type: 'multiple_choice',
      prompt: 'In P(A | B), what does the bar mean?',
      options: [
        'Given: only look at the cases where B happened',
        'Divided by: A ÷ B',
        'Or: A or B happens',
        'Not: A without B',
      ],
      correctIndex: 0,
      explanation:
        'The bar reads “given”. You shrink the world to the cases where B happened, then ask how often A happens there. The common mistake is reading it as division.',
    },
  ],
};

const bayesIntuitively: Lesson = {
  id: 'bayes-intuitively',
  title: 'Bayes’ theorem, intuitively',
  estimatedMinutes: 5,
  intro:
    'Bayes’ theorem updates a chance when new evidence arrives. The easiest way to use it is a **tree of counts**: imagine 1,000 people, split them by what is true, then by what the evidence says.\n\nCount the branches that match the evidence and see what share are really true. That is P(true | evidence). The formula, P(A | B) = P(B | A) × P(A) ÷ P(B), is the same sum written short.',
  questions: [
    {
      id: 'u2-tree-leavers',
      type: 'multiple_choice',
      prompt:
        'Kathakar’s model predicts cancellations. Of {people} subscribers, {base:%} will cancel next month. How many is that?',
      ...CHURN_MODEL,
      options: ['50', '5', '500', '95'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'leavers' },
      explanation:
        '{base:%} of {people} is {leavers}: the first branch of the tree. The common mistake is skipping the counts and juggling percentages, where it is easy to lose track.',
    },
    {
      id: 'u2-tree-caught',
      type: 'multiple_choice',
      prompt:
        'The model flags {hit_rate:%} of the {leavers} who will cancel. How many of them get flagged?',
      ...CHURN_MODEL,
      options: ['40', '80', '10', '45'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'caught' },
      explanation:
        '{hit_rate:%} of {leavers} is {caught}. The common mistake is treating the 80% as the chance that a flagged subscriber leaves; it only describes those who really leave.',
    },
    {
      id: 'u2-tree-false-flags',
      type: 'multiple_choice',
      prompt:
        'It also wrongly flags {false_alarm:%} of the {stayers} who will stay. How many false alarms is that?',
      ...CHURN_MODEL,
      options: ['95', '10', '5', '950'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'false_flags' },
      explanation:
        '{false_alarm:%} of {stayers} is {false_flags}. Stayers are so many that a small false-alarm rate still makes a big branch. The common mistake is forgetting this branch altogether.',
    },
    {
      id: 'u2-tree-answer',
      type: 'numeric_estimate',
      prompt: 'So of everyone the model flags, what share will really cancel?',
      ...CHURN_MODEL,
      formula: 'answer * 100',
      answerLabel: 'Share of flagged who cancel',
      answerSuffix: '%',
      correctValue: 29.63,
      tolerance: 3,
      explanation:
        'Flagged = {caught} + {false_flags} = {flagged}, and only {caught} of them cancel: {answer:%}. The common mistake is answering 80%, confusing P(flagged | cancels) with P(cancels | flagged).',
    },
    {
      id: 'u2-bayes-formula',
      type: 'multiple_choice',
      prompt: 'Which is Bayes’ theorem for P(cancels | flagged)?',
      options: [
        'P(flagged | cancels) × P(cancels) ÷ P(flagged)',
        'P(flagged | cancels) × P(flagged) ÷ P(cancels)',
        'P(cancels) × P(flagged)',
        'P(flagged | cancels) ÷ P(cancels)',
      ],
      correctIndex: 0,
      explanation:
        'Start from the flip you know, P(flagged | cancels), weight it by how common cancelling is, then divide by how common flags are. The common mistake is swapping the two probabilities inside the formula.',
    },
    {
      id: 'u2-build-bayes',
      type: 'build_metric',
      prompt: 'Build P(cancels | flagged) from the tree.',
      ...CHURN_MODEL,
      goal: 'Of the subscribers the model flags, what share will really cancel?',
      metricName: 'P(cancels | flagged)',
      cards: [
        { label: 'Flagged and will cancel', value: 40 },
        { label: 'Everyone flagged', value: 135 },
        { label: 'Everyone who will cancel', value: 50 },
        { label: 'All subscribers', value: 1000 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 1,
      percent: true,
      explanation:
        'Flagged-and-cancels ÷ everyone flagged = {caught} ÷ {flagged}, about {answer:%}. The common mistake is dividing by everyone who will cancel, which gives the model’s hit rate instead.',
    },
    {
      id: 'u2-bayes-why-low',
      type: 'multiple_choice',
      prompt: 'The model catches 80% of leavers, yet most flagged subscribers stay. Why?',
      options: [
        'Stayers far outnumber leavers, so a few false alarms swamp the real ones',
        'The model is broken and should be thrown away',
        'Flagged subscribers change their minds',
        '80% is a low hit rate',
      ],
      correctIndex: 0,
      explanation:
        'With only 5% leaving, the 10% false-alarm rate applies to a much bigger group. The common mistake is base rate neglect: judging a model by its hit rate without asking how rare the event is.',
    },
  ],
};

const baseRates: Lesson = {
  id: 'base-rates',
  title: 'Base rates and false alarms',
  estimatedMinutes: 4,
  intro:
    'The **base rate** is how common something is before you see any evidence. When the thing you are looking for is rare, most alarms are false, even from a good test.\n\nThat is why a churn spike alert, a fraud flag or a positive result for a rare disease needs a second look before anyone panics. Ignoring how rare something is is called **base rate neglect**.',
  questions: [
    {
      id: 'u2-rare-disease',
      type: 'multiple_choice',
      prompt:
        'A disease affects 1 in 1,000 people. A test catches {hit_rate:%} of cases and wrongly flags {false_alarm:%} of healthy people. You test positive. What is the chance you have it?',
      givens: { people: 100000, base: 0.001, hit_rate: 0.99, false_alarm: 0.01 },
      derived: {
        sick_positive: 'people * base * hit_rate',
        healthy_positive: 'people * (1 - base) * false_alarm',
        answer: 'sick_positive / (sick_positive + healthy_positive)',
      },
      options: ['About 9%', '99%', 'About 50%', '1%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'answer * 100', tolerance: 0.5 },
      explanation:
        'Among 1,00,000 people, about {sick_positive} sick people test positive, and so do {healthy_positive} healthy people: only {answer:%} of positives are sick. The common mistake is base rate neglect: trusting the 99% without asking how rare the disease is.',
    },
    {
      id: 'u2-outage-alert',
      type: 'numeric_estimate',
      prompt:
        'Kathakar’s alert fires when daily cancellations jump. Real problems happen on {base:%} of days. It fires on {hit_rate:%} of problem days and {false_alarm:%} of normal days. When it fires, estimate the chance of a real problem.',
      givens: { days: 1000, base: 0.02, hit_rate: 0.9, false_alarm: 0.1 },
      derived: {
        real_alerts: 'days * base * hit_rate',
        false_alerts: 'days * (1 - base) * false_alarm',
        answer: 'real_alerts / (real_alerts + false_alerts)',
      },
      formula: 'answer * 100',
      answerLabel: 'Chance it is a real problem',
      answerSuffix: '%',
      correctValue: 15.52,
      tolerance: 4,
      explanation:
        'Over {days} days, it fires on {real_alerts} problem days and {false_alerts} normal days, so only {answer:%} of alerts are real. The common mistake is treating the alert as proof instead of as a reason to look.',
    },
    {
      id: 'u2-fix-alert',
      type: 'multiple_choice',
      prompt: 'Which change would make that alert most trustworthy?',
      options: [
        'Fewer false alarms on normal days',
        'Catching every problem day instead of 90% of them',
        'Sending the alert to more people',
        'Checking it only on weekends',
      ],
      correctIndex: 0,
      explanation:
        'Most alerts come from the many normal days, so cutting false alarms matters most; catching 100% of problem days instead of 90% barely helps. The common mistake is improving the part that is already good.',
    },
    {
      id: 'u2-lie-daily-cancellations',
      type: 'spot_the_lie',
      prompt: 'Priya sent this chart to the whole company. What is wrong with it?',
      claim: { by: 'Priya from Marketing', text: 'Cancellations exploded this week!' },
      chart: {
        kind: 'bar',
        title: 'Cancellations per day this week',
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [{ name: 'Cancellations', values: [6, 6, 5, 7, 6, 8, 9] }],
        axis: { min: 4, max: 10, label: 'Cancellations' },
      },
      trick: 'truncated_axis',
      options: [
        'The bars are the wrong colour for bad news',
        'The axis starts at 4, not 0, which makes small differences look huge',
        'A week should start on Sunday',
      ],
      correctIndex: 1,
      explanation:
        'Bars are compared by length, so the axis must start at zero. Five to nine cancellations a day is ordinary noise for 5,000 subscribers. The mistake is reading bar heights without checking where the axis starts.',
    },
    {
      id: 'u2-fraud-flags',
      type: 'multiple_choice',
      prompt:
        'A payment app flags {flag_rate:%} of payments as fraud. Only {fraud:%} of payments are fraud, and the flag catches all of them. Roughly what share of flags are real fraud?',
      givens: { flag_rate: 0.05, fraud: 0.005 },
      derived: { answer: 'fraud / flag_rate' },
      options: ['About 10%', 'About 100%', 'About 50%', 'About 0.5%'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'answer * 100', tolerance: 0.5 },
      explanation:
        'Real fraud is {fraud:%} of payments, but {flag_rate:%} are flagged, so only {answer:%} of flags are fraud. The common mistake is assuming a flag means fraud when flags are ten times more common than fraud.',
    },
    {
      id: 'u2-base-rate-first',
      type: 'multiple_choice',
      prompt: 'Before trusting any alarm, what should you ask first?',
      options: [
        'How rare is the thing it looks for?',
        'How loud is the alarm?',
        'Who built the alarm?',
        'How many people saw the alarm?',
      ],
      correctIndex: 0,
      explanation:
        'The rarer the event, the more alarms are false, however good the test. The common mistake is base rate neglect: judging an alarm only by how often it catches real cases.',
    },
  ],
};

const expectedValue: Lesson = {
  id: 'expected-value',
  title: 'Expected value',
  estimatedMinutes: 5,
  intro:
    'The **expected value** of a choice is its average result if you could repeat it many times: each outcome times its chance, added up.\n\nIt turns “should we run this campaign?” into a sum: the expected gain minus the cost. The common mistake is counting only the good outcome, such as the customers a discount keeps, and forgetting everyone else who gets the discount too.',
  questions: [
    {
      id: 'u2-ev-game',
      type: 'multiple_choice',
      prompt:
        'A fair game pays ₹{prize} with a {chance:%} chance, and nothing otherwise. What is the expected payout of one play?',
      givens: { prize: 100, chance: 0.3 },
      derived: { payout: 'prize * chance' },
      options: ['₹30', '₹100', '₹70', '₹3'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'payout' },
      explanation:
        'Expected payout = ₹{prize} × {chance:%} = ₹{payout}. The common mistake is quoting the prize, which you win only 3 times in 10.',
    },
    {
      id: 'u2-ev-lottery',
      type: 'numeric_estimate',
      prompt:
        'A ₹{cost} lottery ticket has a 1 in {odds} chance of winning ₹{prize}. On average, how much do you lose per ticket?',
      givens: { cost: 10, odds: 1000, prize: 5000 },
      derived: { back: 'prize / odds', loss: 'cost - back' },
      formula: 'loss',
      answerLabel: 'Average loss per ticket',
      answerPrefix: '₹',
      correctValue: 5,
      tolerance: 1,
      explanation:
        'You expect ₹{prize} ÷ {odds} = ₹{back} back for every ₹{cost} spent, a loss of ₹{loss} per ticket. The common mistake is focusing on the prize and forgetting the price you pay every time.',
    },
    {
      id: 'u2-campaign-saved',
      type: 'multiple_choice',
      prompt:
        'Kathakar could give a ₹{discount} discount to {offered} subscribers at risk. Without it, {without:%} would cancel; with it, {with_offer:%} would. How many subscribers does it save?',
      ...CAMPAIGN,
      options: ['80', '120', '200', '1,000'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'saved' },
      explanation:
        '{leave_without} would leave without the offer and {leave_with} with it, so it saves {saved}. The common mistake is counting everyone offered, or everyone who stays, as “saved”.',
    },
    {
      id: 'u2-campaign-net',
      type: 'multiple_choice',
      prompt:
        'Each saved subscriber is worth ₹{value} in future fees. The ₹{discount} discount goes to all {offered} people offered it. What is the campaign’s expected result?',
      ...CAMPAIGN,
      options: [
        'It loses about ₹2,000',
        'It gains about ₹48,000',
        'It gains about ₹28,000',
        'It breaks even',
      ],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'cost - gain' },
      explanation:
        'It keeps ₹{gain} of fees ({saved} × ₹{value}) but gives away ₹{cost} in discounts. The common mistake is counting the gain and forgetting that most discounts go to people who would have stayed anyway.',
    },
    {
      id: 'u2-cost-per-save',
      type: 'build_metric',
      prompt: 'Build a number to compare retention offers.',
      ...CAMPAIGN,
      goal: 'How much does the campaign spend for each subscriber it actually saves?',
      metricName: 'Cost per saved subscriber',
      cards: [
        { label: 'Total discount cost (₹)', value: 50000 },
        { label: 'Subscribers saved', value: 80 },
        { label: 'Subscribers offered the discount', value: 1000 },
        { label: 'Subscribers who cancelled anyway', value: 120 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 1,
      prefix: '₹',
      explanation:
        'Cost per save = ₹{cost} ÷ {saved} = ₹625, more than the ₹{value} each save is worth. The common mistake is dividing by everyone offered (₹{discount} each), which hides what the saves really cost.',
    },
    {
      id: 'u2-target-offer',
      type: 'multiple_choice',
      prompt: 'How could Kathakar make a discount pay for itself?',
      options: [
        'Offer it only to the groups most likely to cancel',
        'Offer it to every subscriber',
        'Double the discount for everyone',
        'Stop measuring churn',
      ],
      correctIndex: 0,
      explanation:
        'Targeting raises the share of people who were really about to leave, so each rupee saves more subscribers. The common mistake is a blanket offer that mostly rewards people who would have stayed.',
    },
  ],
};

const is200Unusual: Lesson = {
  id: 'is-200-unusual',
  title: 'Is 200 lost subscribers unusual?',
  estimatedMinutes: 5,
  intro:
    'To judge a number, compare it with what normally happens. Work out the **mean** and **standard deviation** of past months: a month more than 2 standard deviations away is unusual.\n\nBut compare like with like. Use **rates**, not counts, when the business keeps growing, and compare a month with the same month in earlier years when there is a **seasonal pattern**. Otherwise you raise false alarms.',
  questions: [
    {
      id: 'u2-predict-mean-churn',
      type: 'predict_reveal',
      prompt: 'Here are 24 months of Kathakar’s churn rate. Predict the mean.',
      dataset: MONTHLY_CHURN,
      statistic: 'mean',
      slider: { min: 2, max: 4.5, step: 0.05 },
      trueValue: 2.7,
      tolerance: 0.15,
      reveal: {
        visual: 'marker',
        description: 'A marker slides to the mean churn rate, next to your prediction.',
      },
      explanation:
        'The mean is {mean:2}%. Most months sit close to it, and two high months on the right pull it up a little. The common mistake is guessing from the months you remember best, not the whole run.',
    },
    {
      id: 'u2-estimate-sd-churn',
      type: 'numeric_estimate',
      prompt: 'Estimate the standard deviation of these rates, in percentage points.',
      dataset: MONTHLY_CHURN,
      statistic: 'std_dev',
      correctValue: 0.38,
      tolerance: 0.1,
      explanation:
        'The standard deviation is about {std_dev:2} points, so a typical month sits within about 0.4 points of the mean. The common mistake is reading the range ({range:1} points) as the typical spread.',
    },
    {
      id: 'u2-z-score-april',
      type: 'multiple_choice',
      prompt:
        'April 2026’s churn rate was {april:1}%. About how many standard deviations above the mean is that?',
      dataset: MONTHLY_CHURN,
      givens: { april: 4 },
      derived: { gap: 'april - mean', z: 'gap / std_dev' },
      options: ['About 3.4', 'About 1.3', 'About 0.4', 'About 10'],
      correctIndex: 0,
      check: { kind: 'formula', formula: 'z', tolerance: 0.05 },
      explanation:
        '({april}% − {mean:2}%) ÷ {std_dev:2} ≈ {z:1} standard deviations: unusual against all months. The common mistake is stopping here and panicking, before asking whether April is always like this.',
    },
    {
      id: 'u2-tap-unusual-months',
      type: 'tap_outlier',
      prompt:
        'Use the 1.5 × IQR rule: Q1 is {q1}% and Q3 is {q3}%. Tap every month that counts as an outlier.',
      dataset: MONTHLY_CHURN,
      outlierIndices: [11, 23],
      explanation:
        'The fences are {lower_fence:2}% and {upper_fence:2}%, so only 3.7% and 4.0% are outliers, and both are Aprils. That pattern is the real clue. The common mistake is treating each outlier as a separate surprise.',
    },
    {
      id: 'u2-lie-cherry-april',
      type: 'spot_the_lie',
      prompt: 'Priya posted this chart in the team chat. What is misleading about it?',
      claim: { by: 'Priya from Marketing', text: 'Churn just jumped to 4%. Something has broken!' },
      chart: {
        kind: 'line',
        title: 'Monthly churn rate',
        labels: [
          'Jan 25',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
          'Jan 26',
          'Feb',
          'Mar',
          'Apr',
        ],
        series: [
          {
            name: 'Churn rate',
            values: [2.4, 2.7, 2.9, 3.7, 2.6, 2.4, 2.5, 2.7, 2.5, 2.6, 2.9, 2.8, 2.4, 2.6, 2.3, 4],
          },
        ],
        axis: { min: 2, max: 4.5, label: 'Churn rate', suffix: '%' },
        window: { from: 12, to: 15 },
      },
      trick: 'cherry_picked_range',
      options: [
        'It should use bars, not a line',
        'It starts in January, hiding that last April jumped the same way',
        'The axis should start at zero',
      ],
      correctIndex: 1,
      explanation:
        'The full chart shows April 2025 jumping to 3.7% too, then falling back. Four months is too short to judge a seasonal business. The common mistake is cherry-picking a window that makes a normal pattern look new.',
    },
    {
      id: 'u2-aprils-table',
      type: 'multiple_choice',
      prompt: 'Compare like with like. Is April 2026 unusual for an April?',
      table: {
        caption: 'Kathakar’s churn rate in April',
        columns: ['April', 'churn rate'],
        rows: [
          ['2024', '3.9%'],
          ['2025', '3.7%'],
          ['2026', '4.0%'],
        ],
      },
      options: [
        'No: April is always about 4%, well above other months',
        'Yes: 4.0% is the highest rate ever',
        'Yes: 200 is the most cancellations ever',
        'There is no way to tell',
      ],
      correctIndex: 0,
      explanation:
        'Against other Aprils, 4.0% is ordinary: the jump is seasonal. The common mistake is comparing a month with all months when the business has a yearly rhythm, or comparing counts when the business has grown.',
    },
    {
      id: 'u2-fair-comparison',
      type: 'multiple_choice',
      prompt: 'What is the fairest way to judge whether a month’s churn is unusual?',
      options: [
        'Compare its churn rate with the same month in earlier years',
        'Compare its number of cancellations with last month’s',
        'Compare it with the best month ever',
        'Ask the team whether the month felt busy',
      ],
      correctIndex: 0,
      explanation:
        'Rates remove the effect of growth, and same-month comparisons remove the season. The common mistake is comparing raw counts with last month, which mixes growth, season and noise.',
    },
  ],
};

const checkpoint: Checkpoint = {
  id: 'unit-2-checkpoint',
  title: 'Unit 2 checkpoint',
  passMark: 0.8,
  retakeDelayMinutes: 60,
  items: [
    {
      lessonId: 'what-is-probability',
      question: {
        id: 'u2-cp-shop-buyers',
        type: 'multiple_choice',
        prompt:
          'A shop in Pune had {visitors} visitors yesterday, and {buyers} bought something. What is a fair estimate of the chance that a visitor buys?',
        givens: { visitors: 400, buyers: 60 },
        derived: { chance: 'buyers / visitors' },
        options: ['15%', '60%', '6%', '40%'],
        correctIndex: 0,
        check: { kind: 'formula', formula: 'chance * 100' },
        explanation:
          '{buyers} of {visitors} is {chance:%}. The common mistake is quoting the count of buyers, which means little until you know out of how many visitors.',
      },
    },
    {
      lessonId: 'what-is-probability',
      question: {
        id: 'u2-cp-triage-complaints',
        type: 'inbox_triage',
        prompt: 'Which question can the complaints data answer?',
        message: {
          from: 'Meera',
          role: 'Head of operations',
          channel: 'chat',
          text: 'Complaints **doubled** this week! Are our riders getting worse?',
        },
        data: {
          caption: 'Weekly complaints data',
          columns: ['week', 'city', 'orders', 'complaints'],
        },
        candidates: [
          {
            question: 'Are our riders getting worse?',
            flaw: 'too_vague',
            note: '“Worse” needs a measure and a baseline before data can answer it.',
          },
          {
            question: 'Which riders were rude to customers?',
            flaw: 'data_not_available',
            note: 'There is no rider or complaint text in this data.',
          },
          {
            question: 'Did complaints per 100 orders rise this week in each city?',
            note: 'Orders and complaints by week and city give exactly this rate.',
          },
        ],
        answerableIndex: 2,
        explanation:
          'Complaints may double simply because orders doubled, so a rate per 100 orders is the fair measure. The common mistake is chasing a count without checking what it is out of.',
      },
    },
    {
      lessonId: 'independent-events',
      question: {
        id: 'u2-cp-two-sixes',
        type: 'multiple_choice',
        prompt: 'You roll two dice. What is the chance that both show a 6?',
        givens: { one_six: 1 / 6 },
        derived: { both: 'one_six * one_six' },
        options: ['About 3%', 'About 33%', 'About 17%', '50%'],
        correctIndex: 0,
        check: { kind: 'formula', formula: 'both * 100', tolerance: 0.3 },
        explanation:
          'The dice are independent, so multiply: 1/6 × 1/6 = 1/36, about {both:%}. The common mistake is adding the chances (33%), which answers a different question.',
      },
    },
    {
      lessonId: 'independent-events',
      question: {
        id: 'u2-cp-app-loads',
        type: 'numeric_estimate',
        prompt:
          'An app loads properly {loads:%} of the time, and each try is independent. Estimate the chance it loads properly twice in a row.',
        givens: { loads: 0.9 },
        derived: { both: 'loads * loads' },
        formula: 'both * 100',
        answerLabel: 'Chance of two good loads',
        answerSuffix: '%',
        correctValue: 81,
        tolerance: 3,
        explanation:
          'Independent events multiply: {loads:%} × {loads:%} = {both:%}. The common mistake is answering 90%, as if the second load were guaranteed once the first worked.',
      },
    },
    {
      lessonId: 'conditional-probability',
      question: {
        id: 'u2-cp-cancelled-given-student',
        type: 'multiple_choice',
        prompt:
          'In April 2026, {student_cancelled} of Kathakar’s {students} students cancelled, out of {cancelled} cancellations in all. What is P(cancelled | student)?',
        givens: { students: 1380, student_cancelled: 111, cancelled: 200 },
        derived: { rate: 'student_cancelled / students', flipped: 'student_cancelled / cancelled' },
        options: ['About 8%', 'About 56%', 'About 28%', 'About 4%'],
        correctIndex: 0,
        check: { kind: 'formula', formula: 'rate * 100', tolerance: 0.1 },
        explanation:
          'Given student, only the {students} students count: {student_cancelled} of them is {rate:%}. The common mistake is the flip, the share of cancellations that were students ({flipped:%}).',
      },
    },
    {
      lessonId: 'bayes-intuitively',
      question: {
        id: 'u2-cp-fraud-bayes',
        type: 'numeric_estimate',
        prompt:
          '{fraud:%} of payments are fraud. A detector flags {hit_rate:%} of fraud and {false_alarm:%} of honest payments. A payment is flagged: estimate the chance it is fraud.',
        givens: { payments: 10000, fraud: 0.01, hit_rate: 0.9, false_alarm: 0.05 },
        derived: {
          caught: 'payments * fraud * hit_rate',
          false_flags: 'payments * (1 - fraud) * false_alarm',
          answer: 'caught / (caught + false_flags)',
        },
        formula: 'answer * 100',
        answerLabel: 'Chance it is fraud',
        answerSuffix: '%',
        correctValue: 15.38,
        tolerance: 4,
        explanation:
          'Per {payments} payments: {caught} fraud flags and {false_flags} false flags, so only {answer:%} of flags are fraud. The common mistake is answering 90%, the detector’s hit rate.',
      },
    },
    {
      lessonId: 'base-rates',
      question: {
        id: 'u2-cp-why-false',
        type: 'multiple_choice',
        prompt: 'Why are most alarms for rare events false, even from good tests?',
        options: [
          'The many normal cases make more false alarms than the few real cases make true ones',
          'Good tests are always wrong half the time',
          'Rare events cannot be measured',
          'People set alarms off on purpose',
        ],
        correctIndex: 0,
        explanation:
          'A small false-alarm rate applied to a huge number of normal cases outweighs a high hit rate on a few real ones. The common mistake is base rate neglect.',
      },
    },
    {
      lessonId: 'expected-value',
      question: {
        id: 'u2-cp-scratch-card',
        type: 'multiple_choice',
        prompt:
          'A ₹{price} scratch card pays ₹{prize} with a {chance:%} chance. What happens on average for each card you buy?',
        givens: { price: 20, prize: 100, chance: 0.15 },
        derived: { payout: 'prize * chance', loss: 'price - payout' },
        options: ['You lose about ₹5', 'You gain ₹80', 'You gain about ₹15', 'You break even'],
        correctIndex: 0,
        check: { kind: 'formula', formula: 'loss' },
        explanation:
          'Expected payout is ₹{prize} × {chance:%} = ₹{payout}, but each card costs ₹{price}: a loss of ₹{loss}. The common mistake is comparing the prize with the price and ignoring how rarely you win.',
      },
    },
    {
      lessonId: 'is-200-unusual',
      question: {
        id: 'u2-cp-seasonal-sales',
        type: 'multiple_choice',
        prompt:
          'Ice cream sales in Delhi rose 40% from April to May this year. Which comparison best tells you if that is unusual?',
        options: [
          'Last year’s rise from April to May',
          'The rise from March to April',
          'The average month of the year',
          'December’s sales',
        ],
        correctIndex: 0,
        explanation:
          'Summer sales jump every year, so compare with the same change in earlier years. The common mistake is comparing a seasonal month with ordinary months and raising a false alarm.',
      },
    },
    {
      lessonId: 'is-200-unusual',
      question: {
        id: 'u2-cp-lie-april-bars',
        type: 'spot_the_lie',
        prompt: 'Kabir put this chart in his slides. What is wrong with it?',
        claim: { by: 'Kabir from Product', text: 'April’s cancellations went through the roof!' },
        chart: {
          kind: 'bar',
          title: 'Cancellations per month',
          labels: ['March', 'April'],
          series: [{ name: 'Cancellations', values: [116, 200] }],
          axis: { min: 100, max: 210, label: 'Cancellations' },
        },
        trick: 'truncated_axis',
        options: [
          'Two months are too few for any chart',
          'The bars should be the same colour as the logo',
          'The axis starts at 100, which makes April’s rise look far bigger than it is',
        ],
        correctIndex: 2,
        explanation:
          'From 116 to 200 is a rise of about 70%, but with the axis starting at 100, April’s bar is six times taller. The common mistake is trusting bar heights without checking the axis.',
      },
    },
  ],
};

export const unit2: Unit = {
  id: 'unit-2-churn-culprit',
  title: 'The Churn Culprit',
  description: 'Probability and Bayes’ theorem: tell a real problem from a false alarm.',
  hook: {
    from: 'Ritika',
    role: 'Founder, Kathakar',
    channel: 'chat',
    text: 'Hi! We lost **200 subscribers** last month. That’s our worst month ever. Is this normal, or should I panic? I have investors on a call on Monday.',
  },
  lessons: [
    whatIsProbability,
    independentEvents,
    conditionalProbability,
    bayesIntuitively,
    baseRates,
    expectedValue,
    is200Unusual,
  ],
  checkpoint,
  missionId: 'the-false-alarm',
};
