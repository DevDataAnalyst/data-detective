import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SUPPORT } from '../content/support';
import { DonateButton } from './DonateButton';

/** Pretends to be a computer (a mouse that hovers) or a phone. jsdom has no matchMedia. */
function pretendDevice(kind: 'computer' | 'phone') {
  window.matchMedia = ((query: string) => ({
    matches: kind === 'computer' && query.includes('pointer: fine'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe('DonateButton', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('on a phone, links straight to a UPI app with the chosen amount', async () => {
    pretendDevice('phone');
    const user = userEvent.setup();
    render(<DonateButton />);
    const section = screen.getByRole('region', { name: 'Enjoying Data Detective?' });

    const link = within(section).getByRole('link', { name: 'Pay ₹50 with a UPI app' });
    expect(link.getAttribute('href')).toMatch(/^upi:\/\/pay\?pa=debayankar7@okhdfcbank&/);
    expect(link.getAttribute('href')).toContain('&am=50&');

    await user.click(screen.getByRole('radio', { name: '₹100' }));
    expect(screen.getByRole('link', { name: 'Pay ₹100 with a UPI app' })).toHaveAttribute(
      'href',
      expect.stringContaining('&am=100&'),
    );
    await user.click(screen.getByRole('radio', { name: 'Any amount' }));
    const anyAmount = screen.getByRole('link', { name: 'Pay with a UPI app' });
    expect(anyAmount.getAttribute('href')).not.toContain('am=');

    // No QR code on a phone until asked for: it would be scanned from another device.
    expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show a QR code' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('on a computer, shows a QR code drawn in the page, with no outside service', async () => {
    pretendDevice('computer');
    const user = userEvent.setup();
    render(<DonateButton />);

    const qr = await screen.findByRole('img', {
      name: `QR code to pay ₹50 to ${SUPPORT.upiId} with any UPI app`,
    });
    expect(qr.tagName.toLowerCase()).toBe('svg');
    expect(qr.querySelector('path')?.getAttribute('d')).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(document.querySelector('img[src^="http"]')).toBeNull();

    // A different amount draws a different code.
    const before = qr.querySelector('path')?.getAttribute('d');
    await user.click(screen.getByRole('radio', { name: '₹20' }));
    const after = await screen.findByRole('img', { name: /QR code to pay ₹20/ });
    expect(after.querySelector('path')?.getAttribute('d')).not.toBe(before);

    await user.click(screen.getByRole('button', { name: 'Hide the QR code' }));
    expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument();
  });

  it('copies the UPI ID, for iPhones and any other app', async () => {
    pretendDevice('phone');
    const user = userEvent.setup();
    render(<DonateButton />);
    expect(screen.getByText(SUPPORT.upiId)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Copy UPI ID' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'UPI ID copied. Paste it into any UPI app.',
    );
    expect(await navigator.clipboard.readText()).toBe(SUPPORT.upiId);
  });

  it('says that nothing is unlocked by paying', () => {
    render(<DonateButton />);
    expect(screen.getByText(/paying doesn’t unlock anything/)).toBeVisible();
    expect(screen.getByText(/completely optional/)).toBeVisible();
  });
});
