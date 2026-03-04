import { describe, expect, it } from "vitest";
import { simulateHandResult, simulateMatchTo12, simulateTrucoSequence } from "../src/engine/simulator.js";

describe("integração - fluxo de mão", () => {
  it("mão com truco aceito usa valor aumentado", () => {
    const truco = simulateTrucoSequence(1, [{ kind: "accept" }]);
    expect(truco.handOver).toBe(false);
    expect(truco.handValue).toBe(3);

    const hand = simulateHandResult(["human", "bot", "human"], truco.handValue);
    expect(hand.winner).toBe("human");
    expect(hand.points).toBe(3);
  });

  it("recusa de truco dá pontuação do valor aceito anterior", () => {
    const truco = simulateTrucoSequence(1, [{ kind: "run", winner: "human" }]);
    expect(truco.handOver).toBe(true);
    expect(truco.winner).toBe("human");
    expect(truco.awarded).toBe(1);
  });
});

describe("integração - partida completa", () => {
  it("encerra ao atingir 12 pontos", () => {
    const result = simulateMatchTo12([
      { roundResults: ["human", "human"], handValue: 3 },
      { roundResults: ["bot", "bot"], handValue: 1 },
      { roundResults: ["human", "human"], handValue: 6 },
      { roundResults: ["human", "tie"], handValue: 3 },
    ]);

    expect(result.human).toBe(12);
    expect(result.bot).toBe(1);
    expect(result.winner).toBe("human");
  });
});
