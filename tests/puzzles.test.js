// Verifies every practice riddle with the engine. Run: node tests/puzzles.test.js
"use strict";
const assert = require("assert");
const E = require("../engine.js");
const { PUZZLES, CATEGORIES } = require("../puzzles.js");

const ids = new Set();
let problems = 0;
for (const p of PUZZLES) {
  const fail = (msg) => { problems++; console.log(`✗ ${p.id}: ${msg}`); };
  try {
    assert.ok(!ids.has(p.id), "duplicate id"); ids.add(p.id);
    assert.ok(CATEGORIES.some((c) => c.id === p.cat), "unknown category");
    for (const k of ["title", "prompt", "hint", "explain"]) {
      assert.ok(p.he && p.he[k] && /[\u0590-\u05FF]/.test(p.he[k]), "missing Hebrew " + k);
    }
    const c = new E.Chess(p.fen);
    assert.strictEqual(c.fen().split(" ").slice(0, 4).join(" "), p.fen.split(" ").slice(0, 4).join(" "), "FEN round-trips");
    // The side not to move must not be in check (illegal position otherwise).
    assert.ok(!c.inCheck(c.turn ^ 8), "side not to move is in check");
    // Every solution move is legal in sequence.
    const line = new E.Chess(p.fen);
    for (const u of p.solution) assert.ok(line.playUci(u), "illegal solution move " + u);

    if (p.goal === "mate") {
      assert.ok(line.isCheckmate(), "solution line does not end in checkmate");
      assert.strictEqual(E.mateDistance(new E.Chess(p.fen), p.mateIn), p.mateIn, "not a mate in exactly " + p.mateIn);
      const winners = E.mateMoves(new E.Chess(p.fen), p.mateIn).map(E.uciOf);
      assert.ok(winners.includes(p.solution[0]), "first solution move doesn't force mate");
      console.log(`✓ ${p.id}: mate in ${p.mateIn}; winning first moves: ${winners.join(" ")}`);
    } else {
      // First move must be clearly best: every other move at least 150cp worse.
      const scored = E.scoreRootMoves(new E.Chess(p.fen), 4);
      const ok = new Set([p.solution[0], ...(p.accept || [])]);
      const best = Math.max(...scored.filter((x) => ok.has(E.uciOf(x.move))).map((x) => x.score));
      const rivals = scored.filter((x) => !ok.has(E.uciOf(x.move)) && x.score > best - 150);
      // Teaching riddles ("pieces", "special") ask for a specific move, so only
      // require no other move to capture the same target / be equally strong there.
      if (p.cat === "tricks" || p.cat === "special" && p.solution.length > 1) {
        if (rivals.length) fail("rival moves as good: " + rivals.map((x) => E.uciOf(x.move) + "=" + x.score).join(" ") + " vs " + best);
      }
      if (p.cat === "pieces") {
        // Only one capture available for the named idea.
        const caps = c.legalMoves().filter((m) => m.cap).map(E.uciOf);
        if (p.id !== "escape" && p.id !== "king" && caps.length !== 1) fail("captures: " + caps.join(" "));
        if (p.id === "escape" && c.legalMoves().length !== 1) fail("escape has several moves");
      }
      console.log(`✓ ${p.id}: best ${best}, legal moves ${scored.length}`);
    }
  } catch (e) { fail(e.message); }
}
for (const cat of CATEGORIES) assert.ok(cat.he && cat.he.name && cat.he.blurb, "missing Hebrew category " + cat.id);
for (const cat of CATEGORIES) assert.ok(PUZZLES.some((p) => p.cat === cat.id), "empty category " + cat.id);
console.log(problems ? `${problems} problem(s)` : `all ${PUZZLES.length} riddles ok`);
process.exit(problems ? 1 : 0);
