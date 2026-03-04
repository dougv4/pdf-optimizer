import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Card, HandValue, PlayerId, RoundWinner, TrucoAction } from "../domain/types.js";

const COLORS = {
  reset: "\u001b[0m",
  cyan: "\u001b[36m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  magenta: "\u001b[35m",
  bold: "\u001b[1m",
};

function paint(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export class TerminalUI {
  private rl = createInterface({ input, output });

  printHeader(title: string): void {
    output.write(`\n${paint("=".repeat(58), "cyan")}\n`);
    output.write(`${paint(`${title}`, "bold")}\n`);
    output.write(`${paint("=".repeat(58), "cyan")}\n`);
  }

  printScore(human: number, bot: number): void {
    output.write(
      `${paint("Placar", "yellow")}: Você ${paint(String(human), "green")} x ${paint(String(bot), "red")} Bot\n`,
    );
  }

  printHand(cards: Card[]): void {
    output.write(`${paint("Sua mão:", "yellow")}\n`);
    cards.forEach((card, idx) => {
      output.write(`  [${idx + 1}] ${card.label}\n`);
    });
  }

  printRoundInfo(roundIndex: number, handValue: HandValue): void {
    output.write(
      `${paint(`\nRodada ${roundIndex + 1}`, "magenta")} | Valor da mão: ${paint(String(handValue), "yellow")}\n`,
    );
  }

  printPlayedCard(player: PlayerId, card: Card): void {
    const who = player === "human" ? "Você" : "Bot";
    output.write(`${who} jogou: ${paint(card.label, "cyan")}\n`);
  }

  printRoundWinner(winner: RoundWinner): void {
    if (winner === "tie") {
      output.write(paint("Rodada empatada.\n", "yellow"));
      return;
    }
    output.write(`${paint(winner === "human" ? "Você venceu a rodada.\n" : "Bot venceu a rodada.\n", "green")}`);
  }

  printMessage(message: string): void {
    output.write(`${message}\n`);
  }

  async askCardIndex(cards: Card[]): Promise<number> {
    while (true) {
      const answer = await this.rl.question("Escolha o índice da carta para jogar: ");
      const idx = Number(answer.trim()) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < cards.length) {
        return idx;
      }
      output.write(paint("Índice inválido. Tente novamente.\n", "red"));
    }
  }

  async askTurnAction(canAskTruco: boolean): Promise<"play" | "truco"> {
    if (!canAskTruco) {
      return "play";
    }

    while (true) {
      const answer = await this.rl.question("Ação [1=jogar carta, 2=pedir truco]: ");
      if (answer.trim() === "1") {
        return "play";
      }
      if (answer.trim() === "2") {
        return "truco";
      }
      output.write(paint("Opção inválida.\n", "red"));
    }
  }

  async askTrucoResponse(canRaise: boolean): Promise<TrucoAction> {
    while (true) {
      const options = canRaise
        ? "Resposta ao truco [1=aceitar, 2=correr, 3=aumentar]: "
        : "Resposta ao truco [1=aceitar, 2=correr]: ";
      const answer = await this.rl.question(options);
      if (answer.trim() === "1") {
        return "accept";
      }
      if (answer.trim() === "2") {
        return "run";
      }
      if (canRaise && answer.trim() === "3") {
        return "raise";
      }
      output.write(paint("Opção inválida.\n", "red"));
    }
  }

  async askReplay(): Promise<boolean> {
    while (true) {
      const answer = await this.rl.question("Jogar novamente? [s/n]: ");
      const normalized = answer.trim().toLowerCase();
      if (normalized === "s") {
        return true;
      }
      if (normalized === "n") {
        return false;
      }
      output.write(paint("Digite 's' ou 'n'.\n", "red"));
    }
  }

  close(): void {
    this.rl.close();
  }
}
