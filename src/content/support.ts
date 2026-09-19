/**
 * Voluntary support through UPI, offered on the mission complete screen. The UPI ID is public on
 * purpose: it is where people pay. Nothing checks that a payment happened, so nothing in the app
 * may ever depend on one: a real reward would need a payment gateway that confirms it.
 */
export const SUPPORT = {
  upiId: 'debayankar7@okhdfcbank',
  payeeName: 'Data Detective',
  note: 'Support Data Detective',
  /** Suggested amounts in ₹. Learners can also choose any amount in their UPI app. */
  amounts: [20, 50, 100],
  defaultAmount: 50,
} as const;

export interface UpiPayment {
  upiId: string;
  payeeName: string;
  note: string;
  /** ₹, or null to let the payer type the amount in their UPI app. */
  amount: number | null;
}

/** %-encoding with spaces as %20 (not +) and @ left as it is, the way UPI apps read links. */
function encode(value: string): string {
  return encodeURIComponent(value).replace(/%40/g, '@');
}

/**
 * A UPI payment link. On a phone it opens a UPI app (Google Pay, PhonePe, Paytm, BHIM…) with the
 * payee, note and amount filled in; the payer confirms with their UPI PIN. The same text in a QR
 * code works from a computer: any UPI app can scan it.
 */
export function upiPayUrl({ upiId, payeeName, note, amount }: UpiPayment): string {
  const params: Array<[string, string]> = [
    ['pa', upiId],
    ['pn', payeeName],
    ...(amount === null ? [] : ([['am', String(amount)]] as Array<[string, string]>)),
    ['cu', 'INR'],
    ['tn', note],
  ];
  return `upi://pay?${params.map(([key, value]) => `${key}=${encode(value)}`).join('&')}`;
}
