import type { Checkpoint, DataTable, Lesson, Unit } from './types';

/*
 * Unit 4: Crack the Interview (SQL and pandas interview questions, and a step-by-step way to solve
 * a data problem out loud).
 *
 * Every SQL answer is proven by running the query against its tables (src/test/sqlQuestions.test.ts)
 * and every pandas answer by running the code in Pyodide (src/test/pythonQuestions.pyodide.test.ts).
 * Numbers taken from the mission dataset are checked against it in unit4.test.ts.
 */

const THE_TABLES = [
  'customers: customer_id, city, signup_date',
  'orders: order_id, customer_id, order_date, status, order_value',
];

// ---------------------------------------------------------------------------------------------
// Lesson 1: a routine for any data problem

const thinkBeforeYouType: Lesson = {
  id: 'think-before-you-type',
  title: 'Think before you type',
  estimatedMinutes: 4,
  intro:
    'In a data interview, how you reach the answer matters as much as the answer. A routine that works: **Clarify** the question, **Inspect** the data, **Plan** the steps, **Build** one step at a time, **Check** the result, **Explain** it simply.\n\nThe most common mistake is typing code in the first minute.',
  questions: [
    {
      id: 'u4-six-steps',
      type: 'order_steps',
      prompt: 'Put the six steps of the routine in order.',
      steps: [
        'Clarify what is being asked',
        'Inspect the tables: rows, gaps, duplicates',
        'Plan the steps before writing code',
        'Build the answer one step at a time',
        'Check the result a second way',
        'Explain the answer and its limits',
      ],
      explanation:
        'Each step catches a different mistake before it costs you: the wrong question, messy data, a dead end, a silent bug. The common mistake is starting at Build.',
    },
    {
      id: 'u4-triage-best-customers',
      type: 'inbox_triage',
      prompt:
        'The interviewer asks something vague. Which version can you answer with these tables?',
      message: {
        from: 'Kavya',
        role: 'Analytics lead, Nashta Now',
        channel: 'chat',
        text: 'Can you find our best customers?',
      },
      data: { caption: 'The tables you have', columns: THE_TABLES },
      candidates: [
        {
          question: 'Who are our happiest customers?',
          flaw: 'data_not_available',
          note: 'Happiness needs ratings or surveys, and these tables have neither.',
        },
        {
          question: 'Who are our most valuable customers?',
          flaw: 'too_vague',
          note: 'Valuable by what measure, and over what period? It is still not pinned down.',
        },
        {
          question: 'Which 10 customers spent the most on delivered orders from April to June?',
          note: 'A measure, a period, which orders count and how many to return: answerable.',
        },
      ],
      answerableIndex: 2,
      explanation:
        '“Best” hides a choice of measure and period, so say yours out loud before you start. The common mistake is quietly picking a definition and answering a different question from the one asked.',
    },
    {
      id: 'u4-first-question',
      type: 'multiple_choice',
      prompt: 'The interviewer says: “Find our most active users.” What do you ask first?',
      options: [
        'Should I use SQL or Python?',
        'What counts as active, and over what period?',
        'How many rows should the answer have?',
        'Can I use window functions?',
      ],
      correctIndex: 1,
      explanation:
        'The definition and the time window decide the answer; the tools are details. The common mistake is choosing a definition silently, so the interviewer hears an answer to a different question.',
    },
    {
      id: 'u4-grain',
      type: 'multiple_choice',
      prompt: 'What is one row of this table?',
      table: {
        caption: 'order_items, first rows',
        columns: ['order_id', 'item', 'quantity', 'price'],
        rows: [
          [50001, 'Poha', 1, 60],
          [50001, 'Masala chai', 2, 30],
          [50002, 'Idli', 1, 50],
          [50003, 'Misal pav', 1, 90],
          [50003, 'Jalebi', 1, 40],
        ],
      },
      options: ['One order', 'One item within an order', 'One customer', 'One day of sales'],
      correctIndex: 1,
      explanation:
        'Order 50001 appears on two rows, so each row is one item in an order. The common mistake is assuming every table has one row per order, then double counting after a join.',
    },
    {
      id: 'u4-repeat-rate',
      type: 'build_metric',
      prompt: 'Build the metric.',
      goal: 'What share of customers who ordered came back to order again?',
      metricName: 'Repeat rate',
      cards: [
        { label: 'Customers with 2 or more orders', value: 460 },
        { label: 'Customers who signed up', value: 2000 },
        { label: 'Customers with at least 1 order', value: 1150 },
        { label: 'All orders', value: 3200 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 2,
      percent: true,
      explanation:
        'Only customers who ordered once could come back, so they are the bottom of the fraction. The common mistake is dividing by everyone who signed up, which makes the rate look worse than it is.',
    },
    {
      id: 'u4-plan-revenue',
      type: 'order_steps',
      prompt: 'Plan it: revenue by city. Put the steps in order.',
      steps: [
        'Agree that revenue means delivered orders',
        'Check that orders has one row per order',
        'Join orders to customers to get each city',
        'Add up order value by city',
        'Check that the cities add up to the total',
      ],
      explanation:
        'Agree the definition, check the grain, then build and check. The common mistake is discovering at the end that cancelled orders were counted, after all the work is done.',
    },
    {
      id: 'u4-parts-add-up',
      type: 'multiple_choice',
      prompt:
        'Your city totals add up to ₹18.4 lakh, but all delivered orders together are worth ₹14.2 lakh. What does that tell you?',
      options: [
        'Rounding: nothing to worry about',
        'Some cities have no orders',
        'Something counts some orders more than once',
        'The orders table is wrong',
      ],
      correctIndex: 2,
      explanation:
        'The parts must add up to the whole, and a bigger sum means rows were repeated, usually by a join. The common mistake is trusting a query because it ran without errors.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Lesson 2: the order SQL runs in

const DELIVERIES: DataTable = {
  caption: 'orders',
  columns: ['order_id', 'customer_id', 'status'],
  rows: [
    [1, 7, 'delivered'],
    [2, 7, 'delivered'],
    [3, 8, 'delivered'],
    [4, 8, 'cancelled'],
    [5, 9, 'delivered'],
    [6, 9, 'delivered'],
    [7, 9, 'cancelled'],
  ],
};

const howSqlRuns: Lesson = {
  id: 'how-sql-runs',
  title: 'The order SQL runs in',
  estimatedMinutes: 5,
  intro:
    'You write SELECT first, but the database starts with **FROM** (and joins), then **WHERE**, **GROUP BY**, **HAVING**, **SELECT**, **ORDER BY** and **LIMIT**.\n\nThat order explains many interview questions: why WHERE cannot filter on a total, and why a column alias works in ORDER BY but not in WHERE.',
  questions: [
    {
      id: 'u4-run-order',
      type: 'order_steps',
      prompt: 'Put these clauses in the order the database runs them.',
      language: 'sql',
      steps: [
        'FROM orders',
        "WHERE status = 'delivered'",
        'GROUP BY customer_id',
        'HAVING COUNT(*) > 1',
        'SELECT customer_id, COUNT(*)',
        'ORDER BY 2 DESC',
      ],
      explanation:
        'WHERE filters rows before grouping, and HAVING filters groups after. SELECT comes late, which is why its aliases are not ready for WHERE. The common mistake is thinking SQL runs top to bottom as written.',
    },
    {
      id: 'u4-having',
      type: 'multiple_choice',
      prompt: 'Which line goes in the blank to keep customers with more than one delivered order?',
      code: {
        language: 'sql',
        text: "SELECT customer_id, COUNT(*) AS n\nFROM orders\nWHERE status = 'delivered'\nGROUP BY customer_id\n____;",
      },
      tables: [DELIVERIES],
      options: ['WHERE COUNT(*) > 1', 'HAVING COUNT(*) > 1', 'ORDER BY COUNT(*) DESC'],
      correctIndex: 1,
      check: {
        kind: 'sql_blank',
        reference:
          "SELECT customer_id, COUNT(*) FROM orders WHERE status = 'delivered' GROUP BY customer_id HAVING COUNT(*) >= 2",
      },
      explanation:
        'HAVING filters groups after they are counted. WHERE runs before grouping, so it cannot see COUNT, and ORDER BY only sorts. The common mistake is putting a total in WHERE.',
    },
    {
      id: 'u4-count-column',
      type: 'multiple_choice',
      prompt: 'What does this query return?',
      code: { language: 'sql', text: 'SELECT COUNT(coupon)\nFROM orders;' },
      tables: [
        {
          caption: 'orders',
          columns: ['order_id', 'coupon'],
          rows: [
            [1, 'NEW50'],
            [2, null],
            [3, 'FEST'],
            [4, null],
            [5, 'FEST'],
          ],
        },
      ],
      options: ['5', '2', '3'],
      correctIndex: 2,
      check: { kind: 'sql_value' },
      explanation:
        'COUNT(coupon) skips NULLs, so it counts the 3 orders that used a coupon. COUNT(*) would say 5, and COUNT(DISTINCT coupon) 2. The common mistake is counting rows with COUNT(column) when the column has gaps.',
    },
    {
      id: 'u4-avg-null',
      type: 'multiple_choice',
      prompt: 'Four customers were asked to rate the app. What does this return?',
      code: { language: 'sql', text: 'SELECT AVG(rating)\nFROM reviews;' },
      tables: [
        {
          caption: 'reviews',
          columns: ['customer_id', 'rating'],
          rows: [
            [1, 4],
            [2, null],
            [3, 5],
            [4, 3],
          ],
        },
      ],
      options: ['4', '3', 'NULL'],
      correctIndex: 0,
      check: { kind: 'sql_value' },
      explanation:
        'AVG skips NULLs, so it averages three ratings: 12 ÷ 3 = 4. Counting the missing rating as 0 would give 3. The common mistake is assuming missing values count as zero.',
    },
    {
      id: 'u4-alias-where',
      type: 'multiple_choice',
      prompt: 'Why does this query fail?',
      code: {
        language: 'sql',
        text: 'SELECT customer_id,\n       SUM(order_value) AS total\nFROM orders\nWHERE total > 500\nGROUP BY customer_id;',
      },
      options: [
        'Aliases cannot be used anywhere in SQL',
        'WHERE runs before the totals exist',
        'SUM only works on whole numbers',
        'GROUP BY must come before WHERE',
      ],
      correctIndex: 1,
      explanation:
        'WHERE filters single rows before any totals exist. Filter the totals with HAVING SUM(order_value) > 500 instead. The common mistake is expecting SQL to run in the order it is written.',
    },
    {
      id: 'u4-group-null',
      type: 'multiple_choice',
      prompt: 'How many rows does this query return?',
      code: { language: 'sql', text: 'SELECT city, COUNT(*)\nFROM customers\nGROUP BY city;' },
      tables: [
        {
          caption: 'customers',
          columns: ['customer_id', 'city'],
          rows: [
            [1, 'Pune'],
            [2, 'Pune'],
            [3, null],
            [4, 'Delhi'],
            [5, null],
            [6, 'Mumbai'],
          ],
        },
      ],
      options: ['3 rows', '4 rows', '6 rows'],
      correctIndex: 1,
      check: { kind: 'sql_rows' },
      explanation:
        'GROUP BY puts every NULL city into one group of its own, so the two customers with no city make a fourth row. The common mistake is forgetting that missing values still form a group.',
    },
    {
      id: 'u4-rows-reach-group',
      type: 'numeric_estimate',
      prompt:
        "An orders table has {rows} rows, and {cancelled} of them are cancelled. A query filters with WHERE status = 'delivered', then groups by city. How many rows reach GROUP BY?",
      givens: { rows: 1200, cancelled: 90 },
      derived: { delivered: 'rows - cancelled' },
      formula: 'delivered',
      answerLabel: 'Rows that reach GROUP BY',
      correctValue: 1110,
      tolerance: 0.5,
      explanation:
        'WHERE runs before GROUP BY, so only the {delivered} delivered rows are grouped. The common mistake is thinking GROUP BY sees every row and the filter comes later.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Lesson 3: joins that keep, drop or repeat rows

const JOIN_CUSTOMERS: DataTable = {
  caption: 'customers',
  columns: ['customer_id', 'city'],
  rows: [
    [1, 'Pune'],
    [2, 'Mumbai'],
    [3, 'Delhi'],
    [4, 'Pune'],
  ],
};

const JOIN_ORDERS: DataTable = {
  caption: 'orders',
  columns: ['order_id', 'customer_id', 'order_value'],
  rows: [
    [101, 1, 200],
    [102, 1, 150],
    [103, 2, 300],
    [104, 5, 120],
  ],
};

const FAN_ORDERS: DataTable = {
  caption: 'orders',
  columns: ['order_id', 'order_value'],
  rows: [
    [1, 100],
    [2, 250],
  ],
};

const FAN_ITEMS: DataTable = {
  caption: 'order_items',
  columns: ['order_id', 'item'],
  rows: [
    [1, 'Poha'],
    [1, 'Chai'],
    [2, 'Idli'],
    [2, 'Vada'],
    [2, 'Coffee'],
  ],
};

const joins: Lesson = {
  id: 'joins-without-double-counting',
  title: 'Joins without double counting',
  estimatedMinutes: 5,
  intro:
    'A join can keep rows, drop them or **repeat** them. INNER JOIN keeps only matches; LEFT JOIN keeps every row on the left and fills the gaps with NULL.\n\nJoin a one-row-per-order table to a one-row-per-item table and each order repeats once per item, so adding up order value afterwards counts money twice.',
  questions: [
    {
      id: 'u4-inner-rows',
      type: 'multiple_choice',
      prompt: 'How many rows does this INNER JOIN return?',
      code: {
        language: 'sql',
        text: 'SELECT c.customer_id, o.order_id\nFROM customers AS c\nJOIN orders AS o\n  ON o.customer_id = c.customer_id;',
      },
      tables: [JOIN_CUSTOMERS, JOIN_ORDERS],
      options: ['4 rows', '3 rows', '5 rows'],
      correctIndex: 1,
      check: { kind: 'sql_rows' },
      explanation:
        'INNER JOIN keeps only pairs that match: two orders for customer 1 and one for customer 2. Order 104 belongs to no known customer, so it drops out. The common mistake is expecting a join to keep every row.',
    },
    {
      id: 'u4-left-rows',
      type: 'multiple_choice',
      prompt: 'And how many rows does this LEFT JOIN return?',
      code: {
        language: 'sql',
        text: 'SELECT c.customer_id, o.order_id\nFROM customers AS c\nLEFT JOIN orders AS o\n  ON o.customer_id = c.customer_id;',
      },
      tables: [JOIN_CUSTOMERS, JOIN_ORDERS],
      options: ['5 rows', '4 rows', '6 rows'],
      correctIndex: 0,
      check: { kind: 'sql_rows' },
      explanation:
        'LEFT JOIN keeps every customer: two rows for customer 1, one for customer 2, and one each, with a NULL order, for customers 3 and 4. The common mistake is expecting one row per left row.',
    },
    {
      id: 'u4-anti-join',
      type: 'multiple_choice',
      prompt: 'Fill the blank to list the customers who have never ordered.',
      code: {
        language: 'sql',
        text: 'SELECT c.customer_id\nFROM customers AS c\nLEFT JOIN orders AS o\n  ON o.customer_id = c.customer_id\nWHERE ____;',
      },
      tables: [JOIN_CUSTOMERS, JOIN_ORDERS],
      options: ['o.order_id = NULL', 'c.customer_id IS NULL', 'o.order_id IS NULL'],
      correctIndex: 2,
      check: {
        kind: 'sql_blank',
        reference:
          'SELECT customer_id FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)',
      },
      explanation:
        'After a LEFT JOIN, customers with no orders have NULL in every orders column, and IS NULL finds them. “= NULL” is never true. The common mistake is testing for NULL with = and getting nothing back.',
    },
    {
      id: 'u4-fan-out',
      type: 'multiple_choice',
      prompt: 'Order 1 has two items and order 2 has three. What does this query return?',
      code: {
        language: 'sql',
        text: 'SELECT SUM(o.order_value)\nFROM orders AS o\nJOIN order_items AS i\n  ON i.order_id = o.order_id;',
      },
      tables: [FAN_ORDERS, FAN_ITEMS],
      options: ['350', '950', '5'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'Each order’s value appears once per item: ₹100 twice and ₹250 three times, so ₹950 instead of the real ₹350. The common mistake is adding up an order-level column after joining an item-level table.',
    },
    {
      id: 'u4-court-jump',
      type: 'courtroom',
      prompt: 'What is behind the jump?',
      evidence:
        'After Priya added order_items to the monthly revenue query, to show the top items, total revenue jumped from ₹9 lakh to ₹21 lakh.',
      witnesses: [
        {
          name: 'Priya, marketing',
          claim: 'The item data finally captures sales we were missing before.',
        },
        {
          name: 'Arun, engineering',
          claim: 'The app must have logged every order twice this month.',
        },
      ],
      suspects: [
        {
          text: 'The join repeats each order once per item',
          note: 'An order with three items now has three rows, and its value is added each time.',
        },
        {
          text: 'Duplicate orders from the app',
          note: 'Duplicates would show without the join too, but revenue only jumped when order_items was added.',
        },
        {
          text: 'A price rise this month',
          note: 'Prices do not change when a table is added to a query.',
        },
      ],
      confounderIndex: 0,
      explanation:
        'The only change was the join, and joining items gives an order one row per item. The common mistake is believing a bigger number because it came from more data.',
    },
    {
      id: 'u4-aov',
      type: 'build_metric',
      prompt: 'Build the metric from the two orders above.',
      goal: 'What is the average value of an order?',
      metricName: 'Average order value',
      cards: [
        { label: 'Value of orders, each counted once', value: 350 },
        { label: 'Rows after joining the items', value: 5 },
        { label: 'Number of orders', value: 2 },
        { label: 'Value after joining the items', value: 950 },
      ],
      numeratorIndex: 0,
      denominatorIndex: 2,
      prefix: '₹',
      explanation:
        'Divide money counted once per order by the number of orders: ₹350 ÷ 2 = ₹175. The common mistake is dividing by rows after a join, which makes the average depend on how many items people buy.',
    },
    {
      id: 'u4-sum-distinct',
      type: 'multiple_choice',
      prompt:
        'You need revenue and the number of items for each city in one result, without double counting. What works?',
      options: [
        'Join everything, then use SUM(DISTINCT order_value)',
        'Add up each table on its own first, then join the totals',
        'Join everything, then divide the sum by the number of items',
        'Use a LEFT JOIN instead of an INNER JOIN',
      ],
      correctIndex: 1,
      explanation:
        'Total each table at its own grain, then join the summaries. SUM(DISTINCT) looks clever but also drops different orders that happen to have the same value. The common mistake is patching a double count instead of avoiding it.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Lesson 4: window functions

const PUNE_ORDERS: DataTable = {
  caption: 'orders',
  columns: ['order_id', 'city', 'order_value'],
  rows: [
    [1, 'Pune', 500],
    [2, 'Pune', 500],
    [3, 'Pune', 400],
    [4, 'Pune', 300],
    [5, 'Delhi', 350],
    [6, 'Delhi', 200],
  ],
};

const DAILY: DataTable = {
  caption: 'daily',
  columns: ['day', 'orders'],
  rows: [
    [1, 40],
    [2, 46],
    [3, 43],
    [4, 50],
  ],
};

const windowFunctions: Lesson = {
  id: 'window-functions',
  title: 'Window functions',
  estimatedMinutes: 5,
  intro:
    'A window function adds a value to every row without collapsing rows. **ROW_NUMBER** numbers them, **RANK** and **DENSE_RANK** deal with ties, **LAG** looks at the row before, and **SUM() OVER** keeps a running total.\n\n**PARTITION BY** restarts the count for each group, which answers “top N in each group” questions.',
  questions: [
    {
      id: 'u4-second-highest',
      type: 'multiple_choice',
      prompt: 'Which value does this query return?',
      code: {
        language: 'sql',
        text: "SELECT DISTINCT order_value\nFROM (\n  SELECT order_value,\n    DENSE_RANK() OVER (\n      ORDER BY order_value DESC) AS r\n  FROM orders\n  WHERE city = 'Pune'\n) AS ranked\nWHERE r = 2;",
      },
      tables: [PUNE_ORDERS],
      options: ['400', '500', '300'],
      correctIndex: 0,
      check: { kind: 'sql_value' },
      explanation:
        'DENSE_RANK gives both ₹500 orders rank 1, so rank 2 is ₹400: the second-highest value. ROW_NUMBER would have made the second ₹500 number 2. The common mistake is using ROW_NUMBER when ties matter.',
    },
    {
      id: 'u4-rank-gap',
      type: 'multiple_choice',
      prompt: 'What rank does the ₹400 order get here?',
      code: {
        language: 'sql',
        text: "SELECT r FROM (\n  SELECT order_value,\n    RANK() OVER (\n      ORDER BY order_value DESC) AS r\n  FROM orders\n  WHERE city = 'Pune'\n) AS ranked\nWHERE order_value = 400;",
      },
      tables: [PUNE_ORDERS],
      options: ['2', '3', '4'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'RANK skips numbers after a tie: two orders share rank 1, so the next one is 3. DENSE_RANK would say 2. The common mistake is expecting RANK to leave no gaps.',
    },
    {
      id: 'u4-top-per-city',
      type: 'order_steps',
      prompt: 'Put the lines in order to find the biggest order in each city.',
      language: 'sql',
      steps: [
        'WITH ranked AS (',
        '  SELECT *, ROW_NUMBER() OVER (',
        '    PARTITION BY city ORDER BY order_value DESC',
        '  ) AS rn FROM orders',
        ')',
        'SELECT city, order_id, order_value FROM ranked',
        'WHERE rn = 1;',
      ],
      tables: [
        {
          caption: 'orders',
          columns: ['order_id', 'city', 'order_value'],
          rows: [
            [1, 'Pune', 500],
            [2, 'Pune', 450],
            [3, 'Delhi', 350],
            [4, 'Delhi', 200],
            [5, 'Mumbai', 300],
          ],
        },
      ],
      reference:
        'SELECT city, order_id, order_value FROM orders AS o WHERE order_value = (SELECT MAX(order_value) FROM orders WHERE city = o.city)',
      explanation:
        'The window numbers orders within each city, biggest first, and the outer query keeps number 1. The common mistake is ORDER BY with LIMIT 1, which finds the biggest order overall, not one per city.',
    },
    {
      id: 'u4-lag',
      type: 'multiple_choice',
      prompt: 'Fill the blank to show each day’s change from the day before.',
      code: {
        language: 'sql',
        text: 'SELECT day, orders,\n  orders - ____ AS change\nFROM daily\nORDER BY day;',
      },
      tables: [DAILY],
      options: [
        'LEAD(orders) OVER (ORDER BY day)',
        'LAG(orders) OVER (ORDER BY day)',
        'MIN(orders) OVER ()',
      ],
      correctIndex: 1,
      check: {
        kind: 'sql_blank',
        reference:
          'SELECT d.day, d.orders, d.orders - p.orders FROM daily AS d LEFT JOIN daily AS p ON p.day = d.day - 1 ORDER BY d.day',
        ordered: true,
      },
      explanation:
        'LAG reads the row before in the window’s order, so each day is compared with the previous one, and day 1 gets NULL. The common mistake is mixing up LAG, the row before, and LEAD, the row after.',
    },
    {
      id: 'u4-running-total',
      type: 'multiple_choice',
      prompt: 'What is the running total on day 3?',
      code: {
        language: 'sql',
        text: 'SELECT running FROM (\n  SELECT day,\n    SUM(orders) OVER (ORDER BY day) AS running\n  FROM daily\n) AS totals\nWHERE day = 3;',
      },
      tables: [DAILY],
      options: ['43', '129', '179'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'SUM() OVER (ORDER BY day) adds up every day so far: 40 + 46 + 43 = 129. The common mistake is expecting a window sum to give the day’s own value, or the total of all days.',
    },
    {
      id: 'u4-top-n-tool',
      type: 'multiple_choice',
      prompt: 'You need the top 3 items in each category. Which approach works?',
      options: [
        'ORDER BY sales DESC LIMIT 3',
        'GROUP BY category HAVING COUNT(*) <= 3',
        'ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC), then keep 1 to 3',
        'SELECT DISTINCT category, MAX(sales)',
      ],
      correctIndex: 2,
      explanation:
        'PARTITION BY restarts the numbering in every category, so keeping 1 to 3 gives the top 3 of each. The common mistake is LIMIT 3, which returns the top 3 overall.',
    },
    {
      id: 'u4-rank-after-tie',
      type: 'numeric_estimate',
      prompt:
        'With RANK(), {tied} orders tie for the biggest value. What rank does the next-biggest order get?',
      givens: { tied: 3 },
      derived: { next_rank: 'tied + 1' },
      formula: 'next_rank',
      answerLabel: 'Rank of the next order',
      correctValue: 4,
      tolerance: 0.5,
      explanation:
        'RANK counts the rows that come first: {tied} tied orders share rank 1, so the next gets rank {next_rank}. DENSE_RANK would give it 2. The common mistake is assuming ranks never skip.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Lesson 5: pandas interview questions

const pandasPatterns: Lesson = {
  id: 'pandas-patterns',
  title: 'pandas interview questions',
  estimatedMinutes: 5,
  intro:
    'Most pandas interview questions use a handful of moves: filter rows, **groupby** with **agg**, **merge**, **drop_duplicates** and **transform**.\n\nKnow how each treats missing values: sum and mean skip NaN, but NaN never equals anything, not even NaN, so test for it with **isna()**.',
  questions: [
    {
      id: 'u4-mean-nan',
      type: 'multiple_choice',
      prompt: 'What does this print?',
      code: {
        language: 'python',
        text: 'import pandas as pd\ns = pd.Series([100, None, 300])\nprint(s.mean())',
      },
      options: ['133.3', '200.0', 'nan'],
      correctIndex: 1,
      check: { kind: 'python_output' },
      explanation:
        'mean() skips NaN, so it averages 100 and 300. Counting the gap as 0 would give 133.3. The common mistake is assuming missing values count as zero, in pandas as in SQL.',
    },
    {
      id: 'u4-drop-duplicates',
      type: 'multiple_choice',
      prompt: 'How many rows are left?',
      code: {
        language: 'python',
        text: 'import pandas as pd\ndf = pd.DataFrame({\n    "order_id": [1, 1, 2, 3],\n    "item": ["Poha", "Poha", "Idli", "Poha"],\n})\nprint(len(df.drop_duplicates()))',
      },
      options: ['2', '3', '4'],
      correctIndex: 1,
      check: { kind: 'python_output' },
      explanation:
        'drop_duplicates removes rows that repeat in every column, so only the second (1, Poha) goes; order 3’s Poha is a different order. The common mistake is expecting it to look at one column: use subset= for that.',
    },
    {
      id: 'u4-count-vs-size',
      type: 'multiple_choice',
      prompt: 'What does this print?',
      code: {
        language: 'python',
        text: 'import pandas as pd\ndf = pd.DataFrame({\n    "city": ["Pune", "Pune", "Delhi"],\n    "coupon": ["NEW", None, None],\n})\nn = df.groupby("city")["coupon"].count()\nprint(n.to_dict())',
      },
      options: ["{'Delhi': 1, 'Pune': 2}", "{'Delhi': 0, 'Pune': 1}", "{'Pune': 1}"],
      correctIndex: 1,
      check: { kind: 'python_output' },
      explanation:
        'count() counts values that are not missing, so Delhi’s group gives 0; size() counts rows and would say 1 and 2. The common mistake is using count() to count rows.',
    },
    {
      id: 'u4-merge-how',
      type: 'multiple_choice',
      prompt: 'Fill the blank so every customer stays, even those with no orders. It prints 4.',
      code: {
        language: 'python',
        text: 'import pandas as pd\ncustomers = pd.DataFrame({"id": [1, 2, 3]})\norders = pd.DataFrame({"id": [1, 1, 4]})\nm = customers.merge(orders, on="id", how=____)\nprint(len(m))',
      },
      options: ['"inner"', '"right"', '"left"'],
      correctIndex: 2,
      check: {
        kind: 'python_blank',
        reference:
          'import pandas as pd\ncustomers = pd.DataFrame({"id": [1, 2, 3]})\norders = pd.DataFrame({"id": [1, 1, 4]})\nboth = customers.merge(orders, on="id", how="outer")\nprint(len(both[both["id"].isin(customers["id"])]))',
      },
      explanation:
        'A left merge keeps every customer: customer 1 twice, for two orders, and customers 2 and 3 once each with no order. "inner" drops them and "right" keeps orders instead. The common mistake is the default inner merge, which silently loses rows.',
    },
    {
      id: 'u4-transform',
      type: 'multiple_choice',
      prompt: 'What does this print?',
      code: {
        language: 'python',
        text: 'import pandas as pd\ndf = pd.DataFrame({\n    "city": ["Pune", "Pune", "Delhi"],\n    "sales": [30, 90, 50],\n})\nt = df.groupby("city")["sales"].transform("sum")\nprint((df["sales"] / t).tolist())',
      },
      options: ['[0.25, 0.75, 1.0]', '[0.18, 0.53, 0.29]', '[120, 120, 50]'],
      correctIndex: 0,
      check: { kind: 'python_output' },
      explanation:
        'transform("sum") puts each city’s total on every row, so each sale is divided by its own city’s total: 30 ÷ 120 = 0.25. The common mistake is dividing by the grand total, or losing rows by using agg.',
    },
    {
      id: 'u4-pandas-steps',
      type: 'order_steps',
      prompt: 'Put the lines in order to find each city’s revenue from delivered orders.',
      language: 'python',
      steps: [
        'orders = pd.read_csv("orders.csv")',
        'done = orders[orders["status"] == "delivered"]',
        'done = done.merge(customers, on="customer_id")',
        'revenue = done.groupby("city")["order_value"].sum()',
        'revenue.sort_values(ascending=False)',
      ],
      explanation:
        'Read, filter, bring in the city, then total and sort: each line needs the one before it. The common mistake is grouping by city before the city has been merged in, which fails with a KeyError.',
    },
    {
      id: 'u4-merge-rows',
      type: 'numeric_estimate',
      prompt:
        'You merge {customers} customers with {orders} orders using how="left". {no_orders} customers have no orders, and every order belongs to a known customer. How many rows come out?',
      givens: { customers: 1000, orders: 3000, no_orders: 200 },
      derived: { rows_out: 'orders + no_orders' },
      formula: 'rows_out',
      answerLabel: 'Rows after the merge',
      correctValue: 3200,
      tolerance: 0.5,
      explanation:
        'Each order makes one row with its customer: {orders} rows. The {no_orders} customers with no orders keep one row each, with NaN, so {rows_out} in all. The common mistake is expecting a left merge to keep the left table’s row count.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Lesson 6: rates, dates and retention

const SUMMARY: DataTable = {
  caption: 'summary',
  columns: ['repeat_customers', 'customers'],
  rows: [[400, 1000]],
};

const ratesAndRetention: Lesson = {
  id: 'rates-and-retention',
  title: 'Rates, dates and retention',
  estimatedMinutes: 5,
  intro:
    'Many interview questions are rates over time: repeat rate, retention, growth. Three habits keep them right. Divide as decimals: in many databases one whole number divided by another drops the fraction. Fix the time window before counting. And follow customers from their **first order**, so new and old customers are not mixed.',
  questions: [
    {
      id: 'u4-integer-division',
      type: 'multiple_choice',
      prompt: 'What does this query return?',
      code: { language: 'sql', text: 'SELECT repeat_customers / customers\nFROM summary;' },
      tables: [SUMMARY],
      options: ['0.4', '0', '40'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'Both columns are whole numbers, so SQLite, like PostgreSQL, divides as whole numbers: 400 ÷ 1,000 is 0. Multiply by 1.0 first to get 0.4. The common mistake is reporting a 0% rate that is really 40%.',
    },
    {
      id: 'u4-decimal-division',
      type: 'multiple_choice',
      prompt: 'Fill the blank to get the repeat rate as a decimal.',
      code: { language: 'sql', text: 'SELECT ____ AS repeat_rate\nFROM summary;' },
      tables: [SUMMARY],
      options: [
        'repeat_customers / customers',
        '1.0 * repeat_customers / customers',
        'customers / repeat_customers',
      ],
      correctIndex: 1,
      check: {
        kind: 'sql_blank',
        reference: 'SELECT CAST(repeat_customers AS REAL) / customers FROM summary',
      },
      explanation:
        'Multiplying by 1.0 turns the top into a decimal before dividing, so 400 ÷ 1,000 gives 0.4. The common mistake is multiplying after dividing, when the fraction is already gone.',
    },
    {
      id: 'u4-first-orders',
      type: 'multiple_choice',
      prompt: 'How many customers placed their first order in March?',
      code: {
        language: 'sql',
        text: "SELECT COUNT(*) FROM (\n  SELECT customer_id,\n    MIN(order_date) AS first_order\n  FROM orders\n  GROUP BY customer_id\n) AS firsts\nWHERE first_order LIKE '2026-03%';",
      },
      tables: [
        {
          caption: 'orders',
          columns: ['order_id', 'customer_id', 'order_date'],
          rows: [
            [1, 7, '2026-02-20'],
            [2, 7, '2026-03-05'],
            [3, 8, '2026-03-11'],
            [4, 9, '2026-03-28'],
            [5, 9, '2026-04-02'],
            [6, 10, '2026-04-15'],
          ],
        },
      ],
      options: ['3', '2', '4'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'Customer 7 ordered in March too, but first ordered in February, so they were not new in March. The common mistake is counting everyone who ordered in a month as new that month.',
    },
    {
      id: 'u4-came-back',
      type: 'multiple_choice',
      prompt: 'How many customers ordered again within 30 days of their first order?',
      code: {
        language: 'sql',
        text: 'WITH firsts AS (\n  SELECT customer_id,\n    MIN(order_date) AS first_day\n  FROM orders GROUP BY customer_id\n)\nSELECT COUNT(DISTINCT f.customer_id)\nFROM firsts AS f\nJOIN orders AS o\n  ON o.customer_id = f.customer_id\n AND o.order_date > f.first_day\n AND julianday(o.order_date)\n   - julianday(f.first_day) <= 30;',
      },
      tables: [
        {
          caption: 'orders',
          columns: ['order_id', 'customer_id', 'order_date'],
          rows: [
            [1, 7, '2026-04-01'],
            [2, 7, '2026-04-20'],
            [3, 8, '2026-04-03'],
            [4, 8, '2026-05-20'],
            [5, 9, '2026-04-10'],
            [6, 9, '2026-04-11'],
            [7, 10, '2026-04-12'],
          ],
        },
      ],
      options: ['3', '2', '1'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'Customers 7 and 9 came back within 30 days. Customer 8 came back after 47 days, and customer 10 never did. The common mistake is counting any second order, however late, as a quick return.',
    },
    {
      id: 'u4-retention',
      type: 'build_metric',
      prompt: 'Build the metric.',
      goal: 'What share of April’s new customers ordered again within 30 days?',
      metricName: '30-day retention',
      cards: [
        { label: 'New customers in April', value: 250 },
        { label: 'Of them, ordered again within 30 days', value: 90 },
        { label: 'All orders in April', value: 700 },
        { label: 'Customers who ordered in May', value: 400 },
      ],
      numeratorIndex: 1,
      denominatorIndex: 0,
      percent: true,
      explanation:
        'Retention follows one group: of April’s new customers, how many came back within 30 days. The common mistake is dividing by a different group, such as everyone who ordered in May.',
    },
    {
      id: 'u4-court-sale-cohort',
      type: 'courtroom',
      prompt: 'Which lurking variable explains the evidence?',
      evidence:
        'Customers who joined during the October festival sale ordered less often afterwards than customers who joined in other months.',
      witnesses: [
        {
          name: 'Meera, marketing',
          claim: 'The sale annoyed customers, so they stopped ordering.',
        },
        { name: 'Farhan, product', claim: 'The app got slower after October, so orders fell.' },
      ],
      suspects: [
        {
          text: 'The weather after October',
          note: 'The weather affects every customer, not just those who joined in October.',
        },
        {
          text: 'The sale brought in one-time bargain hunters',
          note: 'A big discount attracts people who only want the deal, so that month’s group was different from the start.',
        },
        {
          text: 'Which phone customers use',
          note: 'Phones are spread across every month’s new customers.',
        },
      ],
      confounderIndex: 1,
      explanation:
        'The October group was different before it placed a second order: many joined only for the discount. The common mistake is blaming what happened after people joined, when the difference is who joined.',
    },
    {
      id: 'u4-open-window',
      type: 'multiple_choice',
      prompt:
        'Your 30-day retention drops sharply for customers who joined last week. What do you check first?',
      options: [
        'Whether last week’s customers were unhappy',
        'Whether the query has a typo',
        'Whether they have had 30 days to come back yet',
        'Whether it was worked out in Python or SQL',
      ],
      correctIndex: 2,
      explanation:
        'Customers who joined last week have had 7 days, not 30, to come back. Only count people whose 30 days are over. The common mistake is comparing a finished window with one that is still open.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Lesson 7: check it, then say it

const checkAndExplain: Lesson = {
  id: 'check-and-explain',
  title: 'Check it, then say it',
  estimatedMinutes: 5,
  intro:
    'Before you share an answer, test it. Do the parts add up to the whole? Does a second method agree? What happens with NULLs, ties and groups with no rows?\n\nThen say it in plain words: the answer first, how you got it, and one thing you would check next.',
  questions: [
    {
      id: 'u4-answer-order',
      type: 'order_steps',
      prompt: 'Put this interview answer in a clear order.',
      steps: [
        'Say the answer in one sentence',
        'Say how you defined it',
        'Describe the steps you took',
        'Say how you checked it',
        'Name one limit or next step',
      ],
      explanation:
        'Lead with the answer so the listener knows where you are going, then back it up. The common mistake is walking through every step before saying what you found.',
    },
    {
      id: 'u4-second-method',
      type: 'multiple_choice',
      prompt:
        'Your query says Pune’s delivered orders are worth ₹1.5 lakh. Which is the best check?',
      options: [
        'Run the same query again',
        'Round it to one decimal place',
        'Work it out another way, such as adding up the items in those orders',
        'Ask the interviewer whether it looks right',
      ],
      correctIndex: 2,
      explanation:
        'Running the same query repeats the same mistake, while a different route to the same number catches it. The common mistake is re-running code and calling that a check.',
    },
    {
      id: 'u4-ties-limit',
      type: 'multiple_choice',
      prompt: 'LIMIT 1 names one top customer. How many customers share the top spend?',
      code: {
        language: 'sql',
        text: 'SELECT COUNT(*)\nFROM totals\nWHERE spend = (\n  SELECT MAX(spend) FROM totals\n);',
      },
      tables: [
        {
          caption: 'totals',
          columns: ['customer_id', 'spend'],
          rows: [
            [7, 900],
            [8, 1200],
            [9, 1200],
            [10, 450],
          ],
        },
      ],
      options: ['1', '2', '3'],
      correctIndex: 1,
      check: { kind: 'sql_value' },
      explanation:
        'Customers 8 and 9 both spent ₹1,200, and LIMIT 1 silently picks one of them. The common mistake is reporting one “top” customer when there is a tie.',
    },
    {
      id: 'u4-empty-groups',
      type: 'multiple_choice',
      prompt: 'Five cities should appear in this report. How many rows does it return?',
      code: {
        language: 'sql',
        text: 'SELECT c.city, COUNT(*) AS orders\nFROM cities AS c\nJOIN orders AS o ON o.city = c.city\nGROUP BY c.city;',
      },
      tables: [
        {
          caption: 'cities',
          columns: ['city'],
          rows: [['Pune'], ['Mumbai'], ['Delhi'], ['Chennai'], ['Jaipur']],
        },
        {
          caption: 'orders',
          columns: ['order_id', 'city'],
          rows: [
            [1, 'Pune'],
            [2, 'Pune'],
            [3, 'Mumbai'],
            [4, 'Delhi'],
            [5, 'Chennai'],
          ],
        },
      ],
      options: ['5 rows', '4 rows', '6 rows'],
      correctIndex: 1,
      check: { kind: 'sql_rows' },
      explanation:
        'Jaipur has no orders, so the join drops it and the report quietly shows four cities. A LEFT JOIN from cities with COUNT(o.order_id) keeps it, with 0. The common mistake is losing the zeros.',
    },
    {
      id: 'u4-not-in-null',
      type: 'multiple_choice',
      prompt: 'Which customers were not referred by anyone? How many rows come back?',
      code: {
        language: 'sql',
        text: 'SELECT customer_id\nFROM customers\nWHERE customer_id NOT IN (\n  SELECT referred_id FROM referrals\n);',
      },
      tables: [
        { caption: 'customers', columns: ['customer_id'], rows: [[1], [2], [3]] },
        { caption: 'referrals', columns: ['referred_id'], rows: [[2], [null]] },
      ],
      options: ['2 rows', '1 row', '0 rows'],
      correctIndex: 2,
      check: { kind: 'sql_rows' },
      explanation:
        'The list holds a NULL, and “not equal to NULL” is never true, so NOT IN returns nothing at all. Filter out the NULLs or use NOT EXISTS. The common mistake is trusting NOT IN over a column with gaps.',
    },
    {
      id: 'u4-lie-ranking',
      type: 'spot_the_lie',
      prompt: 'Rohit put this slide in the review. What is wrong with it?',
      claim: { by: 'Rohit from Finance', text: 'Mumbai is miles ahead of Pune!' },
      chart: {
        kind: 'bar',
        title: 'Revenue from delivered orders, April to June',
        labels: ['Mumbai', 'Pune', 'Bengaluru'],
        series: [{ name: 'Revenue', values: [1.7, 1.47, 1.26] }],
        axis: { min: 1.2, max: 1.75, label: 'Lakh ₹' },
      },
      trick: 'truncated_axis',
      options: [
        'Revenue should be shown in rupees, not lakh',
        'The axis starts at ₹1.2 lakh, so a 16% lead looks enormous',
        'Bengaluru should not be on the same chart',
      ],
      correctIndex: 1,
      explanation:
        'Mumbai brought in about 16% more than Pune, but cutting the axis at ₹1.2 lakh makes its bar look nearly twice as tall. The common mistake is presenting a true ranking with a picture that exaggerates it.',
    },
    {
      id: 'u4-plain-words',
      type: 'multiple_choice',
      prompt:
        'The manager asks why the dashboard put Pune on top. Which answer works for someone who is not technical?',
      options: [
        'There was a one-to-many fan-out on order_items',
        'The dashboard added each order once for every item in it, and Pune’s orders have the most items',
        'The data is wrong',
        'Pune’s numbers were made up',
      ],
      correctIndex: 1,
      explanation:
        'Say what happened in everyday words, and why it hit Pune hardest. The common mistake is explaining with jargon, so the listener cannot act on it.',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// Checkpoint

const checkpoint: Checkpoint = {
  id: 'unit-4-checkpoint',
  title: 'Unit 4 checkpoint',
  passMark: 0.8,
  retakeDelayMinutes: 60,
  items: [
    {
      lessonId: 'think-before-you-type',
      question: {
        id: 'u4-cp-clarify',
        type: 'multiple_choice',
        prompt: 'An interviewer asks: “How is the app doing?” What is the best first reply?',
        options: [
          '“Let me write a query over all the tables.”',
          '“It is doing well.”',
          '“Do you mean orders, revenue or customers, and compared with when?”',
          '“I would need more data.”',
        ],
        correctIndex: 2,
        explanation:
          '“Doing” could mean many things, so offer a measure and a comparison and let the interviewer choose. The common mistake is diving into the data before the question is pinned down.',
      },
    },
    {
      lessonId: 'how-sql-runs',
      question: {
        id: 'u4-cp-having',
        type: 'multiple_choice',
        prompt: 'Fill the blank to keep the cities with at least 3 orders.',
        code: {
          language: 'sql',
          text: 'SELECT city, COUNT(*) AS orders\nFROM orders\nGROUP BY city\n____;',
        },
        tables: [
          {
            caption: 'orders',
            columns: ['order_id', 'city'],
            rows: [
              [1, 'Pune'],
              [2, 'Pune'],
              [3, 'Pune'],
              [4, 'Delhi'],
              [5, 'Delhi'],
              [6, 'Delhi'],
              [7, 'Delhi'],
              [8, 'Mumbai'],
            ],
          },
        ],
        options: ['HAVING COUNT(*) > 3', 'WHERE COUNT(*) >= 3', 'HAVING COUNT(*) >= 3'],
        correctIndex: 2,
        check: {
          kind: 'sql_blank',
          reference: 'SELECT city, COUNT(*) FROM orders GROUP BY city HAVING NOT COUNT(*) < 3',
        },
        explanation:
          'HAVING filters the counted groups, and “at least 3” includes 3, so Pune stays. The common mistake is filtering totals in WHERE, or losing the boundary case with >.',
      },
    },
    {
      lessonId: 'how-sql-runs',
      question: {
        id: 'u4-cp-count-distinct',
        type: 'multiple_choice',
        prompt: 'What does this query return?',
        code: { language: 'sql', text: 'SELECT COUNT(DISTINCT customer_id)\nFROM orders;' },
        tables: [
          {
            caption: 'orders',
            columns: ['order_id', 'customer_id'],
            rows: [
              [1, 7],
              [2, 7],
              [3, 8],
              [4, null],
              [5, 9],
            ],
          },
        ],
        options: ['5', '3', '4'],
        correctIndex: 1,
        check: { kind: 'sql_value' },
        explanation:
          'COUNT(DISTINCT customer_id) counts different customers and skips the NULL: 7, 8 and 9. The common mistake is counting orders, or counting the missing value as a customer.',
      },
    },
    {
      lessonId: 'joins-without-double-counting',
      question: {
        id: 'u4-cp-fan-out',
        type: 'multiple_choice',
        prompt: 'Order 2 has four items. What does this query return?',
        code: {
          language: 'sql',
          text: 'SELECT SUM(o.order_value)\nFROM orders AS o\nJOIN order_items AS i\n  ON i.order_id = o.order_id;',
        },
        tables: [
          {
            caption: 'orders',
            columns: ['order_id', 'order_value'],
            rows: [
              [1, 300],
              [2, 80],
            ],
          },
          {
            caption: 'order_items',
            columns: ['order_id', 'item'],
            rows: [
              [1, 'Thali'],
              [2, 'Chai'],
              [2, 'Samosa'],
              [2, 'Jalebi'],
              [2, 'Lassi'],
            ],
          },
        ],
        options: ['380', '620', '5'],
        correctIndex: 1,
        check: { kind: 'sql_value' },
        explanation:
          'Order 2’s ₹80 is added once for each of its four items: 300 + 320 = 620, not the real 380. The common mistake is adding up an order-level column after joining items.',
      },
    },
    {
      lessonId: 'joins-without-double-counting',
      question: {
        id: 'u4-cp-zero-orders',
        type: 'multiple_choice',
        prompt: 'How many customers does this count as having no orders?',
        code: {
          language: 'sql',
          text: 'SELECT COUNT(*) FROM (\n  SELECT c.customer_id,\n    COUNT(o.order_id) AS n\n  FROM customers AS c\n  LEFT JOIN orders AS o\n    ON o.customer_id = c.customer_id\n  GROUP BY c.customer_id\n) AS per_customer\nWHERE n = 0;',
        },
        tables: [
          { caption: 'customers', columns: ['customer_id'], rows: [[1], [2], [3], [4]] },
          {
            caption: 'orders',
            columns: ['order_id', 'customer_id'],
            rows: [
              [10, 1],
              [11, 1],
              [12, 3],
            ],
          },
        ],
        options: ['2', '0', '4'],
        correctIndex: 0,
        check: { kind: 'sql_value' },
        explanation:
          'The LEFT JOIN keeps customers 2 and 4, and COUNT(o.order_id) gives them 0 because it skips the NULLs. COUNT(*) would have given them 1 each. The common mistake is counting an empty match as an order.',
      },
    },
    {
      lessonId: 'window-functions',
      question: {
        id: 'u4-cp-dense-rank',
        type: 'multiple_choice',
        prompt: 'Which rank does the ₹300 order get?',
        code: {
          language: 'sql',
          text: 'SELECT r FROM (\n  SELECT order_value,\n    DENSE_RANK() OVER (\n      ORDER BY order_value DESC) AS r\n  FROM orders\n) AS ranked\nWHERE order_value = 300;',
        },
        tables: [
          {
            caption: 'orders',
            columns: ['order_id', 'order_value'],
            rows: [
              [1, 500],
              [2, 500],
              [3, 300],
              [4, 200],
            ],
          },
        ],
        options: ['3', '2', '1'],
        correctIndex: 1,
        check: { kind: 'sql_value' },
        explanation:
          'DENSE_RANK leaves no gaps after a tie: both ₹500 orders are 1, so ₹300 is 2. RANK would say 3. The common mistake is mixing up RANK and DENSE_RANK.',
      },
    },
    {
      lessonId: 'pandas-patterns',
      question: {
        id: 'u4-cp-nan-equals',
        type: 'multiple_choice',
        prompt: 'Two values are missing. What does this print?',
        code: {
          language: 'python',
          text: 'import pandas as pd\ns = pd.Series(["A", None, None])\nprint((s == None).sum())',
        },
        options: ['2', '0', '1'],
        correctIndex: 1,
        check: { kind: 'python_output' },
        explanation:
          'Nothing is ever equal to a missing value, so == None finds neither gap. Use s.isna() to find them. The common mistake is testing for missing values with ==.',
      },
    },
    {
      lessonId: 'rates-and-retention',
      question: {
        id: 'u4-cp-rounded-down',
        type: 'multiple_choice',
        prompt: '45 of 200 customers came back. What does this query return?',
        code: { language: 'sql', text: 'SELECT 100 * returned / signed_up\nFROM summary;' },
        tables: [{ caption: 'summary', columns: ['returned', 'signed_up'], rows: [[45, 200]] }],
        options: ['22.5', '22', '0'],
        correctIndex: 1,
        check: { kind: 'sql_value' },
        explanation:
          'Whole numbers divide as whole numbers, so 4,500 ÷ 200 gives 22, not 22.5. Multiplying by 100 first saved most of it, but not the half: use 100.0. The common mistake is trusting a rate that was quietly rounded down.',
      },
    },
    {
      lessonId: 'rates-and-retention',
      question: {
        id: 'u4-cp-repeat-rate',
        type: 'build_metric',
        prompt: 'Build the metric.',
        goal: 'What share of customers who ordered from April to June ordered at least twice?',
        metricName: 'Repeat rate',
        cards: [
          { label: 'Customers with 2 or more orders', value: 520 },
          { label: 'Customers who signed up', value: 2650 },
          { label: 'Customers with at least 1 order', value: 1300 },
          { label: 'Orders from April to June', value: 3460 },
        ],
        numeratorIndex: 0,
        denominatorIndex: 2,
        percent: true,
        explanation:
          'Only customers who ordered could order twice, so they are the bottom of the fraction. The common mistake is dividing by everyone who ever signed up.',
      },
    },
    {
      lessonId: 'check-and-explain',
      question: {
        id: 'u4-cp-answer-first',
        type: 'multiple_choice',
        prompt: 'Which is the best way to start your answer to the manager?',
        options: [
          '“First I joined three tables, then I grouped by city…”',
          '“Mumbai brought in the most: ₹1.7 lakh from delivered orders.”',
          '“The query ran without errors.”',
          '“It depends on many things.”',
        ],
        correctIndex: 1,
        explanation:
          'Start with the answer and its definition; the steps can follow if they are wanted. The common mistake is making the listener sit through the method before hearing the result.',
      },
    },
  ],
};

export const unit4: Unit = {
  id: 'unit-4-crack-the-interview',
  title: 'Crack the Interview',
  description:
    'SQL and pandas interview questions, and a step-by-step way to solve a data problem out loud.',
  hook: {
    from: 'Kavya',
    role: 'Analytics lead, Nashta Now',
    channel: 'email',
    subject: 'Your technical round on Friday',
    text: 'Hi! Thanks for your time last week. Friday’s technical round is an hour long: a few SQL and pandas questions, then one live problem with our orders data. We care most about how you get to the answer, so ask questions, check the data, work step by step and tell us what you are doing. See you on Friday!',
  },
  lessons: [
    thinkBeforeYouType,
    howSqlRuns,
    joins,
    windowFunctions,
    pandasPatterns,
    ratesAndRetention,
    checkAndExplain,
  ],
  checkpoint,
  missionId: 'the-final-round',
};
