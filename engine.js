/*
 * Sugi Chess engine: full chess rules plus a small alpha-beta search.
 * Plain script so it works in the page, in the Web Worker (importScripts)
 * and in Node (for the tests).
 *
 * Board is 0x88: square = row * 16 + file, row 0 is rank 8 (top of the
 * board from White's side), file 0 is the a-file.
 */
(function (root) {
  "use strict";

  const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  const WHITE = 0, BLACK = 8;
  const CASTLE_WK = 1, CASTLE_WQ = 2, CASTLE_BK = 4, CASTLE_BQ = 8;
  const FLAG_NONE = 0, FLAG_DOUBLE = 1, FLAG_EP = 2, FLAG_CASTLE = 3;

  const KNIGHT_STEPS = [-33, -31, -18, -14, 14, 18, 31, 33];
  const BISHOP_STEPS = [-17, -15, 15, 17];
  const ROOK_STEPS = [-16, -1, 1, 16];
  const KING_STEPS = [-17, -16, -15, -1, 1, 15, 16, 17];

  const PIECE_CHARS = " pnbrqk";
  const VALUES = [0, 100, 320, 330, 500, 900, 0];

  const sq = (row, file) => row * 16 + file;
  const rowOf = (s) => s >> 4;
  const fileOf = (s) => s & 7;
  const onBoard = (s) => (s & 0x88) === 0;
  const typeOf = (p) => p & 7;
  const colorOf = (p) => p & 8;

  function sqName(s) {
    return "abcdefgh"[fileOf(s)] + (8 - rowOf(s));
  }
  function parseSq(name) {
    const f = name.charCodeAt(0) - 97;
    const r = 8 - parseInt(name[1], 10);
    if (f < 0 || f > 7 || r < 0 || r > 7 || isNaN(r)) return -1;
    return sq(r, f);
  }

  // ---------- Zobrist hashing (two 32-bit halves) ----------
  let seed = 0x9e3779b9;
  function rand32() {
    // xorshift32, deterministic so hashes match between page and worker.
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5; seed >>>= 0;
    return seed | 0;
  }
  const Z_PIECE_LO = [], Z_PIECE_HI = [];
  for (let p = 0; p < 16; p++) {
    Z_PIECE_LO.push(new Int32Array(128));
    Z_PIECE_HI.push(new Int32Array(128));
    for (let s = 0; s < 128; s++) {
      Z_PIECE_LO[p][s] = rand32();
      Z_PIECE_HI[p][s] = rand32();
    }
  }
  const Z_SIDE_LO = rand32(), Z_SIDE_HI = rand32();
  const Z_CASTLE_LO = [], Z_CASTLE_HI = [];
  for (let i = 0; i < 16; i++) { Z_CASTLE_LO.push(rand32()); Z_CASTLE_HI.push(rand32()); }
  const Z_EP_LO = [], Z_EP_HI = [];
  for (let i = 0; i < 8; i++) { Z_EP_LO.push(rand32()); Z_EP_HI.push(rand32()); }

  // Castling rights lost when a piece moves from / to a square.
  const CASTLE_MASK = new Int8Array(128).fill(15);
  CASTLE_MASK[sq(7, 4)] = 15 & ~(CASTLE_WK | CASTLE_WQ);
  CASTLE_MASK[sq(7, 7)] = 15 & ~CASTLE_WK;
  CASTLE_MASK[sq(7, 0)] = 15 & ~CASTLE_WQ;
  CASTLE_MASK[sq(0, 4)] = 15 & ~(CASTLE_BK | CASTLE_BQ);
  CASTLE_MASK[sq(0, 7)] = 15 & ~CASTLE_BK;
  CASTLE_MASK[sq(0, 0)] = 15 & ~CASTLE_BQ;

  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  class Chess {
    constructor(fen) {
      this.board = new Int8Array(128);
      this.load(fen || START_FEN);
    }

    load(fen) {
      const parts = fen.trim().split(/\s+/);
      if (parts.length < 4) throw new Error("Bad FEN: " + fen);
      this.board.fill(0);
      this.kings = [-1, -1];
      const rows = parts[0].split("/");
      if (rows.length !== 8) throw new Error("Bad FEN rows: " + fen);
      for (let r = 0; r < 8; r++) {
        let f = 0;
        for (const ch of rows[r]) {
          if (ch >= "1" && ch <= "8") { f += +ch; continue; }
          const lower = ch.toLowerCase();
          const t = PIECE_CHARS.indexOf(lower);
          if (t < 1 || f > 7) throw new Error("Bad FEN piece: " + fen);
          const c = ch === lower ? BLACK : WHITE;
          this.board[sq(r, f)] = t | c;
          if (t === KING) this.kings[c >> 3] = sq(r, f);
          f++;
        }
        if (f !== 8) throw new Error("Bad FEN row length: " + fen);
      }
      if (this.kings[0] < 0 || this.kings[1] < 0) throw new Error("FEN needs both kings: " + fen);
      this.turn = parts[1] === "b" ? BLACK : WHITE;
      this.castling = 0;
      if (parts[2].includes("K")) this.castling |= CASTLE_WK;
      if (parts[2].includes("Q")) this.castling |= CASTLE_WQ;
      if (parts[2].includes("k")) this.castling |= CASTLE_BK;
      if (parts[2].includes("q")) this.castling |= CASTLE_BQ;
      this.ep = parts[3] === "-" ? -1 : parseSq(parts[3]);
      this.half = parseInt(parts[4] || "0", 10) || 0;
      this.full = parseInt(parts[5] || "1", 10) || 1;
      this.stack = [];
      this.computeHash();
      this.keys = [this.key()];
    }

    computeHash() {
      let lo = 0, hi = 0;
      for (let s = 0; s < 128; s++) {
        if (!onBoard(s)) { s += 7; continue; }
        const p = this.board[s];
        if (p) { lo ^= Z_PIECE_LO[p][s]; hi ^= Z_PIECE_HI[p][s]; }
      }
      if (this.turn === BLACK) { lo ^= Z_SIDE_LO; hi ^= Z_SIDE_HI; }
      lo ^= Z_CASTLE_LO[this.castling]; hi ^= Z_CASTLE_HI[this.castling];
      if (this.ep >= 0) { lo ^= Z_EP_LO[fileOf(this.ep)]; hi ^= Z_EP_HI[fileOf(this.ep)]; }
      this.hashLo = lo; this.hashHi = hi;
    }

    key() {
      return (this.hashLo >>> 0).toString(36) + ":" + (this.hashHi >>> 0).toString(36);
    }

    fen() {
      let out = "";
      for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let f = 0; f < 8; f++) {
          const p = this.board[sq(r, f)];
          if (!p) { empty++; continue; }
          if (empty) { out += empty; empty = 0; }
          const ch = PIECE_CHARS[typeOf(p)];
          out += colorOf(p) === WHITE ? ch.toUpperCase() : ch;
        }
        if (empty) out += empty;
        if (r < 7) out += "/";
      }
      let c = "";
      if (this.castling & CASTLE_WK) c += "K";
      if (this.castling & CASTLE_WQ) c += "Q";
      if (this.castling & CASTLE_BK) c += "k";
      if (this.castling & CASTLE_BQ) c += "q";
      return out + " " + (this.turn === WHITE ? "w" : "b") + " " + (c || "-") + " " +
        (this.ep >= 0 ? sqName(this.ep) : "-") + " " + this.half + " " + this.full;
    }

    pieceAt(name) {
      const s = typeof name === "string" ? parseSq(name) : name;
      return s >= 0 ? this.board[s] : 0;
    }

    // Is square s attacked by any piece of color `by`?
    attacked(s, by) {
      const b = this.board;
      // Pawns: a white pawn attacks upward (row - 1), so it sits at s + 15 / s + 17.
      if (by === WHITE) {
        let t = s + 15; if (onBoard(t) && b[t] === (PAWN | WHITE)) return true;
        t = s + 17; if (onBoard(t) && b[t] === (PAWN | WHITE)) return true;
      } else {
        let t = s - 15; if (onBoard(t) && b[t] === (PAWN | BLACK)) return true;
        t = s - 17; if (onBoard(t) && b[t] === (PAWN | BLACK)) return true;
      }
      for (const d of KNIGHT_STEPS) {
        const t = s + d;
        if (onBoard(t) && b[t] === (KNIGHT | by)) return true;
      }
      for (const d of KING_STEPS) {
        const t = s + d;
        if (onBoard(t) && b[t] === (KING | by)) return true;
      }
      for (const d of BISHOP_STEPS) {
        let t = s + d;
        while (onBoard(t)) {
          const p = b[t];
          if (p) {
            if (colorOf(p) === by && (typeOf(p) === BISHOP || typeOf(p) === QUEEN)) return true;
            break;
          }
          t += d;
        }
      }
      for (const d of ROOK_STEPS) {
        let t = s + d;
        while (onBoard(t)) {
          const p = b[t];
          if (p) {
            if (colorOf(p) === by && (typeOf(p) === ROOK || typeOf(p) === QUEEN)) return true;
            break;
          }
          t += d;
        }
      }
      return false;
    }

    inCheck(color) {
      const c = color === undefined ? this.turn : color;
      return this.attacked(this.kings[c >> 3], c ^ 8);
    }

    // Pseudo-legal moves (may leave own king in check). capturesOnly for quiescence.
    pseudoMoves(capturesOnly) {
      const moves = [];
      const b = this.board, us = this.turn, them = us ^ 8;
      const add = (from, to, piece, cap, flag, promo) => {
        moves.push({ from, to, piece, cap, flag: flag || 0, promo: promo || 0 });
      };
      for (let s = 0; s < 128; s++) {
        if (!onBoard(s)) { s += 7; continue; }
        const p = b[s];
        if (!p || colorOf(p) !== us) continue;
        const t = typeOf(p);
        if (t === PAWN) {
          const dir = us === WHITE ? -16 : 16;
          const startRow = us === WHITE ? 6 : 1;
          const promoRow = us === WHITE ? 0 : 7;
          const one = s + dir;
          if (onBoard(one) && !b[one]) {
            if (rowOf(one) === promoRow) {
              for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) add(s, one, p, 0, FLAG_NONE, pr);
            } else if (!capturesOnly) {
              add(s, one, p, 0);
              const two = one + dir;
              if (rowOf(s) === startRow && !b[two]) add(s, two, p, 0, FLAG_DOUBLE);
            }
          }
          for (const side of [-1, 1]) {
            const c = s + dir + side;
            if (!onBoard(c)) continue;
            if (b[c] && colorOf(b[c]) === them) {
              if (rowOf(c) === promoRow) {
                for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) add(s, c, p, b[c], FLAG_NONE, pr);
              } else add(s, c, p, b[c]);
            } else if (c === this.ep) {
              add(s, c, p, PAWN | them, FLAG_EP);
            }
          }
          continue;
        }
        if (t === KNIGHT || t === KING) {
          for (const d of t === KNIGHT ? KNIGHT_STEPS : KING_STEPS) {
            const to = s + d;
            if (!onBoard(to)) continue;
            const q = b[to];
            if (!q) { if (!capturesOnly) add(s, to, p, 0); }
            else if (colorOf(q) === them) add(s, to, p, q);
          }
          if (t === KING && !capturesOnly) this.castleMoves(s, p, add);
          continue;
        }
        const steps = t === BISHOP ? BISHOP_STEPS : t === ROOK ? ROOK_STEPS : KING_STEPS;
        for (const d of steps) {
          let to = s + d;
          while (onBoard(to)) {
            const q = b[to];
            if (!q) { if (!capturesOnly) add(s, to, p, 0); }
            else { if (colorOf(q) === them) add(s, to, p, q); break; }
            to += d;
          }
        }
      }
      return moves;
    }

    castleMoves(s, p, add) {
      const b = this.board, us = this.turn, them = us ^ 8;
      const row = us === WHITE ? 7 : 0;
      if (s !== sq(row, 4)) return;
      const kFlag = us === WHITE ? CASTLE_WK : CASTLE_BK;
      const qFlag = us === WHITE ? CASTLE_WQ : CASTLE_BQ;
      if ((this.castling & (kFlag | qFlag)) === 0) return;
      if (this.attacked(s, them)) return;
      if ((this.castling & kFlag) && b[sq(row, 7)] === (ROOK | us) &&
          !b[sq(row, 5)] && !b[sq(row, 6)] &&
          !this.attacked(sq(row, 5), them) && !this.attacked(sq(row, 6), them)) {
        add(s, sq(row, 6), p, 0, FLAG_CASTLE);
      }
      if ((this.castling & qFlag) && b[sq(row, 0)] === (ROOK | us) &&
          !b[sq(row, 1)] && !b[sq(row, 2)] && !b[sq(row, 3)] &&
          !this.attacked(sq(row, 3), them) && !this.attacked(sq(row, 2), them)) {
        add(s, sq(row, 2), p, 0, FLAG_CASTLE);
      }
    }

    legalMoves(capturesOnly) {
      const out = [];
      const us = this.turn;
      for (const m of this.pseudoMoves(capturesOnly)) {
        this.make(m);
        if (!this.attacked(this.kings[us >> 3], us ^ 8)) out.push(m);
        this.unmake();
      }
      return out;
    }

    movesFrom(name) {
      const s = parseSq(name);
      return this.legalMoves().filter((m) => m.from === s);
    }

    make(m) {
      const b = this.board, us = this.turn, them = us ^ 8;
      this.stack.push({
        m, castling: this.castling, ep: this.ep, half: this.half,
        hashLo: this.hashLo, hashHi: this.hashHi,
      });
      let lo = this.hashLo, hi = this.hashHi;
      lo ^= Z_CASTLE_LO[this.castling]; hi ^= Z_CASTLE_HI[this.castling];
      if (this.ep >= 0) { lo ^= Z_EP_LO[fileOf(this.ep)]; hi ^= Z_EP_HI[fileOf(this.ep)]; }

      // Remove the captured piece.
      if (m.flag === FLAG_EP) {
        const capSq = m.to + (us === WHITE ? 16 : -16);
        b[capSq] = 0;
        lo ^= Z_PIECE_LO[m.cap][capSq]; hi ^= Z_PIECE_HI[m.cap][capSq];
      } else if (m.cap) {
        lo ^= Z_PIECE_LO[m.cap][m.to]; hi ^= Z_PIECE_HI[m.cap][m.to];
      }
      // Move the piece.
      const placed = m.promo ? (m.promo | us) : m.piece;
      b[m.from] = 0;
      b[m.to] = placed;
      lo ^= Z_PIECE_LO[m.piece][m.from]; hi ^= Z_PIECE_HI[m.piece][m.from];
      lo ^= Z_PIECE_LO[placed][m.to]; hi ^= Z_PIECE_HI[placed][m.to];

      if (m.flag === FLAG_CASTLE) {
        const row = rowOf(m.from);
        const kingside = fileOf(m.to) === 6;
        const rf = sq(row, kingside ? 7 : 0), rt = sq(row, kingside ? 5 : 3);
        const rook = b[rf];
        b[rf] = 0; b[rt] = rook;
        lo ^= Z_PIECE_LO[rook][rf] ^ Z_PIECE_LO[rook][rt];
        hi ^= Z_PIECE_HI[rook][rf] ^ Z_PIECE_HI[rook][rt];
      }
      if (typeOf(m.piece) === KING) this.kings[us >> 3] = m.to;

      this.castling &= CASTLE_MASK[m.from] & CASTLE_MASK[m.to];
      this.ep = m.flag === FLAG_DOUBLE ? (m.from + m.to) >> 1 : -1;
      this.half = (typeOf(m.piece) === PAWN || m.cap) ? 0 : this.half + 1;
      if (us === BLACK) this.full++;
      this.turn = them;

      lo ^= Z_CASTLE_LO[this.castling]; hi ^= Z_CASTLE_HI[this.castling];
      if (this.ep >= 0) { lo ^= Z_EP_LO[fileOf(this.ep)]; hi ^= Z_EP_HI[fileOf(this.ep)]; }
      lo ^= Z_SIDE_LO; hi ^= Z_SIDE_HI;
      this.hashLo = lo; this.hashHi = hi;
      this.keys.push(this.key());
    }

    unmake() {
      const st = this.stack.pop();
      if (!st) return null;
      const m = st.m, b = this.board;
      this.keys.pop();
      this.turn ^= 8;
      const us = this.turn;
      if (us === BLACK) this.full--;
      b[m.from] = m.piece;
      b[m.to] = 0;
      if (m.flag === FLAG_EP) {
        b[m.to + (us === WHITE ? 16 : -16)] = m.cap;
      } else if (m.cap) {
        b[m.to] = m.cap;
      }
      if (m.flag === FLAG_CASTLE) {
        const row = rowOf(m.from);
        const kingside = fileOf(m.to) === 6;
        const rf = sq(row, kingside ? 7 : 0), rt = sq(row, kingside ? 5 : 3);
        b[rf] = b[rt]; b[rt] = 0;
      }
      if (typeOf(m.piece) === KING) this.kings[us >> 3] = m.from;
      this.castling = st.castling; this.ep = st.ep; this.half = st.half;
      this.hashLo = st.hashLo; this.hashHi = st.hashHi;
      return m;
    }

    // Find a legal move from a UCI string like "e2e4" or "e7e8q".
    moveFromUci(uci) {
      if (!uci || uci.length < 4) return null;
      const from = parseSq(uci.slice(0, 2)), to = parseSq(uci.slice(2, 4));
      const promo = uci[4] ? PIECE_CHARS.indexOf(uci[4].toLowerCase()) : 0;
      for (const m of this.legalMoves()) {
        if (m.from === from && m.to === to && (m.promo || 0) === (promo > 0 ? promo : 0)) return m;
      }
      return null;
    }

    playUci(uci) {
      const m = this.moveFromUci(uci);
      if (!m) return null;
      this.make(m);
      return m;
    }

    repetitions() {
      const k = this.keys[this.keys.length - 1];
      let n = 0;
      // Only positions since the last irreversible move can repeat.
      const start = Math.max(0, this.keys.length - 1 - this.half);
      for (let i = start; i < this.keys.length; i++) if (this.keys[i] === k) n++;
      return n;
    }

    insufficientMaterial() {
      const minors = [];
      for (let s = 0; s < 128; s++) {
        if (!onBoard(s)) { s += 7; continue; }
        const p = this.board[s];
        if (!p) continue;
        const t = typeOf(p);
        if (t === KING) continue;
        if (t === PAWN || t === ROOK || t === QUEEN) return false;
        minors.push({ t, c: colorOf(p), shade: (rowOf(s) + fileOf(s)) & 1 });
      }
      if (minors.length <= 1) return true;
      // Only bishops, all on the same color of square.
      if (minors.every((x) => x.t === BISHOP) && minors.every((x) => x.shade === minors[0].shade)) return true;
      return false;
    }

    // { over, result: "1-0" | "0-1" | "1/2-1/2", reason }
    status() {
      const moves = this.legalMoves();
      const check = this.inCheck();
      if (!moves.length) {
        if (check) return { over: true, result: this.turn === WHITE ? "0-1" : "1-0", reason: "checkmate", check };
        return { over: true, result: "1/2-1/2", reason: "stalemate", check };
      }
      if (this.insufficientMaterial()) return { over: true, result: "1/2-1/2", reason: "material", check };
      if (this.half >= 100) return { over: true, result: "1/2-1/2", reason: "fifty", check };
      if (this.repetitions() >= 3) return { over: true, result: "1/2-1/2", reason: "repetition", check };
      return { over: false, check, moves };
    }

    isCheckmate() {
      return this.inCheck() && this.legalMoves().length === 0;
    }
  }

  function uciOf(m) {
    return sqName(m.from) + sqName(m.to) + (m.promo ? PIECE_CHARS[m.promo] : "");
  }

  // Short algebraic notation, computed before the move is made.
  function sanOf(chess, m) {
    const t = typeOf(m.piece);
    let san;
    if (m.flag === FLAG_CASTLE) {
      san = fileOf(m.to) === 6 ? "O-O" : "O-O-O";
    } else {
      san = "";
      if (t === PAWN) {
        if (m.cap) san = "abcdefgh"[fileOf(m.from)] + "x";
      } else {
        san = PIECE_CHARS[t].toUpperCase();
        const others = chess.legalMoves().filter((o) => o.to === m.to && o.piece === m.piece && o.from !== m.from);
        if (others.length) {
          const sameFile = others.some((o) => fileOf(o.from) === fileOf(m.from));
          const sameRow = others.some((o) => rowOf(o.from) === rowOf(m.from));
          if (!sameFile) san += "abcdefgh"[fileOf(m.from)];
          else if (!sameRow) san += 8 - rowOf(m.from);
          else san += sqName(m.from);
        }
        if (m.cap) san += "x";
      }
      san += sqName(m.to);
      if (m.promo) san += "=" + PIECE_CHARS[m.promo].toUpperCase();
    }
    chess.make(m);
    if (chess.inCheck()) san += chess.legalMoves().length ? "+" : "#";
    chess.unmake();
    return san;
  }

  // ---------- Evaluation ----------
  // Piece-square tables from White's point of view, a8..h8 first row.
  const PST = {};
  PST[PAWN] = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];
  PST[KNIGHT] = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ];
  PST[BISHOP] = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ];
  PST[ROOK] = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ];
  PST[QUEEN] = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ];
  const KING_MID = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ];
  const KING_END = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ];

  // Mating technique against a bare king: when one side has only its king left
  // and the other is well ahead, reward driving that king to the edge and
  // bringing the winning king close. Without this the search shuffles around.
  function mopUp(chess, score) {
    if (Math.abs(score) < 400) return 0;
    const b = chess.board;
    const loser = score > 0 ? BLACK : WHITE;
    for (let s = 0; s < 128; s++) {
      if (!onBoard(s)) { s += 7; continue; }
      const p = b[s];
      if (p && colorOf(p) === loser && typeOf(p) !== KING) return 0;
    }
    const lk = chess.kings[loser >> 3], wk = chess.kings[(loser ^ 8) >> 3];
    const r = rowOf(lk), f = fileOf(lk);
    const centre = Math.max(3 - r, r - 4) + Math.max(3 - f, f - 4);       // 0 (centre) .. 6 (corner)
    const near = Math.abs(rowOf(lk) - rowOf(wk)) + Math.abs(fileOf(lk) - fileOf(wk));
    const bonus = centre * 10 + (14 - near) * 4;
    return loser === BLACK ? bonus : -bonus;
  }

  // Score from the side to move's point of view.
  function evaluate(chess) {
    const b = chess.board;
    let score = 0, nonPawn = 0;
    let wk = -1, bk = -1;
    for (let s = 0; s < 128; s++) {
      if (!onBoard(s)) { s += 7; continue; }
      const p = b[s];
      if (!p) continue;
      const t = typeOf(p), white = colorOf(p) === WHITE;
      const idx = white ? rowOf(s) * 8 + fileOf(s) : (7 - rowOf(s)) * 8 + fileOf(s);
      if (t === KING) { if (white) wk = idx; else bk = idx; continue; }
      if (t !== PAWN) nonPawn += VALUES[t];
      const v = VALUES[t] + PST[t][idx];
      score += white ? v : -v;
    }
    const endgame = nonPawn <= 2600;
    const kt = endgame ? KING_END : KING_MID;
    score += kt[wk] - kt[bk];
    score += mopUp(chess, score);
    return chess.turn === WHITE ? score : -score;
  }

  // ---------- Search ----------
  const MATE = 100000;
  const INF = 1000000;

  function Searcher(chess, opts) {
    this.chess = chess;
    this.deadline = opts.timeMs ? Date.now() + opts.timeMs : Infinity;
    this.nodes = 0;
    this.stopped = false;
    this.tt = new Map();
    this.killers = [];
    this.useQuiescence = opts.quiescence !== false;
    // Mate searches turn the transposition table off: its stored mate scores are
    // relative to the ply they were found at, which would blur exact mate distances.
    this.useTT = !opts.noTT;
    // Hard cap so long chains of checks (each extends the search) can't run away.
    this.maxPly = opts.maxPly || 64;
    // Keys of positions already played in the game, for repetition draws.
    this.rootPly = chess.keys.length - 1;
  }

  Searcher.prototype.timeUp = function () {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.stopped = true;
    return this.stopped;
  };

  Searcher.prototype.order = function (moves, ttMove, ply) {
    const killers = this.killers[ply] || [];
    for (const m of moves) {
      let s = 0;
      if (ttMove && m.from === ttMove.from && m.to === ttMove.to && m.promo === ttMove.promo) s = 1e6;
      else if (m.cap) s = 1e5 + VALUES[typeOf(m.cap)] * 10 - VALUES[typeOf(m.piece)];
      else if (m.promo) s = 9e4 + VALUES[m.promo];
      else if (killers.some((k) => k.from === m.from && k.to === m.to)) s = 8e4;
      m._s = s;
    }
    moves.sort((a, b) => b._s - a._s);
    return moves;
  };

  Searcher.prototype.quiesce = function (alpha, beta, ply) {
    if (this.timeUp()) return 0;
    const chess = this.chess;
    const stand = evaluate(chess);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply > 40) return stand;
    const moves = this.order(chess.pseudoMoves(true), null, ply);
    const us = chess.turn;
    for (const m of moves) {
      chess.make(m);
      if (chess.attacked(chess.kings[us >> 3], us ^ 8)) { chess.unmake(); continue; }
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      chess.unmake();
      if (this.stopped) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  };

  Searcher.prototype.isRepeat = function () {
    const chess = this.chess;
    const keys = chess.keys;
    const k = keys[keys.length - 1];
    const start = Math.max(0, keys.length - 1 - chess.half);
    for (let i = keys.length - 3; i >= start; i -= 2) if (keys[i] === k) return true;
    return false;
  };

  Searcher.prototype.negamax = function (depth, alpha, beta, ply) {
    const chess = this.chess;
    if (ply > 0) {
      if (chess.half >= 100 || this.isRepeat()) return 0;
    }
    if (ply >= this.maxPly) return evaluate(chess);
    const inCheck = chess.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return this.useQuiescence ? this.quiesce(alpha, beta, ply) : evaluate(chess);
    if (this.timeUp()) return 0;

    const ttKey = chess.hashLo;
    const tte = this.useTT ? this.tt.get(ttKey) : null;
    let ttMove = null;
    if (tte && tte.hi === chess.hashHi) {
      ttMove = tte.move;
      if (ply > 0 && tte.depth >= depth) {
        if (tte.flag === 0) return tte.score;
        if (tte.flag === 1 && tte.score >= beta) return tte.score;
        if (tte.flag === 2 && tte.score <= alpha) return tte.score;
      }
    }

    const moves = this.order(chess.pseudoMoves(false), ttMove, ply);
    const us = chess.turn;
    let best = -INF, bestMove = null, legal = 0;
    const alpha0 = alpha;
    for (const m of moves) {
      chess.make(m);
      if (chess.attacked(chess.kings[us >> 3], us ^ 8)) { chess.unmake(); continue; }
      legal++;
      const score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      chess.unmake();
      if (this.stopped) return 0;
      if (score > best) { best = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!m.cap) {
          const k = this.killers[ply] || (this.killers[ply] = []);
          k.unshift(m); k.length = Math.min(k.length, 2);
        }
        break;
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    if (!this.useTT) return best;
    if (this.tt.size > 400000) this.tt.clear();
    this.tt.set(ttKey, {
      hi: chess.hashHi, depth, score: best, move: bestMove,
      flag: best <= alpha0 ? 2 : best >= beta ? 1 : 0,
    });
    return best;
  };

  // Score every root move at a fixed depth (full window), used for the
  // gentler levels that pick among moves with some randomness.
  function scoreRootMoves(chess, depth, opts) {
    const s = new Searcher(chess, opts || {});
    const out = [];
    for (const m of chess.legalMoves()) {
      chess.make(m);
      const score = -s.negamax(depth - 1, -INF, INF, 1);
      chess.unmake();
      out.push({ move: m, score });
    }
    return out;
  }

  function bestMove(chess, opts) {
    opts = opts || {};
    const maxDepth = opts.depth || 4;
    const s = new Searcher(chess, opts);
    let best = null, bestScore = 0;
    const legal = chess.legalMoves();
    if (!legal.length) return null;
    if (legal.length === 1) return { move: legal[0], score: 0, depth: 0 };
    for (let d = 1; d <= maxDepth; d++) {
      const score = s.negamax(d, -INF, INF, 0);
      if (s.stopped && best) break;
      const tte = s.tt.get(chess.hashLo);
      if (tte && tte.move) { best = tte.move; bestScore = score; }
      if (Math.abs(score) > MATE - 100) break;
      if (s.stopped) break;
    }
    if (!best) best = legal[0];
    return { move: best, score: bestScore, nodes: s.nodes };
  }

  // Difficulty levels for the computer player, weakest first. `id` is the
  // position in this list (shown as dots); `key` names the level for text.
  //   depth         how many half-moves it looks ahead
  //   noise         random centipawns added to each move's score (bigger = sloppier)
  //   randomChance  chance of playing a completely random move
  //   quiescence    whether it follows captures to the end before judging a move
  const LEVELS = [
    { id: 1, key: "seedling", name: "Seedling", emoji: "🌱", depth: 1, noise: 350, randomChance: 0.35, quiescence: false },
    { id: 2, key: "leaf", name: "Leaf", emoji: "🍃", depth: 1, noise: 160, randomChance: 0.12, quiescence: false },
    { id: 3, key: "plant", name: "Little Plant", emoji: "🪴", depth: 1, noise: 200, randomChance: 0.18, quiescence: true },
    { id: 4, key: "sprout", name: "Sprout", emoji: "🌿", depth: 2, noise: 140, randomChance: 0.08, quiescence: true },
    { id: 5, key: "sapling", name: "Sapling", emoji: "🌳", depth: 3, noise: 35, randomChance: 0, quiescence: true },
    { id: 6, key: "cedar", name: "Cedar", emoji: "🌲", depth: 7, timeMs: 1500, noise: 0, randomChance: 0, quiescence: true },
  ];

  function chooseMove(chess, levelId, rng) {
    rng = rng || Math.random;
    const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    const legal = chess.legalMoves();
    if (!legal.length) return null;
    if (level.noise === 0) return bestMove(chess, { depth: level.depth, timeMs: level.timeMs }).move;
    if (rng() < level.randomChance) return legal[Math.floor(rng() * legal.length)];
    const scored = scoreRootMoves(chess, level.depth, { quiescence: level.quiescence });
    // Never miss a mate in one, even on the easiest level; it is more fun to lose to.
    let pick = null, top = -INF;
    for (const x of scored) {
      const v = x.score >= MATE - 10 ? x.score : x.score + (rng() * 2 - 1) * level.noise;
      if (v > top) { top = v; pick = x.move; }
    }
    return pick;
  }

  // ---------- Mate search (for riddles) ----------
  // An alpha-beta search with exact mate scores: a position where the side to
  // move is mated at ply k scores -(MATE - k). Checks extend the search, so a
  // mate delivered on the last ply is always seen.
  function mateSearcher(chess, plies) {
    return new Searcher(chess, { quiescence: false, noTT: true, maxPly: plies + 12 });
  }

  // Attacker to move: the moves that force mate within n of the attacker's moves.
  function mateMoves(chess, n) {
    const plies = 2 * n - 1, need = MATE - plies;
    const s = mateSearcher(chess, plies);
    const out = [];
    for (const m of chess.legalMoves()) {
      chess.make(m);
      const v = -s.negamax(plies - 1, -need, -need + 1, 1);
      chess.unmake();
      if (v >= need) out.push(m);
    }
    return out;
  }

  // Defender to move: true if the attacker mates within k more attacker moves
  // whatever the defender does (k = 0: the defender is already checkmated).
  function forcesMate(chess, k) {
    const replies = chess.legalMoves();
    if (!replies.length) return chess.inCheck();
    if (k <= 0) return false;
    const plies = 2 * k, limit = -(MATE - plies);
    const s = mateSearcher(chess, plies);
    return s.negamax(plies, limit, limit + 1, 0) <= limit;
  }

  // Defender to move: the reply that holds out longest against a mate within k moves.
  function bestDefence(chess, k) {
    const plies = 2 * k;
    const s = mateSearcher(chess, plies);
    let best = null, bestScore = -INF;
    for (const r of chess.legalMoves()) {
      chess.make(r);
      const v = -s.negamax(plies - 1, -INF, INF, 1);
      chess.unmake();
      if (v > bestScore) { bestScore = v; best = r; }
    }
    return best;
  }

  // Fewest attacker moves needed to mate from here (attacker to move), up to max; Infinity if none.
  function mateDistance(chess, max) {
    for (let n = 1; n <= max; n++) if (mateMoves(chess, n).length) return n;
    return Infinity;
  }

  // Brute-force versions, used by the tests to double-check the fast search.
  function mateMovesExact(chess, n) {
    const out = [];
    for (const m of chess.legalMoves()) {
      chess.make(m);
      if (forcesMateExact(chess, n - 1)) out.push(m);
      chess.unmake();
    }
    return out;
  }
  function forcesMateExact(chess, k) {
    const replies = chess.legalMoves();
    if (!replies.length) return chess.inCheck();
    if (k <= 0) return false;
    for (const r of replies) {
      chess.make(r);
      const ok = mateMovesExact(chess, k).length > 0;
      chess.unmake();
      if (!ok) return false;
    }
    return true;
  }

  const api = {
    Chess, START_FEN, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, BLACK,
    FLAG_EP, FLAG_CASTLE, FLAG_DOUBLE,
    sqName, parseSq, typeOf, colorOf, rowOf, fileOf, uciOf, sanOf,
    evaluate, bestMove, scoreRootMoves, chooseMove, LEVELS, MATE,
    mateMoves, forcesMate, bestDefence, mateDistance, mateMovesExact, PIECE_CHARS,
  };
  root.SugiChess = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
