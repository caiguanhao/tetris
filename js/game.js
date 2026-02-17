// ============================================================
// game.js — Shared state, tetromino definitions, event bus, game loop
// DO NOT EDIT — this is the scaffolded glue for all modules
// ============================================================

// --- Constants ---
const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30;

// --- Tetromino Definitions ---
// Each tetromino has 4 rotation states (0-3), defined as arrays of [row, col] offsets
const TETROMINOES = {
  I: {
    color: '#00f0f0',
    shapes: [
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]]
    ]
  },
  O: {
    color: '#f0f000',
    shapes: [
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]]
    ]
  },
  T: {
    color: '#a000f0',
    shapes: [
      [[0,0],[0,1],[0,2],[1,1]],
      [[0,0],[1,0],[2,0],[1,1]],
      [[1,0],[1,1],[1,2],[0,1]],
      [[0,0],[1,0],[2,0],[1,-1]]
    ]
  },
  S: {
    color: '#00f000',
    shapes: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]]
    ]
  },
  Z: {
    color: '#f00000',
    shapes: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]]
    ]
  },
  J: {
    color: '#0000f0',
    shapes: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[1,2]],
      [[0,0],[1,0],[2,0],[2,-1]]
    ]
  },
  L: {
    color: '#f0a000',
    shapes: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[2,1]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[0,0],[0,1],[1,1],[2,1]]
    ]
  }
};

const PIECE_TYPES = Object.keys(TETROMINOES);

// --- Wall Kick Data (SRS) ---
// Offsets to try when rotation fails: [dx, dy] pairs
const WALL_KICKS = {
  normal: [
    [[ 0, 0], [-1, 0], [-1,-1], [ 0, 2], [-1, 2]],
    [[ 0, 0], [ 1, 0], [ 1, 1], [ 0,-2], [ 1,-2]],
    [[ 0, 0], [ 1, 0], [ 1,-1], [ 0, 2], [ 1, 2]],
    [[ 0, 0], [-1, 0], [-1, 1], [ 0,-2], [-1,-2]]
  ],
  I: [
    [[ 0, 0], [-2, 0], [ 1, 0], [-2, 1], [ 1,-2]],
    [[ 0, 0], [ 2, 0], [-1, 0], [ 2,-1], [-1, 2]],
    [[ 0, 0], [ 2, 0], [-1, 0], [ 2, 1], [-1,-2]],
    [[ 0, 0], [-2, 0], [ 1, 0], [-2,-1], [ 1, 2]]
  ]
};

// --- Event Bus ---
const events = {
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(fn => fn(data));
  }
};
window.events = events;

// --- Game State ---
function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

const gameState = {
  board: createEmptyBoard(),
  currentPiece: null,
  nextPiece: null,
  score: 0,
  level: 1,
  lines: 0,
  gameOver: false,
  paused: false,
  started: false,
  dropInterval: 1000
};
window.gameState = gameState;

// Expose constants and helpers globally
window.COLS = COLS;
window.ROWS = ROWS;
window.CELL_SIZE = CELL_SIZE;
window.TETROMINOES = TETROMINOES;
window.PIECE_TYPES = PIECE_TYPES;
window.WALL_KICKS = WALL_KICKS;
window.createEmptyBoard = createEmptyBoard;

// --- Game Loop ---
let lastTime = 0;
let animFrameId = null;

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState.started && !gameState.paused && !gameState.gameOver) {
    if (window.engine && window.engine.update) {
      window.engine.update(dt);
    }
  }

  if (window.renderer && window.renderer.draw) {
    window.renderer.draw();
  }

  if (window.ui && window.ui.update) {
    window.ui.update();
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('board');

  if (window.renderer && window.renderer.init) {
    window.renderer.init(canvas);
  }
  if (window.engine && window.engine.init) {
    window.engine.init();
  }
  if (window.ui && window.ui.init) {
    window.ui.init();
  }

  lastTime = performance.now();
  animFrameId = requestAnimationFrame(gameLoop);
});
