const SUITS = ["clubs", "hearts", "spades", "diamonds"];
const RANKS = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const SUIT_SYMBOL = {
  clubs: "♣",
  hearts: "♥",
  spades: "♠",
  diamonds: "♦",
};
const BASE_STRENGTH = {
  4: 1,
  5: 2,
  6: 3,
  7: 4,
  Q: 5,
  J: 6,
  K: 7,
  A: 8,
  2: 9,
  3: 10,
};
const MANILHA_STRENGTH = {
  "4|clubs": 14,
  "7|hearts": 13,
  "A|spades": 12,
  "7|diamonds": 11,
};
const TRUCO_STEPS = [1, 3, 6, 9, 12];

const els = {
  scoreHuman: document.querySelector("#score-human"),
  scoreBot: document.querySelector("#score-bot"),
  handValue: document.querySelector("#hand-value"),
  statusText: document.querySelector("#status-text"),
  historyList: document.querySelector("#history-list"),
  botCards: document.querySelector("#bot-cards"),
  humanCards: document.querySelector("#human-cards"),
  tableHuman: document.querySelector("#table-human"),
  tableBot: document.querySelector("#table-bot"),
  trucoBtn: document.querySelector("#truco-btn"),
  newMatchBtn: document.querySelector("#new-match-btn"),
  modal: document.querySelector("#action-modal"),
  modalTitle: document.querySelector("#modal-title"),
  modalActions: document.querySelector("#modal-actions"),
};

const state = {
  score: { human: 0, bot: 0 },
  dealer: "bot",
  starter: "human",
  handValue: 1,
  handCards: { human: [], bot: [] },
  tableCards: { human: null, bot: null },
  roundResults: [],
  roundIndex: 0,
  turn: "human",
  handOver: false,
  busy: false,
  waitingChoice: false,
  history: [],
};

function other(player) {
  return player === "human" ? "bot" : "human";
}

function cardLabel(card) {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

function cardKey(card) {
  return `${card.rank}|${card.suit}`;
}

function getCardStrength(card) {
  return MANILHA_STRENGTH[cardKey(card)] ?? BASE_STRENGTH[card.rank];
}

function compareStrength(a, b) {
  const sa = getCardStrength(a);
  const sb = getCardStrength(b);
  if (sa === sb) {
    return 0;
  }
  return sa > sb ? 1 : -1;
}

function winnerFromPerspective(compare, firstPlayer) {
  if (compare === 0) {
    return "tie";
  }
  return compare > 0 ? firstPlayer : other(firstPlayer);
}

function nextHandValue(current) {
  const idx = TRUCO_STEPS.indexOf(current);
  if (idx === -1 || idx === TRUCO_STEPS.length - 1) {
    return null;
  }
  return TRUCO_STEPS[idx + 1];
}

function hasDecisiveWinner(roundResults) {
  if (roundResults.length < 2) {
    return false;
  }

  let prevWinner = null;
  let humanWins = 0;
  let botWins = 0;

  for (const result of roundResults) {
    const effective = result === "tie" ? prevWinner ?? "tie" : result;
    if (effective === "human") {
      humanWins += 1;
      prevWinner = "human";
    } else if (effective === "bot") {
      botWins += 1;
      prevWinner = "bot";
    }
  }

  return humanWins >= 2 || botWins >= 2 || roundResults.length === 3;
}

function resolveHand(roundResults) {
  let prevWinner = null;
  let humanWins = 0;
  let botWins = 0;

  for (const result of roundResults) {
    const effective = result === "tie" ? prevWinner ?? "tie" : result;
    if (effective === "human") {
      humanWins += 1;
      prevWinner = "human";
    } else if (effective === "bot") {
      botWins += 1;
      prevWinner = "bot";
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
  return prevWinner ?? "tie";
}

function createDeck40() {
  const deck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle(deck) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function deal3(deck) {
  return {
    human: [deck[0], deck[1], deck[2]],
    bot: [deck[3], deck[4], deck[5]],
  };
}

function avgStrength(cards) {
  if (!cards.length) {
    return 0;
  }
  const total = cards.reduce((sum, card) => sum + getCardStrength(card), 0);
  return total / cards.length;
}

function shouldBotCallTruco({ cards, handValue, roundIndex, botScore, humanScore }) {
  const avg = avgStrength(cards);
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

function botTrucoResponse({ cards, requestedValue, currentValue, canRaise }) {
  const avg = avgStrength(cards);
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

function chooseBotCard({ cards, opponentCard, botLeadingRound, botRoundWins, humanRoundWins }) {
  const ranked = cards
    .map((card, index) => ({ card, index, strength: getCardStrength(card) }))
    .sort((a, b) => a.strength - b.strength);

  if (!opponentCard) {
    if (botRoundWins > humanRoundWins) {
      return ranked[0].index;
    }
    if (botLeadingRound) {
      return ranked[Math.floor(ranked.length / 2)].index;
    }
    return ranked[ranked.length - 1].index;
  }

  const target = getCardStrength(opponentCard);
  const winner = ranked.find((item) => item.strength > target);
  return winner ? winner.index : ranked[0].index;
}

function setStatus(text) {
  els.statusText.textContent = text;
}

function pushHistory(text) {
  state.history.unshift(text);
  state.history = state.history.slice(0, 8);
  els.historyList.innerHTML = "";
  for (const item of state.history) {
    const li = document.createElement("li");
    li.textContent = item;
    els.historyList.append(li);
  }
}

function cardClass(card) {
  if (!card) {
    return "";
  }
  return card.suit === "hearts" || card.suit === "diamonds" ? "red" : "";
}

function renderCardFace(card) {
  return `<span class="${cardClass(card)}">${cardLabel(card)}</span>`;
}

function render() {
  els.scoreHuman.textContent = String(state.score.human);
  els.scoreBot.textContent = String(state.score.bot);
  els.handValue.textContent = String(state.handValue);

  els.botCards.innerHTML = "";
  state.handCards.bot.forEach(() => {
    const div = document.createElement("div");
    div.className = "card back";
    div.textContent = "🂠";
    els.botCards.append(div);
  });

  els.humanCards.innerHTML = "";
  state.handCards.human.forEach((card, index) => {
    const button = document.createElement("button");
    button.className = `card ${cardClass(card)}`;
    if (!(state.turn === "human" && !state.busy && !state.handOver && !state.waitingChoice)) {
      button.classList.add("disabled");
    }
    button.innerHTML = renderCardFace(card);
    button.addEventListener("click", () => onHumanCardClick(index));
    els.humanCards.append(button);
  });

  if (state.tableCards.human) {
    els.tableHuman.className = `played-card ${cardClass(state.tableCards.human)}`;
    els.tableHuman.innerHTML = renderCardFace(state.tableCards.human);
  } else {
    els.tableHuman.className = "played-card empty";
    els.tableHuman.textContent = "?";
  }

  if (state.tableCards.bot) {
    els.tableBot.className = `played-card ${cardClass(state.tableCards.bot)}`;
    els.tableBot.innerHTML = renderCardFace(state.tableCards.bot);
  } else {
    els.tableBot.className = "played-card empty";
    els.tableBot.textContent = "?";
  }

  const canAskTruco = state.turn === "human" && !state.busy && !state.handOver && !state.waitingChoice;
  els.trucoBtn.disabled = !canAskTruco || nextHandValue(state.handValue) === null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showChoiceModal(title, choices) {
  state.waitingChoice = true;
  render();

  els.modal.classList.remove("hidden");
  els.modalTitle.textContent = title;
  els.modalActions.innerHTML = "";

  return new Promise((resolve) => {
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => {
        hideModal();
        resolve(choice.value);
      });
      els.modalActions.append(btn);
    });
  });
}

function hideModal() {
  state.waitingChoice = false;
  els.modal.classList.add("hidden");
  render();
}

async function onHumanCardClick(index) {
  if (state.turn !== "human" || state.busy || state.handOver || state.waitingChoice) {
    return;
  }

  state.busy = true;
  const card = state.handCards.human.splice(index, 1)[0];
  state.tableCards.human = card;
  pushHistory(`Você jogou ${cardLabel(card)}.`);
  setStatus("Você jogou. Vez do bot...");
  render();

  state.turn = "bot";
  state.busy = false;
  await continueRoundFlow();
}

async function onHumanTrucoClick() {
  if (state.turn !== "human" || state.busy || state.handOver || state.waitingChoice) {
    return;
  }
  if (nextHandValue(state.handValue) === null) {
    setStatus("Mão já está no valor máximo (12).");
    return;
  }

  state.busy = true;
  render();
  const result = await runTrucoChallenge("human");
  state.busy = false;
  render();

  if (result.handOver) {
    return;
  }
  setStatus("Truco resolvido. Escolha sua carta.");
}

async function maybeBotTruco() {
  const wants = shouldBotCallTruco({
    cards: state.handCards.bot,
    handValue: state.handValue,
    roundIndex: state.roundIndex,
    botScore: state.score.bot,
    humanScore: state.score.human,
  });

  if (!wants) {
    return false;
  }

  pushHistory("Bot pediu TRUCO!");
  setStatus("Bot pediu TRUCO!");
  render();
  await delay(250);

  const result = await runTrucoChallenge("bot");
  return result.handOver;
}

async function askHumanTrucoResponse(canRaise, requestedValue) {
  const choices = [
    { label: `Aceitar (${requestedValue})`, value: "accept" },
    { label: "Correr", value: "run" },
  ];
  if (canRaise) {
    choices.push({ label: "Aumentar", value: "raise" });
  }

  return showChoiceModal("Resposta ao Truco", choices);
}

async function runTrucoChallenge(caller) {
  let proposer = caller;
  let responder = other(caller);
  let acceptedValue = state.handValue;
  let requestedValue = nextHandValue(state.handValue);

  while (requestedValue !== null) {
    const canRaise = nextHandValue(requestedValue) !== null;
    let action;

    if (responder === "human") {
      action = await askHumanTrucoResponse(canRaise, requestedValue);
    } else {
      await delay(380);
      action = botTrucoResponse({
        cards: state.handCards.bot,
        requestedValue,
        currentValue: acceptedValue,
        canRaise,
      });
    }

    if (action === "run") {
      const winner = proposer;
      const points = acceptedValue;
      pushHistory(`${winner === "human" ? "Você" : "Bot"} ganhou por corrida (${points} ponto(s)).`);
      await finishHandByRun(winner, points);
      return { handOver: true };
    }

    if (action === "accept") {
      state.handValue = requestedValue;
      pushHistory(`${responder === "human" ? "Você" : "Bot"} aceitou. Mão vale ${requestedValue}.`);
      render();
      return { handOver: false };
    }

    acceptedValue = requestedValue;
    const next = nextHandValue(requestedValue);
    if (next === null) {
      state.handValue = requestedValue;
      render();
      return { handOver: false };
    }

    proposer = responder;
    responder = other(responder);
    requestedValue = next;
    pushHistory(`${proposer === "human" ? "Você" : "Bot"} aumentou para ${requestedValue}!`);
    setStatus(`${proposer === "human" ? "Você" : "Bot"} aumentou o truco para ${requestedValue}.`);
    render();
  }

  return { handOver: false };
}

async function finishHandByRun(winner, points) {
  state.handOver = true;
  state.score[winner] += points;
  setStatus(`${winner === "human" ? "Você" : "Bot"} venceu por corrida e fez ${points} ponto(s).`);
  render();
  await proceedAfterHand();
}

async function botPlayCard() {
  const botCards = state.handCards.bot;
  const botRoundWins = state.roundResults.filter((v) => v === "bot").length;
  const humanRoundWins = state.roundResults.filter((v) => v === "human").length;

  const index = chooseBotCard({
    cards: botCards,
    opponentCard: state.tableCards.human,
    botLeadingRound: state.starter === "bot",
    botRoundWins,
    humanRoundWins,
  });

  const played = botCards.splice(index, 1)[0];
  state.tableCards.bot = played;
  pushHistory(`Bot jogou ${cardLabel(played)}.`);
  render();
}

async function continueRoundFlow() {
  if (state.handOver) {
    return;
  }

  if (state.tableCards.human && state.tableCards.bot) {
    await resolveCurrentRound();
    return;
  }

  if (state.turn === "bot") {
    state.busy = true;
    setStatus("Bot pensando...");
    render();
    await delay(600);

    if (!state.tableCards.bot) {
      const endedByTruco = await maybeBotTruco();
      if (endedByTruco || state.handOver) {
        state.busy = false;
        render();
        return;
      }

      await delay(350);
      await botPlayCard();
    }

    state.turn = "human";
    state.busy = false;
    render();

    if (state.tableCards.human && state.tableCards.bot) {
      await resolveCurrentRound();
      return;
    }

    setStatus("Sua vez: jogue uma carta ou peça truco.");
  } else {
    setStatus("Sua vez: jogue uma carta ou peça truco.");
  }
}

async function resolveCurrentRound() {
  const second = other(state.starter);
  const firstCard = state.tableCards[state.starter];
  const secondCard = state.tableCards[second];
  if (!firstCard || !secondCard) {
    return;
  }

  const cmp = compareStrength(firstCard, secondCard);
  const winner = winnerFromPerspective(cmp, state.starter);
  state.roundResults.push(winner);

  if (winner === "tie") {
    setStatus("Rodada empatada.");
    pushHistory("Rodada empatada.");
  } else {
    state.starter = winner;
    setStatus(`${winner === "human" ? "Você" : "Bot"} venceu a rodada.`);
    pushHistory(`${winner === "human" ? "Você" : "Bot"} venceu a rodada.`);
  }

  render();
  await delay(750);

  if (hasDecisiveWinner(state.roundResults)) {
    await finishHandByCards();
    return;
  }

  state.roundIndex += 1;
  state.tableCards.human = null;
  state.tableCards.bot = null;
  state.turn = state.starter;
  render();
  await continueRoundFlow();
}

async function finishHandByCards() {
  state.handOver = true;
  const winner = resolveHand(state.roundResults);

  if (winner === "tie") {
    setStatus("Mão empatada. Ninguém pontuou.");
    pushHistory("Mão empatada. Ninguém pontuou.");
  } else {
    state.score[winner] += state.handValue;
    setStatus(`${winner === "human" ? "Você" : "Bot"} venceu a mão e fez ${state.handValue} ponto(s).`);
    pushHistory(`${winner === "human" ? "Você" : "Bot"} venceu a mão (${state.handValue} ponto(s)).`);
  }

  render();
  await proceedAfterHand();
}

async function proceedAfterHand() {
  if (state.score.human >= 12 || state.score.bot >= 12) {
    const champion = state.score.human >= 12 ? "Você" : "Bot";
    setStatus(`Fim da partida: ${champion} venceu! Clique em Nova Partida para jogar de novo.`);
    return;
  }

  await delay(900);
  state.dealer = other(state.dealer);
  await startHand();
}

async function startHand() {
  state.handValue = 1;
  state.roundResults = [];
  state.roundIndex = 0;
  state.handOver = false;
  state.busy = false;
  state.waitingChoice = false;
  state.tableCards = { human: null, bot: null };

  const dealt = deal3(shuffle(createDeck40()));
  state.handCards.human = dealt.human;
  state.handCards.bot = dealt.bot;
  state.starter = other(state.dealer);
  state.turn = state.starter;

  pushHistory("Nova mão distribuída.");
  setStatus(state.turn === "human" ? "Sua vez de abrir a rodada." : "Bot abre a rodada.");
  render();

  if (state.turn === "bot") {
    await continueRoundFlow();
  }
}

async function startNewMatch() {
  state.score = { human: 0, bot: 0 };
  state.dealer = "bot";
  state.history = [];
  els.historyList.innerHTML = "";
  setStatus("Nova partida iniciada.");
  render();
  await startHand();
}

els.trucoBtn.addEventListener("click", onHumanTrucoClick);
els.newMatchBtn.addEventListener("click", () => {
  void startNewMatch();
});

void startNewMatch();
