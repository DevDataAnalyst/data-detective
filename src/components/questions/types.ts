import type { Answer } from '../../game/grading';

export interface QuestionProps<Q, A extends Answer> {
  question: Q;
  answer: A | null;
  onAnswer: (answer: A | null) => void;
  /** Show the correct answer and how the learner's answer compares. */
  reveal: boolean;
  /** The answer can no longer be changed. */
  locked: boolean;
  /** Number keys pick multiple choice options. */
  shortcuts: boolean;
  /** Play reveal animations. False when the learner prefers reduced motion. */
  animate: boolean;
}
