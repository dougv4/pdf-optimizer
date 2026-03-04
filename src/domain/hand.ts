import type { PlayerId, RoundWinner } from "./types.js";

export function effectiveRoundWinner(
  roundResult: RoundWinner,
  previousWinner: PlayerId | null,
): RoundWinner {
  if (roundResult !== "tie") {
    return roundResult;
  }
  return previousWinner ?? "tie";
}

export function resolveHand(roundResults: RoundWinner[]): PlayerId | "tie" {
  let previousWinner: PlayerId | null = null;
  let humanWins = 0;
  let botWins = 0;

  for (const result of roundResults) {
    const effective = effectiveRoundWinner(result, previousWinner);
    if (effective === "human") {
      humanWins += 1;
      previousWinner = "human";
    } else if (effective === "bot") {
      botWins += 1;
      previousWinner = "bot";
    }

    if (humanWins >= 2) {
      return "human";
    }
    if (botWins >= 2) {
      return "bot";
    }
  }

  if (humanWins > botWins) {
    return "human";
  }
  if (botWins > humanWins) {
    return "bot";
  }

  return previousWinner ?? "tie";
}

export function hasDecisiveWinner(roundResults: RoundWinner[]): boolean {
  if (roundResults.length < 2) {
    return false;
  }

  let previousWinner: PlayerId | null = null;
  let humanWins = 0;
  let botWins = 0;

  for (const result of roundResults) {
    const effective = effectiveRoundWinner(result, previousWinner);
    if (effective === "human") {
      humanWins += 1;
      previousWinner = "human";
    } else if (effective === "bot") {
      botWins += 1;
      previousWinner = "bot";
    }
  }

  return humanWins >= 2 || botWins >= 2 || roundResults.length === 3;
}
