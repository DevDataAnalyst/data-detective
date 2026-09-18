"""Hidden checks for Unit 3's mission, "The Checkout Redesign".

Loaded into Pyodide after runner.py, in place of checks.py. `compute_reference` works out every
answer from checkout.csv when Python starts, `reference_summary` reports facts for the summary
screen, and `check_task` inspects the learner's variables without giving the answer away.
"""

import json
import math

import pandas as pd

RATE_TOLERANCE = 0.00005
WEEKEND = ("Sat", "Sun")
REFERENCE = {}


def _two_sided_p(z):
    return math.erfc(abs(z) / math.sqrt(2))


def compute_reference(path):
    df = pd.read_csv(path)
    totals = df.groupby("variant")[["visitors", "orders"]].sum()
    rates = totals["orders"] / totals["visitors"]
    old, new = totals.loc["old"], totals.loc["new"]
    old_rate, new_rate = float(rates["old"]), float(rates["new"])
    pooled = float((old["orders"] + new["orders"]) / (old["visitors"] + new["visitors"]))
    pooled_error = math.sqrt(pooled * (1 - pooled) * (1 / old["visitors"] + 1 / new["visitors"]))
    error = math.sqrt(
        old_rate * (1 - old_rate) / old["visitors"] + new_rate * (1 - new_rate) / new["visitors"]
    )
    z_pooled = (new_rate - old_rate) / pooled_error
    z_unpooled = (new_rate - old_rate) / error

    weekend = df["day"].isin(WEEKEND)
    by_day = df.assign(weekend=weekend).groupby(["weekend", "variant"])[["visitors", "orders"]].sum()
    day_rates = by_day["orders"] / by_day["visitors"]
    weekend_share = df[weekend].groupby("variant")["visitors"].sum() / totals["visitors"]
    daily_rates = df["orders"] / df["visitors"]

    reference = {
        "columns": [str(column) for column in df.columns],
        "n_rows": int(len(df)),
        "days": int(df["date"].nunique()),
        "visitors": int(df["visitors"].sum()),
        "rates": {"old": old_rate, "new": new_rate},
        "rates_mean_of_days": {
            str(variant): float(value)
            for variant, value in (df.assign(rate=daily_rates).groupby("variant")["rate"].mean()).items()
        },
        "orders": {"old": float(old["orders"]), "new": float(new["orders"])},
        "z": [z_pooled, z_unpooled],
        "p_value": [_two_sided_p(z_pooled), _two_sided_p(z_unpooled)],
        "day_rates": {
            ("weekend" if is_weekend else "weekday", str(variant)): float(value)
            for (is_weekend, variant), value in day_rates.items()
        },
        "day_type_rates": {
            "weekend" if is_weekend else "weekday": float(group["orders"].sum() / group["visitors"].sum())
            for is_weekend, group in df.assign(weekend=weekend).groupby("weekend")
        },
        "weekend_share": {str(variant): float(value) for variant, value in weekend_share.items()},
    }
    REFERENCE.clear()
    REFERENCE.update(reference)
    return reference


def _percent(fraction, decimals=1):
    return f"{fraction * 100:.{decimals}f}%"


def reference_summary():
    """Facts about the dataset for the mission complete screen, as JSON."""
    ref = REFERENCE
    return json.dumps(
        {
            "days": ref["days"],
            "visitors": f"{ref['visitors']:,}",
            "oldRate": _percent(ref["rates"]["old"]),
            "newRate": _percent(ref["rates"]["new"]),
            "oldWeekendShare": _percent(ref["weekend_share"]["old"], 0),
            "newWeekendShare": _percent(ref["weekend_share"]["new"], 0),
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


def _variable(namespace, name):
    return namespace.get(name, _MISSING)


def _variant_rates(value):
    """{"old": rate, "new": rate} from a Series or a one-column DataFrame, else None."""
    if isinstance(value, pd.DataFrame):
        frame = value
        if "variant" in frame.columns:
            frame = frame.set_index("variant")
        columns = [str(column).lower() for column in frame.columns]
        for name in ("rate", "conversion", "conversion_rate"):
            if name in columns:
                value = frame[frame.columns[columns.index(name)]]
                break
        else:
            numeric = frame.select_dtypes("number").columns
            if len(numeric) != 1:
                return None
            value = frame[numeric[0]]
    if not isinstance(value, pd.Series):
        return None
    rates = {}
    for label, item in value.items():
        number = _number(item)
        if number is None:
            return None
        rates[str(label).strip().lower()] = number
    return rates


def _all_numbers(value):
    """Every number in a Series or DataFrame, for checks where the labels can be anything."""
    if isinstance(value, pd.DataFrame):
        columns = [str(column).lower() for column in value.columns]
        for name in ("rate", "conversion", "conversion_rate"):
            if name in columns:
                return _all_numbers(value[value.columns[columns.index(name)]])
        numeric = value.select_dtypes("number")
        if numeric.shape[1] == 0:
            return None
        numbers = [_number(item) for item in numeric.to_numpy().ravel()]
    elif isinstance(value, pd.Series):
        numbers = [_number(item) for item in value.to_numpy()]
    else:
        return None
    return None if any(number is None for number in numbers) else numbers


def _close(actual, expected, tolerance=RATE_TOLERANCE):
    return abs(actual - expected) <= tolerance


def _same_numbers(actual, expected, tolerance=RATE_TOLERANCE):
    if actual is None or len(actual) != len(expected):
        return False
    return all(_close(a, b, tolerance) for a, b in zip(sorted(actual), sorted(expected)))


# ------------------------------------------------------------------------------------------------
# One check per task


def _check_conversion(ns, ref):
    df = _variable(ns, "df")
    if df is _MISSING:
        return _not_yet("Create a DataFrame called `df` by reading checkout.csv.")
    # Columns added along the way, such as a weekend flag, are fine.
    if not isinstance(df, pd.DataFrame) or not set(ref["columns"]).issubset(str(c) for c in df.columns):
        return _not_yet("`df` should be the whole file, read with pd.read_csv(\"checkout.csv\").")
    if len(df) != ref["n_rows"]:
        return _not_yet(f"`df` has {len(df)} rows, but the file has more. Read the whole file.")
    value = _variable(ns, "conversion")
    if value is _MISSING:
        return _not_yet("`df` looks right. Now store each checkout's conversion rate in `conversion`.")
    rates = _variant_rates(value)
    if rates is None or set(rates) != {"old", "new"}:
        return _not_yet("`conversion` should hold two rates, labelled old and new.")
    expected = ref["rates"]
    if all(_close(rates[key], expected[key]) for key in expected):
        return _passed(
            f"The new checkout converts at {_percent(expected['new'])} and the old one at "
            f"{_percent(expected['old'])}. That looks like a win. Is the gap bigger than chance?"
        )
    if all(_close(rates[key], ref["rates_mean_of_days"][key]) for key in expected):
        return _not_yet(
            "That averages the daily rates, but days had different numbers of visitors. Add up "
            "orders and visitors for each checkout first, then divide."
        )
    if all(_close(rates[key], ref["orders"][key], 0.5) for key in expected):
        return _not_yet("These are order counts. Divide by each checkout's visitors.")
    if all(_close(rates[key], expected[key] * 100, RATE_TOLERANCE * 100) for key in expected):
        return _not_yet("These look like percentages. Keep the rates as fractions, such as 0.05.")
    return _not_yet(
        "The rates do not match. Group by variant, add up visitors and orders, then divide orders "
        "by visitors."
    )


def _check_significance(ns, ref):
    z = _variable(ns, "z")
    if z is _MISSING:
        return _not_yet("Store the z statistic of the difference in `z`.")
    z_number = _number(z)
    if z_number is None:
        return _not_yet("`z` should be a single number.")
    if not any(abs(abs(z_number) - abs(expected)) <= 0.01 for expected in ref["z"]):
        return _not_yet(
            "`z` does not match. It is the difference in conversion rates divided by its standard "
            "error, worked out from the pooled rate and both checkouts' visitors."
        )
    p_value = _variable(ns, "p_value")
    if p_value is _MISSING:
        return _not_yet("`z` is right. Now turn it into a two-sided p-value, `p_value`.")
    p_number = _number(p_value)
    if p_number is None:
        return _not_yet("`p_value` should be a single number.")
    matches = [abs(p_number - expected) <= max(1e-12, expected * 0.05) for expected in ref["p_value"]]
    if any(matches):
        return _passed(
            f"z is about {abs(z_number):.1f}, so p is tiny: chance alone almost never makes a gap "
            "this big. But chance is not the only way a test can mislead."
        )
    if any(abs(p_number - expected / 2) <= max(1e-12, expected * 0.025) for expected in ref["p_value"]):
        return _not_yet("That is a one-sided p-value. A difference could go either way, so double it.")
    if p_number > 0.5:
        return _not_yet("That p-value is far too big for a z this large. Use erfc(abs(z) / sqrt(2)).")
    return _not_yet("`p_value` does not match your `z`. Use erfc(abs(z) / sqrt(2)).")


def _check_by_day_type(ns, ref):
    value = _variable(ns, "by_day_type")
    if value is _MISSING:
        return _not_yet("Store the conversion rate for each day type and checkout in `by_day_type`.")
    numbers = _all_numbers(value)
    expected = list(ref["day_rates"].values())
    if numbers is None:
        return _not_yet("`by_day_type` should hold conversion rates, one per day type and checkout.")
    if _same_numbers(numbers, expected):
        rate = ref["day_rates"]
        return _passed(
            f"Weekdays: old {_percent(rate[('weekday', 'old')], 2)}, new {_percent(rate[('weekday', 'new')], 2)}. "
            f"Weekends: old {_percent(rate[('weekend', 'old')], 2)}, new {_percent(rate[('weekend', 'new')], 2)}. "
            "Day for day, the two checkouts convert the same."
        )
    if _same_numbers(numbers, list(ref["day_type_rates"].values())):
        return _not_yet("These split by day type only. Split by checkout as well: four rates in all.")
    if len(numbers) == 4 and _same_numbers([n / 100 for n in numbers], expected):
        return _not_yet("These look like percentages. Keep the rates as fractions, such as 0.05.")
    if len(numbers) != 4:
        return _not_yet(
            f"`by_day_type` has {len(numbers)} values. You need one per day type and checkout: 4."
        )
    return _not_yet(
        "The rates do not match. Mark weekend rows with df[\"day\"].isin([\"Sat\", \"Sun\"]), group "
        "by that and variant, add up, then divide orders by visitors."
    )


def _check_daily_chart(ns, ref):
    titles = LAST_RUN.get("figure_titles", [])  # noqa: F821 - defined by runner.py
    if not titles:
        return _not_yet("No chart appeared yet. Draw it with matplotlib and end with plt.show().")
    if not any(title.strip() and "____" not in title for title in titles):
        return _not_yet("Your chart needs a title. Add one with ax.set_title(...).")
    return _passed("Both lines rise together every weekend. The picture makes the case at a glance.")


CHECKS = {
    "conversion": _check_conversion,
    "significance": _check_significance,
    "by-day-type": _check_by_day_type,
    "daily-chart": _check_daily_chart,
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
