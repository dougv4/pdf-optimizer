import type { Card, PlayerId, RoundWinner } from "./types.js";

const BASE_STRENGTH: Record<string, number> = {
  "4": 1,
  "5": 2,
  "6": 3,
  "7": 4,
  Q: 5,
  J: 6,
  K: 7,
  A: 8,
  "2": 9,
  "3": 10,
};

const MANILHA_STRENGTH: Record<string, number> = {
  "4|clubs": 14,
  "7|hearts": 13,
  "A|spades": 12,
  "7|diamonds": 11,
};

function cardKey(card: Card): string {
  return `${card.rank}|${card.suit}`;
}

export function getCardStrength(card: Card): number {
  return MANILHA_STRENGTH[cardKey(card)] ?? BASE_STRENGTH[card.rank];
}

export function compareCardStrength(a: Card, b: Card): -1 | 0 | 1 {
  const sa = getCardStrength(a);
  const sb = getCardStrength(b);

  if (sa === sb) {
    return 0;
  }
  return sa > sb ? 1 : -1;
}

export function compareCards(a: Card, b: Card): RoundWinner {
  const cmp = compareCardStrength(a, b);
  if (cmp === 0) {
    return "tie";
  }
  return cmp > 0 ? "human" : "bot";
}

export function winnerFromPerspective(
  cmp: -1 | 0 | 1,
  firstPlayer: PlayerId,
): RoundWinner {
  if (cmp === 0) {
    return "tie";
  }
  if (cmp > 0) {
    return firstPlayer;
  }
  return firstPlayer === "human" ? "bot" : "human";
}
