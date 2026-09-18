import type {
  BuildMetricQuestion,
  CourtroomQuestion,
  InboxTriageQuestion,
  Question,
  SpotTheLieQuestion,
} from '../content/types';

/*
 * Placeholder questions for the challenge types, shown on the development-only
 * /dev/question-preview route. They are validated like real content, so they double as examples
 * for authors.
 */

const inboxTriage: InboxTriageQuestion[] = [
  {
    id: 'preview-triage-slow-deliveries',
    type: 'inbox_triage',
    prompt: 'Which question can you actually answer with the orders table?',
    message: {
      from: 'Meera',
      role: 'Operations manager',
      channel: 'chat',
      text: 'Deliveries feel slower lately and customers are grumbling. Can you look into it?',
    },
    data: {
      caption: 'Orders table',
      columns: ['order_id', 'city', 'order_time', 'delivered_time', 'rider_id'],
    },
    candidates: [
      {
        question: 'Why are customers unhappy with us?',
        flaw: 'data_not_available',
        note: 'The table has no ratings or complaints, so it cannot say why anyone is unhappy.',
      },
      {
        question: 'Has the median delivery time in each city risen over the last eight weeks?',
        note: 'Order and delivery times give the delivery time, and city and date split it up.',
      },
      {
        question: 'Are our deliveries bad?',
        flaw: 'too_vague',
        note: '“Bad” means nothing until you say how you would measure it, and against what.',
      },
    ],
    answerableIndex: 1,
    explanation:
      'Turn a feeling into something you can measure with the columns you have. The common mistake is chasing “why” before checking “what changed”.',
  },
  {
    id: 'preview-triage-festival-campaign',
    type: 'inbox_triage',
    prompt: 'Which question can the sales export answer?',
    message: {
      from: 'Arjun Mehta',
      role: 'Marketing lead, Chai Adda',
      channel: 'email',
      subject: 'Diwali campaign',
      text: 'Did our Diwali campaign work? The board meets on Monday and I need something solid.',
    },
    data: {
      caption: 'Sales export',
      columns: ['date', 'store', 'bills', 'revenue_inr'],
    },
    candidates: [
      {
        question: 'How many new customers did the campaign bring in?',
        flaw: 'data_not_available',
        note: 'There is no customer id, so new and returning customers look the same.',
      },
      {
        question: 'Which store had the most bills during the campaign?',
        flaw: 'wrong_metric',
        note: 'The busiest store is usually busy anyway. It says nothing about the campaign.',
      },
      {
        question:
          'Was daily revenue in the campaign fortnight higher than in the same fortnight last year?',
        note: 'Dates and revenue answer it, and last year’s festival season is a fair baseline.',
      },
    ],
    answerableIndex: 2,
    explanation:
      'Compare the campaign with a fair baseline, such as last year’s festival season. The common mistake is reporting a big number with nothing to compare it to.',
  },
  {
    id: 'preview-triage-onboarding',
    type: 'inbox_triage',
    prompt: 'Which question fits the data in the sign-up funnel?',
    message: {
      from: 'Farhan',
      role: 'Product manager',
      channel: 'chat',
      text: 'Is the new onboarding **better**? Engineering wants to delete the old one.',
    },
    data: {
      caption: 'Sign-up funnel',
      columns: ['user_id', 'signup_date', 'onboarding_version', 'finished_onboarding'],
    },
    candidates: [
      {
        question: 'What share of users finished onboarding with each version?',
        note: 'Version and a finished flag give a completion rate per version.',
      },
      {
        question: 'Is the new onboarding better?',
        flaw: 'too_vague',
        note: 'Better at what? Pick one measurable outcome first.',
      },
      {
        question: 'How long did users spend on each onboarding screen?',
        flaw: 'data_not_available',
        note: 'Nothing here records screens or timings.',
      },
    ],
    answerableIndex: 0,
    explanation:
      'A completion rate per version answers “better” in a way the data supports. The common mistake is accepting the vague question as it was asked.',
  },
];

const spotTheLie: SpotTheLieQuestion[] = [
  {
    id: 'preview-lie-truncated-signups',
    type: 'spot_the_lie',
    prompt: 'What is wrong with this chart?',
    claim: { by: 'Priya from Marketing', text: 'Our new ad tripled sign-ups!' },
    chart: {
      kind: 'bar',
      title: 'Weekly sign-ups',
      labels: ['Before ad', 'After ad'],
      series: [{ name: 'Sign-ups', values: [980, 1040] }],
      axis: { min: 950, max: 1050, label: 'Sign-ups' },
    },
    trick: 'truncated_axis',
    options: [
      'The bars start at 950, not zero, so a 6% rise looks like tripling',
      'It shows only two weeks',
      'Sign-ups should be shown as a line',
    ],
    correctIndex: 0,
    explanation:
      'Bar length should match the value. Starting the axis at 950 turns a rise from 980 to 1,040 into a bar three times taller. The mistake is judging bars without checking where the axis starts.',
  },
  {
    id: 'preview-lie-cherry-picked-sales',
    type: 'spot_the_lie',
    prompt: 'Why should the sales team be careful with this chart?',
    claim: { by: 'Rahul from Sales', text: 'Sales are shooting up. Best trend all year!' },
    chart: {
      kind: 'line',
      title: 'Monthly sales',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [
        {
          name: 'Sales',
          values: [120, 118, 115, 112, 110, 104, 98, 95, 92, 90, 96, 101],
        },
      ],
      axis: { min: 80, max: 130, label: 'Sales (lakh ₹)' },
      window: { from: 9, to: 11 },
    },
    trick: 'cherry_picked_range',
    options: [
      'A line chart must start at zero',
      'It shows only October to December, hiding a fall across the year',
      'Three points are too few to draw a line',
    ],
    correctIndex: 1,
    explanation:
      'The full year falls from 120 to 101; only the last three months rise. Cherry-picking a short stretch can flip the story. Always ask what came before the chart starts.',
  },
  {
    id: 'preview-lie-dual-axis-training',
    type: 'spot_the_lie',
    prompt: 'What makes this chart misleading?',
    claim: {
      by: 'Sneha from HR',
      text: 'Training hours and sales move together perfectly, so training drives sales.',
    },
    chart: {
      kind: 'line',
      title: 'Training hours and sales',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [
        { name: 'Training hours', values: [40, 42, 45, 47, 50, 52] },
        { name: 'Sales (lakh ₹)', values: [200, 204, 210, 213, 219, 222], axis: 'right' },
      ],
      axis: { min: 38, max: 54, label: 'Hours' },
      rightAxis: { min: 195, max: 225, label: 'Lakh ₹' },
    },
    trick: 'dual_axis',
    options: [
      'The months should run right to left',
      'Sales should be in crores',
      'Two axes were scaled so the lines overlap, making them look linked',
    ],
    correctIndex: 2,
    explanation:
      'With two axes, the scales can be chosen to make any two rising lines overlap. Training rose 30% while sales rose 11%. Both rising over time is not proof that one causes the other.',
  },
];

const courtroom: CourtroomQuestion[] = [
  {
    id: 'preview-court-ice-cream',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence: 'Over 60 summer days in Chennai, days with more ice cream sales had more drownings.',
    witnesses: [
      { name: 'Kiran, café owner', claim: 'Ice cream gives swimmers cramps, so they drown.' },
      { name: 'Deepa, lifeguard', claim: 'Drownings upset people, so they eat more ice cream.' },
    ],
    suspects: [
      { text: 'Hot weather', note: 'Heat sends people to the beach and to ice cream stalls.' },
      { text: 'Ice cream prices', note: 'Prices move sales, but cannot send anyone into the sea.' },
      { text: 'The day of the week', note: 'Weekends matter a little; heat explains far more.' },
    ],
    confounderIndex: 0,
    explanation:
      'Hot days raise both ice cream sales and beach trips, so neither causes the other. The mistake is treating a correlation as a cause without asking what drives both.',
  },
  {
    id: 'preview-court-hospitals',
    type: 'courtroom',
    prompt: 'Cross-examine the witnesses. What are they both missing?',
    evidence: 'Indian cities with more hospitals record more deaths each year.',
    witnesses: [
      { name: 'Ramesh', claim: 'Hospitals are dangerous places to be.' },
      { name: 'Anita', claim: 'Cities build hospitals because many people die there.' },
    ],
    suspects: [
      {
        text: 'Air pollution',
        note: 'Pollution matters, but it does not decide how many hospitals a city builds.',
      },
      {
        text: 'Population size',
        note: 'Bigger cities have more people, so more hospitals and more deaths.',
      },
    ],
    confounderIndex: 1,
    explanation:
      'Bigger cities have more of everything: people, hospitals and deaths. Compare rates per 1,000 people instead of totals. The mistake is comparing raw counts across groups of different sizes.',
  },
  {
    id: 'preview-court-dark-mode',
    type: 'courtroom',
    prompt: 'Look at the exhibit. Which variable is hiding behind the link?',
    evidence: 'Users who turn on dark mode spend twice as long in the app.',
    witnesses: [
      { name: 'Isha, designer', claim: 'Dark mode is so comfortable that people stay longer.' },
      { name: 'Vikram, engineer', claim: 'People who stay longer end up switching dark mode on.' },
    ],
    table: {
      caption: 'Sessions by time of day',
      columns: ['time of use', 'dark mode users', 'avg session (min)'],
      rows: [
        ['Daytime', '12%', 14],
        ['Late night', '61%', 31],
      ],
    },
    suspects: [
      { text: 'Phone brand', note: 'Brands differ a little, but the table shows no link.' },
      {
        text: 'Late-night use',
        note: 'Night users turn dark mode on and also have long sessions.',
      },
      {
        text: 'The user’s city',
        note: 'City does not explain why dark mode and long sessions go together.',
      },
    ],
    confounderIndex: 1,
    explanation:
      'People using the app late at night both prefer dark mode and stay longer, so dark mode is not causing it. The mistake is picking one witness’s story before checking for a third variable.',
  },
];

const buildMetric: BuildMetricQuestion[] = [
  {
    id: 'preview-metric-conversion',
    type: 'build_metric',
    prompt: 'Build the metric that answers the question.',
    goal: 'What share of people who visit our site buy something?',
    metricName: 'Conversion rate',
    cards: [
      { label: 'Orders', value: 1240 },
      { label: 'Page views', value: 96000 },
      { label: 'Visitors', value: 31000 },
      { label: 'Items added to cart', value: 3900 },
    ],
    numeratorIndex: 0,
    denominatorIndex: 2,
    percent: true,
    explanation:
      'Conversion rate is orders ÷ visitors. Dividing by page views is the common mistake: one visitor can view many pages, which makes the rate look far smaller than it is.',
  },
  {
    id: 'preview-metric-order-value',
    type: 'build_metric',
    prompt: 'Put the right cards on top and bottom.',
    goal: 'On average, how much money does each order bring in?',
    metricName: 'Average order value',
    cards: [
      { label: 'Visitors', value: 31000 },
      { label: 'Revenue (₹)', value: 1860000 },
      { label: 'Refunds', value: 42 },
      { label: 'Orders', value: 1240 },
    ],
    numeratorIndex: 1,
    denominatorIndex: 3,
    prefix: '₹',
    explanation:
      'Average order value is revenue ÷ orders. Dividing revenue by visitors is the common mistake: that gives revenue per visitor, a different question.',
  },
  {
    id: 'preview-metric-churn',
    type: 'build_metric',
    prompt: 'Build the churn rate.',
    goal: 'What share of the subscribers we had at the start of last month cancelled?',
    metricName: 'Monthly churn rate',
    cards: [
      { label: 'Subscribers at the start of the month', value: 4000 },
      { label: 'Cancellations in the month', value: 180 },
      { label: 'New sign-ups in the month', value: 350 },
    ],
    numeratorIndex: 1,
    denominatorIndex: 0,
    percent: true,
    explanation:
      'Churn rate is cancellations ÷ subscribers at the start. The common mistake is comparing cancellations with new sign-ups, which mixes two different groups of people.',
  },
];

export const PREVIEW_QUESTIONS: readonly Question[] = [
  ...inboxTriage,
  ...spotTheLie,
  ...courtroom,
  ...buildMetric,
];
