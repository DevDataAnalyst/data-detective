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
    },
  ],
};
