import { hasDecisiveWinner, resolveHand } from "../domain/hand.js";
import { nextHandValue } from "../domain/truco.js";
import type { HandValue, PlayerId, RoundWinner } from "../domain/types.js";

export type SimulatedTrucoStep =
  | { kind: "accept" }
  | { kind: "run"; winner: PlayerId }
  | { kind: "raise" };

export function simulateTrucoSequence(
  currentValue: HandValue,
  steps: SimulatedTrucoStep[],
): { handOver: boolean; winner: PlayerId | null; handValue: HandValue; awarded: number } {
  let acceptedValue: HandValue = currentValue;
  let requested = nextHandValue(currentValue);

  for (const step of steps) {
    if (requested === null) {
      break;
    }

    if (step.kind === "run") {
      return {
        handOver: true,
        winner: step.winner,
        handValue: acceptedValue,
        awarded: acceptedValue,
      };
    }

    if (step.kind === "accept") {
      return {
        handOver: false,
        winner: null,
        handValue: requested,
        awarded: requested,
      };
    }

    acceptedValue = requested;
    const next = nextHandValue(requested);
    if (next === null) {
      return {
        handOver: false,
        winner: null,
        handValue: requested,
        awarded: requested,
      };
    }
    requested = next;
  }

  return {
    handOver: false,
    winner: null,
    handValue: acceptedValue,
    awarded: acceptedValue,
  };
}

export function simulateHandResult(
  roundResults: RoundWinner[],
  handValue: HandValue,
): { winner: PlayerId | "tie"; points: number } {
  const winner = resolveHand(roundResults);
  if (winner === "tie") {
    return { winner, points: 0 };
  }
  return { winner, points: handValue };
}

export function simulateMatchTo12(
  hands: Array<{ roundResults: RoundWinner[]; handValue: HandValue }>,
): { human: number; bot: number; winner: PlayerId | "tie" } {
  let human = 0;
  let bot = 0;

  for (const hand of hands) {
    const decisive = hasDecisiveWinner(hand.roundResults) || hand.roundResults.length === 3;
    if (!decisive) {
      continue;
    }
    const result = simulateHandResult(hand.roundResults, hand.handValue);
    if (result.winner === "human") {
      human += result.points;
    } else if (result.winner === "bot") {
      bot += result.points;
    }
    if (human >= 12 || bot >= 12) {
      break;
    }
  }

  const winner: PlayerId | "tie" = human === bot ? "tie" : human > bot ? "human" : "bot";
  return { human, bot, winner };
}
