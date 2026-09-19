/**
 * The hidden checks for each mission, as Python source. Each module defines the same three
 * functions: `compute_reference(path)`, `reference_summary()` and `check_task(task_id, ns)`.
 * The worker loads the one for the mission that is open.
 */
import deliveryChecks from './checks.py?raw';
import checkoutChecks from './checks_checkout.py?raw';
import churnChecks from './checks_churn.py?raw';
import interviewChecks from './checks_interview.py?raw';

export const CHECK_MODULES: Readonly<Record<string, string>> = {
  'late-delivery-mystery': deliveryChecks,
  'the-false-alarm': churnChecks,
  'the-checkout-redesign': checkoutChecks,
  'the-final-round': interviewChecks,
};
