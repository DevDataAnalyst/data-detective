import { AlertIcon, ClockIcon, LightbulbIcon } from '../../components/icons';
import { hintForError, type ErrorHintContext } from '../errorHints';
import type { PythonError, RichOutput, TableOutput } from '../python/protocol';
import type { RunOutcome } from '../python/pythonRuntime';

interface OutputPanelProps {
  outcome: RunOutcome | null;
  running: boolean;
  downloadingPackages?: string | null;
  /** The open mission's files, tables and variables, so error hints can name them. */
  hintContext?: ErrorHintContext;
}

export function OutputPanel({
  outcome,
  running,
  downloadingPackages = null,
  hintContext,
}: OutputPanelProps) {
  return (
    <section
      aria-labelledby="output-title"
      className="rounded-2xl bg-surface p-3 ring-1 ring-slate-200 sm:p-4"
    >
      <h3
        id="output-title"
        className="mb-2 text-sm font-bold tracking-wide text-slate-600 uppercase"
      >
        Output
      </h3>
      <div aria-busy={running}>
        {renderBody(outcome, running, downloadingPackages, hintContext)}
      </div>
    </section>
  );
}

function renderBody(
  outcome: RunOutcome | null,
  running: boolean,
  downloadingPackages: string | null,
  hintContext: ErrorHintContext | undefined,
) {
  if (running) {
    return (
      <div className="flex items-start gap-2 text-slate-600">
        <span
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 rounded-full border-2 border-current-600 border-t-transparent motion-safe:animate-spin"
        />
        {downloadingPackages ? (
          <p>
            Downloading packages your code needs ({downloadingPackages}). This happens once per
            visit and can take a minute on a slow connection.
          </p>
        ) : (
          <p>Running your code…</p>
        )}
      </div>
    );
  }
  if (!outcome) {
    return <p className="text-slate-600">Run your code to see the result here.</p>;
  }
  switch (outcome.kind) {
    case 'timed_out':
      return (
        <div className="flex gap-3 rounded-xl border-2 border-incorrect-200 bg-incorrect-50 p-3 text-incorrect-ink-900">
          <ClockIcon className="mt-0.5 shrink-0 text-xl" aria-hidden="true" />
          <div>
            <p className="font-bold">
              Stopped after {Math.round(outcome.timeoutMs / 1000)} seconds
            </p>
            <p className="text-sm">
              Your code took too long, so Python was restarted and your earlier tasks were run
              again. Check for a loop that never ends.
            </p>
          </div>
        </div>
      );
    case 'unavailable':
      return <p className="text-incorrect-ink-800">{outcome.message}</p>;
    case 'completed': {
      const { stdout, rich, error } = outcome.result;
      const empty = !stdout && rich.length === 0 && !error;
      return (
        <div className="space-y-3">
          {stdout && (
            <pre className="max-h-80 overflow-auto rounded-xl bg-code p-3 font-mono text-sm leading-relaxed whitespace-pre text-code-ink">
              {stdout}
            </pre>
          )}
          {rich.map((output, index) => (
            <RichOutputView key={index} output={output} />
          ))}
          {error && <ErrorView error={error} hintContext={hintContext} />}
          {empty && (
            <p className="text-slate-600">
              Your code ran without showing anything. Use <code className="font-mono">print()</code>
              , or end with a variable name to display it.
            </p>
          )}
        </div>
      );
    }
  }
}

function RichOutputView({ output }: { output: RichOutput }) {
  switch (output.kind) {
    case 'table':
      return <TableView table={output} />;
    case 'text':
      return (
        <pre className="overflow-auto rounded-xl bg-slate-100 p-3 font-mono text-sm whitespace-pre-wrap text-slate-900">
          {output.text}
        </pre>
      );
    case 'image':
      return (
        <img
          src={`data:${output.mime};base64,${output.data}`}
          alt="Chart drawn by your code"
          className="max-w-full rounded-xl ring-1 ring-slate-200"
        />
      );
  }
}

function TableView({ table }: { table: TableOutput }) {
  const truncated = table.totalRows > table.rows.length;
  return (
    <figure>
      <div className="max-h-[28rem] overflow-auto rounded-xl ring-1 ring-slate-200">
        <table className="min-w-full font-mono text-sm tabular-nums">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-500">
                {table.indexName ?? ''}
              </th>
              {table.columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-3 py-2 text-right font-semibold whitespace-nowrap text-slate-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-100">
                <th
                  scope="row"
                  className="px-3 py-1.5 text-left font-semibold whitespace-nowrap text-slate-600"
                >
                  {table.index[rowIndex]}
                </th>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-3 py-1.5 text-right whitespace-nowrap ${cell === 'NaN' ? 'text-incorrect-ink-800' : 'text-slate-900'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-1 text-xs text-slate-600">
        {truncated
          ? `Showing the first ${table.rows.length} of ${table.totalRows} rows, ${table.totalColumns} columns.`
          : `${table.totalRows} rows, ${table.totalColumns} columns.`}
      </figcaption>
    </figure>
  );
}

function ErrorView({ error, hintContext }: { error: PythonError; hintContext?: ErrorHintContext }) {
  const hint = hintForError(error, hintContext);
  return (
    <div className="rounded-xl border-2 border-incorrect-200 bg-incorrect-50 p-3 text-incorrect-ink-900">
      <p className="flex items-center gap-2 font-bold">
        <AlertIcon aria-hidden="true" />
        {error.type}
        {error.line ? ` on line ${error.line}` : ''}
      </p>
      {error.message && <p className="mt-1 font-mono text-sm break-words">{error.message}</p>}
      {error.trace.length > 0 && (
        <pre className="mt-2 overflow-auto rounded-lg bg-surface/70 p-2 font-mono text-sm text-slate-800">
          {error.trace.map((frame) => `Line ${frame.line}: ${frame.code}`).join('\n')}
        </pre>
      )}
      {hint && (
        <p className="mt-2 flex gap-2 text-sm text-slate-800">
          <LightbulbIcon
            className="mt-0.5 shrink-0 text-base text-incorrect-ink-700"
            aria-hidden="true"
          />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}
