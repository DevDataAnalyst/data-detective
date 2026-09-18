import type { Checkpoint, Lesson } from '../../content/types';
import type { CheckpointAnswerRecord } from '../../game/checkpoint';
import { AnswerReview } from '../review/AnswerReview';

interface CheckpointReviewProps {
  checkpoint: Checkpoint;
  lessons: readonly Lesson[];
  answers: Readonly<Record<string, CheckpointAnswerRecord>>;
}

/** Every checkpoint question with the result. Missed ones show the right answer and explanation. */
export function CheckpointReview({ checkpoint, lessons, answers }: CheckpointReviewProps) {
  return (
    <AnswerReview
      headingId="checkpoint-review"
      items={checkpoint.items.map((item) => ({
        question: item.question,
        context: lessons.find((lesson) => lesson.id === item.lessonId)?.title,
        record: answers[item.question.id],
      }))}
    />
  );
}
