import type { DataTable, NumberDataset } from '../../content/types';
import { captionWithUnit, formatValue } from '../../content/template';
import { DotPlot } from '../charts/DotPlot';
import { paddedDomain } from '../charts/dotPlotLayout';

export function ValueList({ dataset }: { dataset: NumberDataset }) {
  return (
    <figure>
      <figcaption className="text-sm font-semibold text-slate-600">{dataset.label}</figcaption>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label={`${dataset.label} values`}>
        {dataset.values.map((value, index) => (
          <li
            key={index}
            className="rounded-lg bg-white px-2.5 py-1.5 font-mono text-sm text-slate-800 tabular-nums ring-1 ring-slate-300"
          >
            {formatValue(dataset, value)}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Shows a dataset as chips or a dot plot, depending on the content. */
export function DatasetView({ dataset }: { dataset: NumberDataset }) {
  if (dataset.display !== 'dot_plot') return <ValueList dataset={dataset} />;
  return (
    <figure>
      <figcaption className="text-sm font-semibold text-slate-600">
        {captionWithUnit(dataset)}
      </figcaption>
      <div className="mt-1">
        <DotPlot dataset={dataset} />
      </div>
    </figure>
  );
}

/** Several datasets on a shared axis so their spread can be compared fairly. */
export function DatasetComparison({ datasets }: { datasets: readonly NumberDataset[] }) {
  const domain = paddedDomain(datasets.flatMap((dataset) => dataset.values));
  return (
    <div className="space-y-3">
      {datasets.map((dataset) => (
        <figure
          key={dataset.label}
          className="rounded-2xl bg-slate-50 px-3 pt-2 ring-1 ring-slate-200"
        >
          <figcaption className="text-sm font-bold text-slate-700">{dataset.label}</figcaption>
          <p className="font-mono text-xs text-slate-600">
            {dataset.values.map((value) => formatValue(dataset, value)).join(' · ')}
          </p>
          <DotPlot dataset={dataset} domain={domain} />
        </figure>
      ))}
    </div>
  );
}

export function DataTableView({ table }: { table: DataTable }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-300">
      <table className="min-w-full text-sm">
        <caption className="px-3 pt-2.5 pb-1 text-left font-semibold text-slate-700">
          {table.caption}
        </caption>
        <thead>
          <tr className="border-b border-slate-200">
            {table.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-3 py-2 text-left font-mono text-xs font-semibold whitespace-nowrap text-slate-600"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-3 py-2 font-mono whitespace-nowrap ${typeof cell === 'number' ? 'text-right tabular-nums' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
