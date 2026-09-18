/**
 * The hidden checks for each mission, as Python source. Each module defines the same three
 * functions: `compute_reference(path)`, `reference_summary()` and `check_task(task_id, ns)`.
 * The worker loads the one for the mission that is open.
 */
import deliveryChecks from './checks.py?raw';
import churnChecks from './checks_churn.py?raw';

export const CHECK_MODULES: Readonly<Record<string, string>> = {
  'late-delivery-mystery': deliveryChecks,
  'the-false-alarm': churnChecks,
};
