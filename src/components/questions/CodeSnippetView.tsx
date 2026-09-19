import { Fragment } from 'react';
import { CODE_BLANK, LANGUAGE_NAMES } from '../../content/code';
import type { CodeSnippet } from '../../content/types';

/**
 * Code to read, in the dark code style used across the app. Long lines scroll sideways rather
 * than wrap, since indentation matters; the region is focusable so the keyboard can scroll it.
 * A `____` blank shows as an empty box, and screen readers hear "blank".
 */
export function CodeSnippetView({ code }: { code: CodeSnippet }) {
  const name = LANGUAGE_NAMES[code.language];
  const parts = code.text.split(CODE_BLANK);
  return (
    <div
      role="region"
      aria-label={`${name} code`}
      tabIndex={0}
      className="overflow-x-auto rounded-2xl bg-code px-4 pt-2.5 pb-3 text-code-ink"
    >
      <p aria-hidden="true" className="text-xs font-bold tracking-wide uppercase opacity-75">
        {name}
      </p>
      <pre className="mt-1 font-mono text-[13px] leading-relaxed sm:text-sm">
        <code>
          {parts.map((part, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="mx-0.5 inline-block min-w-14 rounded-md border-2 border-dashed border-code-ink/60 text-center"
                  >
                    ?
                  </span>
                  <span className="sr-only">blank</span>
                </>
              )}
              {part}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
