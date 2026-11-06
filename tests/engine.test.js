// Move-generation (perft) and engine sanity tests. Run: node tests/engine.test.js
"use strict";
const assert = require("assert");
const E = require("../engine.js");

function perft(c, d) {
  if (d === 0) return 1;
  let n = 0;
  for (const m of c.legalMoves()) { c.make(m); n += perft(c, d - 1); c.unmake(); }
  return n;
}

const cases = [
  [E.START_FEN, 4, 197281],
  ["r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 3, 97862],
  ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 5, 674624],
  ["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 3, 9467],
  ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 3, 62379],
];
for (const [fen, d, want] of cases) {
  const c = new E.Chess(fen);
  const before = c.fen(), key = c.key();
  const got = perft(c, d);
  assert.strictEqual(got, want, `perft(${d}) ${fen}: got ${got}, want ${want}`);
  assert.strictEqual(c.fen(), before, "unmake restores FEN");
  c.computeHash();
  assert.strictEqual(c.key(), key, "unmake restores hash");
}
console.log("perft ok");

// Incremental hash matches a fresh hash after a sequence of moves.
{
  const c = new E.Chess();
  for (const u of ["e2e4", "a7a6", "e4e5", "d7d5", "e5d6", "g8f6", "g1f3", "b8c6", "f1e2", "c8g4", "e1g1"]) {
    assert.ok(c.playUci(u), "legal " + u);
  }
  const lo = c.hashLo, hi = c.hashHi;
  c.computeHash();
  assert.strictEqual(c.hashLo, lo); assert.strictEqual(c.hashHi, hi);
  assert.strictEqual(new E.Chess(c.fen()).key(), c.key(), "hash from FEN matches");
}

// Game-end detection.
{
  const fool = new E.Chess();
  for (const u of ["f2f3", "e7e5", "g2g4", "d8h4"]) fool.playUci(u);
  assert.deepStrictEqual([fool.status().reason, fool.status().result], ["checkmate", "0-1"]);
  assert.strictEqual(new E.Chess("k7/2Q5/1K6/8/8/8/8/8 b - - 0 1").status().reason, "stalemate");
  assert.strictEqual(new E.Chess("k7/8/1K6/8/8/8/8/6N1 b - - 0 1").status().reason, "material");
  const rep = new E.Chess();
  for (let i = 0; i < 2; i++) for (const u of ["g1f3", "g8f6", "f3g1", "f6g8"]) rep.playUci(u);
  assert.strictEqual(rep.status().reason, "repetition");
  // SAN
  const s = new E.Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  assert.strictEqual(E.sanOf(s, s.moveFromUci("e1c1")), "O-O-O");
  assert.strictEqual(E.sanOf(s, s.moveFromUci("a1a8")), "Rxa8+");
}

// Search finds mates and wins material.
{
  const c = new E.Chess("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
  assert.strictEqual(E.uciOf(E.bestMove(c, { depth: 3 }).move), "a1a8");
  const f = new E.Chess("r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1");
  assert.strictEqual(E.uciOf(E.bestMove(f, { depth: 4 }).move), "b5c7");
  for (const lvl of E.LEVELS) {
    const g = new E.Chess();
    const t = Date.now();
    const m = E.chooseMove(g, lvl.id);
    assert.ok(m, "level " + lvl.id + " moves");
    console.log(`level ${lvl.id} opening move ${E.uciOf(m)} in ${Date.now() - t}ms`);
  }
}

// The strongest level never loses to the weakest one.
{
  const g = new E.Chess();
  let st = g.status(), plies = 0;
  while (!st.over && plies < 200) {
    const m = E.chooseMove(g, g.turn === E.WHITE ? 4 : 1);
    g.make(m); plies++; st = g.status();
  }
  console.log("Cedar vs Seedling:", st.reason, st.result, "after", plies, "plies");
  assert.notStrictEqual(st.result, "0-1", "Cedar should never lose to Seedling");
}
console.log("engine ok");
