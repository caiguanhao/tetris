// renderer.js — Canvas rendering (teammate: renderer)
// Handles: grid drawing, current piece, ghost piece, locked blocks, animations
window.renderer = (function () {
  let ctx = null;
  let flashRows = [];
  let flashTimer = 0;
  const FLASH_DURATION = 150; // ms

  function init(canvas) {
    ctx = canvas.getContext('2d');
    // Listen for line clears to trigger flash
    window.events.on('lines-cleared', function (data) {
      flashRows = data.lines.slice();
      flashTimer = FLASH_DURATION;
    });
  }

  function draw() {
    if (!ctx) return;
    var state = window.gameState;
    var w = COLS * CELL_SIZE;
    var h = ROWS * CELL_SIZE;

    // Update flash timer
    if (flashTimer > 0) {
      flashTimer -= 16; // approximate frame time
      if (flashTimer <= 0) {
        flashTimer = 0;
        flashRows = [];
      }
    }

    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Draw grid lines
    drawGrid(w, h);

    // Draw locked blocks
    drawBoard(state.board);

    // Draw ghost piece
    if (state.currentPiece && state.started && !state.gameOver) {
      drawGhostPiece(state);
    }

    // Draw current piece
    if (state.currentPiece && state.started) {
      drawPiece(state.currentPiece);
    }

    // Draw flash overlay on cleared rows
    if (flashTimer > 0 && flashRows.length > 0) {
      var alpha = flashTimer / FLASH_DURATION;
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
      for (var i = 0; i < flashRows.length; i++) {
        ctx.fillRect(0, flashRows[i] * CELL_SIZE, w, CELL_SIZE);
      }
    }

  }

  function drawGrid(w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (var x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, h);
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(w, y * CELL_SIZE);
    }
    ctx.stroke();
  }

  function drawCell(x, y, color) {
    var px = x * CELL_SIZE;
    var py = y * CELL_SIZE;
    var s = CELL_SIZE;
    // Main fill
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
    // Highlight (top-left bevel)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(px + 1, py + 1, s - 2, 2);
    ctx.fillRect(px + 1, py + 1, 2, s - 2);
    // Shadow (bottom-right bevel)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(px + 1, py + s - 3, s - 2, 2);
    ctx.fillRect(px + s - 3, py + 1, 2, s - 2);
  }

  function drawBoard(board) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawCell(c, r, board[r][c]);
        }
      }
    }
  }

  function drawPiece(piece) {
    var shape = piece.shape;
    for (var i = 0; i < shape.length; i++) {
      var row = piece.y + shape[i][0];
      var col = piece.x + shape[i][1];
      if (row >= 0) {
        drawCell(col, row, piece.color);
      }
    }
  }

  function getGhostY(state) {
    var piece = state.currentPiece;
    var ghostY = piece.y;
    while (true) {
      var nextY = ghostY + 1;
      if (collides(state.board, piece.shape, piece.x, nextY)) break;
      ghostY = nextY;
    }
    return ghostY;
  }

  function collides(board, shape, px, py) {
    for (var i = 0; i < shape.length; i++) {
      var r = py + shape[i][0];
      var c = px + shape[i][1];
      if (c < 0 || c >= COLS || r >= ROWS) return true;
      if (r >= 0 && board[r][c]) return true;
    }
    return false;
  }

  function drawGhostPiece(state) {
    var piece = state.currentPiece;
    var ghostY = getGhostY(state);
    if (ghostY === piece.y) return;
    var shape = piece.shape;
    ctx.globalAlpha = 0.25;
    for (var i = 0; i < shape.length; i++) {
      var row = ghostY + shape[i][0];
      var col = piece.x + shape[i][1];
      if (row >= 0) {
        drawCell(col, row, piece.color);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  return { init: init, draw: draw };
})();
