import {
  drawGrid,
  drawBlock,
  getGridOffset,
  GRID_SIZE,
  CELL_SIZE,
  drawGhostBlock,
  blockCollision,
  canPlaceBlockAtPosition,
  findBestGridPlacement,
  checkAndClearLines,
  canPlaceAnyBlock,
  drawTray,
  createTrayBlocks,
} from "./gameFunctions.js";
import { BLOCK_SHAPES } from "./blocks.js";
import { createGameOverModal, showModal } from "./modal.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let GAME_GRID = Array.from({ length: GRID_SIZE }, () =>
  Array(GRID_SIZE).fill(0),
);

let score = 0;
let combo = 0;
let gameOver = false;
let bestScore = parseInt(localStorage.getItem("blockBlastBest") || "0", 10);

const scoreElement = document.getElementById("score");
const comboElement = document.getElementById("combo");
const bestScoreElement = document.getElementById("bestScore");

const TRAY_Y = canvas.height - 120;
const TRAY_BLOCK_SIZE = 30;
const TOTAL_BLOCKS = 3;
const BLOCK_SPACING = 120;
let availableBlocks = [];

let activeBlock = null;
let offsetX = 0;
let offsetY = 0;

let mouse = { x: 0, y: 0 };

// Initialize game
createTrayBlocks({
  availableBlocks,
  canvas,
  TRAY_Y,
  TRAY_BLOCK_SIZE,
  TOTAL_BLOCKS,
  BLOCK_SPACING,
  BLOCK_SHAPES,
});
updateDisplay();

// ─── Mouse Events ──────────────────────────────────────────────────────────

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  if (activeBlock) {
    activeBlock.x = mouse.x - offsetX;
    activeBlock.y = mouse.y - offsetY;
  }
});

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  pickBlock(x, y);
});

canvas.addEventListener("mouseup", () => {
  dropBlock();
});

// ─── Touch Events ──────────────────────────────────────────────────────────

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  pickBlock(x, y);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!activeBlock) return;
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  mouse.x = x;
  mouse.y = y;
  activeBlock.x = x - offsetX;
  activeBlock.y = y - offsetY;
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  dropBlock();
}, { passive: false });

// ─── Shared Pick / Drop Logic ───────────────────────────────────────────────

function pickBlock(x, y) {
  for (let i = 0; i < availableBlocks.length; i++) {
    const block = availableBlocks[i];
    if (block.active && blockCollision(x, y, block, TRAY_BLOCK_SIZE)) {
      activeBlock = {
        shape: block.shape,
        color: block.color,
        active: true,
        originalIndex: i,
        x: x - offsetX,
        y: y - offsetY,
        originalX: block.x,
        originalY: block.y,
      };

      offsetX = x - block.x;
      offsetY = y - block.y;
      break;
    }
  }
}

function dropBlock() {
  if (!activeBlock) return;

  const placement = findBestGridPlacement({
    canvas,
    grid: GAME_GRID,
    block: activeBlock,
    offsetX,
    offsetY,
    blockX: activeBlock.x,
    blockY: activeBlock.y,
  });

  if (placement.canPlace) {
    // Place block on grid
    for (let y = 0; y < activeBlock.shape.length; y++) {
      for (let x = 0; x < activeBlock.shape[y].length; x++) {
        if (activeBlock.shape[y][x]) {
          GAME_GRID[placement.gridY + y][placement.gridX + x] =
            activeBlock.color;
        }
      }
    }

    // Remove the used block from availableBlocks
    availableBlocks = availableBlocks.filter(
      (block, index) => index !== activeBlock.originalIndex,
    );

    // Check and clear completed lines
    const linesCleared = checkAndClearLines(GAME_GRID);

    // Update score based on cleared lines
    updateScore(linesCleared);

    if (availableBlocks.length === 0) {
      createTrayBlocks({
        availableBlocks,
        canvas,
        TRAY_Y,
        TRAY_BLOCK_SIZE,
        TOTAL_BLOCKS,
        BLOCK_SPACING,
        BLOCK_SHAPES,
      });
    }

    // Check if game is over
    if (
      !canPlaceAnyBlock({
        grid: GAME_GRID,
        availableBlocks,
      })
    ) {
      gameOver = true;
      setTimeout(() => {
        showModal(score);
      }, 100);
    }
  } else {
    const originalBlock = availableBlocks[activeBlock.originalIndex];
    if (originalBlock) {
      originalBlock.x = activeBlock.originalX;
      originalBlock.y = activeBlock.originalY;
    }
  }

  activeBlock = null;
}

// ─── Score & Display ────────────────────────────────────────────────────────

function updateScore(linesCleared) {
  if (linesCleared > 0) {
    combo++;
    score += linesCleared * 100 * combo;
  } else {
    combo = 0;
  }

  // Update best score
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("blockBlastBest", bestScore);
  }

  updateDisplay();
  pulseScore();
}

function pulseScore() {
  const input = document.getElementById("score");
  if (!input) return;
  input.classList.remove("score-pulse");
  void input.offsetWidth; // force reflow to restart animation
  input.classList.add("score-pulse");
}

function updateDisplay() {
  scoreElement.value = score;
  comboElement.value = combo;
  bestScoreElement.value = bestScore;
}

// ─── Reset ──────────────────────────────────────────────────────────────────

function resetGame() {
  GAME_GRID = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

  score = 0;
  combo = 0;
  gameOver = false;
  availableBlocks.length = 0;

  createTrayBlocks({
    availableBlocks,
    canvas,
    TRAY_Y,
    TRAY_BLOCK_SIZE,
    TOTAL_BLOCKS,
    BLOCK_SPACING,
    BLOCK_SHAPES,
  });

  updateDisplay();
}

createGameOverModal({
  onRestart: resetGame,
});

// ─── Game Loop ──────────────────────────────────────────────────────────────

function gameLoop() {
  drawGrid(ctx, canvas, GAME_GRID);
  drawTray(ctx, availableBlocks, TRAY_BLOCK_SIZE);

  if (activeBlock) {
    drawBlock(
      ctx,
      activeBlock.shape,
      activeBlock.x,
      activeBlock.y,
      TRAY_BLOCK_SIZE,
      0.7,
      activeBlock.color,
    );
    const placement = findBestGridPlacement({
      canvas,
      grid: GAME_GRID,
      block: activeBlock,
      offsetX,
      offsetY,
      blockX: activeBlock.x,
      blockY: activeBlock.y,
    });
    if (placement.canPlace) {
      drawGhostBlock(
        ctx,
        activeBlock.shape,
        placement.gridX,
        placement.gridY,
        canvas,
        0.3,
        activeBlock.color,
      );
    }
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
