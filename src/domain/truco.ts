import type { HandValue } from "./types.js";

const TRUCO_STEPS: HandValue[] = [1, 3, 6, 9, 12];

export function nextHandValue(current: HandValue): HandValue | null {
  const idx = TRUCO_STEPS.indexOf(current);
  if (idx < 0 || idx === TRUCO_STEPS.length - 1) {
    return null;
  }
  return TRUCO_STEPS[idx + 1];
}
