import { describe, expect, it } from "vitest";
import { createDeck40 } from "../src/domain/deck.js";
import { resolveHand } from "../src/domain/hand.js";
import { compareCards, getCardStrength } from "../src/domain/ranking.js";
import { nextHandValue } from "../src/domain/truco.js";
import type { Card } from "../src/domain/types.js";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit, label: `${rank}-${suit}` };
}

describe("deck", () => {
  it("cria baralho com 40 cartas sem 8/9/10", () => {
    const deck = createDeck40();
    expect(deck).toHaveLength(40);
    const ranks = new Set(deck.map((c) => c.rank));
    expect(ranks.has("4")).toBe(true);
    expect(ranks.has("3")).toBe(true);
    expect(ranks.has("8" as never)).toBe(false);
    expect(ranks.has("9" as never)).toBe(false);
    expect(ranks.has("10" as never)).toBe(false);
  });
});

describe("ranking", () => {
  it("aplica ordem correta das manilhas", () => {
    const zap = getCardStrength(card("4", "clubs"));
    const copas = getCardStrength(card("7", "hearts"));
    const espadilha = getCardStrength(card("A", "spades"));
    const seteOuro = getCardStrength(card("7", "diamonds"));
    const tres = getCardStrength(card("3", "clubs"));

    expect(zap).toBeGreaterThan(copas);
    expect(copas).toBeGreaterThan(espadilha);
    expect(espadilha).toBeGreaterThan(seteOuro);
    expect(seteOuro).toBeGreaterThan(tres);
  });

  it("compara carta comum vs manilha", () => {
    const winner = compareCards(card("4", "clubs"), card("3", "hearts"));
    expect(winner).toBe("human");
  });
});

describe("truco", () => {
  it("escalona 1 -> 3 -> 6 -> 9 -> 12 e encerra", () => {
    expect(nextHandValue(1)).toBe(3);
    expect(nextHandValue(3)).toBe(6);
    expect(nextHandValue(6)).toBe(9);
    expect(nextHandValue(9)).toBe(12);
    expect(nextHandValue(12)).toBeNull();
  });
});

describe("desempate de rodada", () => {
  it("empate favorece vencedor anterior", () => {
    const winner = resolveHand(["human", "tie"]);
    expect(winner).toBe("human");
  });
});
