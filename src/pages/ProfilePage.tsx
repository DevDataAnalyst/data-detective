import { useState } from 'react';
import { buttonStyles } from '../components/buttonStyles';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { unit1 } from '../content/unit1';
import { completedLessonIds } from '../game/progress';
import { useProgress, useProgressStore } from '../storage/progressContext';

export function ProfilePage() {
  const progress = useProgress();
  const completed = completedLessonIds(progress);
  const completedCount = unit1.lessons.filter((lesson) => completed.has(lesson.id)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-bold">Unit 1: {unit1.title}</h2>
        <p className="text-slate-600">
          {completedCount} of {unit1.lessons.length} lessons completed
        </p>
      </section>
      {import.meta.env.DEV && <DevTools />}
    </div>
  );
}

/** Development helpers. Stripped from production builds. */
function DevTools() {
  const store = useProgressStore();
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      aria-labelledby="dev-tools-title"
      className="rounded-2xl border-2 border-dashed border-slate-300 p-4"
    >
      <h2 id="dev-tools-title" className="font-bold text-slate-700">
        Developer tools
      </h2>
      <p className="text-sm text-slate-600">Only visible in development builds.</p>
      <button
        type="button"
        className={`mt-3 ${buttonStyles.secondary}`}
        onClick={() => setConfirming(true)}
      >
        Reset progress
      </button>
      <ConfirmDialog
        open={confirming}
        title="Reset all progress?"
        description="This clears completed lessons on this device."
        cancelLabel="Keep my progress"
        confirmLabel="Reset progress"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          store.reset();
          setConfirming(false);
        }}
      />
    </section>
  );
}
