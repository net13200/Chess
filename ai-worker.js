/* Runs the computer player off the main thread so the board stays responsive. */
importScripts("engine.js");

self.onmessage = (e) => {
  const { id, startFen, moves, level, kind } = e.data;
  const E = self.SugiChess;
  const chess = new E.Chess(startFen);
  for (const u of moves) chess.playUci(u);
  let move;
  if (kind === "hint") {
    move = E.bestMove(chess, { depth: 4, timeMs: 900 }).move;
  } else if (kind === "defend") {
    // "Finish it yourself" riddles: the lone king runs away as well as it can.
    move = E.bestMove(chess, { depth: 4, timeMs: 600 }).move;
  } else {
    move = E.chooseMove(chess, level);
  }
  self.postMessage({ id, uci: move ? E.uciOf(move) : null });
};
