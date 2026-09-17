import type { Ref } from 'react';
import { fillTemplate } from '../../content/template';
import type { Question } from '../../content/types';
import type { Answer } from '../../game/grading';
import { MultipleChoice } from './MultipleChoice';
import { NumericEstimate } from './NumericEstimate';
import { PredictReveal } from './PredictReveal';
import { TapOutlier } from './TapOutlier';

interface QuestionViewProps {
  question: Question;
  answer: Answer | null;
  onAnswer: (answer: Answer | null) => void;
  reveal: boolean;
  locked: boolean;
  shortcuts: boolean;
  animate: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** Shows the prompt and the right component for the question type. */
export function QuestionView({ question, answer, headingRef, ...shared }: QuestionViewProps) {
  return (
    <div className="space-y-5">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl leading-snug font-bold text-slate-900 outline-none sm:text-2xl"
      >
        {fillTemplate(question.prompt, question.dataset)}
      </h2>
      {renderBody(question, answer, shared)}
    </div>
  );
}

function renderBody(
  question: Question,
  answer: Answer | null,
  shared: Omit<QuestionViewProps, 'question' | 'answer' | 'headingRef'>,
) {
  switch (question.type) {
    case 'multiple_choice':
      return (
        <MultipleChoice
          {...shared}
          question={question}
          answer={answer?.type === 'multiple_choice' ? answer : null}
        />
      );
    case 'numeric_estimate':
      return (
        <NumericEstimate
          {...shared}
          question={question}
          answer={answer?.type === 'numeric_estimate' ? answer : null}
        />
      );
    case 'predict_reveal':
      return (
        <PredictReveal
          {...shared}
          question={question}
          answer={answer?.type === 'predict_reveal' ? answer : null}
        />
      );
    case 'tap_outlier':
      return (
        <TapOutlier
          {...shared}
          question={question}
          answer={answer?.type === 'tap_outlier' ? answer : null}
        />
      );
  }
}
