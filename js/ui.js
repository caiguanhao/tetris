// ui.js — Input handling and UI (teammate: ui)
// Handles: keyboard/touch input, score panel, next piece preview, overlays, high score
window.ui = (function () {
  // DOM refs
  let scoreEl, levelEl, linesEl, highScoreEl;
  let nextCanvas, nextCtx;
  let startScreen, pauseScreen, gameoverScreen, finalScoreEl;
  let overlay;

  // High score
  let highScore = 0;
  const HS_KEY = 'tetris_high_score';

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  const SWIPE_THRESHOLD = 30;

  // --- Init ---
  function init() {
    // DOM refs
    scoreEl = document.getElementById('score-value');
    levelEl = document.getElementById('level-value');
    linesEl = document.getElementById('lines-value');
    highScoreEl = document.getElementById('high-score-value');
    nextCanvas = document.getElementById('next-piece');
    nextCtx = nextCanvas.getContext('2d');
    overlay = document.getElementById('overlay');
    startScreen = document.getElementById('start-screen');
    pauseScreen = document.getElementById('pause-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    finalScoreEl = document.getElementById('final-score');

    // Load high score
    highScore = parseInt(localStorage.getItem(HS_KEY), 10) || 0;
    highScoreEl.textContent = highScore;

    // Keyboard
    document.addEventListener('keydown', onKeyDown);

    // Touch — swipe on board area
    var boardWrapper = document.getElementById('board-wrapper');
    boardWrapper.addEventListener('touchstart', onTouchStart, { passive: false });
    boardWrapper.addEventListener('touchend', onTouchEnd, { passive: false });

    // Overlay tap
    overlay.addEventListener('click', onOverlayClick);
    overlay.addEventListener('touchend', onOverlayClick);

    // Create touch buttons for mobile
    createTouchButtons();

    // Event bus listeners
    events.on('game-start', onGameStart);
    events.on('game-over', onGameOver);
    events.on('game-pause', onGamePause);

    // Auto-pause when tab loses visibility
    document.addEventListener('visibilitychange', function () {
      var gs = window.gameState;
      if (document.hidden && gs.started && !gs.gameOver && !gs.paused) {
        events.emit('input-pause');
      }
    });

    // Auto-pause when browser window loses focus (e.g., Alt+Tab)
    window.addEventListener('blur', function () {
      var gs = window.gameState;
      if (gs.started && !gs.gameOver && !gs.paused) {
        events.emit('input-pause');
      }
    });
  }

  // --- Keyboard ---
  function onKeyDown(e) {
    var gs = window.gameState;

    // Start / restart
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!gs.started || gs.gameOver) {
        if (gs.gameOver) {
          events.emit('request-restart');
        } else {
          events.emit('input-start');
        }
      }
      return;
    }

    // Pause toggle
    if (e.key === 'p' || e.key === 'P') {
      if (gs.started && !gs.gameOver) {
        events.emit('input-pause');
      }
      return;
    }

    // Game must be active for movement
    if (!gs.started || gs.paused || gs.gameOver) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        events.emit('input-left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        events.emit('input-right');
        break;
      case 'ArrowDown':
        e.preventDefault();
        events.emit('input-down');
        break;
      case 'ArrowUp':
        e.preventDefault();
        events.emit('input-rotate');
        break;
      case ' ':
        e.preventDefault();
        events.emit('input-drop');
        break;
    }
  }

  // --- Touch ---
  function onTouchStart(e) {
    var t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }

  function onTouchEnd(e) {
    var gs = window.gameState;
    if (!gs.started || gs.paused || gs.gameOver) return;

    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    var dt = Date.now() - touchStartTime;

    // Quick tap = rotate
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD && dt < 300) {
      events.emit('input-rotate');
      return;
    }

    // Swipe detection
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > SWIPE_THRESHOLD) events.emit('input-right');
      else if (dx < -SWIPE_THRESHOLD) events.emit('input-left');
    } else {
      if (dy > SWIPE_THRESHOLD) events.emit('input-down');
      else if (dy < -SWIPE_THRESHOLD) events.emit('input-drop');
    }
  }

  function onOverlayClick(e) {
    e.preventDefault();
    var gs = window.gameState;
    if (!gs.started) {
      events.emit('input-start');
    } else if (gs.paused) {
      events.emit('input-pause');
    } else if (gs.gameOver) {
      events.emit('request-restart');
    }
  }

  // --- Touch Buttons ---
  function createTouchButtons() {
    var container = document.createElement('div');
    container.id = 'touch-controls';
    var buttons = [
      { label: '\u25C0', event: 'input-left' },
      { label: '\u25BC', event: 'input-down' },
      { label: '\u21BB', event: 'input-rotate' },
      { label: '\u25B6', event: 'input-right' },
      { label: '\u2B07', event: 'input-drop' }
    ];
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'touch-btn';
      btn.textContent = b.label;
      btn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        events.emit(b.event);
      });
      container.appendChild(btn);
    });
    document.body.appendChild(container);
  }

  // --- Event Handlers ---
  function onGameStart() {
    startScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    gameoverScreen.style.display = 'none';
    overlay.classList.add('hidden');
  }

  function onGameOver() {
    var gs = window.gameState;
    finalScoreEl.textContent = 'Score: ' + gs.score;
    gameoverScreen.style.display = '';
    overlay.classList.remove('hidden');
    // Update high score
    if (gs.score > highScore) {
      highScore = gs.score;
      localStorage.setItem(HS_KEY, highScore);
      highScoreEl.textContent = highScore;
    }
  }

  function onGamePause(data) {
    if (data.paused) {
      pauseScreen.style.display = '';
      overlay.classList.remove('hidden');
    } else {
      pauseScreen.style.display = 'none';
      overlay.classList.add('hidden');
    }
  }

  // --- Next Piece Preview ---
  function drawNextPiece() {
    var gs = window.gameState;
    nextCtx.clearRect(0, 0, 120, 120);
    if (!gs.nextPiece) return;

    var piece = gs.nextPiece;
    var shape = piece.shape || TETROMINOES[piece.type].shapes[0];
    var color = piece.color || TETROMINOES[piece.type].color;

    // Find bounding box
    var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    shape.forEach(function (cell) {
      if (cell[0] < minR) minR = cell[0];
      if (cell[0] > maxR) maxR = cell[0];
      if (cell[1] < minC) minC = cell[1];
      if (cell[1] > maxC) maxC = cell[1];
    });

    var rows = maxR - minR + 1;
    var cols = maxC - minC + 1;
    var cellSize = 24;
    var offsetX = (120 - cols * cellSize) / 2;
    var offsetY = (120 - rows * cellSize) / 2;

    shape.forEach(function (cell) {
      var r = cell[0] - minR;
      var c = cell[1] - minC;
      nextCtx.fillStyle = color;
      nextCtx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize - 1, cellSize - 1);
      nextCtx.strokeStyle = 'rgba(255,255,255,0.2)';
      nextCtx.strokeRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize - 1, cellSize - 1);
    });
  }

  // --- Update (called every frame) ---
  function update() {
    var gs = window.gameState;
    scoreEl.textContent = gs.score;
    levelEl.textContent = gs.level;
    linesEl.textContent = gs.lines;

    // High score live update
    if (gs.score > highScore) {
      highScore = gs.score;
      localStorage.setItem(HS_KEY, highScore);
    }
    highScoreEl.textContent = highScore;

    drawNextPiece();
  }

  return { init: init, update: update };
})();
