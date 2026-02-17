Take screenshots of the Tetris game for the README. Write a temporary Node.js script `take-screenshots.mjs` that uses Playwright to capture two screenshots, then run it with `node take-screenshots.mjs` and delete the script afterward.

## Requirements

Install `playwright` if not already available (use `npx playwright install chromium` if needed).

## Script Details

The script should use `playwright` (import from `playwright`) to launch a Chromium browser and capture two screenshots.

### Common Setup

- Launch Chromium (non-headless is fine, or headless — either works)
- Viewport: `1280 × 720` with `deviceScaleFactor: 2` (produces 2560×1440 retina images)
- Navigate to the game using a `file://` URL pointing to `index.html` in the current working directory (use `path.resolve('index.html')` and convert to a file URL)
- Wait for the page to fully load

### Screenshot 1: Start Screen (`screenshot.png`)

Capture the game at the initial start screen — the overlay showing "TETRIS / Press Enter or Tap to Start" should be visible. Just take the screenshot immediately after the page loads.

### Screenshot 2: Gameplay (`gameplay.png`)

After capturing the start screen:

1. Press Enter to start the game
2. Wait briefly for the game to initialize (~500ms)
3. Use `page.evaluate()` to automate real gameplay — an AI places ~30 pieces into columns 0–8, leaving column 9 as a well, then positions an I-piece above the well:

```javascript
// Inside page.evaluate():
const gs = window.gameState;
const TETROMINOES = window.TETROMINOES;
const ROWS = window.ROWS;
const COLS = window.COLS;

// Freeze gravity so pieces don't fall on their own
gs.dropInterval = 999999;

// --- AI helper functions ---

// Simulate dropping a shape at (x) onto a board copy, return landing y
function simDrop(board, shape, x) {
  for (let y = 0; y < ROWS; y++) {
    for (const [r, c] of shape) {
      const row = y + r, col = x + c;
      if (row >= ROWS || col < 0 || col >= COLS) return y - 1;
      if (board[row][col] !== null) return y - 1;
    }
  }
  return ROWS - 1 - Math.max(...shape.map(s => s[0]));
}

// Score a board state (cols 0-8 only)
function scoreBoard(board) {
  let holes = 0, aggHeight = 0, bumpiness = 0, fullRows = 0;
  const heights = [];
  for (let c = 0; c < 9; c++) {
    let h = 0;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== null) { h = ROWS - r; break; }
    }
    heights.push(h);
    aggHeight += h;
    // Count holes in this column
    let foundBlock = false;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== null) foundBlock = true;
      else if (foundBlock) holes++;
    }
  }
  for (let i = 0; i < heights.length - 1; i++) {
    bumpiness += Math.abs(heights[i] - heights[i + 1]);
  }
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) { full = false; break; }
    }
    if (full) fullRows++;
  }
  return holes * -7.0 + bumpiness * -1.8 + aggHeight * -0.5 + fullRows * 10.0;
}

// Find best (rotation, x) for a piece type, placing only in cols 0-8
function findBest(board, pieceType) {
  const def = TETROMINOES[pieceType];
  let bestScore = -Infinity, bestRot = 0, bestX = 0, bestY = 0, bestShape = def.shapes[0];
  for (let rot = 0; rot < def.shapes.length; rot++) {
    const shape = def.shapes[rot];
    const minC = Math.min(...shape.map(s => s[1]));
    const maxC = Math.max(...shape.map(s => s[1]));
    // x range: piece cells must stay within cols 0-8
    for (let x = -minC; x <= 8 - maxC; x++) {
      const y = simDrop(board, shape, x);
      if (y < 0) continue;
      // Verify all cells are in bounds
      let valid = true;
      for (const [r, c] of shape) {
        if (y + r < 0 || y + r >= ROWS) { valid = false; break; }
      }
      if (!valid) continue;
      // Place on board copy and score
      const copy = board.map(row => [...row]);
      for (const [r, c] of shape) {
        copy[y + r][x + c] = def.color;
      }
      const s = scoreBoard(copy);
      if (s > bestScore) {
        bestScore = s; bestRot = rot; bestX = x; bestY = y; bestShape = shape;
      }
    }
  }
  return { rot: bestRot, x: bestX, y: bestY, shape: bestShape };
}

// --- AI play loop ---
const maxPieces = 35;
const targetFullRows = 5;
for (let i = 0; i < maxPieces; i++) {
  if (!gs.currentPiece || gs.gameOver) break;

  // Check if we have enough full rows (cols 0-8)
  let fullCount = 0;
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < 9; c++) {
      if (gs.board[r][c] === null) { full = false; break; }
    }
    if (full) fullCount++;
  }
  if (fullCount >= targetFullRows) break;

  const best = findBest(gs.board, gs.currentPiece.type);
  gs.currentPiece.rotation = best.rot;
  gs.currentPiece.shape = best.shape;
  gs.currentPiece.x = best.x;
  // Hard drop locks the piece and spawns the next one (synchronous)
  window.events.emit('input-drop');
}

// Now set up the final scene: I-piece hovering over the well
// First, set nextPiece to I so it spawns after we drop the current piece
const iDef = TETROMINOES['I'];
gs.nextPiece = { type: 'I', rotation: 0, shape: iDef.shapes[0], color: iDef.color };
// Drop the current piece to trigger I-piece spawn
window.events.emit('input-drop');

// Position the I-piece vertically over column 9
if (gs.currentPiece && gs.currentPiece.type === 'I') {
  gs.currentPiece.rotation = 1;
  gs.currentPiece.shape = iDef.shapes[1]; // vertical: [[0,0],[1,0],[2,0],[3,0]]
  gs.currentPiece.x = 9;
  gs.currentPiece.y = 2;
}

// Set next piece to T for the preview panel
const tDef = TETROMINOES['T'];
gs.nextPiece = { type: 'T', rotation: 0, shape: tDef.shapes[0], color: tDef.color };

// Pause so nothing moves during screenshot
gs.paused = true;

// Set nice score/level display
gs.score = 52300;
gs.level = 11;
gs.lines = 100;

// Update UI
window.events.emit('score-changed', { score: gs.score, level: gs.level, lines: gs.lines });
if (window.renderer && window.renderer.draw) window.renderer.draw();
if (window.ui && window.ui.update) window.ui.update();
```

4. Wait ~200ms for rendering to complete
5. Take the screenshot as `gameplay.png`

### Cleanup

- Close the browser
- The script should exit cleanly

## After Running

After the script runs successfully, delete `take-screenshots.mjs`. Verify that both `screenshot.png` and `gameplay.png` exist and report their dimensions/file sizes.
