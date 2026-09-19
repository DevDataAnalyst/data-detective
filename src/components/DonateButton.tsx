import { useEffect, useId, useState } from 'react';
import { SUPPORT, upiPayUrl } from '../content/support';
import { buttonStyles } from './buttonStyles';
import { useMediaQuery } from './hooks';
import { CopyIcon } from './icons';

/** A mouse and a hover: probably a computer, where a UPI link has no app to open. */
const COMPUTER_QUERY = '(hover: hover) and (pointer: fine)';

const chipClasses = {
  idle: 'border-slate-300 bg-surface text-slate-800 hover:border-current-500 hover:bg-current-50',
  selected: 'border-current-600 bg-current-50 text-current-ink-800',
};

/**
 * Optional support through UPI, at the end of the mission complete screen. On a phone the button
 * opens a UPI app with the amount filled in. On a computer a QR code, drawn here with no outside
 * service, lets people pay from their phone. Copying the UPI ID works anywhere, including iPhones,
 * where UPI links may not open an app. Nothing checks that a payment happened, so paying unlocks
 * nothing.
 */
export function DonateButton() {
  const titleId = useId();
  const amountName = useId();
  const [amount, setAmount] = useState<number | null>(SUPPORT.defaultAmount);
  const computer = useMediaQuery(COMPUTER_QUERY);
  // Until the learner chooses, the QR code shows on computers and hides on phones.
  const [qrChoice, setQrChoice] = useState<boolean | null>(null);
  const showQr = qrChoice ?? computer;
  const [status, setStatus] = useState('');

  const url = upiPayUrl({
    upiId: SUPPORT.upiId,
    payeeName: SUPPORT.payeeName,
    note: SUPPORT.note,
    amount,
  });
  const amountText = amount === null ? '' : ` ₹${amount}`;

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('The clipboard is not available');
      await navigator.clipboard.writeText(SUPPORT.upiId);
      setStatus('UPI ID copied. Paste it into any UPI app.');
    } catch {
      setStatus(`Couldn’t copy here. The UPI ID is ${SUPPORT.upiId}.`);
    }
  };

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
    >
      <div className="space-y-1">
        <h2 id={titleId} className="text-lg font-bold text-slate-900">
          Enjoying Data Detective?
        </h2>
        <p className="text-slate-700">
          It’s free, with no ads. If it helped you, you can chip in through UPI. It’s completely
          optional.
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">Amount</legend>
        <div className="flex flex-wrap gap-2">
          {[...SUPPORT.amounts, null].map((option) => (
            <label
              key={option ?? 'any'}
              className={`flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 font-semibold transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-current-600 ${
                amount === option ? chipClasses.selected : chipClasses.idle
              }`}
            >
              <input
                type="radio"
                name={amountName}
                className="sr-only"
                checked={amount === option}
                onChange={() => setAmount(option)}
              />
              {option === null ? 'Any amount' : `₹${option}`}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <a
          href={url}
          className={`w-full ${computer ? buttonStyles.secondary : buttonStyles.primary}`}
        >
          Pay{amountText} with a UPI app
        </a>
        <p className="text-sm text-slate-600">
          Opens Google Pay, PhonePe, Paytm or another UPI app with{' '}
          {amount === null ? 'the details' : 'the amount'} filled in. You confirm with your UPI PIN.
        </p>
      </div>

      {showQr && (
        <figure className="flex flex-col items-center gap-2">
          <UpiQrCode
            value={url}
            label={`QR code to pay${amountText} to ${SUPPORT.upiId} with any UPI app`}
          />
          <figcaption className="text-sm text-slate-600">
            Scan it with any UPI app on your phone.
          </figcaption>
        </figure>
      )}

      <p className="text-sm text-slate-700">
        Or pay to{' '}
        <code className="rounded bg-slate-100 px-1 font-mono break-all text-slate-900">
          {SUPPORT.upiId}
        </code>{' '}
        from any UPI app.
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={copy}
          className={`${buttonStyles.ghost} min-h-11 px-3 text-sm`}
        >
          <CopyIcon aria-hidden="true" />
          Copy UPI ID
        </button>
        <button
          type="button"
          aria-expanded={showQr}
          onClick={() => setQrChoice(!showQr)}
          className={`${buttonStyles.ghost} min-h-11 px-3 text-sm`}
        >
          {showQr ? 'Hide the QR code' : 'Show a QR code'}
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm font-medium text-slate-700">
        {status}
      </p>
      <p className="text-xs text-slate-600">
        Your UPI app handles the payment: Data Detective never sees your payment details, and paying
        doesn’t unlock anything.
      </p>
    </section>
  );
}

type QrState = { value: string; modules: boolean[][] } | { value: string; failed: true } | null;

/**
 * The payment link as a QR code, drawn as SVG in black on white (scanners need the contrast, so
 * it ignores the theme), with the four-module quiet zone around it. The encoder loads only when
 * a QR code is shown.
 */
function UpiQrCode({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<QrState>(null);

  useEffect(() => {
    let current = true;
    import('uqr')
      .then(({ encode }) => {
        if (current) setState({ value, modules: encode(value, { ecc: 'M', border: 0 }).data });
      })
      .catch(() => {
        if (current) setState({ value, failed: true });
      });
    return () => {
      current = false;
    };
  }, [value]);

  if (state?.value === value && 'failed' in state) {
    return (
      <p className="text-sm text-slate-700">
        The QR code couldn’t load. Copy the UPI ID below instead.
      </p>
    );
  }
  if (state?.value !== value || !('modules' in state)) {
    return <div aria-hidden="true" className="size-52 rounded-lg bg-slate-100" />;
  }
  const quiet = 4;
  const size = state.modules.length + quiet * 2;
  const path = state.modules
    .flatMap((row, y) =>
      row.flatMap((dark, x) => (dark ? [`M${x + quiet} ${y + quiet}h1v1h-1z`] : [])),
    )
    .join('');
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="block size-52 rounded-lg"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
