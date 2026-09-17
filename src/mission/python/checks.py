"""Hidden checks for the mission tasks.

Loaded into Pyodide after runner.py. `compute_reference` works out the right answers from the
dataset when Python starts, so regenerating the CSV never breaks grading. `check_task` inspects the
learner's variables after each run and explains, without giving the answer away, what is not
right yet.
"""

import json
import math

import pandas as pd

TOLERANCE = 0.01
REFERENCE = {}


def _floats(series):
    return {str(label): float(value) for label, value in series.items()}


def compute_reference(path):
    df = pd.read_csv(path)
    clean = df.dropna(subset=["delivery_time_min"])
    times = clean["delivery_time_min"]
    q1 = float(times.quantile(0.25))
    q3 = float(times.quantile(0.75))
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    inside = (times >= lower) & (times <= upper)
    no_outliers = clean[inside]

    means = clean.groupby("city")["delivery_time_min"].mean()
    no_outlier_means = no_outliers.groupby("city")["delivery_time_min"].mean()

    kept_by_city_fences = []
    for _, group in clean.groupby("city"):
        city_times = group["delivery_time_min"]
        city_q1, city_q3 = city_times.quantile(0.25), city_times.quantile(0.75)
        spread = city_q3 - city_q1
        kept_by_city_fences.append(
            group[(city_times >= city_q1 - 1.5 * spread) & (city_times <= city_q3 + 1.5 * spread)]
        )
    per_city_fence_means = pd.concat(kept_by_city_fences).groupby("city")["delivery_time_min"].mean()

    slowest = str(no_outlier_means.idxmax())
    by_hour = {
        str(city): _floats(group.groupby("order_hour")["delivery_time_min"].mean())
        for city, group in clean.groupby("city")
    }
    slow_no_outliers = no_outliers[no_outliers["city"] == slowest]
    slow_clean = clean[clean["city"] == slowest]
    slow_hours = slow_clean.groupby("order_hour")["delivery_time_min"].agg(["mean", "count"])
    # Hours clearly slower than usual, ignoring hours with too few orders to trust.
    rush_hours = sorted(
        int(hour)
        for hour, row in slow_hours.iterrows()
        if row["count"] >= 5 and row["mean"] >= slow_clean["delivery_time_min"].mean() + 6
    )

    reference = {
        "n_orders": int(len(df)),
        "columns": [str(column) for column in df.columns],
        "missing": {str(column): int(count) for column, count in df.isna().sum().items()},
        "clean_rows": int(len(clean)),
        "dropna_all_rows": int(len(df.dropna())),
        "cities": sorted(str(city) for city in means.index),
        "city_mean": _floats(means),
        "city_median": _floats(clean.groupby("city")["delivery_time_min"].median()),
        "q1": q1,
        "q3": q3,
        "lower": lower,
        "upper": upper,
        "n_outliers": int((~inside).sum()),
        "n_outliers_strict": int(((times <= lower) | (times >= upper)).sum()),
        "n_outliers_3iqr": int(((times < q1 - 3 * iqr) | (times > q3 + 3 * iqr)).sum()),
        "n_outside_quartiles": int(((times < q1) | (times > q3)).sum()),
        "city_mean_no_outliers": _floats(no_outlier_means),
        "city_mean_per_city_fences": _floats(per_city_fence_means),
        "raw_slowest_city": str(means.idxmax()),
        "slowest_city": slowest,
        "city_by_hour": by_hour,
        "rush_hours": rush_hours,
        "slow_city_by_hour_no_outliers": _floats(
            slow_no_outliers.groupby("order_hour")["delivery_time_min"].mean()
        ),
    }
    REFERENCE.clear()
    REFERENCE.update(reference)
    return reference


def reference_summary():
    """Facts about the dataset for the mission complete screen, as JSON."""
    return json.dumps(
        {
            "orders": REFERENCE["n_orders"],
            "missingDeliveryTimes": REFERENCE["missing"]["delivery_time_min"],
            "cities": len(REFERENCE["cities"]),
            "outliers": REFERENCE["n_outliers"],
            "misleadingCity": REFERENCE["raw_slowest_city"],
            "slowestCity": REFERENCE["slowest_city"],
        }
    )


# ------------------------------------------------------------------------------------------------
# Helpers

_MISSING = object()


def _passed(message):
    return {"passed": True, "message": message}


def _not_yet(message):
    return {"passed": False, "message": message}


def _number(value):
    """A float from Python or NumPy numbers; None for anything else, including booleans."""
    try:
        import numpy as np

        if isinstance(value, (bool, np.bool_)):
            return None
        if isinstance(value, (int, float, np.integer, np.floating)):
            number = float(value)
            return None if math.isnan(number) else number
    except Exception:  # noqa: BLE001
        return None
    return None


def _labelled_numbers(value, preferred_columns=("mean", "delivery_time_min")):
    """{label: number} from a Series, or from a DataFrame with one obvious numeric column."""
    if isinstance(value, pd.DataFrame):
        frame = value
        if isinstance(frame.columns, pd.MultiIndex):
            frame = frame.copy()
            frame.columns = [str(column[-1]) for column in frame.columns]
        for key in ("city", "order_hour"):
            if key in frame.columns:
                frame = frame.set_index(key)
                break
        columns = [str(column).lower() for column in frame.columns]
        chosen = next((frame.columns[columns.index(name)] for name in preferred_columns if name in columns), None)
        if chosen is None:
            numeric = frame.select_dtypes("number").columns
            if len(numeric) != 1:
                return None
            chosen = numeric[0]
        value = frame[chosen]
    if not isinstance(value, pd.Series):
        return None
    numbers = {}
    for label, item in value.items():
        number = _number(item)
        if number is None:
            return None
        label_text = str(int(label)) if _number(label) is not None and float(label).is_integer() else str(label)
        numbers[label_text] = number
    return numbers


def _matches(actual, expected, tolerance=TOLERANCE):
    if actual is None or set(actual) != set(expected):
        return False
    return all(abs(actual[key] - expected[key]) <= tolerance for key in expected)


def _first_mismatch(actual, expected):
    for key in sorted(expected):
        if key not in actual or abs(actual[key] - expected[key]) > TOLERANCE:
            return key
    return None


def _variable(namespace, name):
    return namespace.get(name, _MISSING)


# ------------------------------------------------------------------------------------------------
# One check per task


def _check_load_data(ns, ref):
    df = _variable(ns, "df")
    if df is _MISSING:
        return _not_yet("Create a DataFrame called `df` by reading deliveries.csv.")
    if not isinstance(df, pd.DataFrame):
        return _not_yet("`df` should be a pandas DataFrame. Read the file with pd.read_csv(...).")
    if [str(column) for column in df.columns] != ref["columns"]:
        return _not_yet("`df` should have the same columns as the file, such as city and delivery_time_min.")
    if len(df) != ref["n_orders"]:
        return _not_yet(f"`df` has {len(df)} rows, but the file has more. Read the whole file.")
    n_orders = _variable(ns, "n_orders")
    if n_orders is _MISSING:
        return _not_yet("`df` looks right. Now store the number of orders in `n_orders`.")
    number = _number(n_orders)
    if number is None:
        return _not_yet("`n_orders` should be a single number, such as len(df).")
    if number != ref["n_orders"]:
        return _not_yet(f"`n_orders` is {n_orders:g}, which is not the number of rows in `df`.")
    return _passed(f"Case file open: {ref['n_orders']} orders, {len(ref['columns'])} columns.")


def _check_missing_values(ns, ref):
    df = _variable(ns, "df")
    if df is _MISSING:
        return _not_yet("`df` does not exist yet. Pass task 1 first, or run its code again.")
    missing = _variable(ns, "missing")
    if missing is _MISSING:
        return _not_yet("Store the missing value counts in `missing`, one count per column.")
    if isinstance(missing, pd.DataFrame):
        return _not_yet("`missing` should hold one count per column. Add up each column's True values.")
    if _number(missing) is not None:
        return _not_yet("`missing` should count each column separately, not give one total.")
    counts = _labelled_numbers(missing)
    if counts is None or set(counts) != set(ref["missing"]):
        return _not_yet("`missing` should have one count for every column in `df`.")
    wrong = [column for column, count in ref["missing"].items() if counts[column] != count]
    if wrong:
        return _not_yet(f"The count for {wrong[0]} in `missing` does not match the data.")

    clean = _variable(ns, "clean")
    if clean is _MISSING:
        return _not_yet("`missing` is right. Now make `clean` without the rows missing a delivery time.")
    if not isinstance(clean, pd.DataFrame) or "delivery_time_min" not in clean.columns:
        return _not_yet("`clean` should be a DataFrame with the same columns as `df`.")
    still_missing = int(clean["delivery_time_min"].isna().sum())
    if still_missing:
        return _not_yet(f"`clean` still has {still_missing} missing delivery times.")
    if len(clean) == ref["dropna_all_rows"] and ref["dropna_all_rows"] != ref["clean_rows"]:
        return _not_yet(
            f"`clean` has {len(clean)} rows: it also dropped orders where only the rating is missing. "
            "Drop rows based on delivery_time_min only."
        )
    if len(clean) != ref["clean_rows"]:
        return _not_yet(f"`clean` has {len(clean)} rows. Keep every order that has a delivery time.")
    return _passed(
        f"{ref['missing']['delivery_time_min']} orders had no delivery time, so `clean` keeps "
        f"{ref['clean_rows']}. Orders missing only a rating are still useful."
    )


def _check_city_averages(ns, ref):
    city_stats = _variable(ns, "city_stats")
    if city_stats is _MISSING:
        return _not_yet("Create `city_stats` with the mean and median delivery time for each city.")
    if isinstance(city_stats, pd.Series):
        return _not_yet("`city_stats` should be a DataFrame with both a mean and a median column.")
    if not isinstance(city_stats, pd.DataFrame):
        return _not_yet("`city_stats` should be a DataFrame with one row per city.")
    frame = city_stats
    if isinstance(frame.columns, pd.MultiIndex):
        frame = frame.copy()
        frame.columns = [str(column[-1]) for column in frame.columns]
    if "city" in frame.columns:
        frame = frame.set_index("city")
    columns = {str(column).lower(): column for column in frame.columns}
    for needed in ("mean", "median"):
        if needed not in columns:
            return _not_yet(f"`city_stats` needs a column named {needed}.")
    if sorted(str(city) for city in frame.index) != ref["cities"]:
        return _not_yet(f"`city_stats` should have exactly one row per city ({len(ref['cities'])} rows).")
    means = _labelled_numbers(frame[columns["mean"]])
    medians = _labelled_numbers(frame[columns["median"]])
    if not _matches(means, ref["city_mean"]):
        city = _first_mismatch(means or {}, ref["city_mean"])
        return _not_yet(f"The mean for {city} does not match. Summarise delivery_time_min in `clean`.")
    if not _matches(medians, ref["city_median"]):
        city = _first_mismatch(medians or {}, ref["city_median"])
        return _not_yet(f"The median for {city} does not match. Summarise delivery_time_min in `clean`.")
    return _passed(
        f"{ref['raw_slowest_city']} has the highest mean, but compare its median with the other "
        "cities. Something is pulling that average up."
    )


def _check_flag_outliers(ns, ref):
    n_outliers = _variable(ns, "n_outliers")
    if n_outliers is _MISSING:
        return _not_yet("Store the number of outliers in `n_outliers`.")
    if isinstance(n_outliers, (pd.Series, pd.DataFrame)):
        return _not_yet("`n_outliers` should be a single number. Count the True values with .sum().")
    number = _number(n_outliers)
    if number is None:
        return _not_yet("`n_outliers` should be a single number, the count of outliers.")
    if number in (ref["n_outliers"], ref["n_outliers_strict"]):
        return _passed(
            f"{ref['n_outliers']} orders fall outside the fences. Look at them: some times are "
            "impossible, but not all of them."
        )
    if number == ref["n_outliers_3iqr"] and ref["n_outliers_3iqr"] != ref["n_outliers"]:
        return _not_yet("That count uses fences 3 × IQR out. The rule uses 1.5 × IQR.")
    if number == ref["n_outside_quartiles"]:
        return _not_yet("That counts everything outside Q1 and Q3. The fences sit 1.5 × IQR further out.")
    if number == ref["clean_rows"] or number == ref["n_orders"]:
        return _not_yet("That is the number of orders, not outliers. Count only values outside the fences.")
    return _not_yet(
        f"`n_outliers` is {number:g}, but the IQR rule finds a different number. Check Q1, Q3 and "
        "both fences."
    )


def _check_without_outliers(ns, ref):
    value = _variable(ns, "city_stats_no_outliers")
    if value is _MISSING:
        return _not_yet("Store the mean delivery time per city, without outliers, in `city_stats_no_outliers`.")
    means = _labelled_numbers(value)
    if means is None or set(means) != set(ref["cities"]):
        return _not_yet("`city_stats_no_outliers` should hold one mean delivery time per city.")
    if _matches(means, ref["city_mean_no_outliers"]):
        drop = {city: ref["city_mean"][city] - ref["city_mean_no_outliers"][city] for city in ref["cities"]}
        biggest = max(drop, key=drop.get)
        return _passed(
            f"{biggest}'s average dropped the most once outliers were removed. "
            f"{ref['slowest_city']} is still the slowest city."
        )
    if _matches(means, ref["city_mean"]):
        return _not_yet("These are the same means as in `city_stats`. Remove the outliers before grouping.")
    if _matches(means, ref["city_median"]):
        return _not_yet("These look like medians. This task asks for the mean without outliers.")
    if _matches(means, ref["city_mean_per_city_fences"]):
        return _not_yet(
            "It looks like you worked out separate fences for each city. Use the fences from task 4, "
            "which were computed on all orders."
        )
    city = _first_mismatch(means, ref["city_mean_no_outliers"])
    return _not_yet(f"The mean for {city} does not match. Keep orders from `lower` to `upper`, then group by city.")


def _check_dinner_rush(ns, ref):
    value = _variable(ns, "slow_city_by_hour")
    if value is _MISSING:
        return _not_yet("Store the mean delivery time for each hour in `slow_city_by_hour`.")
    by_hour = _labelled_numbers(value)
    if by_hour is None:
        return _not_yet("`slow_city_by_hour` should hold one mean delivery time per order_hour.")
    slowest = ref["slowest_city"]
    if _matches(by_hour, ref["city_by_hour"][slowest]) or _matches(
        by_hour, ref["slow_city_by_hour_no_outliers"]
    ):
        hours = ref["rush_hours"]
        window = f" Its slowest stretch runs from {hours[0]}:00 to {hours[-1]}:59." if hours else ""
        return _passed(f"You found when {slowest} is slow.{window}")
    for city, hours in ref["city_by_hour"].items():
        if _matches(by_hour, hours):
            if city == ref["raw_slowest_city"]:
                return _not_yet(
                    f"This is {city}. Its high average came from a few extreme values. Which city "
                    "is still slow without them?"
                )
            return _not_yet(f"This is {city}, which is not the slowest city once outliers are removed.")
    return _not_yet("The hourly means do not match. Filter to one city, then group by order_hour.")


def _check_make_a_chart(ns, ref):
    titles = LAST_RUN.get("figure_titles", [])  # noqa: F821 - defined by runner.py
    if not titles:
        return _not_yet("No chart appeared yet. Draw it with matplotlib and end with plt.show().")
    if not any(title.strip() and "____" not in title for title in titles):
        return _not_yet("Your chart needs a title. Add one with ax.set_title(...).")
    return _passed("A clear chart makes the case to a busy manager in seconds.")


CHECKS = {
    "load-data": _check_load_data,
    "missing-values": _check_missing_values,
    "city-averages": _check_city_averages,
    "flag-outliers": _check_flag_outliers,
    "without-outliers": _check_without_outliers,
    "dinner-rush": _check_dinner_rush,
    "make-a-chart": _check_make_a_chart,
}


def check_task(task_id, namespace):
    """Checks one task against the reference answers. Returns JSON, never raises."""
    check = CHECKS.get(task_id)
    if check is None:
        return json.dumps(None)
    try:
        result = check(namespace, REFERENCE)
    except Exception as error:  # noqa: BLE001 - a check must never crash the workspace
        result = _not_yet(f"We could not check this yet ({type(error).__name__}). Run your code again.")
    return json.dumps(result)
