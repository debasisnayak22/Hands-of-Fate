// ===== Gesture-Controlled Rock Paper Scissors — Game Engine =====
// ===== Supports: vs AI + Multiplayer (PeerJS) =====

const MATCHES_PER_ROUND = 5;
const ROUNDS_TO_WIN = 2;

// --- Theme Definitions ---
const THEMES = {
  classic: {
    name: 'Classic',
    icons: { rock: '✊', paper: '✋', scissors: '✌️', none: '❓' },
    battleCry: 'SHOOT!',
    waiting: '🤔',
  },
  naruto: {
    name: 'Naruto',
    icons: { rock: '🔥', paper: '💧', scissors: '🌀', none: '❓' },
    battleCry: 'JUTSU!',
    waiting: '🍥',
  },
  marvel: {
    name: 'Marvel',
    icons: { rock: '🛡️', paper: '⚡', scissors: '🕷️', none: '❓' },
    battleCry: 'AVENGERS!',
    waiting: '💫',
  }
};

// --- Game State ---
const state = {
  // Mode
  gameMode: 'ai', // 'ai' or 'multiplayer'

  // Round-based tracking
  currentRound: 1,
  matchInRound: 0,
  roundPlayerScore: 0,
  roundComputerScore: 0,
  roundsWonPlayer: 0,
  roundsWonComputer: 0,
  totalPlayerScore: 0,
  totalComputerScore: 0,

  // Streak
  streak: 0,
  bestStreak: 0,

  // Match history
  history: [],
  roundHistory: [],
  moveHistory: [],

  // Settings
  theme: 'classic',
  difficulty: 'medium',

  // Flags
  isPlaying: false,
  isCountingDown: false,
  gameOver: false,

  // Gesture
  currentGesture: 'none',
  handLandmarker: null,
  webcamRunning: false,
  lastVideoTime: -1,
  animFrameId: null,

  // Multiplayer-specific
  opponentGesture: null,
  waitingForOpponent: false,
};

// --- DOM References ---
let dom = {};

function cacheDom() {
  dom = {
    // Screens
    screenModeSelect: document.getElementById('screen-mode-select'),
    screenLobby: document.getElementById('screen-lobby'),
    screenWaiting: document.getElementById('screen-waiting'),
    screenGame: document.getElementById('screen-game'),

    // Mode selection
    btnModeAI: document.getElementById('btn-mode-ai'),
    btnModeMulti: document.getElementById('btn-mode-multi'),

    // Lobby
    btnCreateRoom: document.getElementById('btn-create-room'),
    btnJoinRoom: document.getElementById('btn-join-room'),
    joinCodeInput: document.getElementById('join-code-input'),
    joinError: document.getElementById('join-error'),
    btnLobbyBack: document.getElementById('btn-lobby-back'),

    // Waiting Room
    roomCodeDisplay: document.getElementById('room-code-display'),
    btnCopyCode: document.getElementById('btn-copy-code'),
    btnCopyLink: document.getElementById('btn-copy-link'),
    btnWaitingCancel: document.getElementById('btn-waiting-cancel'),

    // Game elements
    webcam: document.getElementById('webcam'),
    canvas: document.getElementById('canvas-overlay'),
    gestureLabel: document.getElementById('gesture-label'),
    cameraStatus: document.getElementById('camera-status'),
    webcamContainer: document.getElementById('webcam-container'),
    computerEmoji: document.getElementById('computer-hand-emoji'),
    computerMoveLabel: document.getElementById('computer-move-label'),
    scorePlayer: document.getElementById('score-player'),
    scoreComputer: document.getElementById('score-computer'),
    streakCount: document.getElementById('streak-count'),
    streakDisplay: document.getElementById('streak-display'),
    countdownText: document.getElementById('countdown-text'),
    countdownRing: document.getElementById('countdown-ring'),
    startBtn: document.getElementById('start-btn'),
    resultBanner: document.getElementById('result-banner'),
    resultText: document.getElementById('result-text'),
    resultDetail: document.getElementById('result-detail'),
    roundCounter: document.getElementById('round-counter'),
    matchProgress: document.getElementById('match-progress'),
    roundIndicator: document.getElementById('round-indicator'),
    roundScorePlayer: document.getElementById('round-score-player'),
    roundScoreComputer: document.getElementById('round-score-computer'),
    roundDots: document.getElementById('round-dots'),
    historyList: document.getElementById('history-list'),
    themeSelect: document.getElementById('theme-select'),
    difficultySelect: document.getElementById('difficulty-select'),
    difficultyGroup: document.getElementById('difficulty-group'),
    soundToggle: document.getElementById('sound-toggle'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    celebrationOverlay: document.getElementById('celebration-overlay'),
    toastContainer: document.getElementById('toast-container'),

    // Modal
    roundModal: document.getElementById('round-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalSubtitle: document.getElementById('modal-subtitle'),
    modalPlayerScore: document.getElementById('modal-player-score'),
    modalComputerScore: document.getElementById('modal-computer-score'),
    modalOpponentLabel: document.getElementById('modal-opponent-label'),
    modalRoundDots: document.getElementById('modal-round-dots'),
    modalMessage: document.getElementById('modal-message'),
    modalBtn: document.getElementById('modal-btn'),
    modalBtnText: document.getElementById('modal-btn-text'),

    // Disconnect modal
    disconnectModal: document.getElementById('disconnect-modal'),
    btnDisconnectBack: document.getElementById('btn-disconnect-back'),

    // Multiplayer UI
    gameSubtitle: document.getElementById('game-subtitle'),
    connectionBadge: document.getElementById('connection-badge'),
    opponentName: document.getElementById('opponent-name'),
    opponentPanelTitle: document.getElementById('opponent-panel-title'),
    opponentScoreLabel: document.getElementById('opponent-score-label'),
    waitingOpponent: document.getElementById('waiting-opponent'),
    btnBackToMenu: document.getElementById('btn-back-to-menu'),
  };
}

// =============================================================
// SCREEN NAVIGATION
// =============================================================

function showScreen(screenId) {
  [dom.screenModeSelect, dom.screenLobby, dom.screenWaiting, dom.screenGame]
    .forEach(s => s.classList.add('hidden'));

  const target = document.getElementById(screenId);
  if (target) target.classList.remove('hidden');
}

// =============================================================
// TOAST NOTIFICATIONS
// =============================================================

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// =============================================================
// MEDIAPIPE HAND LANDMARKER
// =============================================================

async function initHandLandmarker() {
  dom.loadingText.textContent = 'Loading AI Hand Detection Model...';

  try {
    const { HandLandmarker, FilesetResolver } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
    );

    window._HandLandmarker = HandLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );

    state.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    dom.loadingText.textContent = 'Starting webcam...';
    await startWebcam();

    dom.loadingOverlay.classList.add('hidden');
    dom.cameraStatus.textContent = '✅ Camera ready — show your hand!';
    dom.cameraStatus.className = 'camera-status ready';
  } catch (err) {
    console.error('Failed to init HandLandmarker:', err);
    dom.loadingText.textContent = 'Error loading model. Please refresh.';
    dom.cameraStatus.textContent = '❌ Failed to load hand detection';
    dom.cameraStatus.className = 'camera-status error';
  }
}

// =============================================================
// WEBCAM
// =============================================================

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    });
    dom.webcam.srcObject = stream;
    await new Promise((resolve) => {
      dom.webcam.onloadedmetadata = () => {
        dom.webcam.play();
        resolve();
      };
    });
    dom.canvas.width = dom.webcam.videoWidth;
    dom.canvas.height = dom.webcam.videoHeight;
    state.webcamRunning = true;
    predictLoop();
  } catch (err) {
    console.error('Webcam error:', err);
    dom.cameraStatus.textContent = '❌ Camera access denied';
    dom.cameraStatus.className = 'camera-status error';
  }
}

// =============================================================
// PREDICTION LOOP
// =============================================================

function predictLoop() {
  if (!state.webcamRunning || !state.handLandmarker) return;

  const video = dom.webcam;
  if (video.currentTime !== state.lastVideoTime && video.readyState >= 2) {
    state.lastVideoTime = video.currentTime;
    const results = state.handLandmarker.detectForVideo(video, performance.now());
    processResults(results);
  }

  state.animFrameId = requestAnimationFrame(predictLoop);
}

// =============================================================
// PROCESS LANDMARKS → GESTURE
// =============================================================

function processResults(results) {
  const canvasCtx = dom.canvas.getContext('2d');
  canvasCtx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

  if (results.landmarks && results.landmarks.length > 0) {
    const landmarks = results.landmarks[0];
    const handedness = results.handednesses?.[0]?.[0]?.categoryName || 'Right';

    drawHandLandmarks(canvasCtx, landmarks);

    const gesture = classifyGesture(landmarks, handedness);
    state.currentGesture = gesture;

    const theme = THEMES[state.theme];
    const icon = theme.icons[gesture] || theme.icons.none;
    dom.gestureLabel.textContent = `${icon} ${gesture.toUpperCase()}`;
    dom.gestureLabel.classList.add('active');
    dom.webcamContainer.classList.add('detecting');
  } else {
    state.currentGesture = 'none';
    dom.gestureLabel.textContent = 'No hand detected';
    dom.gestureLabel.classList.remove('active');
    dom.webcamContainer.classList.remove('detecting');
  }
}

function drawHandLandmarks(ctx, landmarks) {
  const w = dom.canvas.width;
  const h = dom.canvas.height;

  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17],
  ];

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
  ctx.lineWidth = 3;
  connections.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  });

  landmarks.forEach((lm, i) => {
    const x = lm.x * w;
    const y = lm.y * h;
    const isTip = [4, 8, 12, 16, 20].includes(i);

    ctx.beginPath();
    ctx.arc(x, y, isTip ? 6 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = isTip ? '#06b6d4' : '#a855f7';
    ctx.fill();

    if (isTip) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

// =============================================================
// GESTURE CLASSIFICATION
// =============================================================

function classifyGesture(landmarks, handedness) {
  const fingerStates = [];

  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];

  if (handedness === 'Right') {
    fingerStates.push(thumbTip.x < thumbIP.x ? 1 : 0);
  } else {
    fingerStates.push(thumbTip.x > thumbIP.x ? 1 : 0);
  }

  fingerStates.push(landmarks[8].y < landmarks[6].y ? 1 : 0);
  fingerStates.push(landmarks[12].y < landmarks[10].y ? 1 : 0);
  fingerStates.push(landmarks[16].y < landmarks[14].y ? 1 : 0);
  fingerStates.push(landmarks[20].y < landmarks[18].y ? 1 : 0);

  const [thumb, index, middle, ring, pinky] = fingerStates;
  const extendedCount = index + middle + ring + pinky;

  if (extendedCount === 0) return 'rock';
  if (index === 1 && middle === 1 && ring === 0 && pinky === 0) return 'scissors';
  if (extendedCount >= 3) return 'paper';
  if (extendedCount === 2 && index === 1) return 'scissors';

  return 'none';
}

// =============================================================
// AI OPPONENT
// =============================================================

function getAIMove() {
  const moves = ['rock', 'paper', 'scissors'];
  const counter = { rock: 'paper', paper: 'scissors', scissors: 'rock' };

  if (state.difficulty === 'easy') {
    return moves[Math.floor(Math.random() * 3)];
  }

  if (state.difficulty === 'medium') {
    if (state.moveHistory.length > 0 && Math.random() < 0.5) {
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      return counter[lastMove];
    }
    return moves[Math.floor(Math.random() * 3)];
  }

  if (state.moveHistory.length >= 3) {
    const transitions = {};
    for (let i = 0; i < state.moveHistory.length - 1; i++) {
      const current = state.moveHistory[i];
      const next = state.moveHistory[i + 1];
      if (!transitions[current]) transitions[current] = { rock: 0, paper: 0, scissors: 0 };
      transitions[current][next]++;
    }

    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    if (transitions[lastMove]) {
      const t = transitions[lastMove];
      const total = t.rock + t.paper + t.scissors;
      if (total > 0) {
        let predicted = 'rock';
        let max = 0;
        for (const m of moves) {
          if (t[m] > max) { max = t[m]; predicted = m; }
        }
        if (Math.random() < 0.7) return counter[predicted];
      }
    }
  }

  return moves[Math.floor(Math.random() * 3)];
}

// =============================================================
// GAME RESULT LOGIC
// =============================================================

function getResult(player, computer) {
  if (player === computer) return 'draw';
  if (
    (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper')
  ) return 'win';
  return 'lose';
}

// =============================================================
// ROUND UI UPDATES
// =============================================================

function updateRoundUI() {
  dom.roundIndicator.textContent = `ROUND ${state.currentRound}`;

  dom.matchProgress.innerHTML = '';
  for (let i = 0; i < MATCHES_PER_ROUND; i++) {
    const dot = document.createElement('div');
    dot.className = 'match-dot';
    if (i < state.roundHistory.length) {
      const match = state.roundHistory[i];
      dot.classList.add(match.result);
      dot.textContent = match.result === 'win' ? '✓' : match.result === 'lose' ? '✗' : '—';
    } else if (i === state.roundHistory.length) {
      dot.classList.add('current');
      dot.textContent = (i + 1);
    } else {
      dot.textContent = (i + 1);
    }
    dom.matchProgress.appendChild(dot);
  }

  dom.roundScorePlayer.textContent = state.roundPlayerScore;
  dom.roundScoreComputer.textContent = state.roundComputerScore;

  updateRoundDots(dom.roundDots);

  dom.roundCounter.textContent = `Round ${state.currentRound} • Match ${Math.min(state.matchInRound + 1, MATCHES_PER_ROUND)} of ${MATCHES_PER_ROUND}`;
}

function updateRoundDots(container) {
  container.innerHTML = '';
  for (let r = 1; r <= 3; r++) {
    const dot = document.createElement('span');
    dot.className = 'round-dot';
    if (r === state.currentRound && !state.gameOver) {
      dot.classList.add('active');
    }
    if (r < state.currentRound || state.gameOver) {
      const roundResult = getRoundResult(r);
      if (roundResult === 'player') dot.classList.add('won');
      else if (roundResult === 'computer') dot.classList.add('lost');
      else if (roundResult === 'draw') dot.classList.add('tied');
    }
    dot.textContent = `R${r}`;
    container.appendChild(dot);
  }
}

function getRoundResult(roundNum) {
  const roundMatches = state.history.filter(h => h.round === roundNum);
  if (roundMatches.length === 0) return null;
  const pWins = roundMatches.filter(h => h.result === 'win').length;
  const cWins = roundMatches.filter(h => h.result === 'lose').length;
  if (pWins > cWins) return 'player';
  if (cWins > pWins) return 'computer';
  return 'draw';
}

// =============================================================
// GAME FLOW — MATCH
// =============================================================

async function startMatch() {
  if (state.isPlaying || state.isCountingDown || state.gameOver) return;

  // In multiplayer, only host can start
  if (state.gameMode === 'multiplayer') {
    const mp = window.multiplayer;
    if (mp.isHost) {
      // Send countdown-start to guest
      mp.send({ type: 'countdown-start' });
    } else {
      showToast('Wait for the host to start!', 'info');
      return;
    }
  }

  await runCountdownAndCapture();
}

// Called by both host and guest
async function runCountdownAndCapture() {
  const audio = window.audioEngine;
  audio.init();
  audio.playClick();

  state.isCountingDown = true;
  state.opponentGesture = null;
  state.waitingForOpponent = false;
  dom.startBtn.disabled = true;
  dom.waitingOpponent.classList.add('hidden');

  // Hide previous result
  dom.resultBanner.classList.remove('visible');
  dom.webcamContainer.classList.remove('win-glow', 'lose-glow', 'draw-glow', 'gesture-locked');

  // Computer thinking animation
  const theme = THEMES[state.theme];
  dom.computerEmoji.textContent = theme.waiting;
  dom.computerEmoji.className = 'computer-hand-emoji thinking';
  dom.computerMoveLabel.textContent = state.gameMode === 'multiplayer' ? 'Playing...' : 'Thinking...';

  // Countdown
  dom.countdownRing.classList.add('active');

  for (let i = 3; i >= 1; i--) {
    dom.countdownText.textContent = i;
    dom.countdownText.className = 'countdown-text number-pop';
    audio.playCountdownBeep();
    await sleep(900);
  }

  // SHOOT!
  dom.countdownText.textContent = theme.battleCry;
  dom.countdownText.className = 'countdown-text shoot';
  audio.playShoot();

  // Capture gesture
  const playerMove = state.currentGesture;
  state.isCountingDown = false;
  dom.countdownRing.classList.remove('active');

  if (playerMove === 'none') {
    if (state.gameMode === 'multiplayer') {
      // Send "none" gesture in multiplayer — auto-forfeit
      window.multiplayer.send({ type: 'gesture', move: 'none' });
    }
    dom.countdownText.textContent = '🤷';
    dom.computerEmoji.textContent = '😏';
    dom.computerEmoji.className = 'computer-hand-emoji reveal';
    dom.computerMoveLabel.textContent = 'No gesture!';

    dom.resultBanner.classList.add('visible');
    dom.resultText.textContent = 'NO GESTURE DETECTED!';
    dom.resultText.className = 'result-text lose';
    dom.resultDetail.textContent = 'Show Rock ✊, Paper ✋, or Scissors ✌️';

    audio.playLose();

    if (state.gameMode === 'ai') {
      dom.startBtn.disabled = false;
    }
    return;
  }

  // Lock gesture
  dom.webcamContainer.classList.add('gesture-locked');

  if (state.gameMode === 'ai') {
    // === AI MODE ===
    const computerMove = getAIMove();
    await sleep(400);
    revealAndScore(playerMove, computerMove);
  } else {
    // === MULTIPLAYER MODE ===
    // Send our gesture to opponent
    window.multiplayer.send({ type: 'gesture', move: playerMove });

    // Check if opponent's gesture already arrived
    if (state.opponentGesture) {
      await sleep(400);
      revealAndScore(playerMove, state.opponentGesture);
    } else {
      // Wait for opponent's gesture
      state.waitingForOpponent = true;
      state.isPlaying = true;
      dom.waitingOpponent.classList.remove('hidden');
      dom.computerMoveLabel.textContent = 'Waiting...';

      // Store our move to use when opponent's arrives
      state._pendingPlayerMove = playerMove;

      // Timeout after 15s
      state._gestureTimeout = setTimeout(() => {
        if (state.waitingForOpponent) {
          state.waitingForOpponent = false;
          state.isPlaying = false;
          dom.waitingOpponent.classList.add('hidden');
          showToast('Opponent took too long!', 'error');
          dom.startBtn.disabled = false;
          dom.countdownText.textContent = 'GO';
        }
      }, 15000);
    }
  }
}

async function revealAndScore(playerMove, opponentMove) {
  const audio = window.audioEngine;
  const theme = THEMES[state.theme];

  state.waitingForOpponent = false;
  state.isPlaying = false;
  dom.waitingOpponent.classList.add('hidden');
  if (state._gestureTimeout) clearTimeout(state._gestureTimeout);

  // Handle opponent's "none" (forfeit)
  if (opponentMove === 'none') {
    dom.computerEmoji.textContent = '🤷';
    dom.computerEmoji.className = 'computer-hand-emoji reveal';
    dom.computerMoveLabel.textContent = 'No gesture!';
    // Count as a win for us
    opponentMove = playerMove === 'rock' ? 'scissors' : playerMove === 'paper' ? 'rock' : 'paper';
  }

  // Reveal opponent's hand
  await sleep(400);
  dom.computerEmoji.textContent = theme.icons[opponentMove];
  dom.computerEmoji.className = 'computer-hand-emoji reveal';
  dom.computerMoveLabel.textContent = opponentMove.toUpperCase();

  // Determine result
  const result = getResult(playerMove, opponentMove);

  // Update match in round
  state.matchInRound++;
  state.moveHistory.push(playerMove);
  if (state.moveHistory.length > 20) state.moveHistory.shift();

  const historyEntry = {
    player: playerMove,
    computer: opponentMove,
    result,
    round: state.currentRound,
    match: state.matchInRound
  };
  state.history.push(historyEntry);
  state.roundHistory.push(historyEntry);

  // Score for this round
  if (result === 'win') {
    state.roundPlayerScore++;
    state.totalPlayerScore++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
  } else if (result === 'lose') {
    state.roundComputerScore++;
    state.totalComputerScore++;
    state.streak = 0;
  }

  // Update UI
  await sleep(200);
  updateScoreUI(result);
  updateStreakUI();
  updateRoundUI();
  updateHistoryUI();
  showMatchResult(result, playerMove, opponentMove);

  // Sound & visual effects
  if (result === 'win') {
    audio.playWin();
    if (state.streak >= 3 && state.streak % 3 === 0) {
      audio.playStreakBonus();
      spawnConfetti();
    }
    dom.webcamContainer.classList.add('win-glow');
  } else if (result === 'lose') {
    audio.playLose();
    dom.webcamContainer.classList.add('lose-glow');
  } else {
    audio.playDraw();
    dom.webcamContainer.classList.add('draw-glow');
  }

  // Check if round is over
  if (state.matchInRound >= MATCHES_PER_ROUND) {
    await sleep(1200);
    endRound();
    return;
  }

  // Re-enable start
  await sleep(500);
  if (state.gameMode === 'ai' || window.multiplayer.isHost) {
    dom.startBtn.disabled = false;
  }
  dom.countdownText.textContent = 'GO';
}

// =============================================================
// END OF ROUND
// =============================================================

function endRound() {
  let roundWinner;
  if (state.roundPlayerScore > state.roundComputerScore) {
    roundWinner = 'player';
    state.roundsWonPlayer++;
  } else if (state.roundComputerScore > state.roundPlayerScore) {
    roundWinner = 'computer';
    state.roundsWonComputer++;
  } else {
    roundWinner = 'draw';
  }

  const tournamentOver = (
    state.roundsWonPlayer >= ROUNDS_TO_WIN ||
    state.roundsWonComputer >= ROUNDS_TO_WIN ||
    state.currentRound >= 3
  );

  if (tournamentOver) {
    state.gameOver = true;
    showTournamentEndModal(roundWinner);
  } else {
    showRoundEndModal(roundWinner);
  }

  updateRoundUI();
}

// =============================================================
// MODALS
// =============================================================

function showRoundEndModal(roundWinner) {
  const audio = window.audioEngine;
  const oppLabel = state.gameMode === 'multiplayer' ? 'P2' : 'CPU';

  dom.modalTitle.textContent = `ROUND ${state.currentRound} COMPLETE`;
  dom.modalOpponentLabel.textContent = oppLabel;

  if (roundWinner === 'player') {
    dom.modalSubtitle.textContent = '🎉 You won this round!';
    dom.modalSubtitle.className = 'modal-subtitle win';
    audio.playWin();
    spawnConfetti();
  } else if (roundWinner === 'computer') {
    dom.modalSubtitle.textContent = `💀 ${oppLabel} won this round!`;
    dom.modalSubtitle.className = 'modal-subtitle lose';
    audio.playLose();
  } else {
    dom.modalSubtitle.textContent = '🤝 This round was a draw!';
    dom.modalSubtitle.className = 'modal-subtitle draw';
    audio.playDraw();
  }

  dom.modalPlayerScore.textContent = state.roundPlayerScore;
  dom.modalComputerScore.textContent = state.roundComputerScore;
  updateRoundDots(dom.modalRoundDots);

  const nextRound = state.currentRound + 1;
  dom.modalMessage.textContent = `Rounds: You ${state.roundsWonPlayer} — ${oppLabel} ${state.roundsWonComputer} • Next: Round ${nextRound}`;

  if (state.gameMode === 'ai' || window.multiplayer.isHost) {
    dom.modalBtnText.textContent = `START ROUND ${nextRound}`;
    dom.modalBtn.style.display = '';
  } else {
    dom.modalBtnText.textContent = 'Waiting for host...';
    dom.modalBtn.disabled = true;
    dom.modalBtn.style.display = '';
  }

  dom.roundModal.classList.add('visible');
}

function showTournamentEndModal() {
  const audio = window.audioEngine;
  const oppLabel = state.gameMode === 'multiplayer' ? 'P2' : 'CPU';

  dom.modalTitle.textContent = '🏆 TOURNAMENT OVER';
  dom.modalOpponentLabel.textContent = oppLabel;

  let overallWinner;
  if (state.roundsWonPlayer > state.roundsWonComputer) {
    overallWinner = 'player';
  } else if (state.roundsWonComputer > state.roundsWonPlayer) {
    overallWinner = 'computer';
  } else {
    if (state.totalPlayerScore > state.totalComputerScore) overallWinner = 'player';
    else if (state.totalComputerScore > state.totalPlayerScore) overallWinner = 'computer';
    else overallWinner = 'draw';
  }

  if (overallWinner === 'player') {
    dom.modalSubtitle.textContent = '🎉🏆 YOU ARE THE CHAMPION! 🏆🎉';
    dom.modalSubtitle.className = 'modal-subtitle win';
    audio.playStreakBonus();
    spawnConfetti();
    setTimeout(() => spawnConfetti(), 500);
    setTimeout(() => spawnConfetti(), 1000);
  } else if (overallWinner === 'computer') {
    dom.modalSubtitle.textContent = `💀 ${oppLabel} WINS THE TOURNAMENT`;
    dom.modalSubtitle.className = 'modal-subtitle lose';
    audio.playLose();
  } else {
    dom.modalSubtitle.textContent = '🤝 TOURNAMENT ENDS IN A DRAW!';
    dom.modalSubtitle.className = 'modal-subtitle draw';
    audio.playDraw();
  }

  dom.modalPlayerScore.textContent = state.totalPlayerScore;
  dom.modalComputerScore.textContent = state.totalComputerScore;
  updateRoundDots(dom.modalRoundDots);

  dom.modalMessage.textContent = `Rounds Won: You ${state.roundsWonPlayer} — ${oppLabel} ${state.roundsWonComputer} • Total: ${state.totalPlayerScore} - ${state.totalComputerScore}`;
  dom.modalBtnText.textContent = '🔄 PLAY AGAIN';
  dom.modalBtn.disabled = false;
  dom.modalBtn.style.display = '';

  dom.roundModal.classList.add('visible');
}

function handleModalBtn() {
  const audio = window.audioEngine;
  audio.init();
  audio.playClick();

  dom.roundModal.classList.remove('visible');

  if (state.gameOver) {
    if (state.gameMode === 'multiplayer') {
      window.multiplayer.send({ type: 'rematch' });
    }
    resetTournament();
  } else {
    if (state.gameMode === 'multiplayer' && window.multiplayer.isHost) {
      window.multiplayer.send({ type: 'next-round' });
    }
    startNextRound();
  }
}

function startNextRound() {
  state.currentRound++;
  state.matchInRound = 0;
  state.roundPlayerScore = 0;
  state.roundComputerScore = 0;
  state.roundHistory = [];

  dom.resultBanner.classList.remove('visible');
  dom.webcamContainer.classList.remove('win-glow', 'lose-glow', 'draw-glow', 'gesture-locked');
  const theme = THEMES[state.theme];
  dom.computerEmoji.textContent = theme.icons.none;
  dom.computerEmoji.className = 'computer-hand-emoji';
  dom.computerMoveLabel.textContent = 'Waiting...';
  dom.countdownText.textContent = 'GO';

  updateRoundUI();
  updateScoreUI(null);

  if (state.gameMode === 'ai' || window.multiplayer.isHost) {
    dom.startBtn.disabled = false;
  }
}

function resetTournament() {
  state.currentRound = 1;
  state.matchInRound = 0;
  state.roundPlayerScore = 0;
  state.roundComputerScore = 0;
  state.roundsWonPlayer = 0;
  state.roundsWonComputer = 0;
  state.totalPlayerScore = 0;
  state.totalComputerScore = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.history = [];
  state.roundHistory = [];
  state.moveHistory = [];
  state.gameOver = false;

  dom.resultBanner.classList.remove('visible');
  dom.webcamContainer.classList.remove('win-glow', 'lose-glow', 'draw-glow', 'gesture-locked');
  const theme = THEMES[state.theme];
  dom.computerEmoji.textContent = theme.icons.none;
  dom.computerEmoji.className = 'computer-hand-emoji';
  dom.computerMoveLabel.textContent = 'Waiting...';
  dom.countdownText.textContent = 'GO';

  updateRoundUI();
  updateScoreUI(null);
  updateStreakUI();
  updateHistoryUI();

  if (state.gameMode === 'ai' || window.multiplayer.isHost) {
    dom.startBtn.disabled = false;
  }
}

// =============================================================
// UI UPDATES
// =============================================================

function updateScoreUI(result) {
  dom.scorePlayer.textContent = state.roundPlayerScore;
  dom.scoreComputer.textContent = state.roundComputerScore;

  if (result === 'win') {
    dom.scorePlayer.classList.add('score-bump');
    setTimeout(() => dom.scorePlayer.classList.remove('score-bump'), 500);
  } else if (result === 'lose') {
    dom.scoreComputer.classList.add('score-bump');
    setTimeout(() => dom.scoreComputer.classList.remove('score-bump'), 500);
  }
}

function updateStreakUI() {
  if (state.streak > 0) {
    dom.streakCount.textContent = `🔥 ${state.streak}`;
    dom.streakDisplay.classList.toggle('on-fire', state.streak >= 3);
  } else {
    dom.streakCount.textContent = '0';
    dom.streakDisplay.classList.remove('on-fire');
  }
}

function updateHistoryUI() {
  dom.historyList.innerHTML = '';
  const recentHistory = [...state.roundHistory].reverse();
  recentHistory.forEach((entry) => {
    const theme = THEMES[state.theme];
    const div = document.createElement('div');
    div.className = `history-item ${entry.result}`;
    div.textContent = `${theme.icons[entry.player]} vs ${theme.icons[entry.computer]}`;
    dom.historyList.appendChild(div);
  });
}

function showMatchResult(result, playerMove, computerMove) {
  const theme = THEMES[state.theme];

  dom.resultBanner.classList.add('visible');
  dom.resultText.className = `result-text ${result}`;

  if (result === 'win') {
    dom.resultText.textContent = '🎉 YOU WIN!';
    dom.resultDetail.textContent = `${theme.icons[playerMove]} beats ${theme.icons[computerMove]}`;
  } else if (result === 'lose') {
    dom.resultText.textContent = '💀 YOU LOSE!';
    dom.resultDetail.textContent = `${theme.icons[computerMove]} beats ${theme.icons[playerMove]}`;
  } else {
    dom.resultText.textContent = '🤝 DRAW!';
    dom.resultDetail.textContent = `Both played ${theme.icons[playerMove]}`;
  }

  if (state.streak >= 3 && result === 'win') {
    dom.resultDetail.textContent += ` — 🔥 ${state.streak} STREAK!`;
  }
}

// =============================================================
// CONFETTI
// =============================================================

function spawnConfetti() {
  const overlay = dom.celebrationOverlay;
  const colors = ['#a855f7', '#06b6d4', '#f472b6', '#22c55e', '#eab308', '#ef4444'];

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-5%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1.5 + Math.random()) + 's';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    overlay.appendChild(piece);
  }

  setTimeout(() => { overlay.innerHTML = ''; }, 2500);
}

// =============================================================
// THEME / SETTINGS
// =============================================================

function setTheme(themeName) {
  state.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
  const theme = THEMES[themeName];
  dom.computerEmoji.textContent = theme.icons.none;
  dom.computerMoveLabel.textContent = 'Waiting...';
  updateHistoryUI();
  updateRoundUI();
  window.audioEngine.playClick();
}

function setDifficulty(diff) {
  state.difficulty = diff;
  window.audioEngine.playClick();
}

function toggleSound() {
  const audio = window.audioEngine;
  audio.init();
  audio.setEnabled(!audio.enabled);
  dom.soundToggle.textContent = audio.enabled ? '🔊' : '🔇';
  dom.soundToggle.classList.toggle('muted', !audio.enabled);
  if (audio.enabled) audio.playClick();
}

// =============================================================
// MULTIPLAYER — MESSAGE HANDLING
// =============================================================

function setupMultiplayerCallbacks() {
  const mp = window.multiplayer;

  mp.onConnected = () => {
    showToast('🎉 Opponent connected!', 'success');
    dom.connectionBadge.classList.remove('hidden', 'disconnected');
    dom.connectionBadge.querySelector('.badge-text').textContent = 'Connected';

    // Go to game screen
    showScreen('screen-game');
    setupMultiplayerUI();
  };

  mp.onDisconnected = (reason) => {
    showToast('😞 Opponent disconnected', 'error');
    dom.connectionBadge.classList.add('disconnected');
    dom.connectionBadge.querySelector('.badge-text').textContent = 'Disconnected';
    dom.disconnectModal.classList.add('visible');
  };

  mp.onMessage = (data) => {
    handleMultiplayerMessage(data);
  };

  mp.onError = (msg) => {
    showToast(msg, 'error');
  };
}

function handleMultiplayerMessage(data) {
  switch (data.type) {
    case 'countdown-start':
      // Guest receives: start the countdown
      runCountdownAndCapture();
      break;

    case 'gesture':
      // Received opponent's gesture
      state.opponentGesture = data.move;

      // If we were waiting for it
      if (state.waitingForOpponent && state._pendingPlayerMove) {
        revealAndScore(state._pendingPlayerMove, data.move);
        state._pendingPlayerMove = null;
      }
      break;

    case 'next-round':
      // Guest: host advanced to next round
      dom.roundModal.classList.remove('visible');
      startNextRound();
      break;

    case 'rematch':
      // Opponent wants rematch
      dom.roundModal.classList.remove('visible');
      resetTournament();
      showToast('🔄 Rematch!', 'info');
      break;
  }
}

function setupMultiplayerUI() {
  state.gameMode = 'multiplayer';

  // Update labels
  dom.gameSubtitle.textContent = `Multiplayer • Room: ${window.multiplayer.roomCode} • Best of 3 Rounds`;
  dom.opponentName.textContent = 'PLAYER 2';
  dom.opponentPanelTitle.querySelector('span').textContent = '👤';
  dom.opponentScoreLabel.textContent = 'P2';
  dom.connectionBadge.classList.remove('hidden');

  // Hide AI difficulty, show it's multiplayer
  dom.difficultyGroup.classList.add('hidden');

  // Only host can start matches
  if (!window.multiplayer.isHost) {
    dom.startBtn.textContent = '⏳ Host starts match';
    dom.startBtn.disabled = true;
  } else {
    dom.startBtn.textContent = '▶ Start Match';
    dom.startBtn.disabled = false;
  }
}

// =============================================================
// MODE SELECTION & LOBBY FLOW
// =============================================================

function selectModeAI() {
  state.gameMode = 'ai';
  dom.gameSubtitle.textContent = 'Gesture-Controlled • AI Powered • Best of 3 Rounds';
  dom.opponentName.textContent = 'OPPONENT';
  dom.opponentPanelTitle.querySelector('span').textContent = '🤖';
  dom.opponentScoreLabel.textContent = 'CPU';
  dom.connectionBadge.classList.add('hidden');
  dom.difficultyGroup.classList.remove('hidden');
  dom.startBtn.textContent = '▶ Start Match';
  dom.startBtn.disabled = false;

  showScreen('screen-game');
}

function openLobby() {
  showScreen('screen-lobby');
  dom.joinCodeInput.value = '';
  dom.joinError.classList.add('hidden');
}

async function handleCreateRoom() {
  const mp = window.multiplayer;
  setupMultiplayerCallbacks();

  dom.btnCreateRoom.disabled = true;
  dom.btnCreateRoom.textContent = 'Creating...';

  try {
    const code = await mp.createRoom();
    dom.roomCodeDisplay.textContent = code;
    showScreen('screen-waiting');
  } catch (err) {
    showToast('Failed to create room: ' + err, 'error');
  } finally {
    dom.btnCreateRoom.disabled = false;
    dom.btnCreateRoom.textContent = 'Create Room';
  }
}

async function handleJoinRoom() {
  const code = dom.joinCodeInput.value.trim().toUpperCase();
  if (code.length < 4) {
    dom.joinError.textContent = 'Please enter a valid room code';
    dom.joinError.classList.remove('hidden');
    return;
  }

  const mp = window.multiplayer;
  setupMultiplayerCallbacks();

  dom.btnJoinRoom.disabled = true;
  dom.btnJoinRoom.textContent = 'Joining...';
  dom.joinError.classList.add('hidden');

  try {
    await mp.joinRoom(code);
    // onConnected callback will switch to game screen
  } catch (err) {
    dom.joinError.textContent = typeof err === 'string' ? err : 'Failed to connect';
    dom.joinError.classList.remove('hidden');
  } finally {
    dom.btnJoinRoom.disabled = false;
    dom.btnJoinRoom.textContent = 'Join';
  }
}

function handleCopyCode() {
  const code = window.multiplayer.roomCode;
  navigator.clipboard.writeText(code).then(() => {
    dom.btnCopyCode.textContent = '✅ Copied!';
    dom.btnCopyCode.classList.add('copied');
    setTimeout(() => {
      dom.btnCopyCode.textContent = '📋 Copy Code';
      dom.btnCopyCode.classList.remove('copied');
    }, 2000);
  });
}

function handleCopyLink() {
  const link = window.multiplayer.getShareLink();
  navigator.clipboard.writeText(link).then(() => {
    dom.btnCopyLink.textContent = '✅ Copied!';
    dom.btnCopyLink.classList.add('copied');
    setTimeout(() => {
      dom.btnCopyLink.textContent = '🔗 Copy Link';
      dom.btnCopyLink.classList.remove('copied');
    }, 2000);
  });
}

function handleWaitingCancel() {
  window.multiplayer.destroy();
  showScreen('screen-lobby');
}

function handleBackToMenu() {
  if (state.gameMode === 'multiplayer') {
    window.multiplayer.destroy();
  }
  state.gameMode = 'ai';
  resetTournament();
  showScreen('screen-mode-select');
}

function handleDisconnectBack() {
  dom.disconnectModal.classList.remove('visible');
  window.multiplayer.destroy();
  resetTournament();
  showScreen('screen-mode-select');
}

// =============================================================
// UTILS
// =============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================
// KEYBOARD SHORTCUT
// =============================================================

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (dom.roundModal && dom.roundModal.classList.contains('visible')) {
      handleModalBtn();
    } else if (dom.disconnectModal && dom.disconnectModal.classList.contains('visible')) {
      handleDisconnectBack();
    } else if (!dom.screenGame.classList.contains('hidden')) {
      startMatch();
    }
  }
});

// =============================================================
// INIT
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();

  // Mode selection
  dom.btnModeAI.addEventListener('click', selectModeAI);
  dom.btnModeMulti.addEventListener('click', openLobby);

  // Lobby
  dom.btnCreateRoom.addEventListener('click', handleCreateRoom);
  dom.btnJoinRoom.addEventListener('click', handleJoinRoom);
  dom.btnLobbyBack.addEventListener('click', () => showScreen('screen-mode-select'));
  dom.joinCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleJoinRoom();
  });

  // Waiting room
  dom.btnCopyCode.addEventListener('click', handleCopyCode);
  dom.btnCopyLink.addEventListener('click', handleCopyLink);
  dom.btnWaitingCancel.addEventListener('click', handleWaitingCancel);

  // Game
  dom.startBtn.addEventListener('click', startMatch);
  dom.themeSelect.addEventListener('change', (e) => setTheme(e.target.value));
  dom.difficultySelect.addEventListener('change', (e) => setDifficulty(e.target.value));
  dom.soundToggle.addEventListener('click', toggleSound);
  dom.modalBtn.addEventListener('click', handleModalBtn);
  dom.btnBackToMenu.addEventListener('click', handleBackToMenu);
  dom.btnDisconnectBack.addEventListener('click', handleDisconnectBack);

  // Check URL for room code (shareable link)
  const urlRoom = MultiplayerManager.getRoomFromURL();
  if (urlRoom) {
    showScreen('screen-lobby');
    dom.joinCodeInput.value = urlRoom;
    showToast('Room code detected! Click Join to connect.', 'info');
  }

  // Init round UI
  updateRoundUI();

  // Init MediaPipe
  initHandLandmarker();
});
