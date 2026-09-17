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
  /** h2 when the question fills the page; h3 when it sits in a list, such as a review. */
  headingLevel?: 'h2' | 'h3';
}

/** Shows the prompt and the right component for the question type. */
export function QuestionView({
  question,
  answer,
  headingRef,
  headingLevel: Heading = 'h2',
  ...shared
}: QuestionViewProps) {
  return (
    <div className="space-y-5">
      <Heading
        ref={headingRef}
        tabIndex={-1}
        className={`leading-snug font-bold text-slate-900 outline-none ${
          Heading === 'h2' ? 'text-xl sm:text-2xl' : 'text-lg'
        }`}
      >
        {fillTemplate(question.prompt, question.dataset)}
      </Heading>
      {renderBody(question, answer, shared)}
    </div>
  );
}

function renderBody(
  question: Question,
  answer: Answer | null,
  shared: Omit<QuestionViewProps, 'question' | 'answer' | 'headingRef' | 'headingLevel'>,
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
