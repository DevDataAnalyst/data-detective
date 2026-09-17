import type { PredictRevealQuestion } from '../../content/types';
import { max, mean, min, quartiles } from '../../game/stats';

export interface Extent {
  from: number;
  to: number;
}

/** Where the true and predicted spreads sit, for the bracket, box and band reveals. */
export function spreadExtents(
  question: PredictRevealQuestion,
  prediction: number | null,
): { truth: Extent; predicted: Extent | null } | null {
  const { values } = question.dataset;
  const around = (center: number, half: number): Extent => ({
    from: center - half,
    to: center + half,
  });
  switch (question.reveal.visual) {
    case 'marker':
      return null;
    case 'range_bracket': {
      const center = (min(values) + max(values)) / 2;
      return {
        truth: { from: min(values), to: max(values) },
        predicted: prediction === null ? null : around(center, prediction / 2),
      };
    }
    case 'iqr_box': {
      const { q1, q3 } = quartiles(values);
      return {
        truth: { from: q1, to: q3 },
        predicted: prediction === null ? null : around((q1 + q3) / 2, prediction / 2),
      };
    }
    case 'sd_band': {
      const center = mean(values);
      return {
        truth: around(center, question.trueValue),
        predicted: prediction === null ? null : around(center, prediction),
      };
    }
  }
}
