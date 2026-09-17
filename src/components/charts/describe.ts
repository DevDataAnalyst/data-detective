import { formatValue } from '../../content/template';
import type { NumberDataset } from '../../content/types';

/** A one-sentence summary of a dataset for screen readers. */
export function describeDataset(dataset: NumberDataset): string {
  const { values } = dataset;
  const low = formatValue(dataset, Math.min(...values));
  const high = formatValue(dataset, Math.max(...values));
  return `Dot plot of ${dataset.label}: ${values.length} values from ${low} to ${high}.`;
}
