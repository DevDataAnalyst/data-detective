import { describe, expect, it } from 'vitest';
import type { PredictRevealQuestion } from '../../content/types';
import { spreadExtents } from './revealGeometry';

const base: PredictRevealQuestion = {
  id: 'geometry',
  type: 'predict_reveal',
  prompt: 'Predict',
  dataset: { label: 'Commute', values: [33, 26, 40, 20, 62, 30, 40, 26, 35] },
  statistic: 'iqr',
  slider: { min: 0, max: 45, step: 1 },
  trueValue: 14,
  tolerance: 3,
  reveal: { visual: 'iqr_box', description: 'box' },
  explanation: 'IQR',
};

describe('spreadExtents', () => {
  it('centres the predicted IQR box on the true box', () => {
    expect(spreadExtents(base, 10)).toEqual({
      truth: { from: 26, to: 40 },
      predicted: { from: 28, to: 38 },
    });
  });

  it('draws the range bracket from min to max', () => {
    const range = { ...base, statistic: 'range', trueValue: 42 } as const;
    const extents = spreadExtents(
      { ...range, reveal: { visual: 'range_bracket', description: '' } },
      40,
    );
    expect(extents?.truth).toEqual({ from: 20, to: 62 });
    expect(extents?.predicted).toEqual({ from: 21, to: 61 });
  });

  it('spans one standard deviation either side of the mean', () => {
    const question: PredictRevealQuestion = {
      ...base,
      dataset: { label: 'Commute', values: [38, 30, 46, 34, 42] },
      statistic: 'std_dev',
      trueValue: 5.66,
      reveal: { visual: 'sd_band', description: '' },
    };
    expect(spreadExtents(question, 2)).toEqual({
      truth: { from: 38 - 5.66, to: 38 + 5.66 },
      predicted: { from: 36, to: 40 },
    });
  });

  it('has nothing to draw for markers or before a prediction', () => {
    expect(spreadExtents({ ...base, reveal: { visual: 'marker', description: '' } }, 5)).toBeNull();
    expect(spreadExtents(base, null)?.predicted).toBeNull();
  });
});
