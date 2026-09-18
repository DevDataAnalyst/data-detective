import type { Checkpoint, Lesson, Unit } from './types';

/*
 * Unit 1: Data Detective (descriptive statistics).
 *
 * Numbers in prompts and explanations use {statistic} placeholders where they come from the
 * question's dataset, and every answer is recomputed by `validateUnit` in the tests.
 */

const whatIsADataset: Lesson = {
  id: 'what-is-a-dataset',
  title: "What's in a dataset?",
  estimatedMinutes: 4,
  intro:
    'A **dataset** is a table. Each **row** is one thing you recorded, like one food order. Each **column** is one piece of information about it, like the city or the delivery time.\n\nColumns come in two main kinds. **Numeric** columns hold amounts you can do maths with, like minutes or marks. **Categorical** columns hold labels or groups, like city names or payment type.',
  questions: [
    {
      id: 'dataset-row-meaning',
      type: 'multiple_choice',
      prompt: 'In this table, what does one row describe?',
      table: {
        caption: 'Food orders',
        columns: ['order_id', 'city', 'distance_km', 'delivery_time_min'],
        rows: [
          [101, 'Pune', 2.5, 28],
          [102, 'Chennai', 4.1, 35],
          [103, 'Pune', 1.2, 22],
          [104, 'Kolkata', 6.0, 41],
        ],
      },
      options: ['One food order', 'One city', 'All the delivery times', 'One column of numbers'],
      correctIndex: 0,
      explanation:
        'Each row is one order, with its own order_id, city, distance and delivery time. It is not a city: the same city can appear in many rows.',
    },
    {
      id: 'dataset-count-rows',
      type: 'multiple_choice',
      prompt: 'How many rows of data does this table have?',
      table: {
        caption: 'Cricket scores',
        columns: ['player', 'team', 'runs', 'balls_faced'],
        rows: [
          ['Rohan', 'Mumbai', 45, 38],
          ['Imran', 'Delhi', 12, 20],
          ['Kavya', 'Chennai', 67, 51],
          ['Arjun', 'Delhi', 0, 3],
          ['Sneha', 'Mumbai', 88, 60],
        ],
      },
      options: ['4', '5', '6', '20'],
      correctIndex: 1,
      check: { kind: 'table_rows' },
      explanation:
        "There are 5 rows, one per player. The header holds column names, not data, so don't count it.",
    },
    {
      id: 'dataset-count-columns',
      type: 'multiple_choice',
      prompt: 'And how many columns does the same table have?',
      table: {
        caption: 'Cricket scores',
        columns: ['player', 'team', 'runs', 'balls_faced'],
        rows: [
          ['Rohan', 'Mumbai', 45, 38],
          ['Imran', 'Delhi', 12, 20],
          ['Kavya', 'Chennai', 67, 51],
          ['Arjun', 'Delhi', 0, 3],
          ['Sneha', 'Mumbai', 88, 60],
        ],
      },
      options: ['5', '2', '4', '20'],
      correctIndex: 2,
      check: { kind: 'table_columns' },
      explanation:
        'There are 4 columns: player, team, runs and balls_faced. Each column is one piece of information recorded for every player.',
    },
    {
      id: 'dataset-which-categorical',
      type: 'multiple_choice',
      prompt: 'Which of these columns is categorical?',
      options: ['delivery_time_min', 'distance_km', 'city', 'order_total_rupees'],
      correctIndex: 2,
      explanation:
        'city holds labels like Pune and Chennai, so it is categorical. The others are amounts you could add up or average, so they are numeric.',
    },
    {
      id: 'dataset-pin-codes',
      type: 'multiple_choice',
      prompt: 'A column holds PIN codes like 560001 and 411014. What kind of column is it?',
      options: [
        'Numeric, because it contains digits',
        'Categorical, because each code is a label for a place',
      ],
      correctIndex: 1,
      explanation:
        'The average of two PIN codes means nothing, so they are labels, not amounts. Digits alone do not make a column numeric.',
    },
    {
      id: 'dataset-sum-data-use',
      type: 'numeric_estimate',
      prompt:
        "Here is Priya's mobile data use for one week. Roughly how many GB did she use in total?",
      dataset: {
        label: 'Mobile data used each day',
        suffix: 'GB',
        values: [1.2, 0.8, 1.5, 2.1, 1.0, 3.2, 2.4],
      },
      statistic: 'sum',
      correctValue: 12.2,
      tolerance: 1.5,
      explanation:
        'The seven days add up to {sum} GB. A quick way to estimate is to round each day to a whole number first, then add.',
    },
    {
      id: 'dataset-spot-typo',
      type: 'tap_outlier',
      prompt:
        'These are commute times for 9 classmates. One value looks like a typing mistake. Tap it, then check.',
      dataset: {
        label: 'Commute time',
        suffix: 'min',
        values: [35, 42, 28, 40, 380, 33, 45, 38, 30],
      },
      outlierIndices: [4],
      explanation:
        '380 minutes is over 6 hours, far from every other commute. It is probably a typo for 38. Spotting values like this is the first job of a data detective.',
    },
    {
      id: 'dataset-why-types-matter',
      type: 'multiple_choice',
      prompt: 'Why does it help to know whether a column is numeric or categorical?',
      options: [
        'It decides which summaries make sense',
        'Categorical columns are less important',
        'Numeric columns never contain mistakes',
      ],
      correctIndex: 0,
      explanation:
        'You can average delivery times but not city names. For a categorical column, you count how often each label appears instead.',
    },
  ],
};

const theMean: Lesson = {
  id: 'the-mean',
  title: 'The mean',
  estimatedMinutes: 4,
  intro:
    'The **mean** is what most people call the average. Add up all the values, then divide by how many values there are.\n\nFor delivery times of 20, 30 and 40 minutes, the total is 90 and there are 3 orders, so the mean is 90 ÷ 3 = 30 minutes.\n\nThink of the mean as the **balance point** of the data.',
  questions: [
    {
      id: 'mean-stipends',
      type: 'multiple_choice',
      prompt: 'What is the mean of these five internship stipends?',
      dataset: {
        label: 'Monthly internship stipend',
        prefix: '₹',
        values: [8000, 10000, 12000, 10000, 15000],
      },
      options: ['₹10,000', '₹11,000', '₹12,000', '₹55,000'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'mean' },
      explanation:
        'The total is ₹{sum} across 5 stipends, so the mean is ₹{sum} ÷ 5 = ₹{mean}. ₹{sum} is the total: remember to divide.',
    },
    {
      id: 'mean-estimate-delivery',
      type: 'numeric_estimate',
      prompt: 'Estimate the mean delivery time before we reveal it.',
      dataset: { label: 'Delivery time', suffix: 'min', values: [28, 35, 31, 40, 26] },
      statistic: 'mean',
      correctValue: 32,
      tolerance: 3,
      explanation:
        'The five orders add up to {sum} minutes, so the mean is {sum} ÷ 5 = {mean} minutes. The values sit around 30, with the 40-minute order pulling the mean up a little.',
    },
    {
      id: 'mean-predict-runs',
      type: 'predict_reveal',
      prompt: 'Where does the mean of these six cricket scores sit? Drag the slider, then check.',
      dataset: {
        label: 'Runs scored',
        suffix: 'runs',
        display: 'dot_plot',
        values: [12, 45, 30, 8, 60, 25],
      },
      statistic: 'mean',
      slider: { min: 0, max: 70, step: 1 },
      trueValue: 30,
      tolerance: 5,
      reveal: {
        visual: 'marker',
        description: 'A marker slides to the mean on the dot plot, next to your prediction.',
      },
      explanation:
        'The scores total {sum} runs over 6 innings, so the mean is {mean}. It is the balance point: 45 and 60 above it balance 8, 12 and 25 below it.',
    },
    {
      id: 'mean-what-it-tells',
      type: 'multiple_choice',
      prompt: "A class's mean exam mark is 62. What does that tell you for sure?",
      options: [
        'Half the class scored above 62',
        'The total of all marks divided by the number of students is 62',
        'At least one student scored exactly 62',
        'Most students scored 62',
      ],
      correctIndex: 1,
      explanation:
        'The mean is simply total ÷ count. Nobody has to score exactly 62, and "half above, half below" describes the median, not the mean.',
    },
    {
      id: 'mean-data-use',
      type: 'multiple_choice',
      prompt: "Rahul's mobile data use over 4 days is shown. What is his mean daily use?",
      dataset: { label: 'Mobile data used each day', suffix: 'GB', values: [1.5, 2.5, 3.0, 1.0] },
      options: ['2.5 GB', '8 GB', '2 GB', '3 GB'],
      correctIndex: 2,
      check: { kind: 'statistic', statistic: 'mean' },
      explanation:
        'The 4 days add up to {sum} GB, and {sum} ÷ 4 = {mean} GB per day. 8 GB is the total, not the mean.',
    },
    {
      id: 'mean-estimate-commute',
      type: 'numeric_estimate',
      prompt: 'Estimate the mean commute time for this week.',
      dataset: { label: 'Commute time', suffix: 'min', values: [45, 50, 40, 55, 60] },
      statistic: 'mean',
      correctValue: 50,
      tolerance: 3,
      explanation:
        'The total is {sum} minutes over 5 days, giving a mean of {mean}. The values are spread evenly around 50: 40 and 60 cancel out, and so do 45 and 55.',
    },
    {
      id: 'mean-one-late-order',
      type: 'multiple_choice',
      prompt:
        'Four orders took 30 minutes each. Then a fifth order took 80 minutes. What is the mean of all five?',
      dataset: { label: 'Delivery time', suffix: 'min', values: [30, 30, 30, 30, 80] },
      options: ['30 minutes', '40 minutes', '55 minutes', '80 minutes'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'mean' },
      explanation:
        'The new total is {sum} minutes across 5 orders, so the mean is {mean}. Averaging only 30 and 80 to get 55 is a common mistake: every order counts once.',
    },
  ],
};

const medianAndMode: Lesson = {
  id: 'median-and-mode',
  title: 'Median and mode',
  estimatedMinutes: 4,
  intro:
    'The **median** is the middle value once the data is sorted. With an even number of values, it is halfway between the two middle values.\n\nThe **mode** is the value that appears most often. It is the only one of the three averages that also works for categories, like the most common city in a list of orders.\n\nAlways sort first, then find the middle.',
  questions: [
    {
      id: 'median-delivery',
      type: 'multiple_choice',
      prompt: 'What is the median of these five delivery times?',
      dataset: { label: 'Delivery time', suffix: 'min', values: [34, 22, 41, 28, 30] },
      options: ['41 minutes', '30 minutes', '31 minutes', '28 minutes'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'median' },
      explanation:
        'Sorted, the times are 22, 28, 30, 34, 41, so the middle value is {median}. Picking 41 is the classic mistake: it is the middle of the unsorted list.',
    },
    {
      id: 'median-even-stipends',
      type: 'numeric_estimate',
      prompt: 'There are six stipends here, an even number. What is the median?',
      dataset: {
        label: 'Monthly internship stipend',
        prefix: '₹',
        values: [9000, 15000, 12000, 7000, 20000, 10000],
      },
      statistic: 'median',
      correctValue: 11000,
      tolerance: 500,
      explanation:
        'Sorted, the two middle stipends are ₹10,000 and ₹12,000. With an even count, the median is halfway between them: ₹{median}.',
    },
    {
      id: 'mode-runs',
      type: 'multiple_choice',
      prompt: 'What is the mode of these scores from 7 matches?',
      dataset: { label: 'Runs scored', suffix: 'runs', values: [20, 45, 20, 8, 33, 20, 45] },
      options: ['45 runs', '20 runs', '33 runs', '27 runs'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'mode' },
      explanation:
        '{mode} appears three times, more than any other score, so it is the mode. 45 appears twice, which is not enough.',
    },
    {
      id: 'mode-payment-methods',
      type: 'multiple_choice',
      prompt:
        'Payment methods for 8 orders: UPI, Cash, UPI, Card, UPI, Cash, UPI, Card. Which summary makes sense for this column?',
      options: [
        'The mean payment method',
        'The median payment method',
        'The mode: UPI is the most common',
      ],
      correctIndex: 2,
      explanation:
        'Payment method is categorical, so you cannot average or sort the labels meaningfully. The mode still works: UPI appears 4 times.',
    },
    {
      id: 'median-predict-marks',
      type: 'predict_reveal',
      prompt: 'Predict the median of these seven exam marks, then check.',
      dataset: {
        label: 'Exam marks',
        suffix: 'marks',
        display: 'dot_plot',
        values: [55, 72, 64, 48, 90, 67, 70],
      },
      statistic: 'median',
      slider: { min: 40, max: 100, step: 1 },
      trueValue: 67,
      tolerance: 4,
      reveal: {
        visual: 'marker',
        description: 'A marker slides to the middle value on the dot plot.',
      },
      explanation:
        'Sorted, the marks are 48, 55, 64, 67, 70, 72, 90. The 4th of 7 values is in the middle, so the median is {median}.',
    },
    {
      id: 'mode-none',
      type: 'multiple_choice',
      prompt: 'What is the mode of these commute times?',
      dataset: { label: 'Commute time', suffix: 'min', values: [30, 35, 40, 45, 50] },
      options: ['30 minutes', '40 minutes', 'There is no mode', '50 minutes'],
      correctIndex: 2,
      check: { kind: 'no_mode' },
      explanation:
        'Every time appears exactly once, so no value is more common than the others. Not every dataset has a useful mode.',
    },
    {
      id: 'median-even-data-use',
      type: 'multiple_choice',
      prompt: 'What is the median data use for these 4 friends?',
      dataset: { label: 'Mobile data used this week', suffix: 'GB', values: [3, 8, 5, 2] },
      options: ['4.5 GB', '4 GB', '5 GB', '3 GB'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'median' },
      explanation:
        'Sorted: 2, 3, 5, 8. The middle two are 3 and 5, and halfway between them is {median} GB. 4.5 GB is the mean, not the median.',
    },
  ],
};

const meanVsMedian: Lesson = {
  id: 'mean-vs-median',
  title: 'Mean vs median',
  estimatedMinutes: 5,
  intro:
    'An **outlier** is a value far away from the rest. Outliers pull the mean towards them, but the median barely moves, because it only cares about the middle.\n\nWhen a few extreme values drag the mean one way, the data is **skewed**. Then the median usually describes a typical value better.\n\nAlways ask: is the mean being pulled by a few extreme values?',
  questions: [
    {
      id: 'mvm-predict-late-order',
      type: 'predict_reveal',
      prompt: 'Nine delivery times, including one very late order. Predict the mean.',
      dataset: {
        label: 'Delivery time',
        suffix: 'min',
        display: 'dot_plot',
        values: [25, 28, 30, 30, 32, 33, 35, 37, 173],
      },
      statistic: 'mean',
      slider: { min: 20, max: 100, step: 1 },
      trueValue: 47,
      tolerance: 5,
      reveal: {
        visual: 'marker',
        description: 'A marker slides to the mean. Watch how far the one late order drags it.',
      },
      explanation:
        'The mean is {mean} minutes, even though 8 of the 9 orders took 37 minutes or less. The single 173-minute order pulls the mean far above a typical order. The median is just {median}.',
    },
    {
      id: 'mvm-compare-stipends',
      type: 'multiple_choice',
      prompt: 'For these six stipends, which is larger: the mean or the median?',
      dataset: {
        label: 'Monthly internship stipend',
        prefix: '₹',
        display: 'dot_plot',
        values: [8000, 9000, 10000, 10000, 12000, 50000],
      },
      options: ['The mean', 'The median', 'They are equal'],
      correctIndex: 0,
      check: {
        kind: 'compare',
        left: 'mean',
        right: 'median',
        optionIndex: { greater: 0, less: 1, equal: 2 },
      },
      explanation:
        'The ₹50,000 stipend pulls the mean up to ₹{mean}, while the median stays at ₹{median}. Large outliers push the mean above the median.',
    },
    {
      id: 'mvm-news-report',
      type: 'multiple_choice',
      prompt:
        'A report says the average stipend in a survey is ₹16,500, but most interns in it earn about ₹10,000. What is the most likely explanation?',
      options: [
        'The data must be wrong',
        'A few very high stipends pull the mean up',
        'Most interns were counted twice',
      ],
      correctIndex: 1,
      explanation:
        'When most values are near ₹10,000 but the mean is much higher, a few large values are usually pulling it up. The median would show a more typical stipend.',
    },
    {
      id: 'mvm-estimate-median-commute',
      type: 'numeric_estimate',
      prompt: 'One commute in this list is extremely long. Estimate the median.',
      dataset: { label: 'Commute time', suffix: 'min', values: [22, 25, 27, 30, 31, 34, 150] },
      statistic: 'median',
      correctValue: 30,
      tolerance: 2,
      explanation:
        'The middle (4th) value is {median} minutes. The 150-minute commute drags the mean up to {mean:1}, but the median stays with the typical commutes.',
    },
    {
      id: 'mvm-tap-heavy-users',
      type: 'tap_outlier',
      prompt:
        'Monthly data use for 11 students. Tap every value that looks like an outlier, then check.',
      dataset: {
        label: 'Mobile data used this month',
        suffix: 'GB',
        values: [4, 5, 6, 5, 7, 6, 5, 22, 6, 18, 5],
      },
      outlierIndices: [7, 9],
      explanation:
        '18 GB and 22 GB are far above everyone else, who use 4 to 7 GB. Both pull the mean up to {mean:1} GB, while the median stays at {median} GB.',
    },
    {
      id: 'mvm-which-to-report',
      type: 'multiple_choice',
      prompt:
        'A food app wants to show customers a typical delivery time. A few orders last month were stuck for hours. Which should it report?',
      options: ['The mean delivery time', 'The median delivery time', 'The longest delivery time'],
      correctIndex: 1,
      explanation:
        'The median ignores how extreme the stuck orders were, so it reflects what a typical customer experiences. The mean would be pulled up by those few very late orders.',
    },
    {
      id: 'mvm-compare-low-mark',
      type: 'multiple_choice',
      prompt: 'One student scored very low on this test. Which is larger: the mean or the median?',
      dataset: {
        label: 'Exam marks',
        suffix: 'marks',
        display: 'dot_plot',
        values: [12, 70, 74, 76, 78, 80, 81],
      },
      options: ['The mean', 'The median', 'They are equal'],
      correctIndex: 1,
      check: {
        kind: 'compare',
        left: 'mean',
        right: 'median',
        optionIndex: { greater: 0, less: 1, equal: 2 },
      },
      explanation:
        'The mark of 12 pulls the mean down to {mean:1}, below the median of {median}. Outliers pull the mean towards them, in either direction.',
    },
  ],
};

const rangeAndIqr: Lesson = {
  id: 'range-and-iqr',
  title: 'Spread: range and IQR',
  estimatedMinutes: 5,
  intro:
    '**Spread** tells you how far apart values are. Two datasets can share an average but spread very differently.\n\nThe **range** is max − min. It is quick, but one extreme value can stretch it.\n\nThe **IQR** (interquartile range) is Q3 − Q1: the width of the middle half of the sorted data. Outliers barely affect it. A common rule flags values more than **1.5 × IQR** below Q1 or above Q3 as outliers.',
  questions: [
    {
      id: 'spread-range-commute',
      type: 'multiple_choice',
      prompt: 'What is the range of these commute times?',
      dataset: { label: 'Commute time', suffix: 'min', values: [25, 40, 32, 58, 30] },
      options: ['58 minutes', '33 minutes', '37 minutes', '32 minutes'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'range' },
      explanation:
        'The range is the longest minus the shortest commute: {max} − {min} = {range} minutes. 58 is just the maximum.',
    },
    {
      id: 'spread-two-batters',
      type: 'multiple_choice',
      prompt:
        'Two batters both average 40 runs. Batter A scores between 35 and 45 every match. Batter B scores anywhere from 0 to 90. Which is true?',
      options: [
        "Batter B's scores are more spread out",
        'They are equally consistent, because their averages match',
        "Batter A's scores are more spread out",
      ],
      correctIndex: 0,
      explanation:
        "Same average, very different spread. Batter B's range is 90 runs against 10 for Batter A, so B is far less predictable.",
    },
    {
      id: 'spread-predict-range',
      type: 'predict_reveal',
      prompt: 'Predict the range of these delivery times, then check.',
      dataset: {
        label: 'Delivery time',
        suffix: 'min',
        display: 'dot_plot',
        values: [18, 35, 27, 42, 30, 24, 38],
      },
      statistic: 'range',
      slider: { min: 0, max: 50, step: 1 },
      trueValue: 24,
      tolerance: 3,
      reveal: {
        visual: 'range_bracket',
        description:
          'A bracket stretches from the fastest to the slowest order, compared with the width you predicted.',
      },
      explanation:
        'The slowest order took {max} minutes and the fastest {min}, so the range is {max} − {min} = {range} minutes.',
    },
    {
      id: 'spread-iqr-stipends',
      type: 'multiple_choice',
      prompt:
        'Here are 9 monthly stipends, in thousands of rupees. Q1 is {q1} and Q3 is {q3}. What is the IQR?',
      dataset: {
        label: 'Monthly stipend (₹ thousands)',
        values: [6, 8, 8, 10, 12, 13, 15, 15, 30],
      },
      options: ['₹24k', '₹7k', '₹15k', '₹12k'],
      correctIndex: 1,
      check: { kind: 'statistic', statistic: 'iqr' },
      explanation:
        'The IQR is Q3 − Q1 = {q3} − {q1} = ₹{iqr}k. Unlike the range of ₹{range}k, it is not stretched by the ₹30k stipend at the top.',
    },
    {
      id: 'spread-estimate-iqr-marks',
      type: 'numeric_estimate',
      prompt: 'Estimate the IQR of these exam marks. Sort them first.',
      dataset: {
        label: 'Exam marks',
        suffix: 'marks',
        values: [63, 45, 70, 58, 88, 56, 67, 71, 60],
      },
      statistic: 'iqr',
      correctValue: 12,
      tolerance: 3,
      explanation:
        'Q1 is about {q1} and Q3 about {q3}, so the IQR is about {iqr} marks. The middle half of the class scored within that band.',
    },
    {
      id: 'spread-logging-error',
      type: 'multiple_choice',
      prompt:
        'One order in a dataset was logged as 400 minutes by mistake. Which measure of spread changes the most?',
      options: ['The IQR', 'Both change by the same amount', 'The range'],
      correctIndex: 2,
      explanation:
        'The range uses the maximum directly, so one bad value stretches it enormously. The IQR only looks at the middle half, so it barely moves.',
    },
    {
      id: 'spread-predict-iqr',
      type: 'predict_reveal',
      prompt: 'Predict the IQR of these commute times, then check.',
      dataset: {
        label: 'Commute time',
        suffix: 'min',
        display: 'dot_plot',
        values: [33, 26, 40, 20, 62, 30, 40, 26, 35],
      },
      statistic: 'iqr',
      slider: { min: 0, max: 45, step: 1 },
      trueValue: 14,
      tolerance: 3,
      reveal: {
        visual: 'iqr_box',
        description:
          'A box covers the middle half of the commutes, from Q1 to Q3, next to the width you predicted.',
      },
      explanation:
        'Q1 is {q1} and Q3 is {q3} minutes, so the IQR is {iqr}. The 62-minute commute sits outside the box and does not change it.',
    },
    {
      id: 'spread-tap-iqr-rule',
      type: 'tap_outlier',
      prompt:
        'Here Q1 is {q1} and Q3 is {q3}. Use the 1.5 × IQR rule and tap every outlier in these delivery times.',
      dataset: {
        label: 'Delivery time',
        suffix: 'min',
        values: [36, 41, 12, 34, 39, 75, 38, 34, 41],
      },
      outlierIndices: [2, 5],
      explanation:
        'The IQR is {iqr}, so the fences are {q1} − 1.5 × {iqr} = {lower_fence} and {q3} + 1.5 × {iqr} = {upper_fence}. Only 12 and 75 fall outside, so they are the outliers.',
    },
  ],
};

const standardDeviation: Lesson = {
  id: 'standard-deviation',
  title: 'Standard deviation',
  estimatedMinutes: 4,
  intro:
    'The **standard deviation (SD)** is roughly the typical distance of values from the mean. A small SD means values huddle close to the mean. A large SD means they are scattered.\n\nYou do not need to memorise the formula, because tools like pandas calculate it for you. What matters is reading it: an SD of 2 minutes means very consistent deliveries, while 20 minutes means customers cannot predict when food will arrive.',
  questions: [
    {
      id: 'sd-consistent-partner',
      type: 'multiple_choice',
      prompt: 'Both delivery partners average 30 minutes. Which one is more consistent?',
      datasets: [
        { label: 'Partner A', suffix: 'min', values: [30, 31, 29, 30, 30] },
        { label: 'Partner B', suffix: 'min', values: [15, 45, 30, 20, 40] },
      ],
      options: ['Partner A', 'Partner B'],
      correctIndex: 0,
      check: { kind: 'extreme', statistic: 'std_dev', which: 'smallest' },
      explanation:
        "Partner A's times stay within a minute of 30, while Partner B's swing from 15 to 45. A smaller SD means more consistent.",
    },
    {
      id: 'sd-predict-commute',
      type: 'predict_reveal',
      prompt: 'Predict the standard deviation of these commute times.',
      dataset: {
        label: 'Commute time',
        suffix: 'min',
        display: 'dot_plot',
        values: [38, 30, 46, 34, 42],
      },
      statistic: 'std_dev',
      slider: { min: 0, max: 15, step: 0.5 },
      trueValue: 5.66,
      tolerance: 1.5,
      reveal: {
        visual: 'sd_band',
        description:
          'A shaded band shows one SD either side of the mean, next to the band you predicted.',
      },
      explanation:
        'The values sit 0 to 8 minutes from the mean of {mean}, so a typical distance of about {std_dev:1} minutes makes sense.',
    },
    {
      id: 'sd-two-cities',
      type: 'multiple_choice',
      prompt:
        'Two cities both have a mean delivery time of 35 minutes. City X has an SD of 3 minutes and City Y has an SD of 15 minutes. What can customers in City Y expect?',
      options: [
        'Deliveries always take exactly 35 minutes',
        'Faster deliveries than City X on average',
        'Delivery times that vary a lot: some much faster, some much slower',
      ],
      correctIndex: 2,
      explanation:
        'Same mean, but a larger SD means times are more spread out. Customers in City Y often get orders well before or well after 35 minutes.',
    },
    {
      id: 'sd-estimate-marks',
      type: 'numeric_estimate',
      prompt: 'These exam marks all sit close to 70. Estimate the standard deviation.',
      dataset: { label: 'Exam marks', suffix: 'marks', values: [68, 70, 72, 69, 71] },
      statistic: 'std_dev',
      correctValue: 1.41,
      tolerance: 1,
      explanation:
        'Each mark is only 0 to 2 away from the mean of {mean}, so the SD is small: about {std_dev:1}. A guess like 10 would mean marks spread far more widely.',
    },
    {
      id: 'sd-largest-spread',
      type: 'multiple_choice',
      prompt: 'All three sets of cricket scores average 40 runs. Which set has the largest SD?',
      datasets: [
        { label: 'Set A', suffix: 'runs', values: [40, 42, 38, 41, 39] },
        { label: 'Set B', suffix: 'runs', values: [10, 70, 40, 5, 75] },
        { label: 'Set C', suffix: 'runs', values: [30, 50, 40, 35, 45] },
      ],
      options: ['Set A', 'Set B', 'Set C'],
      correctIndex: 1,
      check: { kind: 'extreme', statistic: 'std_dev', which: 'largest' },
      explanation:
        'Set B jumps between single digits and 70-plus, so its values are furthest from the mean on average. That gives it the largest SD.',
    },
    {
      id: 'sd-outlier-effect',
      type: 'multiple_choice',
      prompt:
        'A logging error adds one 300-minute order to a set of delivery times. What happens to the standard deviation?',
      options: ['It stays the same, like the median', 'It gets much larger', 'It gets smaller'],
      correctIndex: 1,
      explanation:
        'The SD is built from every value’s distance to the mean, so one extreme value inflates it a lot. Like the mean, it is sensitive to outliers.',
    },
    {
      id: 'sd-tap-inflator',
      type: 'tap_outlier',
      prompt: 'One order is inflating the standard deviation of these delivery times. Tap it.',
      dataset: {
        label: 'Delivery time',
        suffix: 'min',
        values: [34, 36, 35, 37, 33, 36, 35, 60, 34],
      },
      outlierIndices: [7],
      explanation:
        '60 minutes is much further from the mean than any other order, so it adds the most to the SD. Without it, the SD would drop from about {std_dev:1} to under 2 minutes.',
    },
  ],
};

const shapesOfData: Lesson = {
  id: 'shapes-of-data',
  title: 'Shapes of data',
  estimatedMinutes: 4,
  intro:
    'The **shape** of a dataset tells a story.\n\n**Symmetric:** values spread evenly around the middle, so mean ≈ median.\n\n**Right-skewed:** a long tail of high values, so mean > median. Delivery times often look like this.\n\n**Left-skewed:** a tail of low values, so mean < median.\n\n**Bimodal:** two separate peaks, often two groups mixed together, like lunch and dinner orders.',
  questions: [
    {
      id: 'shape-right-skew-delivery',
      type: 'multiple_choice',
      prompt: 'What shape are these 15 delivery times?',
      dataset: {
        label: 'Delivery time',
        suffix: 'min',
        display: 'dot_plot',
        values: [22, 24, 25, 26, 26, 27, 28, 28, 29, 30, 32, 35, 41, 50, 64],
      },
      options: [
        'Symmetric',
        'Right-skewed: a long tail of high values',
        'Left-skewed: a long tail of low values',
        'Bimodal: two separate peaks',
      ],
      correctIndex: 1,
      check: { kind: 'skew', optionIndex: { symmetric: 0, right: 1, left: 2 } },
      explanation:
        'Most orders arrive in 22 to 32 minutes, with a tail stretching up to 64. That long tail of high values makes it right-skewed, and the mean ({mean:1}) sits above the median ({median}).',
    },
    {
      id: 'shape-right-skew-rule',
      type: 'multiple_choice',
      prompt: 'In right-skewed data, which is usually larger?',
      options: ['The median', 'The mean', 'They are always equal'],
      correctIndex: 1,
      explanation:
        'The long tail of high values pulls the mean towards it, while the median stays with the bulk of the data.',
    },
    {
      id: 'shape-bimodal-orders',
      type: 'multiple_choice',
      prompt: 'A café records the hour of each order. What shape is this data?',
      dataset: {
        label: 'Order time (24-hour clock)',
        display: 'dot_plot',
        values: [12, 12.5, 13, 13, 13.5, 13, 12.5, 14, 19.5, 20, 20, 20.5, 21, 20, 19],
      },
      options: ['Symmetric', 'Right-skewed', 'Bimodal', 'Left-skewed'],
      correctIndex: 2,
      explanation:
        'There are two separate peaks, lunch and dinner, so the data is bimodal. A single average, around 4 pm, would describe a time when hardly anyone orders.',
    },
    {
      id: 'shape-left-skew-marks',
      type: 'multiple_choice',
      prompt:
        'Most students did well on this easy test, but a few scored very low. What shape is it?',
      dataset: {
        label: 'Exam marks',
        suffix: 'marks',
        display: 'dot_plot',
        values: [35, 52, 68, 74, 78, 80, 82, 84, 85, 86, 88, 88, 90, 92, 95],
      },
      options: ['Left-skewed', 'Right-skewed', 'Symmetric', 'Bimodal'],
      correctIndex: 0,
      check: { kind: 'skew', optionIndex: { left: 0, right: 1, symmetric: 2 } },
      explanation:
        'A tail of low marks stretches to the left, so it is left-skewed. Those few low marks pull the mean ({mean:1}) below the median ({median}).',
    },
    {
      id: 'shape-predict-symmetric',
      type: 'predict_reveal',
      prompt: 'These commute times look symmetric. Predict the mean.',
      dataset: {
        label: 'Commute time',
        suffix: 'min',
        display: 'dot_plot',
        values: [42, 30, 40, 46, 36, 50, 38, 44, 34, 40],
      },
      statistic: 'mean',
      slider: { min: 20, max: 60, step: 1 },
      trueValue: 40,
      tolerance: 3,
      reveal: {
        visual: 'marker',
        description: 'A marker slides to the mean. In symmetric data it lands right in the middle.',
      },
      explanation:
        'The values mirror each other around 40, so the mean and the median are both {mean}. In symmetric data, the middle is easy to spot by eye.',
    },
    {
      id: 'shape-estimate-skewed-median',
      type: 'numeric_estimate',
      prompt: 'These stipends are right-skewed. Estimate the median, the typical stipend.',
      dataset: {
        label: 'Monthly internship stipend',
        prefix: '₹',
        values: [8000, 25000, 6000, 10000, 5000, 9000, 8000, 12000, 7000],
      },
      statistic: 'median',
      correctValue: 8000,
      tolerance: 1000,
      explanation:
        'The middle (5th) stipend is ₹{median}. The ₹25,000 stipend pulls the mean up to ₹{mean}, which is why the median is the better "typical" value here.',
    },
    {
      id: 'shape-analyst-first-check',
      type: 'multiple_choice',
      prompt:
        'In one city, the mean delivery time is much higher than the median. What should an analyst check first?',
      options: [
        'Nothing: a higher mean is normal',
        'Whether a few very long deliveries, maybe logging errors, stretch the right tail',
        'Whether the city has fewer restaurants',
      ],
      correctIndex: 1,
      explanation:
        'A mean well above the median signals right skew. Start by looking at the longest deliveries: are they real delays or logging errors?',
    },
  ],
};

const checkpoint: Checkpoint = {
  id: 'unit1-checkpoint',
  title: 'Data Detective checkpoint',
  passMark: 0.8,
  retakeDelayMinutes: 60,
  items: [
    {
      lessonId: 'what-is-a-dataset',
      question: {
        id: 'cp-college-column',
        type: 'multiple_choice',
        prompt: "A column lists each student's college name. What kind of column is it?",
        options: ['Numeric', 'Categorical'],
        correctIndex: 1,
        explanation:
          'College names are labels, so the column is categorical. You would count students per college rather than average anything.',
      },
    },
    {
      lessonId: 'what-is-a-dataset',
      question: {
        id: 'cp-plan-rows',
        type: 'multiple_choice',
        prompt: 'How many rows of data are in this table?',
        table: {
          caption: 'Prepaid phone plans',
          columns: ['plan', 'data_gb_per_day', 'price_rupees', 'validity_days'],
          rows: [
            ['Basic', 1, 199, 28],
            ['Plus', 1.5, 299, 28],
            ['Max', 2, 399, 56],
          ],
        },
        options: ['3', '4', '12'],
        correctIndex: 0,
        check: { kind: 'table_rows' },
        explanation:
          'There are 3 rows, one per plan. 4 is the number of columns, and 12 is the number of cells.',
      },
    },
    {
      lessonId: 'the-mean',
      question: {
        id: 'cp-mean-delivery',
        type: 'numeric_estimate',
        prompt: 'Estimate the mean of these delivery times.',
        dataset: { label: 'Delivery time', suffix: 'min', values: [26, 34, 30, 38, 22] },
        statistic: 'mean',
        correctValue: 30,
        tolerance: 3,
        explanation: 'The total is {sum} minutes across 5 orders, so the mean is {mean} minutes.',
      },
    },
    {
      lessonId: 'median-and-mode',
      question: {
        id: 'cp-median-marks',
        type: 'multiple_choice',
        prompt: 'What is the median of these six exam marks?',
        dataset: { label: 'Exam marks', suffix: 'marks', values: [72, 58, 91, 64, 80, 67] },
        options: ['67', '69.5', '72', '74.5'],
        correctIndex: 1,
        check: { kind: 'statistic', statistic: 'median' },
        explanation:
          'Sorted, the middle two marks are 67 and 72, so the median is halfway between them: {median}. 72 is the mean, not the median.',
      },
    },
    {
      lessonId: 'median-and-mode',
      question: {
        id: 'cp-mode-cities',
        type: 'multiple_choice',
        prompt:
          'Cities for 7 orders: Pune, Chennai, Pune, Kolkata, Pune, Chennai, Hyderabad. What is the mode?',
        options: ['Chennai', 'Pune', 'There is no mode'],
        correctIndex: 1,
        explanation:
          'Pune appears 3 times, more than any other city. The mode is the one average that works for categories.',
      },
    },
    {
      lessonId: 'mean-vs-median',
      question: {
        id: 'cp-compare-commute',
        type: 'multiple_choice',
        prompt: 'Which is larger for these commute times: the mean or the median?',
        dataset: {
          label: 'Commute time',
          suffix: 'min',
          display: 'dot_plot',
          values: [28, 30, 31, 33, 35, 36, 140],
        },
        options: ['The mean', 'The median', 'They are about the same'],
        correctIndex: 0,
        check: {
          kind: 'compare',
          left: 'mean',
          right: 'median',
          optionIndex: { greater: 0, less: 1, equal: 2 },
        },
        explanation:
          'The 140-minute commute pulls the mean up to about {mean:1}, while the median stays at {median}.',
      },
    },
    {
      lessonId: 'range-and-iqr',
      question: {
        id: 'cp-predict-iqr',
        type: 'predict_reveal',
        prompt: 'Predict the IQR of these stipends, in thousands of rupees.',
        dataset: {
          label: 'Monthly stipend (₹ thousands)',
          display: 'dot_plot',
          values: [11, 26, 9, 14, 7, 12, 10, 14, 9],
        },
        statistic: 'iqr',
        slider: { min: 0, max: 20, step: 0.5 },
        trueValue: 5,
        tolerance: 1.5,
        reveal: {
          visual: 'iqr_box',
          description: 'A box covers the middle half of the stipends, from Q1 to Q3.',
        },
        explanation:
          'Q1 is {q1} and Q3 is {q3}, so the middle half of the stipends spans ₹{iqr}k. The ₹26k stipend does not change it.',
      },
    },
    {
      lessonId: 'range-and-iqr',
      question: {
        id: 'cp-tap-outliers',
        type: 'tap_outlier',
        prompt: 'Use the 1.5 × IQR rule to find the outliers in these delivery times. Tap them.',
        dataset: {
          label: 'Delivery time',
          suffix: 'min',
          values: [33, 29, 31, 95, 30, 35, 31, 28, 35],
        },
        outlierIndices: [3],
        explanation:
          'Q1 is {q1} and Q3 is {q3}, so values below {lower_fence} or above {upper_fence} are outliers. Only 95 minutes falls outside.',
      },
    },
    {
      lessonId: 'standard-deviation',
      question: {
        id: 'cp-consistent-partner',
        type: 'multiple_choice',
        prompt:
          'Three delivery partners each average 30 minutes. Which one is the most consistent?',
        datasets: [
          { label: 'Partner A', suffix: 'min', values: [20, 40, 25, 35, 30] },
          { label: 'Partner B', suffix: 'min', values: [29, 31, 30, 28, 32] },
          { label: 'Partner C', suffix: 'min', values: [10, 50, 30, 15, 45] },
        ],
        options: ['Partner A', 'Partner B', 'Partner C'],
        correctIndex: 1,
        check: { kind: 'extreme', statistic: 'std_dev', which: 'smallest' },
        explanation:
          "Partner B's times stay within 2 minutes of the average, so B has the smallest standard deviation and is the most consistent.",
      },
    },
    {
      lessonId: 'shapes-of-data',
      question: {
        id: 'cp-shape-data-use',
        type: 'multiple_choice',
        prompt: 'What shape is this data on monthly phone data use?',
        dataset: {
          label: 'Mobile data used this month',
          suffix: 'GB',
          display: 'dot_plot',
          values: [1.5, 2, 2, 2.5, 2.5, 3, 3, 3, 3.5, 4, 5, 7, 12],
        },
        options: ['Left-skewed', 'Symmetric', 'Right-skewed'],
        correctIndex: 2,
        check: { kind: 'skew', optionIndex: { left: 0, symmetric: 1, right: 2 } },
        explanation:
          'Most people use 2 to 4 GB, but a few heavy users stretch a tail to the right. That is right-skewed, with the mean ({mean:1}) above the median ({median}).',
      },
    },
  ],
};

export const unit1: Unit = {
  id: 'unit-1-data-detective',
  title: 'Data Detective',
  description:
    'Learn to describe data like an analyst: averages, spread and shape. Then crack a real case with Python.',
  lessons: [
    whatIsADataset,
    theMean,
    medianAndMode,
    meanVsMedian,
    rangeAndIqr,
    standardDeviation,
    shapesOfData,
  ],
  checkpoint,
  // Unit 1 opens straight into lesson 1; its story arrives with the mission brief.
  hook: null,
  missionId: 'late-delivery-mystery',
};
