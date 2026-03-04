import type { Card, Rank, Suit } from "./types.js";

const RANKS: Rank[] = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const SUITS: Suit[] = ["clubs", "hearts", "spades", "diamonds"];

const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: "♣",
  hearts: "♥",
  spades: "♠",
  diamonds: "♦",
};

export function cardLabel(rank: Rank, suit: Suit): string {
  return `${rank}${SUIT_SYMBOLS[suit]}`;
}

export function createDeck40(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit, label: cardLabel(rank, suit) });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function deal3(
  deck: Card[],
): { human: Card[]; bot: Card[]; remaining: Card[] } {
  if (deck.length < 6) {
    throw new Error("Baralho insuficiente para distribuir 3 cartas para cada jogador.");
  }

  return {
    human: [deck[0], deck[1], deck[2]],
    bot: [deck[3], deck[4], deck[5]],
    remaining: deck.slice(6),
  };
}
