"""Hidden checks for Unit 4's mission, "The Final Round".

Loaded into Pyodide after runner.py, in place of checks.py. `compute_reference` works out every
answer from the three CSV files when Python starts (orders.csv, customers.csv, order_items.csv),
`reference_summary` reports facts for the summary screen, and `check_task` inspects the learner's
variables without giving the answer away. SQL tasks arrive as DataFrames, saved by runner.py.
"""

import json
import math
import os

import pandas as pd

MONEY_TOLERANCE = 0.5
REFERENCE = {}


def _by_city(series):
    return {str(city): float(value) for city, value in series.items()}


def compute_reference(path):
    folder = os.path.dirname(path)
    orders = pd.read_csv(path)
    customers = pd.read_csv(os.path.join(folder, "customers.csv"))
    items = pd.read_csv(os.path.join(folder, "order_items.csv"))

    orders = orders.merge(customers[["customer_id", "city"]], on="customer_id", how="left")
    delivered = orders[orders["status"] == "delivered"]
    rows_per_order = items.groupby("order_id").size().rename("rows")
    joined = delivered.merge(rows_per_order, left_on="order_id", right_index=True)
    joined_all = orders.merge(rows_per_order, left_on="order_id", right_index=True)

    lines = items.merge(orders[["order_id", "city", "status"]], on="order_id")
    lines["line_total"] = lines["quantity"] * lines["price"]
    delivered_lines = lines[lines["status"] == "delivered"]
    by_item = delivered_lines.groupby(["city", "item"])["line_total"].sum()
    best = {
        str(city): str(group.droplevel(0).idxmax())
        for city, group in by_item.groupby(level=0)
    }
    by_item_all = lines.groupby(["city", "item"])["line_total"].sum()
    best_all = {
        str(city): str(group.droplevel(0).idxmax())
        for city, group in by_item_all.groupby(level=0)
    }

    revenue = delivered.groupby("city")["order_value"].sum().sort_values(ascending=False)
    reference = {
        "cities": sorted(str(city) for city in customers["city"].unique()),
        "customers": int(len(customers)),
        "orders": int(len(orders)),
        "item_rows": int(len(items)),
        "item_orders": int(items["order_id"].nunique()),
        "revenue": _by_city(revenue),
        "revenue_order": [str(city) for city in revenue.index],
        "dashboard": _by_city((joined["order_value"] * joined["rows"]).groupby(joined["city"]).sum()),
        "with_cancelled": _by_city(orders.groupby("city")["order_value"].sum()),
        "dashboard_with_cancelled": _by_city(
            (joined_all["order_value"] * joined_all["rows"]).groupby(joined_all["city"]).sum()
        ),
        "item_revenue": _by_city(delivered_lines.groupby("city")["line_total"].sum()),
        "item_revenue_all": _by_city(lines.groupby("city")["line_total"].sum()),
        "item_price_only": _by_city(delivered_lines.groupby("city")["price"].sum()),
        "rows_per_order": _by_city(
            joined_all.groupby("city")["rows"].sum() / joined_all.groupby("city").size()
        ),
        "best_sellers": best,
        "best_sellers_all": best_all,
    }
    REFERENCE.clear()
    REFERENCE.update(reference)
    return reference


def _grouped(amount):
    """A whole number with Indian digit grouping, e.g. 169730 -> "1,69,730"."""
    digits = str(int(round(amount)))
    if len(digits) <= 3:
        return digits
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups) + "," + tail


def _rupees(amount):
    return "₹" + _grouped(amount)


def reference_summary():
    """Facts about the dataset for the mission complete screen, as JSON."""
    ref = REFERENCE
    top = ref["revenue_order"][0]
    dashboard_top = max(ref["dashboard"], key=ref["dashboard"].get)
    return json.dumps(
        {
            "orders": _grouped(ref["orders"]),
            "itemRows": _grouped(ref["item_rows"]),
            "topCity": top,
            "topRevenue": _rupees(ref["revenue"][top]),
            "dashboardCity": dashboard_top,
            "dashboardRowsPerOrder": f"{ref['rows_per_order'][dashboard_top]:.1f}",
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


def _columns(frame):
    """Column names in lower case, mapped to the real names."""
    return {str(column).strip().lower(): column for column in frame.columns}


def _city_values(value, cities, preferred):
    """(city labels, numbers) from a Series by city, or a DataFrame with a city column.

    With several number columns, one named in `preferred` wins. Returns None when there is no
    city label to read, and (labels, None) when the numbers cannot be told apart.
    """
    if isinstance(value, pd.Series):
        labels = [str(label) for label in value.index]
        numbers = [_number(item) for item in value.to_numpy()]
        return labels, None if any(n is None for n in numbers) else numbers
    if not isinstance(value, pd.DataFrame):
        return None
    frame = value.reset_index() if value.index.name else value
    names = _columns(frame)
    city_column = names.get("city")
    if city_column is None:
        for column in frame.columns:
            texts = frame[column].astype(str)
            if len(texts) and texts.isin(cities).all():
                city_column = column
                break
    if city_column is None:
        return None
    labels = [str(label) for label in frame[city_column]]
    numeric = [column for column in frame.select_dtypes("number").columns if column != city_column]
    chosen = next((names[name] for name in preferred if name in names and names[name] in numeric), None)
    if chosen is None and len(numeric) == 1:
        chosen = numeric[0]
    if chosen is None:
        return labels, None
    numbers = [_number(item) for item in frame[chosen].to_numpy()]
    return labels, None if any(n is None for n in numbers) else numbers


def _matches(labels, numbers, expected, tolerance=MONEY_TOLERANCE):
    if sorted(labels) != sorted(expected) or numbers is None:
        return False
    return all(abs(number - expected[label]) <= tolerance for label, number in zip(labels, numbers))


# ------------------------------------------------------------------------------------------------
# One check per task


def _check_grain(ns, ref):
    grain = _variable(ns, "grain")
    if grain is _MISSING:
        return _not_yet("Run your query: its result is saved as `grain`.")
    if not isinstance(grain, pd.DataFrame):
        return _not_yet("`grain` should be the table your query returns. Run the query again.")
    names = _columns(grain)
    if "item_rows" not in names or "orders" not in names:
        return _not_yet("Name the two counts with AS: `item_rows` and `orders`.")
    if len(grain) != 1:
        return _not_yet(
            "Count across the whole order_items table: one row, so no GROUP BY this time."
        )
    item_rows = _number(grain[names["item_rows"]].iloc[0])
    orders = _number(grain[names["orders"]].iloc[0])
    if item_rows != ref["item_rows"]:
        return _not_yet("`item_rows` should count every row of order_items: COUNT(*).")
    if orders == ref["item_rows"]:
        return _not_yet(
            "`orders` counts rows too. Count each order once, however many items it has: "
            "COUNT(DISTINCT order_id)."
        )
    if orders != ref["item_orders"]:
        return _not_yet("`orders` should count the different order ids in order_items.")
    ratio = ref["item_rows"] / ref["item_orders"]
    return _passed(
        f"{_grouped(ref['item_rows'])} item rows for {_grouped(ref['item_orders'])} orders: about "
        f"{ratio:.1f} rows per order. Join orders to this table and each order repeats once per item."
    )


def _check_revenue(ns, ref):
    value = _variable(ns, "city_revenue")
    if value is _MISSING:
        return _not_yet("Run your query: its result is saved as `city_revenue`.")
    found = _city_values(value, ref["cities"], ("revenue", "total", "total_revenue", "sum"))
    if found is None:
        return _not_yet(
            "Show each city: city is in the customers table, so join orders to customers on "
            "customer_id, then GROUP BY city."
        )
    labels, numbers = found
    if len(labels) != len(set(labels)):
        return _not_yet("Each city should appear once: GROUP BY city.")
    if sorted(labels) != ref["cities"]:
        return _not_yet(f"You need one row for each of the {len(ref['cities'])} cities.")
    if numbers is None:
        return _not_yet("Keep two columns: the city, and its revenue named `revenue`.")
    if _matches(labels, numbers, ref["revenue"]):
        if numbers != sorted(numbers, reverse=True):
            return _not_yet("The totals are right. Now put the biggest first: ORDER BY revenue DESC.")
        top, second = ref["revenue_order"][:2]
        return _passed(
            f"{top} brought in the most: {_rupees(ref['revenue'][top])}, ahead of {second} "
            f"({_rupees(ref['revenue'][second])}). So why does the dashboard say otherwise?"
        )
    if _matches(labels, numbers, ref["dashboard_with_cancelled"]):
        return _not_yet(
            "Two things inflate these totals: joining order_items repeats each order once per "
            "item, and cancelled orders are counted too."
        )
    if _matches(labels, numbers, ref["dashboard"]):
        return _not_yet(
            "These totals are bigger than the orders add up to: joining order_items repeats each "
            "order once for every item in it. Add up order_value from orders, without the items."
        )
    if _matches(labels, numbers, ref["with_cancelled"]):
        return _not_yet(
            "Cancelled orders bring in no money, but these totals count them. Keep only orders "
            "with status 'delivered'."
        )
    return _not_yet(
        "The totals do not match. Join orders to customers on customer_id, keep delivered "
        "orders, then add up order_value by city."
    )


def _check_second_way(ns, ref):
    value = _variable(ns, "item_revenue")
    if value is _MISSING:
        return _not_yet("Store each city's total of quantity × price in `item_revenue`.")
    found = _city_values(value, ref["cities"], ("line_total", "revenue", "total", "item_revenue"))
    if found is None:
        return _not_yet("`item_revenue` should hold one total per city, labelled by city.")
    labels, numbers = found
    if sorted(labels) != ref["cities"] or numbers is None:
        return _not_yet(f"`item_revenue` should hold one total for each of the {len(ref['cities'])} cities.")
    if _matches(labels, numbers, ref["item_revenue"]):
        return _passed(
            "Adding up the items gives exactly the same totals as your SQL did from the orders. "
            "Two methods, one answer: now you can say it with confidence."
        )
    if _matches(labels, numbers, ref["item_revenue_all"]):
        return _not_yet("These include the items of cancelled orders. Keep only delivered orders' items.")
    if _matches(labels, numbers, ref["item_price_only"]):
        return _not_yet("Multiply price by quantity first: a row can be two or three of the same item.")
    return _not_yet(
        "The totals do not match. Merge items with delivered orders and customers, multiply "
        "quantity by price, then add up by city."
    )


def _check_best_sellers(ns, ref):
    value = _variable(ns, "top_items")
    if value is _MISSING:
        return _not_yet("Run your query: its result is saved as `top_items`.")
    if not isinstance(value, pd.DataFrame):
        return _not_yet("`top_items` should be the table your query returns.")
    names = _columns(value)
    if "city" not in names or "item" not in names:
        return _not_yet("Keep a `city` column and an `item` column.")
    cities = [str(city) for city in value[names["city"]]]
    if sorted(cities) != ref["cities"]:
        return _not_yet("Keep one row per city: the item ranked 1 in its city.")
    picked = {str(city): str(item) for city, item in zip(cities, value[names["item"]])}
    if picked == ref["best_sellers"]:
        return _passed(
            "Every city has its own favourite, from "
            f"{ref['best_sellers'][ref['revenue_order'][0]]} in {ref['revenue_order'][0]} to "
            f"{ref['best_sellers'][ref['revenue_order'][-1]]} in {ref['revenue_order'][-1]}."
        )
    if picked == ref["best_sellers_all"]:
        return _not_yet("Count only delivered orders' items.")
    return _not_yet(
        "Add up quantity × price by city and item, number them within each city with "
        "ROW_NUMBER() OVER (PARTITION BY city ORDER BY revenue DESC), and keep number 1."
    )


CHECKS = {
    "grain": _check_grain,
    "revenue": _check_revenue,
    "second-way": _check_second_way,
    "best-sellers": _check_best_sellers,
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
