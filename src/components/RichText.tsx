interface RichTextProps {
  text: string;
  className?: string;
}

/** Inline formatting for content text: **bold** and `code`. */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
          return (
            <code
              key={index}
              className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-900"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

/** Renders content text: blank lines start a new paragraph; **bold** and `code` work inline. */
export function RichText({ text, className }: RichTextProps) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>
          <InlineText text={paragraph} />
        </p>
      ))}
    </div>
  );
}
