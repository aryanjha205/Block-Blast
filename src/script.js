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
import { createGameOverModal, showHowToPlay, showModal } from "./modal.js";
import "./ads.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let GAME_GRID = Array.from({ length: GRID_SIZE }, () =>
  Array(GRID_SIZE).fill(0),
);

let score = 0;
let combo = 0;
let gameOver = false;
let bestScore = Math.max(400, parseInt(localStorage.getItem("blockBlastBest") || "0", 10));

const scoreElement = document.getElementById("score");
const comboElement = document.getElementById("combo");
const bestScoreElement = document.getElementById("bestScore");
const settingsButton = document.getElementById("settingsButton");
const settingsMenu = document.getElementById("settingsMenu");
const settingsHelp = document.getElementById("settingsHelp");
const settingsReset = document.getElementById("settingsReset");

const TRAY_Y = 700;
const TRAY_BLOCK_SIZE = 36;
const TOTAL_BLOCKS = 3;
const BLOCK_SPACING = 171;
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
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (activeBlock) {
    activeBlock.x = mouse.x - offsetX;
    activeBlock.y = mouse.y - offsetY;
  }
});

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (!handleCanvasControl(x, y)) pickBlock(x, y);
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
  if (!handleCanvasControl(x, y)) pickBlock(x, y);
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

settingsButton.addEventListener("click", () => {
  const isOpen = !settingsMenu.hidden;
  settingsMenu.hidden = isOpen;
  settingsButton.setAttribute("aria-expanded", String(!isOpen));
});

settingsHelp.addEventListener("click", () => {
  settingsMenu.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
  showHowToPlay();
});

settingsReset.addEventListener("click", () => {
  settingsMenu.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
  resetGame();
});

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

function handleCanvasControl(x, y) {
  // Help icon in the top-left of the game panel.
  if (x >= 35 && x <= 130 && y >= 20 && y <= 105) {
    showHowToPlay();
    return true;
  }
  // Reset icon in the top-right of the game panel.
  if (x >= 470 && x <= 565 && y >= 20 && y <= 105) {
    resetGame();
    return true;
  }
  return false;
}

createGameOverModal({
  onRestart: resetGame,
});

// ─── Game Loop ──────────────────────────────────────────────────────────────

function gameLoop() {
  drawGrid(ctx, canvas, GAME_GRID);
  drawGameHeader();
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

function drawGameHeader() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#13c969";
  ctx.font = "900 34px Outfit, sans-serif";
  ctx.fillText("?", 82, 60);
  ctx.font = "900 31px Outfit, sans-serif";
  ctx.fillText("↻", 518, 60);

  ctx.fillStyle = "#71887a";
  ctx.font = "700 13px Outfit, sans-serif";
  ctx.fillText("How to Play", 82, 108);
  ctx.fillText("Reset", 518, 108);

  // Lay out the title row as one measured visual group, then center the score below it.
  const scoreLabel = "Best Score";
  const scoreCenter = 300;
  const crownWidth = 30;
  const crownGap = 8;
  ctx.font = "800 19px Outfit, sans-serif";
  const titleWidth = ctx.measureText(scoreLabel).width;
  const groupLeft = scoreCenter - (crownWidth + crownGap + titleWidth) / 2;

  ctx.textAlign = "left";
  ctx.font = "27px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  ctx.fillText("👑", groupLeft, 61);
  ctx.fillStyle = "#728378";
  ctx.font = "800 19px Outfit, sans-serif";
  ctx.fillText(scoreLabel, groupLeft + crownWidth + crownGap, 61);
  ctx.textAlign = "center";
  ctx.fillStyle = "#10c962";
  ctx.font = "900 47px Outfit, sans-serif";
  ctx.fillText(String(Math.max(bestScore, 400)), 300, 100);
  ctx.restore();
}

gameLoop();
