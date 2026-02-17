// engine.js — Game logic (teammate: engine)
// Handles: piece spawning, movement, rotation, collision, line clearing, gravity, game over
window.engine = (function () {
  const gs = window.gameState;
  const ev = window.events;

  let bag = [];
  let dropTimer = 0;

  // --- 7-bag randomizer ---
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function nextFromBag() {
    if (bag.length === 0) bag = shuffle([...window.PIECE_TYPES]);
    return bag.pop();
  }

  // --- Piece creation ---
  function createPiece(type) {
    const def = window.TETROMINOES[type];
    const shape = def.shapes[0];
    const cols = shape.map(c => c[1]);
    const minC = Math.min(...cols);
    const width = Math.max(...cols) - minC + 1;
    return {
      type: type,
      rotation: 0,
      x: Math.floor((window.COLS - width) / 2) - minC,
      y: 0,
      shape: shape,
      color: def.color
    };
  }

  // --- Collision detection ---
  function isValid(piece) {
    for (const [r, c] of piece.shape) {
      const row = piece.y + r;
      const col = piece.x + c;
      if (col < 0 || col >= window.COLS || row < 0 || row >= window.ROWS) return false;
      if (gs.board[row][col] !== null) return false;
    }
    return true;
  }

  function isValidPosition(shape, x, y) {
    for (const [r, c] of shape) {
      const row = y + r;
      const col = x + c;
      if (col < 0 || col >= window.COLS || row < 0 || row >= window.ROWS) return false;
      if (gs.board[row][col] !== null) return false;
    }
    return true;
  }

  // --- Spawning ---
  function spawnPiece() {
    const type = gs.nextPiece ? gs.nextPiece.type : nextFromBag();
    const piece = createPiece(type);
    const nextType = nextFromBag();
    const nextDef = window.TETROMINOES[nextType];
    gs.nextPiece = { type: nextType, rotation: 0, shape: nextDef.shapes[0], color: nextDef.color };

    if (!isValid(piece)) {
      gs.currentPiece = piece;
      gs.gameOver = true;
      ev.emit('game-over');
      return;
    }
    gs.currentPiece = piece;
    dropTimer = 0;
  }

  // --- Movement ---
  function moveLeft() {
    if (!gs.currentPiece || gs.gameOver || gs.paused) return;
    gs.currentPiece.x--;
    if (!isValid(gs.currentPiece)) {
      gs.currentPiece.x++;
    } else {
      ev.emit('piece-moved');
    }
  }

  function moveRight() {
    if (!gs.currentPiece || gs.gameOver || gs.paused) return;
    gs.currentPiece.x++;
    if (!isValid(gs.currentPiece)) {
      gs.currentPiece.x--;
    } else {
      ev.emit('piece-moved');
    }
  }

  function moveDown() {
    if (!gs.currentPiece || gs.gameOver || gs.paused) return;
    gs.currentPiece.y++;
    if (!isValid(gs.currentPiece)) {
      gs.currentPiece.y--;
      lockPiece();
    } else {
      gs.score += 1;
      ev.emit('piece-moved');
      ev.emit('score-changed', { score: gs.score, level: gs.level, lines: gs.lines });
    }
    dropTimer = 0;
  }

  // --- Rotation with SRS wall kicks ---
  function rotate() {
    if (!gs.currentPiece || gs.gameOver || gs.paused) return;
    const p = gs.currentPiece;
    const oldRotation = p.rotation;
    const newRotation = (oldRotation + 1) % 4;
    const newShape = window.TETROMINOES[p.type].shapes[newRotation];
    const kicks = p.type === 'I' ? window.WALL_KICKS.I : window.WALL_KICKS.normal;
    const kickSet = kicks[oldRotation];

    for (const [dx, dy] of kickSet) {
      if (isValidPosition(newShape, p.x + dx, p.y - dy)) {
        p.x += dx;
        p.y -= dy;
        p.rotation = newRotation;
        p.shape = newShape;
        ev.emit('piece-moved');
        return;
      }
    }
  }

  // --- Hard drop ---
  function hardDrop() {
    if (!gs.currentPiece || gs.gameOver || gs.paused) return;
    let cells = 0;
    while (true) {
      gs.currentPiece.y++;
      if (!isValid(gs.currentPiece)) {
        gs.currentPiece.y--;
        break;
      }
      cells++;
    }
    gs.score += cells * 2;
    ev.emit('score-changed', { score: gs.score, level: gs.level, lines: gs.lines });
    ev.emit('hard-drop');
    lockPiece();
  }

  // --- Lock piece to board ---
  function lockPiece() {
    const p = gs.currentPiece;
    for (const [r, c] of p.shape) {
      const row = p.y + r;
      const col = p.x + c;
      if (row >= 0 && row < window.ROWS && col >= 0 && col < window.COLS) {
        gs.board[row][col] = p.color;
      }
    }
    ev.emit('piece-locked');
    clearLines();
    spawnPiece();
  }

  // --- Line clearing ---
  function clearLines() {
    const cleared = [];
    for (let r = window.ROWS - 1; r >= 0; r--) {
      if (gs.board[r].every(cell => cell !== null)) {
        cleared.push(r);
      }
    }
    if (cleared.length === 0) return;

    // Remove cleared rows and add empty ones at top
    for (const r of cleared) {
      gs.board.splice(r, 1);
      gs.board.unshift(Array(window.COLS).fill(null));
    }

    const count = cleared.length;
    const scoreTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
    gs.score += (scoreTable[count] || 0) * gs.level;
    gs.lines += count;

    ev.emit('lines-cleared', { lines: cleared, count: count });
    ev.emit('score-changed', { score: gs.score, level: gs.level, lines: gs.lines });

    // Level up every 10 lines
    const newLevel = Math.floor(gs.lines / 10) + 1;
    if (newLevel > gs.level) {
      gs.level = newLevel;
      gs.dropInterval = Math.max(100, 1000 - (gs.level - 1) * 75);
      ev.emit('level-up', { level: gs.level });
    }
  }

  // --- Game controls ---
  function startGame() {
    gs.board = window.createEmptyBoard();
    gs.score = 0;
    gs.level = 1;
    gs.lines = 0;
    gs.gameOver = false;
    gs.paused = false;
    gs.started = true;
    gs.dropInterval = 1000;
    gs.currentPiece = null;
    gs.nextPiece = null;
    bag = [];
    dropTimer = 0;
    spawnPiece();
    ev.emit('game-start');
    ev.emit('score-changed', { score: gs.score, level: gs.level, lines: gs.lines });
  }

  function togglePause() {
    if (!gs.started || gs.gameOver) return;
    gs.paused = !gs.paused;
    ev.emit('game-pause', { paused: gs.paused });
  }

  function restart() {
    startGame();
  }

  // --- Public API ---
  return {
    init() {
      ev.on('input-left', moveLeft);
      ev.on('input-right', moveRight);
      ev.on('input-down', moveDown);
      ev.on('input-rotate', rotate);
      ev.on('input-drop', hardDrop);
      ev.on('input-pause', togglePause);
      ev.on('input-start', startGame);
      ev.on('request-restart', restart);
    },
    update(dt) {
      if (!gs.currentPiece || gs.gameOver || gs.paused) return;
      dropTimer += dt;
      if (dropTimer >= gs.dropInterval) {
        gs.currentPiece.y++;
        if (!isValid(gs.currentPiece)) {
          gs.currentPiece.y--;
          lockPiece();
        } else {
          ev.emit('piece-moved');
        }
        dropTimer = 0;
      }
    }
  };
})();