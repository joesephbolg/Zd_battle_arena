const cells = [...document.querySelectorAll(".cell")];
const statusText = document.getElementById("status");
const modeButtons = [...document.querySelectorAll(".mode-btn")];
const difficultySelect = document.getElementById("difficulty");
const difficultyPanel = document.getElementById("difficulty-panel");

const scoreXText = document.getElementById("score-x");
const scoreOText = document.getElementById("score-o");
const playerXCard = document.getElementById("player-x");
const playerOCard = document.getElementById("player-o");
const nameX = document.getElementById("name-x");
const nameO = document.getElementById("name-o");

const restartButton = document.getElementById("restart-btn");
const resetScoreButton = document.getElementById("reset-score-btn");

const WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let gameMode = "ai";
let scores = { X: 0, O: 0, draws: 0 };
let aiTimer = null;
let roundId = 0;
let audioContext = null;

document.getElementById("year").textContent =
    new Date().getFullYear();

function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (AudioContextClass) {
            audioContext = new AudioContextClass();
        }
    }

    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }

    return audioContext;
}

function playSound(frequency = 440, duration = 0.08) {
    try {
        const context = getAudioContext();

        if (!context) return;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.07, context.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    } catch (error) {
        // Sound is optional. The game still works without it.
    }
}

function setStatus(message) {
    statusText.textContent = message;
}

function updateScores() {
    scoreXText.textContent = scores.X;
    scoreOText.textContent = scores.O;
}

function updatePlayerCards() {
    playerXCard.classList.toggle(
        "active-player",
        !gameOver && currentPlayer === "X"
    );

    playerOCard.classList.toggle(
        "active-player",
        !gameOver && currentPlayer === "O"
    );
}

function updateModeUI() {
    nameX.textContent = gameMode === "ai" ? "YOU" : "PLAYER 1";
    nameO.textContent = gameMode === "ai" ? "AI" : "PLAYER 2";

    difficultyPanel.hidden = gameMode !== "ai";

    modeButtons.forEach(button => {
        const active = button.dataset.mode === gameMode;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function getWinner(position = board) {
    for (const line of WINNING_LINES) {
        const [a, b, c] = line;

        if (
            position[a] &&
            position[a] === position[b] &&
            position[a] === position[c]
        ) {
            return {
                player: position[a],
                line
            };
        }
    }

    return null;
}

function getEmptyCells(position = board) {
    return position
        .map((value, index) => value === "" ? index : -1)
        .filter(index => index !== -1);
}

function renderBoard() {
    cells.forEach((cell, index) => {
        const value = board[index];

        cell.textContent = value;

        cell.classList.toggle("x", value === "X");
        cell.classList.toggle("o", value === "O");

        cell.classList.remove("winner");

        cell.setAttribute(
            "aria-label",
            `Cell ${index + 1}${value ? ", " + value : ", empty"}`
        );

        cell.disabled =
            gameOver ||
            value !== "" ||
            (gameMode === "ai" && currentPlayer === "O");
    });

    const winner = getWinner();

    if (winner) {
        winner.line.forEach(index => {
            cells[index].classList.add("winner");
        });
    }

    updatePlayerCards();
}

function checkGameEnd() {
    const winner = getWinner();

    if (winner) {
        gameOver = true;
        scores[winner.player]++;

        updateScores();

        if (gameMode === "ai") {
            setStatus(
                winner.player === "X"
                    ? "VICTORY! You conquered the arena!"
                    : "DEFEAT! The AI wins this round."
            );
        } else {
            setStatus(
                `PLAYER ${winner.player === "X" ? "1" : "2"} WINS THE BATTLE!`
            );
        }

        playSound(660, 0.2);

        setTimeout(() => {
            playSound(880, 0.25);
        }, 120);

        renderBoard();

        return true;
    }

    if (getEmptyCells().length === 0) {
        gameOver = true;
        scores.draws++;

        updateScores();

        setStatus("DRAW! Neither player conquered the arena.");

        playSound(350, 0.15);

        renderBoard();

        return true;
    }

    return false;
}

function makeMove(index) {
    if (gameOver || board[index] !== "") return;

    if (gameMode === "ai" && currentPlayer === "O") return;

    board[index] = currentPlayer;

    playSound(currentPlayer === "X" ? 480 : 380);

    if (checkGameEnd()) return;

    currentPlayer = currentPlayer === "X" ? "O" : "X";

    renderBoard();

    if (gameMode === "ai" && currentPlayer === "O") {
        setStatus("AI is thinking...");
        scheduleAIMove();
    } else {
        setStatus(
            gameMode === "ai"
                ? "Your turn. Make your move!"
                : `PLAYER ${currentPlayer === "X" ? "1" : "2"}'S TURN`
        );
    }
}

function findImmediateMove(position, player) {
    for (const index of getEmptyCells(position)) {
        position[index] = player;

        const won = Boolean(getWinner(position));

        position[index] = "";

        if (won) return index;
    }

    return null;
}

function minimax(position, maximizing) {
    const winner = getWinner(position);

    if (winner) {
        return winner.player === "O" ? 10 : -10;
    }

    const empty = getEmptyCells(position);

    if (empty.length === 0) return 0;

    if (maximizing) {
        let best = -Infinity;

        for (const index of empty) {
            position[index] = "O";

            best = Math.max(
                best,
                minimax(position, false)
            );

            position[index] = "";
        }

        return best;
    }

    let best = Infinity;

    for (const index of empty) {
        position[index] = "X";

        best = Math.min(
            best,
            minimax(position, true)
        );

        position[index] = "";
    }

    return best;
}

function getBestMove() {
    const empty = getEmptyCells();

    if (!empty.length) return null;

    const difficulty = difficultySelect.value;

    if (difficulty === "easy") {
        return empty[
            Math.floor(Math.random() * empty.length)
        ];
    }

    if (difficulty === "medium") {
        // Win immediately if possible.
        const winningMove = findImmediateMove(board, "O");

        if (winningMove !== null) return winningMove;

        // Block the player's winning move.
        const blockingMove = findImmediateMove(board, "X");

        if (blockingMove !== null) return blockingMove;

        // Prefer the center.
        if (board[4] === "") return 4;

        // Otherwise, choose a random move.
        return empty[
            Math.floor(Math.random() * empty.length)
        ];
    }

    // Hard mode: use minimax to play optimally.
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const index of empty) {
        board[index] = "O";

        const score = minimax(board, false);

        board[index] = "";

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [index];
        } else if (score === bestScore) {
            bestMoves.push(index);
        }
    }

    return bestMoves[
        Math.floor(Math.random() * bestMoves.length)
    ];
}

function scheduleAIMove() {
    clearTimeout(aiTimer);

    const thisRound = roundId;

    aiTimer = setTimeout(() => {
        if (
            thisRound !== roundId ||
            gameOver ||
            gameMode !== "ai" ||
            currentPlayer !== "O"
        ) {
            return;
        }

        const move = getBestMove();

        if (move !== null) {
            board[move] = "O";

            playSound(380);

            if (checkGameEnd()) return;

            currentPlayer = "X";

            renderBoard();

            setStatus("Your turn. Make your move!");
        }
    }, 450);
}

function startNewRound() {
    clearTimeout(aiTimer);

    roundId++;

    board = Array(9).fill("");
    currentPlayer = "X";
    gameOver = false;

    renderBoard();

    setStatus(
        gameMode === "ai"
            ? "Your turn. Make your move!"
            : "PLAYER 1'S TURN"
    );
}

function resetScores() {
    scores = { X: 0, O: 0, draws: 0 };

    updateScores();

    startNewRound();

    setStatus("Scores reset. Let the battle begin!");
}

cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {
        makeMove(index);
    });
});

modeButtons.forEach(button => {
    button.addEventListener("click", () => {
        gameMode = button.dataset.mode;

        updateModeUI();

        startNewRound();
    });
});

difficultySelect.addEventListener("change", () => {
    startNewRound();

    setStatus("Difficulty updated. Ready for battle!");
});

restartButton.addEventListener("click", () => {
    startNewRound();

    playSound(500);
});

resetScoreButton.addEventListener("click", resetScores);

updateModeUI();
updateScores();
startNewRound();