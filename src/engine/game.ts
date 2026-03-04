import { botTrucoResponse, chooseBotCard, shouldBotCallTruco } from "../bot/strategy.js";
import { deal3, shuffle } from "../domain/deck.js";
import { hasDecisiveWinner, resolveHand } from "../domain/hand.js";
import { compareCardStrength, winnerFromPerspective } from "../domain/ranking.js";
import { nextHandValue } from "../domain/truco.js";
import type {
  Card,
  GameState,
  HandState,
  HandValue,
  PlayerId,
  RoundWinner,
} from "../domain/types.js";
import { TerminalUI } from "../ui/terminal.js";

function otherPlayer(player: PlayerId): PlayerId {
  return player === "human" ? "bot" : "human";
}

type TrucoResult = {
  handOver: boolean;
  winnerByRun: PlayerId | null;
  awardedPoints: number;
  handValue: HandValue;
};

export class GameEngine {
  private gameState: GameState = {
    score: { human: 0, bot: 0 },
    currentHandValue: 1,
    dealer: "bot",
  };

  constructor(private readonly ui: TerminalUI, private readonly buildDeck: () => Card[]) {}

  async runGameLoop(): Promise<void> {
    this.ui.printHeader("Truco - Humano vs Bot");

    while (this.gameState.score.human < 12 && this.gameState.score.bot < 12) {
      this.ui.printScore(this.gameState.score.human, this.gameState.score.bot);
      const handWinner = await this.playHand();
      if (!handWinner) {
        continue;
      }
      this.gameState.dealer = otherPlayer(this.gameState.dealer);
    }

    const champion = this.gameState.score.human >= 12 ? "Você" : "Bot";
    this.ui.printHeader(`Fim da partida: ${champion} venceu!`);
    this.ui.printScore(this.gameState.score.human, this.gameState.score.bot);
  }

  private async playHand(): Promise<PlayerId | null> {
    const shuffled = shuffle(this.buildDeck());
    const dealt = deal3(shuffled);

    const handState: HandState = {
      cards: { human: [...dealt.human], bot: [...dealt.bot] },
      roundResults: [],
      tableCards: {},
      handValue: 1,
    };
    this.gameState.currentHandValue = 1;

    this.ui.printHeader("Nova mão");
    this.ui.printHand(handState.cards.human);

    let starter: PlayerId = otherPlayer(this.gameState.dealer);

    for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
      this.ui.printRoundInfo(roundIndex, handState.handValue);
      handState.tableCards = {};

      const sequence: PlayerId[] = [starter, otherPlayer(starter)];
      for (const currentPlayer of sequence) {
        const trucoOutcome = await this.maybeHandleTruco({
          roundIndex,
          currentPlayer,
          handState,
        });

        handState.handValue = trucoOutcome.handValue;
        this.gameState.currentHandValue = trucoOutcome.handValue;

        if (trucoOutcome.handOver && trucoOutcome.winnerByRun) {
          this.gameState.score[trucoOutcome.winnerByRun] += trucoOutcome.awardedPoints;
          this.ui.printMessage(
            `${trucoOutcome.winnerByRun === "human" ? "Você" : "Bot"} ganhou a mão por corrida e marcou ${trucoOutcome.awardedPoints} ponto(s).`,
          );
          return trucoOutcome.winnerByRun;
        }

        const playedCard =
          currentPlayer === "human"
            ? await this.humanPlayCard(handState.cards.human)
            : this.botPlayCard(handState, starter);

        handState.tableCards[currentPlayer] = playedCard;
        this.ui.printPlayedCard(currentPlayer, playedCard);
      }

      const firstCard = handState.tableCards[starter];
      const secondPlayer = otherPlayer(starter);
      const secondCard = handState.tableCards[secondPlayer];
      if (!firstCard || !secondCard) {
        throw new Error("Rodada inválida: faltou carta na mesa.");
      }

      const cmp = compareCardStrength(firstCard, secondCard);
      const roundWinner = winnerFromPerspective(cmp, starter);
      handState.roundResults.push(roundWinner);
      this.ui.printRoundWinner(roundWinner);

      if (roundWinner !== "tie") {
        starter = roundWinner;
      }

      if (hasDecisiveWinner(handState.roundResults)) {
        break;
      }
    }

    const winner = resolveHand(handState.roundResults);
    if (winner === "tie") {
      this.ui.printMessage("Mão empatada: ninguém pontua.");
      return null;
    }

    this.gameState.score[winner] += handState.handValue;
    this.ui.printMessage(
      `${winner === "human" ? "Você" : "Bot"} venceu a mão e marcou ${handState.handValue} ponto(s).`,
    );
    return winner;
  }

  private async humanPlayCard(cards: Card[]): Promise<Card> {
    this.ui.printHand(cards);
    const idx = await this.ui.askCardIndex(cards);
    return cards.splice(idx, 1)[0];
  }

  private botPlayCard(handState: HandState, starter: PlayerId): Card {
    const botCards = handState.cards.bot;
    const opponentCard = handState.tableCards.human ?? null;
    const botRoundWins = handState.roundResults.filter((r) => r === "bot").length;
    const humanRoundWins = handState.roundResults.filter((r) => r === "human").length;

    const idx = chooseBotCard({
      handCards: botCards,
      opponentCard,
      botIsLeadingRound: starter === "bot",
      botRoundWins,
      humanRoundWins,
    });
    return botCards.splice(idx, 1)[0];
  }

  private async maybeHandleTruco(args: {
    roundIndex: number;
    currentPlayer: PlayerId;
    handState: HandState;
  }): Promise<TrucoResult> {
    const { roundIndex, currentPlayer, handState } = args;

    const nextValue = nextHandValue(handState.handValue);
    if (!nextValue) {
      return {
        handOver: false,
        winnerByRun: null,
        awardedPoints: handState.handValue,
        handValue: handState.handValue,
      };
    }

    let wantsTruco = false;
    if (currentPlayer === "human") {
      const action = await this.ui.askTurnAction(true);
      wantsTruco = action === "truco";
    } else {
      wantsTruco = shouldBotCallTruco({
        handCards: handState.cards.bot,
        handValue: handState.handValue,
        roundIndex,
        botScore: this.gameState.score.bot,
        humanScore: this.gameState.score.human,
      });
    }

    if (!wantsTruco) {
      return {
        handOver: false,
        winnerByRun: null,
        awardedPoints: handState.handValue,
        handValue: handState.handValue,
      };
    }

    this.ui.printMessage(`${currentPlayer === "human" ? "Você pediu" : "Bot pediu"} TRUCO!`);
    return this.resolveTrucoChallenge(currentPlayer, handState.handValue, handState.cards);
  }

  private async resolveTrucoChallenge(
    caller: PlayerId,
    currentValue: HandValue,
    cards: Record<PlayerId, Card[]>,
  ): Promise<TrucoResult> {
    let proposer: PlayerId = caller;
    let responder: PlayerId = otherPlayer(caller);
    let requestedValue = nextHandValue(currentValue);
    let acceptedValue: HandValue = currentValue;

    while (requestedValue !== null) {
      const canRaise = nextHandValue(requestedValue) !== null;
      const action =
        responder === "human"
          ? await this.ui.askTrucoResponse(canRaise)
          : botTrucoResponse({
              handCards: cards.bot,
              requestedValue,
              currentValue: acceptedValue,
              canRaise,
            });

      if (action === "run") {
        return {
          handOver: true,
          winnerByRun: proposer,
          awardedPoints: acceptedValue,
          handValue: acceptedValue,
        };
      }

      if (action === "accept") {
        return {
          handOver: false,
          winnerByRun: null,
          awardedPoints: requestedValue,
          handValue: requestedValue,
        };
      }

      const upgraded = nextHandValue(requestedValue);
      if (!upgraded) {
        return {
          handOver: false,
          winnerByRun: null,
          awardedPoints: requestedValue,
          handValue: requestedValue,
        };
      }

      acceptedValue = requestedValue;
      proposer = responder;
      responder = otherPlayer(responder);
      requestedValue = upgraded;
      this.ui.printMessage(`${proposer === "human" ? "Você" : "Bot"} aumentou para ${requestedValue}!`);
    }

    return {
      handOver: false,
      winnerByRun: null,
      awardedPoints: acceptedValue,
      handValue: acceptedValue,
    };
  }
}
