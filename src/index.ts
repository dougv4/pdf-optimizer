import { createDeck40 } from "./domain/deck.js";
import { GameEngine } from "./engine/game.js";
import { TerminalUI } from "./ui/terminal.js";

async function main(): Promise<void> {
  const ui = new TerminalUI();

  try {
    let playAgain = true;
    while (playAgain) {
      const engine = new GameEngine(ui, createDeck40);
      await engine.runGameLoop();
      playAgain = await ui.askReplay();
    }
  } finally {
    ui.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Erro fatal ao iniciar o jogo:", err);
  process.exitCode = 1;
});
