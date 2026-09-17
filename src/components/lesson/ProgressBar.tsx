interface ProgressBarProps {
  done: number;
  total: number;
  label: string;
}

export function ProgressBar({ done, total, label }: ProgressBarProps) {
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${total} done`}
      className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className="h-full rounded-full bg-correct-500 transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
