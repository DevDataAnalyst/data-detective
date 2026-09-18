import type { Ref } from 'react';
import { fillQuestionText } from '../../content/template';
import type { Question } from '../../content/types';
import type { Answer } from '../../game/grading';
import { BuildMetric } from './BuildMetric';
import { Courtroom } from './Courtroom';
import { InboxTriage } from './InboxTriage';
import { MultipleChoice } from './MultipleChoice';
import { NumericEstimate } from './NumericEstimate';
import { PredictReveal } from './PredictReveal';
import { SpotTheLie } from './SpotTheLie';
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
        {fillQuestionText(question, question.prompt)}
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
    case 'inbox_triage':
      return (
        <InboxTriage
          {...shared}
          question={question}
          answer={answer?.type === 'inbox_triage' ? answer : null}
        />
      );
    case 'spot_the_lie':
      return (
        <SpotTheLie
          {...shared}
          question={question}
          answer={answer?.type === 'spot_the_lie' ? answer : null}
        />
      );
    case 'courtroom':
      return (
        <Courtroom
          {...shared}
          question={question}
          answer={answer?.type === 'courtroom' ? answer : null}
        />
      );
    case 'build_metric':
      return (
        <BuildMetric
          {...shared}
          question={question}
          answer={answer?.type === 'build_metric' ? answer : null}
        />
      );
  }
}
