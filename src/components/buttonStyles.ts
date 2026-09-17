const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition-colors select-none disabled:cursor-not-allowed';

/** Shared button looks. White text only sits on 700-weight colours to keep 4.5:1 contrast. */
export const buttonStyles = {
  primary: `${base} bg-current-600 text-white shadow-[0_4px_0_var(--color-current-800)] hover:bg-current-700 active:translate-y-0.5 active:shadow-none disabled:bg-locked-200 disabled:text-locked-500 disabled:shadow-none disabled:translate-y-0`,
  correct: `${base} bg-correct-700 text-white shadow-[0_4px_0_var(--color-correct-900)] hover:bg-correct-800 active:translate-y-0.5 active:shadow-none`,
  incorrect: `${base} bg-incorrect-700 text-white shadow-[0_4px_0_var(--color-incorrect-900)] hover:bg-incorrect-800 active:translate-y-0.5 active:shadow-none`,
  secondary: `${base} border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-locked-500`,
  ghost: `${base} text-slate-700 hover:bg-slate-100`,
  icon: 'inline-flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800',
} as const;
