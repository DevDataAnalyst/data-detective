interface DailyGoalRingProps {
  xpToday: number;
  dailyGoal: number;
  size?: number;
}

/** A ring that fills toward the daily XP goal. Decorative: pair it with text. */
export function DailyGoalRing({ xpToday, dailyGoal, size = 64 }: DailyGoalRingProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, dailyGoal > 0 ? xpToday / dailyGoal : 1);
  const met = progress >= 1;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-slate-200"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform={`rotate(-90 ${center} ${center})`}
        className={`transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none ${
          met ? 'stroke-correct-500' : 'stroke-streak-500'
        }`}
      />
      {met ? (
        <path
          d={`M ${center - 9} ${center} l 6 6 l 12 -13`}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-correct-700"
        />
      ) : (
        <text
          x={center}
          y={center + 5}
          textAnchor="middle"
          className="fill-slate-800 text-[15px] font-bold"
        >
          {xpToday}
        </text>
      )}
    </svg>
  );
}
