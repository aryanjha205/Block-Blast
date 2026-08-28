let modalEl = null;
let helpModalEl = null;

export function createGameOverModal({ onRestart }) {
  if (modalEl) return;

  modalEl = document.createElement("div");
  modalEl.className = "modal-overlay";

  modalEl.innerHTML = `
    <div class="modal">
      <h2 class="modal-title">Game Over</h2>
      <p class="modal-score">
        Final Score: <span id="modalScore">0</span>
      </p>

      <button class="modal-button" id="restartBtn">
        Restart Game
      </button>
    </div>
  `;

  document.body.appendChild(modalEl);

  document.getElementById("restartBtn").addEventListener("click", () => {
    hideModal();
    onRestart();
  });
}

export function showModal(score) {
  if (!modalEl) return;
  document.getElementById("modalScore").textContent = score;
  modalEl.classList.add("active");
}

export function hideModal() {
  if (!modalEl) return;
  modalEl.classList.remove("active");
}

export function showHowToPlay() {
  if (!helpModalEl) {
    helpModalEl = document.createElement("div");
    helpModalEl.className = "modal-overlay help-overlay";
    helpModalEl.innerHTML = `
      <div class="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
        <h2 class="modal-title" id="helpTitle">How to Play</h2>
        <p class="help-copy">Drag a block from the tray onto the board. Fill a complete row or column to clear it and earn points.</p>
        <button class="modal-button" type="button" id="closeHelpBtn">Got it</button>
      </div>`;
    document.body.appendChild(helpModalEl);
    document.getElementById("closeHelpBtn").addEventListener("click", hideHowToPlay);
    helpModalEl.addEventListener("click", (event) => {
      if (event.target === helpModalEl) hideHowToPlay();
    });
  }
  helpModalEl.classList.add("active");
}

export function hideHowToPlay() {
  helpModalEl?.classList.remove("active");
}
