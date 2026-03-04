import { getCardStrength } from "../domain/ranking.js";
import { nextHandValue } from "../domain/truco.js";
import type { Card, HandValue, TrucoAction } from "../domain/types.js";

function averageStrength(cards: Card[]): number {
  if (cards.length === 0) {
    return 0;
  }
  const total = cards.reduce((sum, card) => sum + getCardStrength(card), 0);
  return total / cards.length;
}

export function shouldBotCallTruco(args: {
  handCards: Card[];
  handValue: HandValue;
  roundIndex: number;
  botScore: number;
  humanScore: number;
}): boolean {
  const { handCards, handValue, roundIndex, botScore, humanScore } = args;
  const avg = averageStrength(handCards);

  if (nextHandValue(handValue) === null) {
    return false;
  }
  if (avg >= 10.5 && handValue < 6 && roundIndex <= 1) {
    return true;
  }
  if (avg >= 11.8 && handValue < 9) {
    return true;
  }
  if (botScore < humanScore && avg >= 9.8 && handValue < 6) {
    return true;
  }
  return false;
}

export function botTrucoResponse(args: {
  handCards: Card[];
  requestedValue: HandValue;
  currentValue: HandValue;
  canRaise: boolean;
}): TrucoAction {
  const { handCards, requestedValue, currentValue, canRaise } = args;
  const avg = averageStrength(handCards);

  if (requestedValue >= 9 && avg < 8.8) {
    return "run";
  }
  if (requestedValue >= 6 && avg < 7.8) {
    return "run";
  }
  if (canRaise && requestedValue < 12 && avg >= 12 && currentValue < 9) {
    return "raise";
  }
  return "accept";
}

export function chooseBotCard(args: {
  handCards: Card[];
  opponentCard: Card | null;
  botIsLeadingRound: boolean;
  botRoundWins: number;
  humanRoundWins: number;
}): number {
  const { handCards, opponentCard, botIsLeadingRound, botRoundWins, humanRoundWins } = args;
  const withStrength = handCards.map((card, index) => ({
    card,
    index,
    strength: getCardStrength(card),
  }));
  withStrength.sort((a, b) => a.strength - b.strength);

  if (!opponentCard) {
    if (botRoundWins > humanRoundWins) {
      return withStrength[0].index;
    }
    if (botIsLeadingRound) {
      return withStrength[Math.floor(withStrength.length / 2)].index;
    }
    return withStrength[withStrength.length - 1].index;
  }

  const target = getCardStrength(opponentCard);
  const winningOption = withStrength.find((item) => item.strength > target);
  if (winningOption) {
    return winningOption.index;
  }
  return withStrength[0].index;
}
