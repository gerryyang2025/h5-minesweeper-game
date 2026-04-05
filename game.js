(function () {
  "use strict";

  const DIFFICULTY = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
  };

  const LEADERBOARD_KEY = "minesweeper_leaderboard";
  const LEADERBOARD_LEVELS = ["beginner", "intermediate", "expert"];

  function emptyLeaderboardData() {
    return { beginner: [], intermediate: [], expert: [] };
  }

  function getLeaderboardData() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return emptyLeaderboardData();
      const d = JSON.parse(raw);
      const out = emptyLeaderboardData();
      for (const k of LEADERBOARD_LEVELS) {
        out[k] = Array.isArray(d[k]) ? d[k] : [];
      }
      return out;
    } catch {
      return emptyLeaderboardData();
    }
  }

  function saveWinToLeaderboard(timeSeconds, difficultyKey) {
    if (!LEADERBOARD_LEVELS.includes(difficultyKey)) return;
    const data = getLeaderboardData();
    data[difficultyKey].push({
      time: Math.max(0, Math.min(999, timeSeconds | 0)),
      date: new Date().toISOString(),
    });
    data[difficultyKey].sort((a, b) => a.time - b.time);
    data[difficultyKey] = data[difficultyKey].slice(0, 10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
  }

  let config = { ...DIFFICULTY.beginner };
  let cells = [];
  let minesPlaced = false;
  let gameStatus = "idle";
  let timerId = null;
  let seconds = 0;
  let longPressTimer = null;
  let longPressFired = false;
  let pointerDown = null;
  let interactionMode = "reveal";

  const boardEl = document.getElementById("board");
  const boardOuter = document.getElementById("board-outer");
  const mineCountEl = document.getElementById("mine-count");
  const timerEl = document.getElementById("timer");
  const faceBtn = document.getElementById("face-btn");
  const difficultySelect = document.getElementById("difficulty");
  const musicBtn = document.getElementById("musicBtn");
  const modeButtons = document.querySelectorAll("[data-mode]");

  const BG_MUSIC_SRC = "audio/game_mario2.mp3";
  let bgMusicAudio = null;
  let isMusicPlaying = true;

  const NS = "http://www.w3.org/2000/svg";

  function ensureBgMusic() {
    if (bgMusicAudio) return;
    bgMusicAudio = new Audio(BG_MUSIC_SRC);
    bgMusicAudio.loop = true;
    bgMusicAudio.volume = 0.3;
    bgMusicAudio.preload = "auto";
  }

  function syncMusicButton() {
    if (!musicBtn) return;
    musicBtn.classList.toggle("leaderboard-link--music-on", isMusicPlaying);
    musicBtn.setAttribute("aria-pressed", isMusicPlaying ? "true" : "false");
  }

  function pauseBackgroundMusic() {
    if (bgMusicAudio) bgMusicAudio.pause();
  }

  function toggleMusic() {
    ensureBgMusic();
    isMusicPlaying = !isMusicPlaying;
    if (isMusicPlaying) {
      bgMusicAudio.play().catch(() => {});
    } else {
      bgMusicAudio.pause();
    }
    syncMusicButton();
  }

  function tryPlayMusicIfOn() {
    ensureBgMusic();
    if (isMusicPlaying) {
      return bgMusicAudio.play().catch(() => {});
    }
    return Promise.resolve();
  }

  function onFirstPointerOutsideMusic(e) {
    if (e.target.closest("#musicBtn")) return;
    tryPlayMusicIfOn();
    document.removeEventListener("pointerdown", onFirstPointerOutsideMusic, true);
  }

  window.addEventListener("load", () => {
    tryPlayMusicIfOn();
  });

  document.addEventListener("pointerdown", onFirstPointerOutsideMusic, true);

  if (musicBtn) {
    musicBtn.addEventListener("click", () => {
      toggleMusic();
    });
  }

  function useModeBar() {
    return window.matchMedia("(max-width: 899px), (hover: none), (pointer: coarse)").matches;
  }

  function syncModeButtons() {
    modeButtons.forEach((btn) => {
      btn.classList.toggle("mode-btn--active", btn.dataset.mode === interactionMode);
    });
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      interactionMode = btn.dataset.mode || "reveal";
      syncModeButtons();
    });
  });

  function idx(r, c) {
    return r * config.cols + c;
  }

  function inBounds(r, c) {
    return r >= 0 && r < config.rows && c >= 0 && c < config.cols;
  }

  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) out.push([nr, nc]);
      }
    }
    return out;
  }

  function excludedFirstArea(fr, fc) {
    const set = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = fr + dr;
        const c = fc + dc;
        if (inBounds(r, c)) set.add(idx(r, c));
      }
    }
    return set;
  }

  function placeMines(safeR, safeC) {
    const exclude = excludedFirstArea(safeR, safeC);
    const pool = [];
    for (let i = 0; i < config.rows * config.cols; i++) {
      if (!exclude.has(i)) pool.push(i);
    }
    for (let m = 0; m < config.mines; m++) {
      const j = m + Math.floor(Math.random() * (pool.length - m));
      const t = pool[m];
      pool[m] = pool[j];
      pool[j] = t;
    }
    for (let m = 0; m < config.mines; m++) {
      cells[pool[m]].isMine = true;
    }
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const i = idx(r, c);
        if (cells[i].isMine) {
          cells[i].adjacent = 0;
          continue;
        }
        let n = 0;
        for (const [nr, nc] of neighbors(r, c)) {
          if (cells[idx(nr, nc)].isMine) n++;
        }
        cells[i].adjacent = n;
      }
    }
    minesPlaced = true;
  }

  function countFlagsAround(r, c) {
    let n = 0;
    for (const [nr, nc] of neighbors(r, c)) {
      if (cells[idx(nr, nc)].mark === "flag") n++;
    }
    return n;
  }

  function reveal(r, c) {
    if (gameStatus === "won" || gameStatus === "lost") return;
    const cell = cells[idx(r, c)];
    if (cell.revealed) return;
    if (cell.mark === "flag") return;

    if (!minesPlaced) {
      placeMines(r, c);
      gameStatus = "playing";
      startTimer();
    }

    if (cell.isMine) {
      cell.revealed = true;
      gameOver(false, r, c);
      return;
    }

    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const i = idx(cr, cc);
      const cur = cells[i];
      if (cur.revealed || cur.mark === "flag") continue;
      if (cur.isMine) continue;
      cur.revealed = true;
      cur.mark = "none";
      if (cur.adjacent === 0) {
        for (const [nr, nc] of neighbors(cr, cc)) {
          const ni = idx(nr, nc);
          if (!cells[ni].revealed && cells[ni].mark !== "flag") stack.push([nr, nc]);
        }
      }
    }

    if (checkWin()) {
      gameOver(true);
    }
    render();
  }

  function chord(r, c) {
    if (gameStatus !== "playing") return;
    const cell = cells[idx(r, c)];
    if (!cell.revealed || cell.adjacent === 0) return;
    if (countFlagsAround(r, c) !== cell.adjacent) return;

    let hitMine = false;
    let hitR = -1;
    let hitC = -1;

    for (const [nr, nc] of neighbors(r, c)) {
      const n = cells[idx(nr, nc)];
      if (n.revealed || n.mark === "flag") continue;
      if (n.isMine) {
        hitMine = true;
        hitR = nr;
        hitC = nc;
        break;
      }
    }

    if (hitMine) {
      cells[idx(hitR, hitC)].revealed = true;
      gameOver(false, hitR, hitC);
      return;
    }

    const toOpen = [];
    for (const [nr, nc] of neighbors(r, c)) {
      const n = cells[idx(nr, nc)];
      if (!n.revealed && n.mark !== "flag") toOpen.push([nr, nc]);
    }

    for (const [tr, tc] of toOpen) {
      reveal(tr, tc);
      if (gameStatus === "lost") return;
    }
  }

  function cycleMark(r, c) {
    if (gameStatus === "won" || gameStatus === "lost") return;
    const cell = cells[idx(r, c)];
    if (cell.revealed) return;
    const order = ["none", "flag", "question"];
    const cur = order.indexOf(cell.mark);
    cell.mark = order[(cur + 1) % order.length];
    render();
  }

  function checkWin() {
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i].isMine && !cells[i].revealed) return false;
    }
    return true;
  }

  function gameOver(won, hitR, hitC) {
    pauseBackgroundMusic();
    stopTimer();
    gameStatus = won ? "won" : "lost";
    setFace(won ? "win" : "dead");

    if (won) {
      saveWinToLeaderboard(seconds, difficultySelect.value);
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].isMine && cells[i].mark !== "flag") cells[i].mark = "flag";
      }
    } else {
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].isMine) cells[i].revealed = true;
      }
    }

    mineCountEl.classList.toggle("mines-zero-highlight", won || flagCount() === config.mines);
    render(hitR, hitC);
  }

  function flagCount() {
    let n = 0;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].mark === "flag") n++;
    }
    return n;
  }

  function updateHud() {
    const remaining = config.mines - flagCount();
    const s = remaining < 0 ? "-" + String(-remaining).padStart(2, "0") : String(remaining).padStart(3, "0");
    mineCountEl.textContent = s.slice(-3);
    mineCountEl.classList.toggle("mines-zero-highlight", remaining === 0 && gameStatus === "playing");
    timerEl.textContent = String(seconds).padStart(3, "0").slice(-3);
  }

  function setFace(state) {
    faceBtn.classList.remove("face-btn--smile", "face-btn--worried", "face-btn--dead", "face-btn--win");
    faceBtn.classList.add("face-btn--" + state);
  }

  function faceForPlaying() {
    if (gameStatus === "lost") return "dead";
    if (gameStatus === "won") return "win";
    return "smile";
  }

  function startTimer() {
    if (timerId != null) return;
    seconds = 0;
    updateHud();
    timerId = window.setInterval(() => {
      seconds = Math.min(seconds + 1, 999);
      updateHud();
    }, 1000);
  }

  function stopTimer() {
    if (timerId != null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  let resizeTimer = null;
  function computeCellSize() {
    if (!boardOuter) return;
    const toolbar = document.querySelector(".toolbar");
    const controls = document.getElementById("mobile-controls");
    const footer = document.querySelector(".app-footer");
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const tH = toolbar ? toolbar.getBoundingClientRect().height : 0;
    const cEl = controls;
    let cH = 0;
    if (cEl) {
      const disp = window.getComputedStyle(cEl).display;
      cH = disp === "none" ? 0 : cEl.getBoundingClientRect().height;
    }
    const fH = footer ? footer.getBoundingClientRect().height : 0;
    const pad = 56;
    const maxW = Math.min(vw - 24, 920);
    const maxH = Math.max(120, vh - tH - cH - fH - pad);
    const innerW = Math.max(1, maxW - 40);
    const innerH = Math.max(1, maxH - 36);
    const w = Math.floor(innerW / config.cols);
    const h = Math.floor(innerH / config.rows);
    let size = Math.min(w, h);
    size = Math.max(22, Math.min(38, size));
    document.documentElement.style.setProperty("--cell-size", size + "px");
  }

  function scheduleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      computeCellSize();
    }, 80);
  }

  function resetGame() {
    stopTimer();
    seconds = 0;
    minesPlaced = false;
    gameStatus = "idle";
    longPressFired = false;
    pointerDown = null;
    interactionMode = "reveal";
    syncModeButtons();
    cells = Array.from({ length: config.rows * config.cols }, () => ({
      isMine: false,
      revealed: false,
      mark: "none",
      adjacent: 0,
    }));
    setFace("smile");
    mineCountEl.classList.remove("mines-zero-highlight");
    computeCellSize();
    buildBoardDom();
    updateHud();
    requestAnimationFrame(() => computeCellSize());
    if (isMusicPlaying && bgMusicAudio) {
      bgMusicAudio.play().catch(() => {});
    }
  }

  function buildBoardDom() {
    boardEl.style.gridTemplateColumns = `repeat(${config.cols}, var(--cell-size))`;
    boardEl.innerHTML = "";
    boardEl.setAttribute("aria-rowcount", String(config.rows));
    boardEl.setAttribute("aria-colcount", String(config.cols));

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "cell hidden";
        el.dataset.row = String(r);
        el.dataset.col = String(c);
        el.setAttribute("role", "gridcell");
        el.setAttribute("aria-label", `第 ${r + 1} 行第 ${c + 1} 列`);
        boardEl.appendChild(el);
      }
    }
    render();
  }

  function appendMineIcon(container, isHit) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("class", "mine-icon");
    svg.setAttribute("aria-hidden", "true");
    const body = document.createElementNS(NS, "circle");
    body.setAttribute("cx", "8");
    body.setAttribute("cy", "8");
    body.setAttribute("r", "4.2");
    body.setAttribute("fill", isHit ? "#ffffff" : "#000000");
    body.setAttribute("stroke", isHit ? "#cccccc" : "#333333");
    body.setAttribute("stroke-width", "0.6");
    svg.appendChild(body);
    const spikes = [
      [8, 0.5, 8, 4],
      [8, 12, 8, 15.5],
      [0.5, 8, 4, 8],
      [12, 8, 15.5, 8],
      [2.3, 2.3, 4.8, 4.8],
      [11.2, 11.2, 13.7, 13.7],
      [13.7, 2.3, 11.2, 4.8],
      [4.8, 11.2, 2.3, 13.7],
    ];
    spikes.forEach(([x1, y1, x2, y2]) => {
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", String(x1));
      ln.setAttribute("y1", String(y1));
      ln.setAttribute("x2", String(x2));
      ln.setAttribute("y2", String(y2));
      ln.setAttribute("stroke", isHit ? "#ffffff" : "#000000");
      ln.setAttribute("stroke-width", "1.2");
      ln.setAttribute("stroke-linecap", "round");
      svg.appendChild(ln);
    });
    container.appendChild(svg);
  }

  function render(hitR, hitC) {
    const ended = gameStatus === "won" || gameStatus === "lost";
    const children = boardEl.children;
    let k = 0;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cell = cells[idx(r, c)];
        const el = children[k++];
        el.className = "cell";
        el.replaceChildren();

        const wrongFlag = gameStatus === "lost" && cell.mark === "flag" && !cell.isMine;
        const showMine = cell.revealed && cell.isMine;
        const isHit = typeof hitR === "number" && r === hitR && c === hitC && cell.isMine;

        if (!cell.revealed) {
          el.classList.add("hidden");
          el.disabled = ended;
          if (cell.mark === "flag") {
            const f = document.createElement("span");
            f.className = "mark-flag";
            f.setAttribute("aria-hidden", "true");
            el.appendChild(f);
            if (wrongFlag) el.classList.add("mine-wrong");
          } else if (cell.mark === "question") {
            const q = document.createElement("span");
            q.className = "mark-question";
            q.textContent = "?";
            el.appendChild(q);
          }
        } else {
          el.classList.add("revealed");
          el.disabled = true;
          if (showMine) {
            el.classList.add(isHit ? "mine-hit" : "revealed");
            appendMineIcon(el, isHit);
          } else if (cell.adjacent > 0) {
            const span = document.createElement("span");
            span.textContent = String(cell.adjacent);
            span.className = `num-${cell.adjacent}`;
            el.appendChild(span);
          }
        }

        if (gameStatus === "won" && cell.isMine && cell.mark === "flag") {
          el.classList.add("flags-highlight");
        }
      }
    }
    updateHud();
  }

  function getCellFromEvent(target) {
    const btn = target.closest(".cell");
    if (!btn || !boardEl.contains(btn)) return null;
    const r = parseInt(btn.dataset.row, 10);
    const c = parseInt(btn.dataset.col, 10);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c, el: btn };
  }

  function clearLongPressTimer() {
    if (longPressTimer != null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  boardEl.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (!useModeBar()) {
      const pos = getCellFromEvent(e.target);
      if (!pos) return;
      cycleMark(pos.r, pos.c);
    }
  });

  boardEl.addEventListener("pointerdown", (e) => {
    const pos = getCellFromEvent(e.target);
    if (!pos) return;

    if (e.button === 1) {
      e.preventDefault();
      chord(pos.r, pos.c);
      return;
    }

    if (e.buttons === 3) {
      e.preventDefault();
      chord(pos.r, pos.c);
      return;
    }

    if (gameStatus === "lost" || gameStatus === "won") return;

    if (e.button === 2) return;

    if (e.button !== 0) return;

    const cell = cells[idx(pos.r, pos.c)];
    if (cell.revealed) {
      if (useModeBar() && interactionMode === "chord") {
        longPressFired = false;
        pointerDown = {
          r: pos.r,
          c: pos.c,
          x: e.clientX,
          y: e.clientY,
          id: e.pointerId,
        };
      }
      return;
    }

    const allowLongPress = useModeBar() && interactionMode === "reveal";
    const shouldWorry = !useModeBar() || interactionMode === "reveal";
    if (shouldWorry) setFace("worried");

    longPressFired = false;
    pointerDown = {
      r: pos.r,
      c: pos.c,
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
    };

    clearLongPressTimer();
    if (!allowLongPress) return;

    longPressTimer = window.setTimeout(() => {
      longPressFired = true;
      longPressTimer = null;
      cycleMark(pos.r, pos.c);
      if (gameStatus === "idle" || gameStatus === "playing") setFace("smile");
    }, 480);
  });

  boardEl.addEventListener("pointerup", (e) => {
    if (e.button !== 0) return;
    clearLongPressTimer();
    setFace(faceForPlaying());

    if (longPressFired) {
      longPressFired = false;
      pointerDown = null;
      return;
    }

    const pos = getCellFromEvent(e.target);
    if (!pointerDown || !pos) {
      pointerDown = null;
      return;
    }
    if (pos.r !== pointerDown.r || pos.c !== pointerDown.c) {
      pointerDown = null;
      return;
    }
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    pointerDown = null;
    if (dx * dx + dy * dy > 100) return;

    const cell = cells[idx(pos.r, pos.c)];
    const mode = useModeBar() ? interactionMode : "reveal";

    if (mode === "flag") {
      if (gameStatus === "won" || gameStatus === "lost") return;
      if (!cell.revealed) cycleMark(pos.r, pos.c);
      return;
    }

    if (mode === "chord") {
      if (gameStatus !== "playing") return;
      if (cell.revealed && cell.adjacent > 0) chord(pos.r, pos.c);
      return;
    }

    if (cell.mark === "flag") return;
    if (cell.mark === "question") {
      cell.mark = "none";
    }
    reveal(pos.r, pos.c);
  });

  boardEl.addEventListener("pointercancel", () => {
    clearLongPressTimer();
    pointerDown = null;
    setFace(faceForPlaying());
  });

  boardEl.addEventListener("pointerleave", (e) => {
    if (e.buttons === 0) {
      clearLongPressTimer();
      pointerDown = null;
      setFace(faceForPlaying());
    }
  });

  faceBtn.addEventListener("click", () => {
    resetGame();
  });

  difficultySelect.addEventListener("change", () => {
    const key = difficultySelect.value;
    config = { ...DIFFICULTY[key] };
    resetGame();
  });

  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);

  syncModeButtons();
  resetGame();
})();
