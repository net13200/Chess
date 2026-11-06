(() => {
  "use strict";

  const E = window.SugiChess;
  const { pieceSvg } = window.SugiPieces;
  const I18N = window.SugiI18n;
  const t = I18N.t;
  const pieceName = (ch) => t("pieces")[ch];
  const { PUZZLES, CATEGORIES } = window.SugiPuzzles;
  const $ = (id) => document.getElementById(id);

  // ---------- Storage (all optional: the app works without it) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("sugichess." + key); return v == null ? fallback : JSON.parse(v); }
      catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("sugichess." + key, JSON.stringify(value)); } catch (_) { /* ignore */ }
    },
    del(key) { try { localStorage.removeItem("sugichess." + key); } catch (_) { /* ignore */ } },
  };

  // ---------- Sound ----------
  const sound = {
    on: store.get("sound", true),
    ctx: null,
    tone(freq, start, dur, type, vol) {
      if (!this.on) return;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = this.ctx;
        if (ctx.state === "suspended") ctx.resume();
        const t = ctx.currentTime + start;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
      } catch (_) { /* audio not available */ }
    },
    move() { this.tone(330, 0, 0.09, "triangle", 0.22); this.tone(220, 0.03, 0.08, "sine", 0.12); },
    capture() { this.tone(520, 0, 0.08, "triangle", 0.2); this.tone(390, 0.07, 0.12, "triangle", 0.2); },
    check() { this.tone(880, 0, 0.12, "sine", 0.16); this.tone(1175, 0.12, 0.18, "sine", 0.16); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.12, 0.25, "triangle", 0.18)); },
    draw() { [523, 494, 523].forEach((f, i) => this.tone(f, i * 0.14, 0.2, "sine", 0.14)); },
    lose() { [392, 349, 311].forEach((f, i) => this.tone(f, i * 0.16, 0.24, "sine", 0.14)); },
    oops() { this.tone(260, 0, 0.14, "sine", 0.16); this.tone(196, 0.12, 0.2, "sine", 0.16); },
  };

  // ---------- AI worker (falls back to the main thread, e.g. when opened from file://) ----------
  let worker = null, workerSeq = 0;
  const pending = new Map();
  try {
    worker = new Worker("ai-worker.js");
    worker.onmessage = (e) => { const cb = pending.get(e.data.id); pending.delete(e.data.id); if (cb) cb(e.data.uci); };
    worker.onerror = () => { worker = null; for (const cb of pending.values()) cb(undefined); pending.clear(); };
  } catch (_) { worker = null; }

  function askEngine(kind, startFen, moves, level) {
    return new Promise((resolve) => {
      const local = () => setTimeout(() => {
        const c = new E.Chess(startFen);
        for (const u of moves) c.playUci(u);
        const m = kind === "hint" ? E.bestMove(c, { depth: 4, timeMs: 900 }).move : E.chooseMove(c, level);
        resolve(m ? E.uciOf(m) : null);
      }, 30);
      if (!worker) return local();
      const id = ++workerSeq;
      pending.set(id, (uci) => (uci === undefined ? local() : resolve(uci)));
      worker.postMessage({ id, kind, startFen, moves, level });
    });
  }

  // ---------- Screens ----------
  function show(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === "screen-" + name));
    window.scrollTo(0, 0);
    if (name === "home") renderHome();
    if (name === "practice") renderPractice();
  }

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (!go) return;
    const where = go.dataset.go;
    if (where === "friend") startGame({ mode: "friend" });
    else show(where);
  });

  // ---------- Home ----------
  $("hero-art").innerHTML = pieceSvg("w", "n") + pieceSvg("b", "q") + pieceSvg("w", "p");

  function renderHome() {
    const saved = store.get("game", null);
    const btn = $("btn-continue");
    btn.hidden = !saved;
    if (saved) {
      $("continue-detail").textContent = saved.mode === "computer"
        ? t("continueComputer", { name: levelLabel(saved.level) })
        : t("continueFriend");
    }
    const stars = store.get("stars", {});
    const solved = PUZZLES.filter((p) => stars[p.id]).length;
    $("riddle-progress").textContent = solved
      ? t("riddlesProgress", { n: solved, total: PUZZLES.length })
      : t("riddlesSub");
  }
  $("btn-continue").addEventListener("click", () => {
    const saved = store.get("game", null);
    if (saved) startGame(saved);
  });

  // ---------- Computer setup ----------
  const levelOf = (id) => {
    const l = E.LEVELS.find((x) => x.id === id) || E.LEVELS[1];
    return { ...l, name: t("level" + l.id), blurb: t("level" + l.id + "Blurb") };
  };
  const levelLabel = (id) => levelOf(id).name + " " + levelOf(id).emoji;
  let setupLevel = store.get("level", 1);
  let setupColor = store.get("color", "w");

  function renderSetup() {
    $("levels").innerHTML = E.LEVELS.map((x) => levelOf(x.id)).map((l) =>
      `<button class="level-btn" role="radio" data-level="${l.id}" aria-checked="${l.id === setupLevel}">` +
      `<span class="level-emoji" aria-hidden="true">${l.emoji}</span>` +
      `<span class="level-name">${l.name}</span>` +
      `<span class="level-dots" aria-label="${t("levelOf", { n: l.id, total: E.LEVELS.length })}">${"●".repeat(l.id)}${"○".repeat(E.LEVELS.length - l.id)}</span>` +
      `<small>${l.blurb}</small></button>`
    ).join("");
    document.querySelectorAll(".color-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color === setupColor)));
    document.querySelectorAll(".color-piece[data-piece]").forEach((el) => {
      el.innerHTML = pieceSvg(el.dataset.piece[0], el.dataset.piece[1]);
    });
  }
  $("levels").addEventListener("click", (e) => {
    const b = e.target.closest("[data-level]");
    if (!b) return;
    setupLevel = +b.dataset.level; store.set("level", setupLevel); renderSetup();
  });
  document.querySelector(".colors").addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]");
    if (!b) return;
    setupColor = b.dataset.color; store.set("color", setupColor); renderSetup();
  });
  $("btn-start").addEventListener("click", () => {
    const human = setupColor === "r" ? (Math.random() < 0.5 ? "w" : "b") : setupColor;
    startGame({ mode: "computer", level: setupLevel, human });
  });
  renderSetup();

  // ---------- Game state ----------
  const S = {
    mode: "friend",          // "friend" | "computer" | "puzzle"
    chess: null,
    startFen: E.START_FEN,
    moves: [],               // UCI moves from startFen
    sans: [],
    level: 2,
    human: "w",              // computer mode: the child's color
    flipped: false,
    selected: -1,
    targets: [],
    lastMove: null,
    hint: null,              // { from, to } squares to glow
    busy: false,             // computer thinking / riddle reply / animation
    token: 0,                // bumps on every new game to cancel stale async work
    over: false,
    puzzle: null,            // { p, index, step, mistakes, hints, solved }
  };

  const colorName = (c) => t(c === E.WHITE ? "white" : "black");
  const colorKey = (c) => (c === E.WHITE ? "w" : "b");
  const turnChar = () => (S.chess.turn === E.WHITE ? "w" : "b");

  function startGame(opts) {
    S.token++;
    S.mode = opts.mode;
    S.level = opts.level || 2;
    S.human = opts.human || "w";
    S.startFen = opts.startFen || E.START_FEN;
    S.chess = new E.Chess(S.startFen);
    S.moves = []; S.sans = [];
    S.selected = -1; S.targets = []; S.lastMove = null; S.hint = null;
    S.busy = false; S.over = false; S.puzzle = null;
    for (const u of opts.moves || []) {
      const m = S.chess.moveFromUci(u);
      if (!m) break;
      S.sans.push(E.sanOf(S.chess, m));
      S.chess.make(m);
      S.moves.push(u);
      S.lastMove = m;
    }
    S.flipped = opts.flipped !== undefined ? opts.flipped : S.mode === "computer" && S.human === "b";
    $("riddle-card").hidden = true;
    $("riddle-controls").hidden = true;
    $("game-controls").hidden = false;
    $("move-list").hidden = false;
    document.querySelector(".play").classList.remove("is-riddle");
    $("btn-flip").hidden = S.mode === "computer";
    setPlayTitle();
    show("play");
    renderAll();
    afterMove(null, true);
  }

  function saveGame() {
    if (S.mode === "puzzle") return;
    if (S.over || !S.moves.length) { store.del("game"); return; }
    store.set("game", { mode: S.mode, level: S.level, human: S.human, startFen: S.startFen, moves: S.moves, flipped: S.flipped });
  }

  const humanTurn = () =>
    !S.over && !S.busy && (S.mode !== "computer" || turnChar() === S.human) &&
    (S.mode !== "puzzle" || !S.puzzle.solved);

  // ---------- Board rendering ----------
  const boardEl = $("board");
  const squareEls = new Map();

  function buildBoard() {
    boardEl.innerHTML = "";
    squareEls.clear();
    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const el = document.createElement("div");
        el.className = "sq";
        el.setAttribute("role", "gridcell");
        boardEl.appendChild(el);
      }
    }
  }
  buildBoard();

  function squareAt(dr, dc) {
    return S.flipped ? (7 - dr) * 16 + (7 - dc) : dr * 16 + dc;
  }
  function displayPos(s) {
    const r = E.rowOf(s), f = E.fileOf(s);
    return S.flipped ? { dr: 7 - r, dc: 7 - f } : { dr: r, dc: f };
  }

  function squareLabel(name, p) {
    const ch = E.PIECE_CHARS[E.typeOf(p)];
    const c = E.colorOf(p) ? "b" : "w";
    const adj = t("colorAdj");
    const color = (ch === "q" && adj[c + "f"]) || adj[c];
    return t("squareLabel", { sq: name, color, piece: pieceName(ch) });
  }

  function renderBoard(anim) {
    const c = S.chess;
    const checkSq = c.inCheck() ? c.kings[c.turn >> 3] : -1;
    const els = boardEl.children;
    squareEls.clear();
    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const s = squareAt(dr, dc);
        const el = els[dr * 8 + dc];
        squareEls.set(s, el);
        el.dataset.sq = s;
        const r = E.rowOf(s), f = E.fileOf(s);
        const cls = ["sq", (r + f) % 2 ? "dark" : "light"];
        if (S.lastMove && (s === S.lastMove.from || s === S.lastMove.to)) cls.push("last");
        if (s === S.selected) cls.push("selected");
        const tgt = S.targets.find((m) => m.to === s);
        if (tgt) cls.push(c.board[s] || tgt.flag === E.FLAG_EP ? "target-cap" : "target");
        if (s === checkSq) cls.push("check");
        if (S.hint && (s === S.hint.from || s === S.hint.to)) cls.push(s === S.hint.from ? "hint-from" : "hint-to");
        el.className = cls.join(" ");
        const p = c.board[s];
        const name = E.sqName(s);
        el.setAttribute("aria-label", p ? squareLabel(name, p) : name);
        let html = "";
        if (p) {
          const color = E.colorOf(p) === E.WHITE ? "w" : "b";
          const mine = humanTurn() && color === turnChar();
          html += `<div class="piece${mine ? " movable" : ""}">${pieceSvg(color, E.PIECE_CHARS[E.typeOf(p)])}</div>`;
        }
        if (dc === 0) html += `<span class="coord coord-rank">${8 - r}</span>`;
        if (dr === 7) html += `<span class="coord coord-file">${"abcdefgh"[f]}</span>`;
        el.innerHTML = html;
      }
    }
    if (anim) animateMove(anim);
    updateLock();
  }

  function animateMove(m) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const slide = (from, to) => {
      const el = squareEls.get(to) && squareEls.get(to).querySelector(".piece");
      if (!el) return;
      const a = displayPos(from), b = displayPos(to);
      el.style.transition = "none";
      el.style.transform = `translate(${(a.dc - b.dc) * 100}%, ${(a.dr - b.dr) * 100}%)`;
      el.style.zIndex = 5;
      el.getBoundingClientRect();
      el.style.transition = "transform 0.28s cubic-bezier(.3,.7,.3,1)";
      el.style.transform = "";
      setTimeout(() => { el.style.zIndex = ""; }, 300);
    };
    slide(m.from, m.to);
    if (m.flag === E.FLAG_CASTLE) {
      const row = E.rowOf(m.from), kingside = E.fileOf(m.to) === 6;
      slide(row * 16 + (kingside ? 7 : 0), row * 16 + (kingside ? 5 : 3));
    }
  }

  const START_COUNT = { 1: 8, 2: 2, 3: 2, 4: 2, 5: 1 };
  function renderBars() {
    const c = S.chess;
    const count = { w: {}, b: {} };
    let mat = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const p = c.board[s];
      if (!p || E.typeOf(p) === E.KING) continue;
      const col = E.colorOf(p) === E.WHITE ? "w" : "b";
      count[col][E.typeOf(p)] = (count[col][E.typeOf(p)] || 0) + 1;
      mat += (col === "w" ? 1 : -1) * [0, 1, 3, 3, 5, 9][E.typeOf(p)];
    }
    // Pieces taken BY color x are the opponent's missing pieces.
    const takenBy = (x) => {
      const opp = x === "w" ? "b" : "w";
      let html = "";
      for (const t of [5, 4, 3, 2, 1]) {
        const n = Math.max(0, START_COUNT[t] - (count[opp][t] || 0));
        for (let i = 0; i < n; i++) html += `<span class="cap">${pieceSvg(opp, E.PIECE_CHARS[t])}</span>`;
      }
      return html;
    };
    const bottom = S.flipped ? "b" : "w";
    const fill = (bar, col) => {
      const el = $(bar);
      const isTurn = !S.over && turnChar() === col;
      el.classList.toggle("is-turn", isTurn);
      el.querySelector(".player-avatar").innerHTML = pieceSvg(col, "k");
      let name;
      if (S.mode === "computer") {
        const lv = levelOf(S.level);
        name = col === S.human ? t("you") : `${lv.name} ${lv.emoji}`;
      } else if (S.mode === "puzzle") {
        name = col === (S.puzzle.color) ? t("you") : colorName(col === "w" ? E.WHITE : E.BLACK);
      } else name = colorName(col === "w" ? E.WHITE : E.BLACK);
      el.querySelector(".player-name").textContent = name;
      const showCaps = S.mode !== "puzzle";
      el.querySelector(".captured").innerHTML = showCaps ? takenBy(col) : "";
      const adv = col === "w" ? mat : -mat;
      el.querySelector(".adv").textContent = showCaps && adv > 0 ? "+" + adv : "";
    };
    fill("bar-bottom", bottom);
    fill("bar-top", bottom === "w" ? "b" : "w");
  }

  function renderMoves() {
    const list = $("move-list");
    if (S.mode === "puzzle") { list.innerHTML = ""; return; }
    let html = "";
    const startBlack = S.startFen.split(" ")[1] === "b";
    const sans = startBlack ? ["…", ...S.sans] : S.sans;
    for (let i = 0; i < sans.length; i += 2) {
      html += `<li><span>${sans[i]}</span><span>${sans[i + 1] || ""}</span></li>`;
    }
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  }

  // Dim the "your piece" affordance while the computer or a riddle reply is moving,
  // without re-rendering (which would cut a piece's slide animation short).
  function updateLock() {
    boardEl.classList.toggle("locked", !humanTurn());
  }

  function renderAll(anim) {
    renderBoard(anim);
    renderBars();
    renderMoves();
    $("btn-undo").disabled = !S.moves.length || S.mode === "puzzle";
  }

  // ---------- Messages ----------
  const FACES = { happy: "😊", think: "🤔", wow: "🤩", oops: "😮", check: "😯", tie: "🤝", sad: "🥲", hint: "💡" };
  function say(text, mood) {
    $("bubble-text").textContent = text;
    $("bubble-face").textContent = FACES[mood] || FACES.happy;
    const b = $("bubble");
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  }


  function turnMessage() {
    const c = S.chess;
    const check = c.inCheck();
    if (S.mode === "computer") {
      if (turnChar() !== S.human) return say(t("thinking", { name: levelOf(S.level).name }), "think");
      return check ? say(t("checkYou"), "check") : say(t("yourTurn"), "happy");
    }
    const k = colorKey(c.turn);
    say(check ? t("check_" + k) : t("turn_" + k), check ? "check" : "happy");
  }

  // ---------- Input: tap or drag ----------
  let drag = null;

  function squareFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const sqEl = el && el.closest && el.closest(".sq");
    return sqEl && boardEl.contains(sqEl) ? +sqEl.dataset.sq : -1;
  }

  function select(s) {
    S.selected = s;
    S.targets = s >= 0 ? S.chess.legalMoves().filter((m) => m.from === s) : [];
    renderBoard();
  }

  function ownPieceAt(s) {
    const p = S.chess.board[s];
    return p && (E.colorOf(p) === E.WHITE ? "w" : "b") === turnChar();
  }

  function tryMoveTo(s) {
    let options = S.targets.filter((m) => m.to === s);
    // Tapping the king, then its own rook, castles toward that rook.
    if (!options.length && S.selected >= 0 && E.typeOf(S.chess.board[S.selected]) === E.KING && ownPieceAt(s) &&
        E.typeOf(S.chess.board[s]) === E.ROOK) {
      options = S.targets.filter((m) => m.flag === E.FLAG_CASTLE && (E.fileOf(m.to) > E.fileOf(m.from)) === (E.fileOf(s) > E.fileOf(m.from)));
    }
    if (!options.length) return false;
    if (options.length > 1 && options.some((m) => m.promo)) {
      choosePromotion(options);
    } else {
      humanMove(options[0]);
    }
    return true;
  }

  boardEl.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const s = squareFromPoint(e.clientX, e.clientY);
    if (s < 0 || !humanTurn()) return;
    e.preventDefault();
    if (S.selected >= 0 && s !== S.selected && tryMoveTo(s)) return;
    if (ownPieceAt(s)) {
      const wasSelected = S.selected === s;
      select(s);
      const pieceEl = squareEls.get(s).querySelector(".piece");
      drag = { from: s, x: e.clientX, y: e.clientY, moved: false, wasSelected, pieceEl, ghost: null, id: e.pointerId };
      try { boardEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    } else {
      select(-1);
    }
  });

  boardEl.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      const size = squareEls.get(drag.from).getBoundingClientRect().width;
      const g = document.createElement("div");
      g.className = "drag-ghost";
      g.style.width = g.style.height = size * 1.15 + "px";
      g.innerHTML = drag.pieceEl ? drag.pieceEl.innerHTML : "";
      document.body.appendChild(g);
      drag.ghost = g;
      if (drag.pieceEl) drag.pieceEl.classList.add("dragging");
    }
    const g = drag.ghost;
    g.style.left = e.clientX + "px";
    g.style.top = e.clientY + "px";
    const over = squareFromPoint(e.clientX, e.clientY);
    squareEls.forEach((el, s) => el.classList.toggle("drag-over", s === over && S.targets.some((m) => m.to === s)));
  });

  function endDrag(e, cancelled) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    if (d.ghost) d.ghost.remove();
    squareEls.forEach((el) => el.classList.remove("drag-over"));
    if (d.pieceEl) d.pieceEl.classList.remove("dragging");
    if (cancelled) return;
    if (d.moved) {
      const s = squareFromPoint(e.clientX, e.clientY);
      if (s >= 0 && s !== d.from && tryMoveTo(s)) return;
      renderBoard();
    } else if (d.wasSelected) {
      select(-1); // tapping a selected piece again unselects it
    }
  }
  boardEl.addEventListener("pointerup", (e) => endDrag(e, false));
  boardEl.addEventListener("pointercancel", (e) => endDrag(e, true));
  boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------- Promotion ----------
  function choosePromotion(options) {
    const color = turnChar();
    const modal = $("promo-modal");
    const box = $("promo-choices");
    box.innerHTML = [E.QUEEN, E.ROOK, E.BISHOP, E.KNIGHT].map((pt) =>
      `<button class="promo-btn" data-promo="${pt}" aria-label="${pieceName(E.PIECE_CHARS[pt])}">${pieceSvg(color, E.PIECE_CHARS[pt])}<span>${pieceName(E.PIECE_CHARS[pt])}</span></button>`
    ).join("");
    modal.hidden = false;
    box.querySelector("button").focus();
    box.onclick = (e) => {
      const b = e.target.closest("[data-promo]");
      if (!b) return;
      modal.hidden = true;
      humanMove(options.find((m) => m.promo === +b.dataset.promo));
    };
    modal.onclick = (e) => { if (e.target === modal) { modal.hidden = true; select(-1); } };
  }

  // ---------- Making moves ----------
  function applyMove(m) {
    S.sans.push(E.sanOf(S.chess, m));
    S.chess.make(m);
    S.moves.push(E.uciOf(m));
    S.lastMove = m;
    S.selected = -1; S.targets = []; S.hint = null;
    if (S.chess.inCheck()) sound.check();
    else if (m.cap) sound.capture();
    else sound.move();
    renderAll(m);
  }

  function humanMove(m) {
    if (S.mode === "puzzle") return puzzleMove(m);
    const praise = m.cap && Math.random() < 0.6;
    applyMove(m);
    afterMove(m, false, praise);
  }

  function afterMove(m, initial, praise) {
    const st = S.chess.status();
    if (st.over) {
      S.over = true;
      saveGame();
      renderBars();
      updateLock();
      return setTimeout(() => gameOver(st), initial ? 0 : 650);
    }
    saveGame();
    if (S.mode === "computer" && turnChar() !== S.human) {
      turnMessage();
      computerMove();
    } else if (praise && !st.check) {
      const praise = t("praise");
      say(praise[Math.floor(Math.random() * praise.length)] + " " + (S.mode === "computer" ? t("yourTurn") : t("turn_" + colorKey(S.chess.turn))), "wow");
    } else {
      turnMessage();
    }
  }

  async function computerMove() {
    const token = S.token;
    S.busy = true;
    updateLock();
    const started = Date.now();
    const uci = await askEngine("move", S.startFen, S.moves.slice(), S.level);
    const wait = Math.max(0, 700 - (Date.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    if (token !== S.token) return;
    S.busy = false;
    const m = uci && S.chess.moveFromUci(uci);
    if (!m) return turnMessage();
    applyMove(m);
    afterMove(m);
  }

  // ---------- Game over ----------
  function gameOver(st) {
    let emoji, title, text, mood;
    const winner = st.result === "1-0" ? "w" : st.result === "0-1" ? "b" : null;
    if (st.reason === "checkmate") {
      if (S.mode === "computer") {
        if (winner === S.human) {
          emoji = "🏆"; title = t("winTitle"); text = t("winText", { name: levelLabel(S.level) });
          sound.win(); confetti();
          const beaten = store.get("beaten", {}); beaten[S.level] = true; store.set("beaten", beaten);
        } else {
          emoji = "🌱"; title = t("loseTitle"); text = t("loseText", { name: levelOf(S.level).name });
          sound.lose(); mood = "sad";
        }
      } else {
        emoji = "🏆"; title = t("mate_" + winner); text = t("friendWinText");
        sound.win(); confetti();
      }
    } else {
      emoji = "🤝"; sound.draw();
      title = t("tieTitle");
      text = t("tie_" + st.reason);
    }
    say(title, mood || (st.reason === "checkmate" ? "wow" : "tie"));
    openEnd(emoji, title, text, 0, [
      { label: t("playAgain"), primary: true, run: () => startGame({ mode: S.mode, level: S.level, human: S.human }) },
      { label: t("lookAtBoard"), run: () => {} },
      { label: t("home"), run: () => show("home") },
    ]);
  }

  function openEnd(emoji, title, text, stars, actions) {
    $("end-emoji").textContent = emoji;
    $("end-title").textContent = title;
    $("end-text").textContent = text;
    $("end-stars").innerHTML = stars ? [1, 2, 3].map((i) => `<span class="${i <= stars ? "on" : ""}">★</span>`).join("") : "";
    const box = $("end-actions");
    box.innerHTML = "";
    actions.forEach((a) => {
      const b = document.createElement("button");
      b.className = "end-btn" + (a.primary ? " primary" : "");
      b.textContent = a.label;
      b.onclick = () => { $("end-modal").hidden = true; a.run(); };
      box.appendChild(b);
    });
    $("end-modal").hidden = false;
    const primary = box.querySelector(".primary");
    if (primary) primary.focus();
  }

  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = $("confetti");
    const colors = ["#ff5e8a", "#ffd166", "#2fae64", "#5b6ee1", "#e8913a", "#8de89c"];
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "vw";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      s.style.setProperty("--drift", (Math.random() * 2 - 1) * 120 + "px");
      s.style.setProperty("--spin", Math.random() * 720 + "deg");
      box.appendChild(s);
      setTimeout(() => s.remove(), 3800);
    }
  }

  // ---------- Controls ----------
  $("btn-undo").addEventListener("click", () => {
    if (!S.moves.length || S.mode === "puzzle") return;
    S.token++;           // cancel a computer move in progress
    S.busy = false;
    let n = 1;
    if (S.mode === "computer") {
      // Go back to the child's turn.
      n = turnChar() === S.human ? 2 : 1;
      if (S.moves.length < n) n = S.moves.length;
    }
    for (let i = 0; i < n; i++) { S.chess.unmake(); S.moves.pop(); S.sans.pop(); }
    if (S.mode === "computer" && turnChar() !== S.human && S.moves.length === 0) {
      // Child is Black and undid everything: the computer opens again.
      S.over = false; S.lastMove = null; renderAll(); afterMove(null, true); return;
    }
    S.over = false;
    const st = S.chess.stack;
    S.lastMove = st.length ? st[st.length - 1].m : null;
    S.selected = -1; S.targets = []; S.hint = null;
    renderAll();
    saveGame();
    say(t("undoSay"), "happy");
  });

  $("btn-hint").addEventListener("click", async () => {
    if (!humanTurn()) return;
    const token = S.token, ply = S.moves.length;
    say(t("hintThinking"), "think");
    S.busy = true;
    const uci = await askEngine("hint", S.startFen, S.moves.slice(), 4);
    S.busy = false;
    if (token !== S.token || ply !== S.moves.length) return;
    const m = uci && S.chess.moveFromUci(uci);
    if (!m) return turnMessage();
    S.hint = { from: m.from, to: m.to };
    S.selected = -1; S.targets = [];
    renderBoard();
    const piece = pieceName(E.PIECE_CHARS[E.typeOf(m.piece)]);
    say(t("hintSay", { piece, from: I18N.sq(E.sqName(m.from)), to: I18N.sq(E.sqName(m.to)) }), "hint");
  });

  $("btn-flip").addEventListener("click", () => {
    S.flipped = !S.flipped;
    renderAll();
    saveGame();
  });

  $("btn-new").addEventListener("click", () => {
    if (S.moves.length && !S.over && !confirm(t("confirmNew"))) return;
    if (S.mode === "computer") show("setup");
    else startGame({ mode: S.mode });
  });

  $("btn-leave").addEventListener("click", () => {
    S.token++;
    S.busy = false;
    show(S.mode === "puzzle" ? "practice" : "home");
  });

  function renderSoundBtn() {
    const b = $("btn-sound");
    b.textContent = sound.on ? "🔊" : "🔇";
    b.setAttribute("aria-pressed", String(sound.on));
    b.setAttribute("aria-label", t(sound.on ? "soundOn" : "soundOff"));
  }
  $("btn-sound").addEventListener("click", () => { sound.on = !sound.on; store.set("sound", sound.on); renderSoundBtn(); });
  renderSoundBtn();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("promo-modal").hidden) { $("promo-modal").hidden = true; select(-1); }
      else if (!$("end-modal").hidden) $("end-modal").hidden = true;
    }
  });

  // ---------- Practice riddles ----------
  const catOf = (cat) => (I18N.lang === "he" && cat.he) || cat;
  const textOf = (p) => (I18N.lang === "he" && p.he) || p;

  function renderPractice() {
    const stars = store.get("stars", {});
    const total = PUZZLES.reduce((n, p) => n + (stars[p.id] || 0), 0);
    $("star-total").textContent = `★ ${total}/${PUZZLES.length * 3}`;
    $("practice-list").innerHTML = CATEGORIES.map((cat) => {
      const items = PUZZLES.map((p, i) => ({ p, i })).filter((x) => x.p.cat === cat.id);
      const done = items.filter((x) => stars[x.p.id]).length;
      const catText = catOf(cat);
      return `<section class="cat" style="--cat:${cat.color}">
        <div class="cat-head"><span class="cat-emoji" aria-hidden="true">${cat.emoji}</span>
          <div><h3>${catText.name}</h3><p>${catText.blurb}</p></div>
          <span class="cat-done">${done}/${items.length}</span></div>
        <div class="tiles">${items.map(({ p, i }) => {
          const st = stars[p.id] || 0;
          return `<button class="tile${st ? " solved" : ""}" data-puzzle="${i}">
            <span class="tile-board" aria-hidden="true">${miniBoard(p.fen)}</span>
            <span class="tile-title">${textOf(p).title}</span>
            <span class="tile-stars" aria-label="${t("starsOf", { n: st })}">${[1, 2, 3].map((k) => `<b class="${k <= st ? "on" : ""}">★</b>`).join("")}</span>
          </button>`;
        }).join("")}</div></section>`;
    }).join("");
  }

  function miniBoard(fen) {
    const c = new E.Chess(fen);
    const flip = c.turn === E.BLACK;
    let html = "";
    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const s = flip ? (7 - dr) * 16 + (7 - dc) : dr * 16 + dc;
        const p = c.board[s];
        const dark = (E.rowOf(s) + E.fileOf(s)) % 2;
        html += `<i class="${dark ? "d" : "l"}${p ? (E.colorOf(p) ? " pb" : " pw") : ""}"></i>`;
      }
    }
    return html;
  }

  $("practice-list").addEventListener("click", (e) => {
    const t = e.target.closest("[data-puzzle]");
    if (t) startPuzzle(+t.dataset.puzzle);
  });

  function startPuzzle(index) {
    const p = PUZZLES[index];
    S.token++;
    S.mode = "puzzle";
    S.startFen = p.fen;
    S.chess = new E.Chess(p.fen);
    S.moves = []; S.sans = [];
    S.selected = -1; S.targets = []; S.lastMove = null; S.hint = null;
    S.busy = false; S.over = false;
    S.puzzle = { p, index, step: 0, mistakes: 0, hints: 0, solved: false, color: turnChar() };
    S.flipped = S.chess.turn === E.BLACK;
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    $("riddle-card").hidden = false;
    $("riddle-card").style.setProperty("--cat", cat.color);
    renderRiddleCard();
    $("riddle-controls").hidden = false;
    $("game-controls").hidden = true;
    $("move-list").hidden = true;
    document.querySelector(".play").classList.add("is-riddle");
    $("btn-prev").disabled = index === 0;
    $("btn-next").disabled = index === PUZZLES.length - 1;
    setPlayTitle();
    show("play");
    renderAll();
    say(t("riddleStart_" + colorKey(S.chess.turn)), "happy");
  }

  function playerMovesSoFar() {
    return Math.ceil(S.moves.length / 2); // player always moves first
  }

  function puzzleMove(m) {
    const pz = S.puzzle, p = pz.p;
    const uci = E.uciOf(m);
    const expected = p.solution[pz.step];
    const onScript = S.moves.every((u, i) => u === p.solution[i]);

    if (p.goal === "moves") {
      if (uci === expected || (pz.step === 0 && (p.accept || []).includes(uci))) {
        applyMove(m);
        pz.step++;
        if (uci !== expected || pz.step >= p.solution.length) return puzzleSolved();
        const reply = p.solution[pz.step];
        pz.step++;
        return puzzleReply(reply);
      }
      return puzzleWrong(m, t("wrong"));
    }

    // Checkmate riddles: any mate in time counts.
    applyMove(m);
    if (S.chess.isCheckmate()) return puzzleSolved();
    const st = S.chess.status();
    if (st.reason === "stalemate") return puzzleWrong(null, t("wrongStalemate"));
    const left = p.mateIn - playerMovesSoFar();
    if (left >= 1 && E.forcesMateAfter(S.chess, left + 1)) {
      // Pick Black's reply: the scripted one if we're still on the main line, else the toughest defence.
      let reply = onScript && uci === expected ? p.solution[pz.step + 1] : null;
      if (!reply || !S.chess.moveFromUci(reply)) {
        let best = null, bestDist = -1;
        for (const r of S.chess.legalMoves()) {
          S.chess.make(r);
          const d = E.mateDistance(S.chess, left);
          S.chess.unmake();
          if (d > bestDist) { bestDist = d; best = r; }
        }
        reply = E.uciOf(best);
      }
      pz.step += 2;
      say(t(left > 1 ? "goodStart" : "goodFinish"), "wow");
      return puzzleReply(reply, true);
    }
    puzzleWrong(null, t(S.chess.inCheck() ? "checkNotMate" : "notMate"));
  }

  function puzzleReply(uci, keepMessage) {
    const token = S.token;
    S.busy = true;
    updateLock();
    if (!keepMessage) say(t("nowWatch"), "wow");
    setTimeout(() => {
      if (token !== S.token) return;
      S.busy = false;
      const m = S.chess.moveFromUci(uci);
      if (m) applyMove(m);
      if (!keepMessage || S.puzzle.p.goal === "moves") say(t("yourTurnAgain"), "think");
      else say(t("findMate"), "think");
      updateLock();
    }, 750);
  }

  function puzzleWrong(m, msg) {
    const token = S.token;
    S.puzzle.mistakes++;
    if (m) applyMove(m);
    sound.oops();
    say(msg, "oops");
    S.busy = true;
    updateLock();
    setTimeout(() => {
      if (token !== S.token) return;
      S.chess.unmake(); S.moves.pop(); S.sans.pop();
      const st = S.chess.stack;
      S.lastMove = st.length ? st[st.length - 1].m : null;
      S.busy = false;
      renderAll();
    }, 1000);
  }

  function puzzleSolved() {
    const pz = S.puzzle;
    pz.solved = true;
    const slips = pz.mistakes + pz.hints;
    const stars = slips === 0 ? 3 : slips <= 2 ? 2 : 1;
    const all = store.get("stars", {});
    all[pz.p.id] = Math.max(all[pz.p.id] || 0, stars);
    store.set("stars", all);
    updateLock();
    say(t("solvedSay"), "wow");
    setTimeout(() => {
      sound.win(); confetti();
      const last = pz.index === PUZZLES.length - 1;
      openEnd(stars === 3 ? "🌟" : "🎉", t(stars === 3 ? "perfect" : "solved"), textOf(pz.p).explain, stars, [
        last
          ? { label: t("allRiddles"), primary: true, run: () => show("practice") }
          : { label: t("nextRiddle"), primary: true, run: () => startPuzzle(pz.index + 1) },
        { label: t("tryAgain"), run: () => startPuzzle(pz.index) },
        ...(last ? [] : [{ label: t("allRiddles"), run: () => show("practice") }]),
      ]);
    }, 600);
  }

  $("btn-rhint").addEventListener("click", () => {
    const pz = S.puzzle;
    if (!pz || pz.solved || S.busy) return;
    const p = pz.p;
    let uci = p.solution[pz.step];
    const onScript = S.moves.every((u, i) => u === p.solution[i]);
    if (!onScript && p.goal === "mate") {
      const left = p.mateIn - playerMovesSoFar();
      const ms = E.mateMoves(S.chess, left);
      uci = ms.length ? E.uciOf(ms[0]) : uci;
    }
    const m = uci && S.chess.moveFromUci(uci);
    if (!m) return;
    pz.hints++;
    if (!S.hint) {
      S.hint = { from: m.from, to: -1 };
      say(pz.step === 0 ? textOf(p).hint : t("hintGlow"), "hint");
    } else {
      S.hint = { from: m.from, to: m.to };
      say(t("hintGlowTo", { sq: I18N.sq(E.sqName(m.to)) }), "hint");
    }
    S.selected = -1; S.targets = [];
    renderBoard();
  });
  $("btn-retry").addEventListener("click", () => S.puzzle && startPuzzle(S.puzzle.index));
  $("btn-prev").addEventListener("click", () => S.puzzle && S.puzzle.index > 0 && startPuzzle(S.puzzle.index - 1));
  $("btn-next").addEventListener("click", () => S.puzzle && S.puzzle.index < PUZZLES.length - 1 && startPuzzle(S.puzzle.index + 1));

  // ---------- Language ----------
  function setPlayTitle() {
    $("play-title").textContent = S.mode === "puzzle" ? t("riddle")
      : S.mode === "computer" ? t("vs", { name: levelLabel(S.level) }) : t("friendTitle");
  }

  function renderRiddleCard() {
    if (!S.puzzle) return;
    const { p, index } = S.puzzle;
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    $("riddle-cat").textContent = `${cat.emoji} ${catOf(cat).name}`;
    $("riddle-count").textContent = I18N.sq(`${index + 1} / ${PUZZLES.length}`);
    $("riddle-title").textContent = textOf(p).title;
    $("riddle-prompt").textContent = textOf(p).prompt;
  }

  function applyLanguage() {
    const he = I18N.lang === "he";
    document.documentElement.lang = I18N.lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = t("docTitle");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    const lb = $("btn-lang");
    $("lang-label").textContent = t("langButton");
    lb.lang = he ? "en" : "he";
    lb.setAttribute("aria-label", t("langButtonLabel"));
    renderSoundBtn();
    renderHome();
    renderSetup();
    if (document.getElementById("screen-practice").classList.contains("is-active")) renderPractice();
    if (S.chess) {
      setPlayTitle();
      renderRiddleCard();
      renderAll();
      if (S.mode !== "puzzle" && !S.over && !S.busy) turnMessage();
    }
  }

  $("btn-lang").addEventListener("click", () => {
    I18N.setLang(I18N.lang === "he" ? "en" : "he");
    applyLanguage();
  });

  // ---------- Start ----------
  applyLanguage();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
