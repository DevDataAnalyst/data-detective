import type { Mission } from './types';

/**
 * Unit 4's mission: the live problem in a technical interview. Three tables, one question, and a
 * dashboard that double counts. Numbers quoted here are checked against the CSV files in
 * unit4.test.ts, and the Python checks work their answers out from the files.
 */
export const theFinalRound: Mission = {
  id: 'the-final-round',
  title: 'The Final Round',
  brief:
    'This is the live problem in your technical round at Nashta Now, a breakfast delivery app. Kavya, the analytics lead, shares three tables: `customers`, `orders` and `order_items`.\n\nHer question: *“Our finance dashboard says Pune brought in the most money from April to June. The operations team swears it was Mumbai. Who is right, and why do they disagree?”*\n\nShe cares more about how you work than about the final number. Clarify the question, plan, check the data, build step by step, check your answer a second way, then explain it for someone who is not technical.',
  dataset: {
    fileName: 'orders.csv',
    url: 'data/orders.csv',
    table: 'orders',
    columns: [
      { name: 'order_id', description: 'One row per order' },
      { name: 'customer_id', description: 'Who ordered: matches customers.customer_id' },
      { name: 'order_date', description: 'The day, April to June 2026 (YYYY-MM-DD)' },
      { name: 'status', description: '“delivered” or “cancelled”' },
      { name: 'order_value', description: 'What the order was worth in ₹: the sum of its items' },
    ],
  },
  extraData: [
    {
      fileName: 'customers.csv',
      url: 'data/customers.csv',
      table: 'customers',
      columns: [
        { name: 'customer_id', description: 'One row per customer' },
        { name: 'city', description: 'Where the customer lives' },
        { name: 'signup_date', description: 'When they joined (YYYY-MM-DD)' },
      ],
    },
    {
      fileName: 'order_items.csv',
      url: 'data/order_items.csv',
      table: 'order_items',
      columns: [
        { name: 'order_id', description: 'The order: one row per item in it' },
        { name: 'item', description: 'What was ordered, such as “Poha”' },
        { name: 'category', description: 'Breakfast, snacks, chai and coffee, juice or sweets' },
        { name: 'quantity', description: 'How many of that item' },
        { name: 'price', description: 'Price of one, in ₹' },
      ],
    },
  ],
  facts: ['orders', 'itemRows', 'topCity', 'topRevenue', 'dashboardCity', 'dashboardRowsPerOrder'],
  tasks: [
    {
      kind: 'question',
      id: 'clarify',
      title: 'Pin down the question',
      instructions:
        'Before any code, make sure you are answering the right question. Which version of Kavya’s question can these tables answer?',
      question: {
        id: 'u4-mission-triage',
        type: 'inbox_triage',
        prompt: 'Which question can the three tables answer?',
        message: {
          from: 'Kavya',
          role: 'Analytics lead, Nashta Now',
          channel: 'chat',
          text: 'Finance says Pune made us the most money last quarter, and ops says Mumbai. Can you tell me which city is really best?',
        },
        data: {
          caption: 'The tables you have',
          columns: [
            'customers: customer_id, city, signup_date',
            'orders: order_id, customer_id, order_date, status, order_value',
            'order_items: order_id, item, category, quantity, price',
          ],
        },
        candidates: [
          {
            question: 'Which city made the most profit from April to June?',
            flaw: 'data_not_available',
            note: 'Profit needs costs, and there are no costs in these tables.',
          },
          {
            question:
              'Which city’s delivered orders were worth the most from April to June, counting each order once?',
            note: 'A measure, a period and a rule for which orders count: the tables can answer this.',
          },
          {
            question: 'Which city is best?',
            flaw: 'too_vague',
            note: '“Best” could mean revenue, orders, customers or growth. Pin it down first.',
          },
        ],
        answerableIndex: 1,
        explanation:
          '“The most money” means revenue when you have no costs, and it needs a period and a rule for which orders count. The common mistake is answering a vaguer question than the one you can check.',
      },
    },
    {
      kind: 'question',
      id: 'plan',
      title: 'Plan your steps',
      instructions:
        'Interviewers want to hear a plan before they see code. Put these steps in the order you would take them.',
      question: {
        id: 'u4-mission-plan',
        type: 'order_steps',
        prompt: 'Put your plan in order.',
        steps: [
          'Agree that revenue means delivered orders, each counted once',
          'Check how many rows each table has for an order',
          'Join orders to customers to find each order’s city',
          'Add up order value by city, biggest first',
          'Check the totals a second way, from the items',
          'Explain the answer and the dashboard’s mistake',
        ],
        explanation:
          'Definitions first, then the shape of the data, then the build, then a check before you speak. The common mistake is building first and finding out at the end that you answered a different question.',
      },
    },
    {
      kind: 'code',
      id: 'grain',
      title: 'Check the grain',
      language: 'sql',
      instructions:
        'Inspect before you build. How many rows does `order_items` have, and how many different orders do they belong to? Write one query that returns both, named `item_rows` and `orders`.\n\nQueries run on all three tables. The result is saved as `grain`.',
      starterCode:
        '-- One query, two numbers: every row in order_items,\n-- and how many different orders those rows belong to.\nSELECT\n  COUNT(*) AS item_rows\nFROM order_items;',
      creates: ['grain'],
      hints: {
        nudge:
          'One row of `order_items` is one item in an order, so an order with three items has three rows.',
        method:
          '`COUNT(*)` counts rows. `COUNT(DISTINCT order_id)` counts each order once, however many rows it has.',
        example:
          'SELECT\n  COUNT(*) AS item_rows,\n  COUNT(____ order_id) AS orders\nFROM order_items;',
      },
    },
    {
      kind: 'code',
      id: 'revenue',
      title: 'Revenue by city',
      language: 'sql',
      instructions:
        'Now build the answer. For each city, add up the value of delivered orders, counting each order once. City is in `customers`, so join it to `orders`. Name the total `revenue` and put the biggest first.\n\nThe result is saved as `city_revenue`.',
      starterCode:
        '-- Revenue by city: delivered orders only,\n-- each order counted once, biggest first.\nSELECT c.city\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id;',
      creates: ['city_revenue'],
      hints: {
        nudge:
          'You only need `orders` and `customers`. Leave `order_items` out: joining it would repeat each order once per item.',
        method:
          'Keep delivered orders with `WHERE`, total them with `SUM(...)` and `GROUP BY c.city`, then sort with `ORDER BY revenue DESC`.',
        example:
          "SELECT c.city, SUM(o.order_value) AS revenue\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = '____'\nGROUP BY c.city\nORDER BY revenue DESC;",
      },
    },
    {
      kind: 'question',
      id: 'dashboard-gap',
      title: 'Why the dashboard disagrees',
      instructions:
        'Your query and the finance dashboard name different cities. Kavya shows you how many rows each order has. What is behind the gap?',
      question: {
        id: 'u4-mission-courtroom',
        type: 'courtroom',
        prompt: 'Look at the exhibit. What makes the dashboard put Pune first?',
        evidence:
          'The dashboard, which joins orders to order_items, says Pune brought in ₹5.7 lakh. Pune’s delivered orders add up to ₹1.5 lakh.',
        witnesses: [
          {
            name: 'Rohit, finance',
            claim: 'Pune customers order big combos, so Pune really is our biggest city.',
          },
          {
            name: 'Sana, operations',
            claim: 'The dashboard must be adding in orders that were cancelled.',
          },
        ],
        table: {
          caption: 'Rows per order, April to June',
          columns: ['city', 'orders', 'item rows', 'rows per order'],
          rows: [
            ['Mumbai', '1,100', '1,621', '1.5'],
            ['Pune', '650', '2,403', '3.7'],
            ['Bengaluru', '700', '1,432', '2.0'],
          ],
        },
        suspects: [
          {
            text: 'Cancelled orders counted as money',
            note: 'Fewer than 1 in 10 orders was cancelled in any city. That cannot make a total nearly four times bigger.',
          },
          {
            text: 'The join repeats each order once per item',
            note: 'After the join, an order’s value is added once for every item in it, and Pune’s orders have the most items.',
          },
          {
            text: 'The dashboard covers different dates',
            note: 'Both cover April to June, so the dates cannot explain the gap.',
          },
        ],
        confounderIndex: 1,
        explanation:
          'Pune orders have about 3.7 items, so after the join each Pune order is added about 3.7 times; a Mumbai order about 1.5 times. The common mistake is adding up an order-level column after joining an item-level table.',
      },
    },
    {
      kind: 'code',
      id: 'second-way',
      title: 'Check it a second way',
      instructions:
        'A checked answer is a strong answer. Work out each city’s revenue again, this time from the items: quantity × price for the items of delivered orders. Use pandas, since interviewers often ask for both.\n\nStore the totals by city in `item_revenue`. If they match your SQL, you can say your answer with confidence.',
      starterCode:
        'import pandas as pd\n\norders = pd.read_csv("orders.csv")\ncustomers = pd.read_csv("customers.csv")\nitems = pd.read_csv("order_items.csv")\n\n# Keep delivered orders, bring in each order\'s city,\n# then add up quantity × price by city.\n',
      creates: ['item_revenue'],
      hints: {
        nudge:
          'Start from the items, and attach to each one its order’s status and its customer’s city.',
        method:
          'Filter `orders` to delivered, merge with `customers` on `customer_id`, merge `items` with that on `order_id`, then group by city and add up quantity × price.',
        example:
          'delivered = orders[orders["status"] == "delivered"]\nwith_city = delivered.merge(customers, on="customer_id")\nlines = items.merge(with_city, on="____")\nlines["line_total"] = lines["quantity"] * lines["price"]\nitem_revenue = lines.groupby("city")["line_total"].sum()',
      },
    },
    {
      kind: 'written',
      id: 'explain',
      title: 'Explain it to the manager',
      instructions:
        'Kavya’s manager joins the call, and she is not technical. In 4–6 sentences: which city brought in the most, how you counted, why the dashboard disagreed, how you checked, and one thing you would fix or check next.',
      placeholder: 'Start with the answer in one sentence, then say how you got there…',
      suggestedSentences: { min: 4, max: 6 },
      minWords: 50,
      selfReview: [
        {
          id: 'answer-first',
          label: 'I gave the answer first: the city and how much it brought in',
        },
        { id: 'definition', label: 'I said what I counted: delivered orders, each counted once' },
        { id: 'dashboard', label: 'I explained the dashboard’s mistake without jargon' },
        { id: 'checked', label: 'I said how I checked the answer' },
        { id: 'next', label: 'I suggested one next step, such as fixing the dashboard' },
      ],
      modelAnswer:
        'Mumbai brought in the most money from April to June: ₹1,69,730 from delivered orders, ahead of Pune with ₹1,46,930. I counted each delivered order once, at its order value. The finance dashboard added up each order once for every item in it, and Pune’s orders are big combos of about 3.7 items, so Pune looked almost four times bigger than it is. I checked my totals a second way, by adding up every item sold, and they matched exactly. Next, I would fix the dashboard so it adds up orders before joining items, and check which other reports use the same query.',
    },
    {
      kind: 'code',
      id: 'best-sellers',
      title: 'Each city’s best seller',
      stretch: true,
      language: 'sql',
      instructions:
        'A classic follow-up: which item brought in the most in each city, from delivered orders? Rank items within each city with a window function and keep the top one.\n\nKeep a `city` column and an `item` column. The result is saved as `top_items`.',
      starterCode:
        "-- Top item by revenue in each city (delivered orders)\nWITH item_sales AS (\n  SELECT c.city, i.item,\n         SUM(i.quantity * i.price) AS revenue\n  FROM order_items AS i\n  JOIN orders AS o ON o.order_id = i.order_id\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE o.status = 'delivered'\n  GROUP BY c.city, i.item\n)\nSELECT city, item, revenue\nFROM item_sales;",
      creates: ['top_items'],
      hints: {
        nudge: 'Number the items within each city, biggest revenue first, then keep number 1.',
        method:
          '`ROW_NUMBER() OVER (PARTITION BY city ORDER BY revenue DESC)` numbers rows within each city.',
        example:
          '-- add after item_sales\n, ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY ____ ORDER BY revenue DESC) AS rn\n  FROM item_sales\n)\nSELECT city, item, revenue FROM ranked WHERE rn = 1;',
      },
    },
  ],
  summary: {
    whatYouDid: [
      {
        text: 'Pinned “the most money” down to delivered order value, counted once, before any code',
      },
      { text: 'Checked the grain: {itemRows} item rows for {orders} orders' },
      { text: 'Found that {topCity} brought in the most: {topRevenue}' },
      {
        text: 'Showed the dashboard added each {dashboardCity} order about {dashboardRowsPerOrder} times, once per item',
      },
      { text: 'Checked the answer a second way, from the items, in pandas' },
      {
        text: 'Ranked each city’s best seller with a window function',
        requiresTask: 'best-sellers',
      },
    ],
    portfolio: [
      {
        text: 'Solved a live data problem across three related tables (customers, orders and order items) with SQL and pandas',
      },
      {
        text: 'Found why a finance dashboard overstated {dashboardCity}’s revenue: a join added each order once per item, about {dashboardRowsPerOrder} times',
      },
      {
        text: 'Confirmed revenue by city two independent ways, and explained the result for a non-technical audience',
      },
      {
        text: 'Ranked best sellers in each city with SQL window functions',
        requiresTask: 'best-sellers',
      },
    ],
  },
};
