# Scripts

## `generate-deliveries.ts`

Generates `public/data/deliveries.csv`, the dataset for the mission "The Late Delivery Mystery".

```bash
npm run generate:data
```

The script uses a fixed random seed (`20260917`), so it always writes the same file. After writing,
it re-checks every planted pattern below and exits with an error if one is missing. If you change
the generator, run it and make sure it ends with "All planted patterns are present."

Mission grading does not hard-code these numbers: the Python worker computes its reference answers
from the CSV when it loads. The numbers here describe the current file, for people writing hints,
tests and the model recommendation.

### Columns

| Column              | Type    | Notes                                                    |
| ------------------- | ------- | -------------------------------------------------------- |
| `order_id`          | text    | `ORD-10001` to `ORD-10600`, in shuffled order            |
| `city`              | text    | Bengaluru, Pune, Hyderabad, Kolkata, Chennai (120 each)  |
| `order_hour`        | integer | 0–23, busiest at lunch (12–14) and dinner (19–22)        |
| `distance_km`       | decimal | 0.8–7.0 km                                               |
| `prep_time_min`     | integer | Restaurant preparation time, 6–28 minutes                |
| `delivery_time_min` | number  | Whole minutes from order to delivery. Some are missing   |
| `rating`            | number  | 1–5 stars, lower for slower deliveries. Some are missing |

pandas reads `delivery_time_min` and `rating` as decimals (`float64`) because they contain missing
values.

### Planted patterns

1. **Missing values.** 18 rows (3%) have no `delivery_time_min`, and 42 rows have no `rating`.
   A correct `clean` DataFrame drops only the 18, leaving 582 rows. Dropping every row with any
   missing value (`df.dropna()`) wrongly removes rows that only lack a rating.
2. **Logging errors.** Seven orders were logged as taking 305–476 minutes: five in Hyderabad, one in
   Pune and one in Chennai. They are all outliers under the 1.5 × IQR rule.
3. **A misleading mean.** Hyderabad's mean delivery time is the highest of all cities (48.5 min)
   only because of its logging errors. Its median (34 min) is ordinary, and without outliers its
   mean drops to 33.2 min, the biggest change of any city.
4. **A genuinely slow city.** Kolkata has the highest median (39 min) and the highest mean once
   outliers are removed (38.3 min).
5. **Dinner rush.** Kolkata is slow at dinner: orders placed between 19:00 and 22:59 average
   47.1 minutes, against 35.8 minutes at other hours. No other city has this pattern.
6. **Not every outlier is an error.** With fences at 12.875 and 55.875 minutes, the IQR rule flags
   13 orders: the seven logging errors plus six real Kolkata dinner deliveries of 56 minutes or
   more. A careful analyst notices the difference.

### Reference values (current file, computed with pandas)

| City      | Mean  | Median | Mean without outliers |
| --------- | ----- | ------ | --------------------- |
| Bengaluru | 33.91 | 34     | 33.91                 |
| Chennai   | 35.74 | 34     | 33.46                 |
| Hyderabad | 48.51 | 34     | 33.16                 |
| Kolkata   | 39.43 | 39     | 38.31                 |
| Pune      | 35.63 | 33     | 33.02                 |

Q1 = 29, Q3 = 39.75, IQR = 10.75, fences 12.875 and 55.875, `n_outliers` = 13.
