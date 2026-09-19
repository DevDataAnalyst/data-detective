/**
 * The "order the steps" question: which order its steps are offered in. Pure, so the shuffle can be
 * tested and is the same on every visit.
 */
import { seededRandom } from './bossBattle';

/** A stable number from text (FNV-1a), to seed a question's shuffle from its id. */
export function hashText(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * The step indices in the order they are offered: shuffled by the question's id, so everyone sees
 * the same shuffle, and never already in the right order.
 */
export function stepOfferOrder(questionId: string, count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  const random = seededRandom(hashText(questionId));
  for (let index = count - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  if (count > 1 && order.every((step, position) => step === position)) {
    order.push(order.shift() as number);
  }
  return order;
}
