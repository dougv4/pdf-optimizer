export type Suit = "clubs" | "hearts" | "spades" | "diamonds";
export type Rank = "4" | "5" | "6" | "7" | "Q" | "J" | "K" | "A" | "2" | "3";

export type Card = {
  rank: Rank;
  suit: Suit;
  label: string;
};

export type PlayerId = "human" | "bot";
export type RoundWinner = PlayerId | "tie";
export type HandValue = 1 | 3 | 6 | 9 | 12;
export type TrucoAction = "accept" | "run" | "raise";

export interface GameState {
  score: Record<PlayerId, number>;
  currentHandValue: HandValue;
  dealer: PlayerId;
}

export interface HandState {
  cards: Record<PlayerId, Card[]>;
  roundResults: RoundWinner[];
  tableCards: Partial<Record<PlayerId, Card>>;
  handValue: HandValue;
}
