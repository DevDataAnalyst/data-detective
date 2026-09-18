import celebrating from '../assets/mascot/celebrating.webp';
import notes from '../assets/mascot/notes.webp';
import report from '../assets/mascot/report.webp';
import sleeping from '../assets/mascot/sleeping.webp';
import thinking from '../assets/mascot/thinking.webp';
import thumbsUp from '../assets/mascot/thumbs-up.webp';
import waving from '../assets/mascot/waving.webp';

/**
 * Professor Ponku, the app's mascot. Each pose belongs to a moment: waving to welcome, thinking for
 * hints and empty states, thumbs up for a right answer, celebrating when something is finished,
 * notes and report in the mission, sleeping for streak reminders. The full-size art, side and back
 * views included, is in design/mascot/.
 */
export const MASCOT_ART = {
  waving: { src: waving, width: 316, height: 360 },
  celebrating: { src: celebrating, width: 409, height: 360 },
  thinking: { src: thinking, width: 258, height: 300 },
  'thumbs-up': { src: thumbsUp, width: 216, height: 220 },
  notes: { src: notes, width: 221, height: 300 },
  report: { src: report, width: 306, height: 300 },
  sleeping: { src: sleeping, width: 210, height: 220 },
} as const;

export type MascotPose = keyof typeof MASCOT_ART;
