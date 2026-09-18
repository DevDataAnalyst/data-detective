import type { CourtroomQuestion, SpotTheLieQuestion } from './types';

/** A daily challenge: one lying chart or one courtroom case, the same for everyone that day. */
export type DailyQuestion = SpotTheLieQuestion | CourtroomQuestion;

/**
 * The daily challenges, in the order the days play them: challenge #1 is the first, #2 the next,
 * and after the last the list starts again. Add new ones at the end, so earlier days keep theirs.
 * They stand alone, apart from the course: a teaser for someone who has never opened a lesson.
 */
export const dailyQuestions: readonly DailyQuestion[] = [
  {
    id: 'daily-lie-chai',
    type: 'spot_the_lie',
    prompt: 'Manoj pinned this chart by the till. What is wrong with it?',
    claim: { by: 'Manoj, café owner', text: 'Masala chai is miles ahead of everything else!' },
    chart: {
      kind: 'bar',
      title: 'Cups sold last week',
      labels: ['Masala', 'Ginger', 'Elaichi', 'Plain'],
      series: [{ name: 'Cups', values: [212, 198, 195, 190] }],
      axis: { min: 185, max: 215, label: 'Cups' },
    },
    trick: 'truncated_axis',
    options: [
      'The axis starts at 185, not 0, so a small lead looks huge',
      'The bars should be sorted from smallest to largest',
      'It should count cups per day, not per week',
    ],
    correctIndex: 0,
    explanation:
      'Masala chai sold 212 cups and plain chai 190: about 12% more, yet its bar is five times taller. The common mistake is comparing bar heights without checking where the axis starts.',
  },
  {
    id: 'daily-court-shoe-size',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence:
      'In a survey of Pune schoolchildren, kids with bigger shoe sizes scored higher on reading tests.',
    witnesses: [
      { name: 'Anil, shoe seller', claim: 'Bigger shoes give children the confidence to read.' },
      { name: 'Farah, librarian', claim: 'Reading lots of books makes children’s feet grow.' },
    ],
    suspects: [
      {
        text: 'The brand of their shoes',
        note: 'Brands differ in style, not in foot size or in how well children read.',
      },
      {
        text: 'Their age',
        note: 'Older children have bigger feet and more years of practice at reading.',
      },
      {
        text: 'How far they live from school',
        note: 'The walk to school does not change foot size or reading scores.',
      },
    ],
    confounderIndex: 1,
    explanation:
      'Age drives both: a ten-year-old has bigger feet and reads better than a six-year-old. Compare children of the same age and the link disappears. The common mistake is forgetting that a third variable can move two things together.',
  },
  {
    id: 'daily-lie-app-users',
    type: 'spot_the_lie',
    prompt: 'Kabir shared this in the team chat. What is misleading about it?',
    claim: { by: 'Kabir from Growth', text: 'Daily users are up 13% in two days. We’re back!' },
    chart: {
      kind: 'line',
      title: 'Daily active users',
      labels: ['1 Sep', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
      series: [
        {
          name: 'Users',
          values: [100, 97, 95, 92, 90, 86, 84, 80, 78, 75, 72, 70, 74, 79],
        },
      ],
      axis: { min: 60, max: 105, label: 'Thousands' },
      window: { from: 11, to: 13 },
    },
    trick: 'cherry_picked_range',
    options: [
      'Line charts must start at zero',
      'It shows only the last three days, hiding a two-week slide',
      'The dates should run from right to left',
    ],
    correctIndex: 1,
    explanation:
      'Over the fortnight, daily users fell from 100,000 to 70,000. The last two days are a small bounce that leaves them 21% below where the month began. The common mistake is judging a trend from a window someone else chose.',
  },
  {
    id: 'daily-court-coaching',
    type: 'courtroom',
    prompt: 'Look at the exhibit. What explains the link?',
    evidence: 'Cities with more coaching centres have more students clearing JEE Main.',
    witnesses: [
      { name: 'Mr Sinha, coaching centre owner', claim: 'Our coaching gets students through.' },
      {
        name: 'Kavya, student',
        claim: 'Students who clear bring in business, so centres open near them.',
      },
    ],
    table: {
      caption: 'JEE Main in three cities, one year',
      columns: ['city', 'sat', 'centres', 'cleared'],
      rows: [
        ['City A', '40,000', '400', '10,000'],
        ['City B', '8,000', '80', '2,000'],
        ['City C', '2,000', '20', '500'],
      ],
    },
    suspects: [
      {
        text: 'How hard the exam was that year',
        note: 'Every city sat the same exam, so it cannot explain differences between them.',
      },
      {
        text: 'Which school board the students studied under',
        note: 'Nothing in the exhibit separates boards. The cities differ in size.',
      },
      {
        text: 'How many students each city has',
        note: 'Bigger cities have more students, so more centres and more who clear. Per student, the cities match.',
      },
    ],
    confounderIndex: 2,
    explanation:
      'In every city a quarter of the students cleared, and there is one centre for every 100 students. The big city simply has more of everything. The common mistake is comparing totals across places of different sizes instead of rates per person.',
  },
  {
    id: 'daily-lie-ad-spend',
    type: 'spot_the_lie',
    prompt: 'Nisha showed this to the founders. What makes it misleading?',
    claim: {
      by: 'Nisha from Marketing',
      text: 'Installs track our ad spend perfectly. Double the budget, double the installs!',
    },
    chart: {
      kind: 'line',
      title: 'Ad spend and app installs',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [
        { name: 'Ad spend (lakh ₹)', values: [10, 12, 14, 16, 18, 20] },
        { name: 'Installs (thousands)', values: [50, 51.2, 52.4, 53.6, 54.8, 56], axis: 'right' },
      ],
      axis: { min: 8, max: 22, label: 'Lakh ₹' },
      rightAxis: { min: 49, max: 57, label: 'Thousands' },
    },
    trick: 'dual_axis',
    options: [
      'Ad spend should be shown in crores',
      'Six months is too little data for a line chart',
      'The lines use different scales: spend doubled, installs rose only 12%',
    ],
    correctIndex: 2,
    explanation:
      'Put both on one scale, starting at 100: ad spend climbs to 200 while installs reach only 112. Two axes can make any two rising lines look like twins. The common mistake is reading a dual-axis chart as if both lines shared a scale.',
  },
  {
    id: 'daily-court-fire-engines',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence: 'At fires in Kolkata, the more fire engines that arrive, the bigger the damage.',
    witnesses: [
      {
        name: 'Rupa, shop owner',
        claim: 'The engines cause the damage, with all that water and all those hoses.',
      },
      { name: 'Sanjay, neighbour', claim: 'Big damage makes people panic and call more engines.' },
    ],
    suspects: [
      {
        text: 'How big the fire was',
        note: 'A big fire needs more engines and burns more, so it drives both.',
      },
      {
        text: 'The time of day',
        note: 'Fires happen at all hours, and the hour does not set both engines and damage.',
      },
      {
        text: 'How far away the fire station is',
        note: 'Distance can slow the engines down, but it does not decide how many are sent.',
      },
    ],
    confounderIndex: 0,
    explanation:
      'Big fires get many engines and do a lot of damage; small fires get one engine and do little. The common mistake is reading a link as cause and effect when a third thing, here the size of the fire, drives both.',
  },
  {
    id: 'daily-lie-delivery',
    type: 'spot_the_lie',
    prompt: 'This slide went out with the investor update. What is wrong with it?',
    claim: { by: 'Meera from Growth', text: 'We deliver twice as fast as our rivals!' },
    chart: {
      kind: 'bar',
      title: 'Average delivery time',
      labels: ['Us', 'Rival A', 'Rival B'],
      series: [{ name: 'Minutes', values: [28, 30, 31] }],
      axis: { min: 26, max: 32, label: 'Minutes' },
    },
    trick: 'truncated_axis',
    options: [
      'Delivery times should be shown in seconds',
      'The axis starts at 26 minutes, so a 3-minute gap looks like double',
      'Rivals should not be named on a chart',
    ],
    correctIndex: 1,
    explanation:
      'We take 28 minutes and Rival B takes 31: about 10% faster, not twice as fast. Start the axis at 26 and their bar looks two and a half times ours. The common mistake is trusting the picture instead of the numbers on the axis.',
  },
  {
    id: 'daily-court-dark-mode',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence: 'People who switch on dark mode spend twice as long in the app as people who don’t.',
    witnesses: [
      { name: 'Tanvi, designer', claim: 'Dark mode is so comfortable that people stay longer.' },
      {
        name: 'Arun, product manager',
        claim: 'Hours in the app tire people’s eyes, so they switch it on.',
      },
    ],
    suspects: [
      {
        text: 'The brand of their phone',
        note: 'Every phone brand offers the setting, and brand does not decide who stays for hours.',
      },
      {
        text: 'How much they used the app already',
        note: 'Heavy users explore the settings and use the app late at night, so they find dark mode and stay longer anyway.',
      },
      {
        text: 'The day they installed the app',
        note: 'The install date does not choose who finds a setting or who stays for hours.',
      },
    ],
    confounderIndex: 1,
    explanation:
      'Keen users are the ones who dig into settings, so dark mode marks people who already love the app. The common mistake is treating a feature that keen users choose as the reason they are keen. Switch it on for a random half of users to find out.',
  },
  {
    id: 'daily-lie-festival-sweets',
    type: 'spot_the_lie',
    prompt: 'Deepa sent this to the owners. What is misleading about it?',
    claim: {
      by: 'Deepa, shop manager',
      text: 'October sales jumped 70%! Our new sweets are a hit.',
    },
    chart: {
      kind: 'line',
      title: 'Monthly sales',
      labels: [
        'Aug 24',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
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
      ],
      series: [
        {
          name: 'Sales',
          values: [10, 11, 17, 12, 10, 10, 9, 10, 10, 11, 10, 10, 10, 11, 17],
        },
      ],
      axis: { min: 5, max: 20, label: 'Lakh ₹' },
      window: { from: 12, to: 14 },
    },
    trick: 'cherry_picked_range',
    options: [
      'It starts in August, hiding that last October jumped just as much',
      'Sales should be shown in rupees, not lakh',
      'A line chart needs at least six points',
    ],
    correctIndex: 0,
    explanation:
      'Last October, sales also jumped to 17 lakh, then fell back: the festival season lifts every sweet shop. This October only matches last October. The common mistake is calling a seasonal jump a new trend.',
  },
  {
    id: 'daily-court-mangoes',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence:
      'In Lucknow, the weeks when the most mangoes are sold are also the weeks when the most air conditioners are sold.',
    witnesses: [
      { name: 'Pappu, fruit seller', claim: 'People buy an AC to keep their mangoes fresh.' },
      { name: 'Neelam, AC dealer', claim: 'Once the AC is on, people get hungry for mangoes.' },
    ],
    suspects: [
      {
        text: 'Cricket on TV',
        note: 'Cricket is on for much of the year, and it does not ripen mangoes.',
      },
      {
        text: 'The price of onions',
        note: 'Onion prices follow their own harvests, not mangoes or ACs.',
      },
      {
        text: 'Summer heat',
        note: 'Summer brings the mango harvest and the heat that sends people to buy ACs.',
      },
    ],
    confounderIndex: 2,
    explanation:
      'May and June bring both the mango harvest and the worst of the heat, so both sales rise together. The common mistake is forgetting the season: many things peak together simply because it is summer.',
  },
  {
    id: 'daily-lie-overtaking',
    type: 'spot_the_lie',
    prompt: 'Ishaan put this on his first slide. What is misleading about it?',
    claim: { by: 'Ishaan from Sales', text: 'Our phones have overtaken the market leader!' },
    chart: {
      kind: 'line',
      title: 'Phones sold each month',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [
        { name: 'Market leader (lakh)', values: [22, 22.4, 22.8, 23.2, 23.6, 24] },
        { name: 'Us (lakh)', values: [1, 1.4, 1.8, 2.2, 2.6, 3], axis: 'right' },
      ],
      axis: { min: 20, max: 25, label: 'Leader, lakh' },
      rightAxis: { min: 0, max: 3.5, label: 'Us, lakh' },
    },
    trick: 'dual_axis',
    options: [
      'Two lines should never cross on a chart',
      'The lines use different scales: they sell 24 lakh phones a month, we sell 3 lakh',
      'Phone sales should be counted in crores',
    ],
    correctIndex: 1,
    explanation:
      'The leader sells 24 lakh phones a month and we sell 3 lakh: they still sell eight times as many. The lines only cross because each has its own axis. The common mistake is trusting where two lines cross without checking that they share a scale.',
  },
  {
    id: 'daily-court-front-row',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence: 'In a Chennai college, students who sit in the front row score higher in exams.',
    witnesses: [
      { name: 'Prof. Iyer', claim: 'Sitting close to the board makes students learn more.' },
      {
        name: 'Deepak, student',
        claim: 'Good marks give students the confidence to sit in front.',
      },
    ],
    suspects: [
      {
        text: 'Their roll numbers',
        note: 'Roll numbers go by name, and they neither choose seats nor set marks.',
      },
      {
        text: 'Which hostel they live in',
        note: 'Every hostel sends students to every row, so it cannot link seats and marks.',
      },
      {
        text: 'How keen they were to begin with',
        note: 'Keen students choose the front row and study harder, so keenness drives both.',
      },
    ],
    confounderIndex: 2,
    explanation:
      'Students who care most pick the front row, and they would score well anywhere. To learn whether the seat matters, you would have to assign seats at random. The common mistake is crediting a choice for the results of the people who make it.',
  },
  {
    id: 'daily-lie-battery',
    type: 'spot_the_lie',
    prompt: 'This ad ran on a shopping site. What is wrong with it?',
    claim: {
      by: 'An ad for the Zappa X phone',
      text: 'Our battery lasts far longer than the rest!',
    },
    chart: {
      kind: 'bar',
      title: 'Battery life, playing video',
      labels: ['Zappa X', 'Brand B', 'Brand C'],
      series: [{ name: 'Hours', values: [20, 19, 18.5] }],
      axis: { min: 18, max: 20.5, label: 'Hours' },
    },
    trick: 'truncated_axis',
    options: [
      'Battery life should be measured in minutes',
      'The brands should be in alphabetical order',
      'The axis starts at 18 hours, so a gap of an hour and a half looks four times bigger',
    ],
    correctIndex: 2,
    explanation:
      'Zappa X lasts 20 hours and Brand C 18.5: an hour and a half more, about 8%. Starting the axis at 18 makes its bar four times taller. The common mistake is trusting how big a gap looks instead of reading the axis.',
  },
  {
    id: 'daily-court-coupons',
    type: 'courtroom',
    prompt: 'Which lurking variable explains the evidence?',
    evidence:
      'Customers who used a discount coupon spent three times as much with us this year as customers who didn’t.',
    witnesses: [
      { name: 'Rahul, marketing', claim: 'Coupons make people spend more. Send them to everyone!' },
      {
        name: 'Sunita, finance',
        claim: 'Spending a lot makes people feel they deserve a coupon, so they hunt for one.',
      },
    ],
    suspects: [
      {
        text: 'How often they already shopped with us',
        note: 'Regular customers see more coupons and spend more anyway, so they were big spenders before any coupon.',
      },
      {
        text: 'Which city they live in',
        note: 'Coupons went out in every city, so the city does not explain who used one.',
      },
      {
        text: 'Whether they shop on the app or the website',
        note: 'Coupons work on both, so this does not separate big spenders from the rest.',
      },
    ],
    confounderIndex: 0,
    explanation:
      'The customers who use coupons are mostly regulars, who spend more with or without one. The common mistake is comparing people who chose to do something with people who didn’t. Send coupons to a random half to see what they really add.',
  },
];
