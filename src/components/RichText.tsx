interface RichTextProps {
  text: string;
  className?: string;
}

/** Renders content text: blank lines start a new paragraph and **double stars** make bold. */
export function RichText({ text, className }: RichTextProps) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={partIndex} className="font-semibold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}
