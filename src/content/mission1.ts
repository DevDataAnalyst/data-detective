import type { Mission } from './types';

/**
 * Mission 1: The Late Delivery Mystery. The dataset and its planted patterns are described in
 * scripts/README.md.
 */
export const lateDeliveryMystery: Mission = {
  id: 'late-delivery-mystery',
  title: 'The Late Delivery Mystery',
  brief:
    'You have just joined a food delivery startup as a junior analyst. Customers in some cities complain that their food keeps arriving late.\n\nThe operations manager wants to know three things before next week’s review: where delivery times are **really** worst, whether a few extreme cases are distorting the averages, and what the team should look at first.\n\nYou have 600 recent orders in `deliveries.csv`. Like most real data, it is messy. Work through the tasks in Python, then write your recommendation.',
  dataset: {
    fileName: 'deliveries.csv',
    url: 'data/deliveries.csv',
    columns: [
      { name: 'order_id', description: 'Order reference' },
      { name: 'city', description: 'Bengaluru, Pune, Hyderabad, Kolkata or Chennai' },
      { name: 'order_hour', description: 'Hour the order was placed, 0–23' },
      { name: 'distance_km', description: 'Distance from restaurant to customer' },
      { name: 'prep_time_min', description: 'Minutes the restaurant took to prepare the food' },
      { name: 'delivery_time_min', description: 'Minutes from order to delivery' },
      { name: 'rating', description: 'Customer rating, 1–5 stars' },
    ],
  },
  summary: {
    whatYouDid: [
      { text: 'Loaded {orders} delivery orders with pandas' },
      {
        text: 'Found {missingDeliveryTimes} missing delivery times and removed only those rows',
      },
      { text: 'Compared mean and median delivery times across {cities} cities' },
      { text: 'Flagged {outliers} outliers with the 1.5 × IQR rule' },
      {
        text: 'Showed that {misleadingCity}’s high average came from a few extreme values, while {slowestCity} is genuinely slow',
      },
      { text: 'Found the hours when {slowestCity} is slowest', requiresTask: 'dinner-rush' },
      { text: 'Drew a chart to make the case', requiresTask: 'make-a-chart' },
      { text: 'Wrote a recommendation for the operations manager' },
    ],
    portfolio: [
      { text: 'Delivery delay analysis (Python, pandas), practice project' },
      {
        text: '• Cleaned a dataset of {orders} food delivery orders, handling {missingDeliveryTimes} missing delivery times without discarding useful rows.',
      },
      {
        text: '• Compared delivery times across {cities} cities using means, medians and the 1.5 × IQR rule, flagging {outliers} outliers.',
      },
      {
        text: '• Showed that one city’s high average came from logging errors while {slowestCity} was genuinely slowest, especially at dinner time, and recommended next steps.',
        requiresTask: 'dinner-rush',
      },
      {
        text: '• Showed that one city’s high average came from logging errors while {slowestCity} was genuinely slowest, and recommended next steps.',
        unlessTask: 'dinner-rush',
      },
    ],
  },
  tasks: [
    {
      id: 'load-data',
      kind: 'code',
      title: 'Open the case file',
      instructions:
        'Use pandas to read `deliveries.csv` into a DataFrame called `df`. Store the number of orders in `n_orders`, and look at the first few rows.\n\nReplace each `____` with your code, then press **Run**.',
      starterCode: `import pandas as pd

# Read deliveries.csv into a DataFrame called df
df = pd.read_csv(____)

# Count the orders (rows) and store the number in n_orders
n_orders = ____
print("Orders:", n_orders)

# The last line is displayed as a table
df.head()
`,
      creates: ['df', 'n_orders'],
      hints: {
        nudge: 'pandas reads a CSV file with a single function whose name starts with `read_`.',
        method:
          'Use `pd.read_csv("deliveries.csv")` to make `df`. The built-in `len(df)` counts its rows.',
        example: 'df = pd.read_csv("deliveries.csv")\nn_orders = ____(df)',
      },
    },
    {
      id: 'missing-values',
      kind: 'code',
      title: 'Find the gaps',
      instructions:
        'Count the missing values in each column and store the counts in `missing`.\n\nThen make `clean`: a copy of `df` without the rows where `delivery_time_min` is missing. Keep rows where only the rating is missing, because their delivery times are still useful.',
      starterCode: `# Count the missing values in each column
missing = ____
print(missing)

# Drop only the rows with no delivery_time_min
clean = ____
print("Rows before:", len(df), "after:", len(clean))
`,
      creates: ['missing', 'clean'],
      hints: {
        nudge: 'First mark where values are missing, then add up the marks in each column.',
        method:
          '`df.isna()` marks missing values as True and `.sum()` counts them per column. `dropna(subset=[...])` drops a row only when the listed columns are missing.',
        example: 'missing = df.isna().____()\nclean = df.dropna(subset=["____"])',
      },
    },
    {
      id: 'city-averages',
      kind: 'code',
      title: 'Compare the cities',
      instructions:
        'Using `clean`, work out the mean and the median `delivery_time_min` for each city. Store them in a DataFrame called `city_stats`, with one row per city and columns named `mean` and `median`.\n\nWhich city looks slowest? Do the mean and median agree?',
      starterCode: `# Group the orders by city and summarise delivery_time_min
city_stats = ____

city_stats
`,
      creates: ['city_stats'],
      hints: {
        nudge: 'You want one row per city, so group the orders by city first.',
        method:
          'Use `clean.groupby("city")["delivery_time_min"]`, then `.agg()` with a list of the summaries you want.',
        example: 'city_stats = clean.groupby("city")["delivery_time_min"].agg(["mean", "____"])',
      },
    },
    {
      id: 'flag-outliers',
      kind: 'code',
      title: 'Flag the outliers',
      instructions:
        'Use the IQR rule on `clean["delivery_time_min"]`. Find Q1 and Q3, set the fences 1.5 × IQR beyond them, and count how many orders fall outside the fences. Store the count in `n_outliers`.',
      starterCode: `times = clean["delivery_time_min"]

q1 = ____
q3 = ____
iqr = q3 - q1
lower = q1 - 1.5 * iqr
upper = ____

n_outliers = ____
print("Fences:", lower, "to", upper)
print("Outliers:", n_outliers)
`,
      creates: ['n_outliers'],
      hints: {
        nudge:
          'Q1 and Q3 are the 25th and 75th percentiles. Anything beyond the fences counts as an outlier.',
        method:
          '`times.quantile(0.25)` gives Q1. The filter `(times < lower) | (times > upper)` is True for outliers, and `.sum()` counts the Trues.',
        example:
          'q1 = times.quantile(0.25)\nq3 = times.quantile(____)\nupper = q3 + 1.5 * iqr\nn_outliers = ((times < lower) | (times > ____)).sum()',
      },
    },
    {
      id: 'without-outliers',
      kind: 'code',
      title: 'Remove the distortion',
      instructions:
        'Keep only the orders inside the fences from the previous task. Recompute the mean delivery time for each city and store it in `city_stats_no_outliers`.\n\nCompare it with `city_stats`. Which city’s average changed the most, and which city is still slow?',
      starterCode: `# Keep only the orders inside the fences
no_outliers = ____

# Mean delivery time per city, without outliers
city_stats_no_outliers = ____

print(city_stats["mean"].round(1))
print(city_stats_no_outliers.round(1))
`,
      creates: ['city_stats_no_outliers'],
      hints: {
        nudge:
          'Keep the orders whose delivery time sits between the fences, then repeat the group-by from task 3.',
        method:
          'Filter with `clean[(clean["delivery_time_min"] >= lower) & (clean["delivery_time_min"] <= upper)]`, then group by city and take `.mean()`.',
        example:
          'no_outliers = clean[(clean["delivery_time_min"] >= lower) & (clean["delivery_time_min"] <= upper)]\ncity_stats_no_outliers = no_outliers.groupby("city")["delivery_time_min"].____()',
      },
    },
    {
      id: 'recommendation',
      kind: 'written',
      title: 'Brief the manager',
      instructions:
        'Write a short message to the operations manager. Say which city is really slowest, whether a few extreme cases distort the averages, and what the team should look at first.',
      placeholder:
        'For example: “The high average in … is mostly caused by …. The city that is genuinely slow is …, especially ….”',
      suggestedSentences: { min: 2, max: 4 },
      minWords: 15,
      selfReview: [
        { id: 'slowest-city', label: 'I name the city that is genuinely slowest' },
        {
          id: 'mean-vs-median',
          label: 'I explain that a few extreme values distort the mean, or compare mean and median',
        },
        { id: 'next-step', label: 'I suggest a concrete next step for the team' },
      ],
      modelAnswer:
        'Kolkata is where deliveries are genuinely slow: it has the highest median delivery time, and it stays the slowest city after removing outliers, especially for dinner orders placed between 7 pm and 11 pm. Hyderabad only looks worst on average because a handful of orders were logged as taking over five hours, which must be recording errors; its median is normal. I suggest fixing the delivery time logging first, then reviewing Kolkata’s evening operations, such as how many riders are available at dinner time.',
    },
    {
      id: 'dinner-rush',
      kind: 'code',
      stretch: true,
      title: 'The dinner rush',
      instructions:
        'For the city that is genuinely slowest, work out the mean delivery time for each `order_hour`. Store the result in `slow_city_by_hour`. At what time of day is it slowest?',
      starterCode: `slow_city = "____"

slow_city_by_hour = ____

slow_city_by_hour
`,
      creates: ['slow_city_by_hour'],
      hints: {
        nudge:
          'Check `city_stats_no_outliers` to see which city is slowest, then look only at that city.',
        method:
          '`clean[clean["city"] == slow_city]` keeps one city. Group it by `order_hour` and take the mean delivery time.',
        example:
          'slow_city = "____"\ncity_orders = clean[clean["city"] == slow_city]\nslow_city_by_hour = city_orders.groupby("____")["delivery_time_min"].mean()',
      },
    },
    {
      id: 'make-a-chart',
      kind: 'code',
      stretch: true,
      title: 'Draw the evidence',
      instructions:
        'Make a chart with matplotlib that would convince the manager, for example a bar chart of `city_stats_no_outliers` or a line chart of `slow_city_by_hour`. Give it a title.',
      starterCode: `import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6, 3.5))

# Draw on ax, for example: city_stats_no_outliers.plot.bar(ax=ax)
____

ax.set_title("____")
plt.show()
`,
      creates: [],
      hints: {
        nudge: 'A pandas Series can draw itself. Point it at the `ax` you already made.',
        method:
          '`city_stats_no_outliers.plot.bar(ax=ax)` draws one bar per city, and `ax.set_title("...")` adds a title.',
        example:
          'city_stats_no_outliers.plot.bar(ax=ax)\nax.set_title("____")\nax.set_ylabel("Mean delivery time (min)")\nplt.show()',
      },
    },
  ],
};
