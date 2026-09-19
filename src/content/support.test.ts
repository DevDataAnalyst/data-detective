import { describe, expect, it } from 'vitest';
import { SUPPORT, upiPayUrl } from './support';

const payment = {
  upiId: SUPPORT.upiId,
  payeeName: SUPPORT.payeeName,
  note: SUPPORT.note,
};

describe('upiPayUrl', () => {
  it('builds a UPI link with the payee, amount, currency and note', () => {
    expect(upiPayUrl({ ...payment, amount: 50 })).toBe(
      'upi://pay?pa=debayankar7@okhdfcbank&pn=Data%20Detective&am=50&cu=INR&tn=Support%20Data%20Detective',
    );
  });

  it('leaves the amount out, for the payer to type, when none is chosen', () => {
    const url = upiPayUrl({ ...payment, amount: null });
    expect(url).not.toContain('am=');
    expect(new URL(url).searchParams.get('pa')).toBe('debayankar7@okhdfcbank');
  });

  it('encodes spaces as %20 and other symbols safely, but keeps @ readable', () => {
    const url = upiPayUrl({ upiId: 'a.b@bank', payeeName: 'A & B', note: 'x=y', amount: 20 });
    expect(url).toBe('upi://pay?pa=a.b@bank&pn=A%20%26%20B&am=20&cu=INR&tn=x%3Dy');
  });

  it('suggests small amounts, with a default among them', () => {
    expect(SUPPORT.amounts).toContain(SUPPORT.defaultAmount);
  });
});
