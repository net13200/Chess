// Verifies every practice riddle with the engine. Run: node tests/puzzles.test.js
// Set DEEP=1 for the slow, full-depth checks of the hardest endgame studies.
"use strict";
const assert = require("assert");
const E = require("../engine.js");
const { PUZZLES, CATEGORIES, TIERS } = require("../puzzles.js");

const DEEP = !!process.env.DEEP;
const ids = new Set();
let problems = 0;
const uci = E.uciOf;

// Moves whose score is within `margin` of the best one, at the given depth.
function goodMoves(c, depth, margin) {
  const scored = E.scoreRootMoves(c, depth).sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  return { best, scored, good: scored.filter((x) => x.score >= best - margin).map((x) => uci(x.move)) };
}

for (const p of PUZZLES) {
  const fail = (msg) => { problems++; console.log(`✗ ${p.id}: ${msg}`); };
  const t0 = Date.now();
  try {
    assert.ok(!ids.has(p.id), "duplicate id"); ids.add(p.id);
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    assert.ok(cat, "unknown category");
    assert.ok(TIERS.some((t) => t.id === cat.tier), "category has no tier");
    for (const k of ["title", "prompt", "hint", "explain"]) {
      assert.ok(p[k], "missing " + k);
      assert.ok(p.he && p.he[k] && /[֐-׿]/.test(p.he[k]), "missing Hebrew " + k);
    }
    const c = new E.Chess(p.fen);
    assert.strictEqual(c.fen().split(" ").slice(0, 4).join(" "), p.fen.split(" ").slice(0, 4).join(" "), "FEN round-trips");
    assert.ok(!c.inCheck(c.turn ^ 8), "side not to move is in check");
    assert.ok(!c.status().over, "game already over");
    // Every solution move is legal in sequence.
    const line = new E.Chess(p.fen);
    for (const u of p.solution) assert.ok(line.playUci(u), "illegal solution move " + u);
    const v = p.verify || {};

    if (p.goal === "mate") {
      assert.ok(line.isCheckmate(), "solution line does not end in checkmate");
      assert.strictEqual(E.mateDistance(new E.Chess(p.fen), p.mateIn), p.mateIn, "not a mate in exactly " + p.mateIn);
      const winners = E.mateMoves(new E.Chess(p.fen), p.mateIn).map(uci);
      assert.ok(winners.includes(p.solution[0]), "first solution move doesn't force mate");
      // Each later attacker move in the line must still mate in time.
      const walk = new E.Chess(p.fen);
      for (let i = 0; i < p.solution.length; i += 2) {
        const left = p.mateIn - i / 2;
        assert.ok(E.mateMoves(walk, left).map(uci).includes(p.solution[i]), `move ${p.solution[i]} doesn't mate in ${left}`);
        walk.playUci(p.solution[i]);
        if (p.solution[i + 1]) walk.playUci(p.solution[i + 1]);
      }
      console.log(`✓ ${p.id}: mate in ${p.mateIn}; winning first moves: ${winners.join(" ")} (${Date.now() - t0}ms)`);
    } else if (p.goal === "finish") {
      assert.ok(p.maxMoves > 0, "finish riddle needs maxMoves");
      // A careful player (the engine) must mate within the limit against the same defence the app uses.
      const g = new E.Chess(p.fen);
      let n = 0, st = g.status();
      while (!st.over && n < 2 * p.maxMoves) {
        const m = g.turn === c.turn ? E.bestMove(g, { depth: 6, timeMs: 1200 }).move : E.bestMove(g, { depth: 4, timeMs: 600 }).move;
        g.make(m); n++; st = g.status();
      }
      if (st.reason !== "checkmate") fail(`engine could not mate within ${p.maxMoves} moves (${st.reason || "out of moves"})`);
      else console.log(`✓ ${p.id}: engine mates in ${Math.ceil(n / 2)} of ${p.maxMoves} moves (${Date.now() - t0}ms)`);
    } else if (cat.tier === 1) {
      // Beginner riddles (unchanged rules).
      const scored = E.scoreRootMoves(new E.Chess(p.fen), 4);
      const ok = new Set([p.solution[0], ...(p.accept || [])]);
      const best = Math.max(...scored.filter((x) => ok.has(uci(x.move))).map((x) => x.score));
      const rivals = scored.filter((x) => !ok.has(uci(x.move)) && x.score > best - 150);
      if (p.cat === "tricks" || p.cat === "special" && p.solution.length > 1) {
        if (rivals.length) fail("rival moves as good: " + rivals.map((x) => uci(x.move) + "=" + x.score).join(" ") + " vs " + best);
      }
      if (p.cat === "pieces") {
        const caps = c.legalMoves().filter((m) => m.cap).map(uci);
        if (p.id !== "escape" && p.id !== "king" && caps.length !== 1) fail("captures: " + caps.join(" "));
        if (p.id === "escape" && c.legalMoves().length !== 1) fail("escape has several moves");
      }
      console.log(`✓ ${p.id}: best ${best}, legal moves ${scored.length}`);
    } else {
      // Explorer / Master move riddles: at every one of the player's steps, the
      // good moves must be exactly the expected ones (alternatives only at step 0).
      const depth = DEEP && v.deepDepth ? v.deepDepth : v.depth || 4;
      const margin = v.margin || 150;
      const walk = new E.Chess(p.fen);
      for (let i = 0; i < p.solution.length; i += 2) {
        const expected = new Set([p.solution[i], ...(i === 0 ? p.accept || [] : [])]);
        const { good, scored } = goodMoves(walk, depth, margin);
        if (v.onlyBest && !(DEEP && v.deepDepth)) {
          if (uci(scored[0].move) !== p.solution[i]) fail(`step ${i}: best is ${uci(scored[0].move)}, not ${p.solution[i]}`);
        } else {
          const extra = good.filter((u) => !expected.has(u));
          const missing = [...expected].filter((u) => !good.includes(u));
          if (extra.length || missing.length) {
            fail(`step ${i}: unexpected good moves [${extra}] / expected but not good [${missing}] — ` +
              scored.slice(0, 5).map((x) => uci(x.move) + "=" + x.score).join(" "));
          }
        }
        walk.playUci(p.solution[i]);
        if (p.solution[i + 1]) walk.playUci(p.solution[i + 1]);
      }
      console.log(`✓ ${p.id}: ${p.solution.length} plies checked at depth ${depth} (${Date.now() - t0}ms)`);
    }
  } catch (e) { fail(e.message); }
}
for (const cat of CATEGORIES) {
  assert.ok(cat.he && cat.he.name && cat.he.blurb, "missing Hebrew category " + cat.id);
  assert.ok(PUZZLES.some((p) => p.cat === cat.id), "empty category " + cat.id);
}
// Riddles are listed tier by tier, so "Next" walks from easy to hard.
const tierOf = (p) => CATEGORIES.find((c) => c.id === p.cat).tier;
PUZZLES.forEach((p, i) => { if (i) assert.ok(tierOf(p) >= tierOf(PUZZLES[i - 1]), "riddles out of tier order at " + p.id); });

// The fast mate search agrees with brute force on every short mate riddle.
for (const p of PUZZLES.filter((x) => x.goal === "mate" && x.mateIn <= 2)) {
  const a = E.mateMoves(new E.Chess(p.fen), p.mateIn).map(uci).sort().join();
  const b = E.mateMovesExact(new E.Chess(p.fen), p.mateIn).map(uci).sort().join();
  if (a !== b) { problems++; console.log(`✗ ${p.id}: fast mate search ${a} != exact ${b}`); }
}

console.log(problems ? `${problems} problem(s)` : `all ${PUZZLES.length} riddles ok`);
process.exit(problems ? 1 : 0);
