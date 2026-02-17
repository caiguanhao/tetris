# Tetris — Browser Game

Classic Tetris in pure HTML/CSS/JS. Canvas-based rendering, keyboard + touch controls, score/level system.

## Architecture

- `js/game.js` — Shared state, tetromino definitions, event bus, game loop (DO NOT EDIT)
- `js/engine.js` — Game logic (piece spawning, movement, rotation, collision, line clearing)
- `js/renderer.js` — Canvas drawing (grid, pieces, ghost piece, animations)
- `js/ui.js` — Input handling, DOM panels, overlays, screens

## Data Model

### Game State (`window.gameState`)
```
board: 2D array [ROWS][COLS] of null or color strings
currentPiece: { type, rotation, x, y, shape, color }
nextPiece: { type, rotation, shape, color }
score: number
level: number (starts at 1)
lines: number (total lines cleared)
gameOver: boolean
paused: boolean
started: boolean
dropInterval: number (ms between gravity drops)
```

### Tetromino Types
I, O, T, S, Z, J, L — each has 4 rotation states defined in `TETROMINOES`.

### Constants
- `COLS = 10`, `ROWS = 20`, `CELL_SIZE = 30`
- Canvas size: 300×600

## Event Bus (`window.events`)

Modules communicate ONLY through events. Never import or call another module directly.

### Input Events (emitted by ui.js)
- `input-left`, `input-right`, `input-down` — movement
- `input-rotate` — clockwise rotation
- `input-drop` — hard drop
- `input-pause` — toggle pause
- `input-start` — start game
- `request-restart` — restart after game over

### Game Events (emitted by engine.js)
- `piece-locked` — piece placed on board
- `piece-moved` — piece position changed
- `lines-cleared` — `{ lines: number[], count: number }`
- `score-changed` — `{ score, level, lines }`
- `level-up` — `{ level }`
- `game-over` — game ended
- `game-start` — game started
- `game-pause` — `{ paused: boolean }`
- `hard-drop` — hard drop happened

## Module Contracts

### engine.js — `window.engine`
Must expose:
- `init()` — set up event listeners, prepare initial state
- `update(dt)` — called every frame with delta time in ms; handle gravity, input

### renderer.js — `window.renderer`
Must expose:
- `init(canvas)` — get 2D context, set up
- `draw()` — called every frame; draw board, current piece, ghost piece

### ui.js — `window.ui`
Must expose:
- `init()` — bind keyboard/touch handlers, set up DOM references
- `update()` — called every frame; update score display, manage overlays

## Conventions
- All modules attach to `window` (no ES modules)
- Read `window.gameState` for current state
- Use `window.events.emit(name, data)` and `window.events.on(name, fn)`
- Engine is the ONLY module that writes to `gameState`
- Renderer reads `gameState` and draws to canvas
- UI reads `gameState` for display, emits input events

## Scoring
- 1 line: 100 × level
- 2 lines: 300 × level
- 3 lines: 500 × level
- 4 lines (Tetris): 800 × level
- Soft drop: 1 point per cell
- Hard drop: 2 points per cell

## Levels
- Level up every 10 lines
- Drop interval: `Math.max(100, 1000 - (level - 1) * 75)` ms
