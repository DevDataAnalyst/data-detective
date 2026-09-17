import type { DayActivity } from '../../game/streak';
import { useElementWidth } from '../hooks';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function describeDay(day: string): { weekday: string; long: string } {
  const [year, month, date] = day.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
  return { weekday, long: `${weekday} ${date} ${MONTHS[month - 1]}` };
}

interface DailyXpChartProps {
  days: readonly DayActivity[];
  dailyGoal: number;
}

/** Bars of XP per day with the daily goal as a dashed line. Today is the last bar. */
export function DailyXpChart({ days, dailyGoal }: DailyXpChartProps) {
  const [ref, width] = useElementWidth<HTMLElement>(320);
  const height = 170;
  const top = 18;
  const bottom = 28;
  const left = 4;
  const right = 4;
  const plotHeight = height - top - bottom;
  const maxXp = Math.max(dailyGoal * 1.25, ...days.map((day) => day.xp));
  const slot = (width - left - right) / days.length;
  const barWidth = Math.max(6, slot * 0.62);
  const y = (xp: number) => top + plotHeight - (xp / maxXp) * plotHeight;
  const goalY = y(dailyGoal);
  const metCount = days.filter((day) => day.goalMet).length;
  const everyOtherLabel = slot < 28;

  return (
    <figure ref={ref} className="w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto max-w-full overflow-visible"
        role="img"
        aria-label={`XP per day for the last ${days.length} days. Goal of ${dailyGoal} XP met on ${metCount} of them.`}
      >
        <line
          x1={left}
          x2={width - right}
          y1={top + plotHeight}
          y2={top + plotHeight}
          className="stroke-slate-300"
        />
        <line
          x1={left}
          x2={width - right}
          y1={goalY}
          y2={goalY}
          strokeDasharray="5 4"
          className="stroke-streak-500"
          strokeWidth={1.5}
        />
        <text x={left} y={goalY - 5} className="fill-streak-700 text-[11px] font-bold">
          {`Goal ${dailyGoal} XP`}
        </text>
        {days.map((day, index) => {
          const x = left + slot * index + (slot - barWidth) / 2;
          const barTop = day.xp > 0 ? y(day.xp) : top + plotHeight - 2;
          const isToday = index === days.length - 1;
          const { weekday, long } = describeDay(day.day);
          return (
            <g key={day.day}>
              <title>{`${long}: ${day.xp} XP${day.goalMet ? ', goal met' : ''}${day.frozen ? ', covered by a streak freeze' : ''}`}</title>
              <rect
                x={x}
                y={barTop}
                width={barWidth}
                height={top + plotHeight - barTop}
                rx={3}
                className={
                  day.xp === 0 ? 'fill-slate-200' : day.goalMet ? 'fill-correct-600' : 'fill-xp-500'
                }
              />
              {day.frozen && (
                <text
                  x={x + barWidth / 2}
                  y={top + plotHeight - 8}
                  textAnchor="middle"
                  className="fill-current-600 text-[11px]"
                >
                  ❄
                </text>
              )}
              {(isToday || !everyOtherLabel || index % 2 === (days.length - 1) % 2) && (
                <text
                  x={x + barWidth / 2}
                  y={height - 9}
                  textAnchor="middle"
                  className={`text-[11px] ${isToday ? 'fill-slate-900 font-bold' : 'fill-slate-600'}`}
                >
                  {isToday ? 'Today' : weekday.slice(0, 1)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-correct-600" /> Goal met
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-xp-500" /> Some XP
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-streak-500" />
          Daily goal
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>XP per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">XP</th>
            <th scope="col">Goal met</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <td>{describeDay(day.day).long}</td>
              <td>{day.xp}</td>
              <td>{day.goalMet ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
