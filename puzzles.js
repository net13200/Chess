/*
 * Practice riddles. Each riddle:
 *   fen       starting position (the side to move is the player)
 *   goal      "moves": play the exact solution (accept lists other good first moves)
 *             "mate":  give checkmate within mateIn moves; any mating line counts
 *   solution  UCI moves, alternating player / computer reply
 *   hint      shown when the hint button is pressed
 *   explain   shown after solving
 * Hebrew text for each riddle and category is in PUZZLES_HE / CATEGORIES_HE below.
 */
(function (root) {
  "use strict";

  // Riddles come in three tiers, named like the computer levels.
  const TIERS = [
    { id: 1, emoji: "🌱", name: "Beginner", he: "מתחילים" },
    { id: 2, emoji: "🌳", name: "Explorer", he: "מתקדמים" },
    { id: 3, emoji: "🌲", name: "Master", he: "אלופים" },
  ];

  const CATEGORIES = [
    { id: "pieces", tier: 1, name: "Meet the pieces", emoji: "♞", color: "#ff5e8a", blurb: "How does each piece move?" },
    { id: "special", tier: 1, name: "Special moves", emoji: "✨", color: "#e8913a", blurb: "Castling, en passant and promotion." },
    { id: "mate1", tier: 1, name: "Checkmate in 1", emoji: "👑", color: "#5b6ee1", blurb: "Find the move that wins the game." },
    { id: "tricks", tier: 1, name: "Clever tricks", emoji: "🎩", color: "#2fae64", blurb: "Forks, skewers and sneaky attacks." },
    { id: "mate2", tier: 1, name: "Checkmate in 2", emoji: "🏆", color: "#9b59d0", blurb: "Think two moves ahead!" },
    { id: "mates2", tier: 2, name: "Tricky checkmates", emoji: "⚔️", color: "#e05d5d", blurb: "Famous traps and quiet killer moves." },
    { id: "tactics2", tier: 2, name: "Sneaky tactics", emoji: "🦊", color: "#e8913a", blurb: "Pins, forks and surprise checks that win big." },
    { id: "endgame", tier: 2, name: "Endgame skills", emoji: "🏁", color: "#2fae64", blurb: "Only a few pieces left: every move counts." },
    { id: "finish", tier: 2, name: "Finish it yourself", emoji: "🎯", color: "#5b6ee1", blurb: "Checkmate the computer before your moves run out." },
    { id: "mate3", tier: 3, name: "Checkmate in 3 and 4", emoji: "🧠", color: "#9b59d0", blurb: "Plan several moves ahead." },
    { id: "master", tier: 3, name: "Master tricks", emoji: "🦉", color: "#c99a1a", blurb: "Deep ideas that strong players love." },
    { id: "save", tier: 3, name: "Save the game", emoji: "🛟", color: "#1fa5bd", blurb: "You're losing. Find the move that saves you!" },
  ];

  const PUZZLES = [
    // ---------- Meet the pieces ----------
    {
      id: "rook", cat: "pieces", title: "Zoom, rook!",
      prompt: "The rook zooms in straight lines: up, down, left and right. Catch the black pawn!",
      fen: "4k3/8/8/8/1p6/8/8/1R2K3 w - - 0 1", goal: "moves", solution: ["b1b4"],
      hint: "Look straight up from the rook.",
      explain: "Rooks can move as far as they like in a straight line, as long as nothing is in the way.",
    },
    {
      id: "bishop", cat: "pieces", title: "Slide, bishop!",
      prompt: "The bishop slides along diagonals, like a skier going down a slope. Catch the black knight!",
      fen: "4k3/8/7n/8/8/8/8/2B1K3 w - - 0 1", goal: "moves", solution: ["c1h6"],
      hint: "Follow the diagonal from the bishop up and to the right.",
      explain: "A bishop always stays on the same color square. This one lives on the dark squares.",
    },
    {
      id: "knight", cat: "pieces", title: "Hop, knight!",
      prompt: "The knight is surrounded by pawns! But knights jump in an L shape, right over other pieces. Catch the queen!",
      fen: "4k3/8/8/2pppq2/2pNp3/2ppp3/8/K7 w - - 0 1", goal: "moves", solution: ["d4f5"],
      hint: "Two squares one way, then one square to the side.",
      explain: "The knight is the only piece that can jump over others. Its L-shaped hop is two squares, then one to the side.",
    },
    {
      id: "queen", cat: "pieces", title: "The mighty queen",
      prompt: "The queen moves like a rook AND a bishop together. Catch the rook in one move!",
      fen: "4k3/8/8/7r/8/8/8/3QK3 w - - 0 1", goal: "moves", solution: ["d1h5"],
      hint: "Try a diagonal.",
      explain: "The queen is the strongest piece because she can go in any straight line or diagonal. And look: she gives check too!",
    },
    {
      id: "king", cat: "pieces", title: "Careful, king!",
      prompt: "The king steps just one square at a time. Capture a pawn, but only one of them is safe to take!",
      fen: "4k3/8/8/8/6p1/3pKp2/8/8 w - - 0 1", goal: "moves", solution: ["e3d3"],
      hint: "The pawn on f3 has a friend guarding it.",
      explain: "A king can never move onto a square that an enemy piece attacks. The f3 pawn was protected by the g4 pawn.",
    },
    {
      id: "pawn", cat: "pieces", title: "Pawn power",
      prompt: "Pawns walk straight forward, but they capture diagonally. Make a capture with your pawn!",
      fen: "4k3/8/8/3bn3/4P3/8/8/4K3 w - - 0 1", goal: "moves", solution: ["e4d5"],
      hint: "The knight is blocking the pawn's path. Which piece is diagonally in front of it?",
      explain: "A pawn can't capture the piece straight in front of it. It takes one step diagonally forward instead.",
    },
    {
      id: "escape", cat: "pieces", title: "Escape from check",
      prompt: "Your king is in check! The rook is attacking it. Find the only safe square.",
      fen: "4r2k/8/8/8/8/1b6/r7/4K3 w - - 0 1", goal: "moves", solution: ["e1f1"],
      hint: "The bishop guards one square, the rook on a2 guards the whole second row.",
      explain: "When you're in check you must get out of it right away: move the king, block, or capture the attacker.",
    },

    // ---------- Special moves ----------
    {
      id: "castle", cat: "special", title: "Castle the king",
      prompt: "Keep your king safe by castling! Move the king two squares toward the rook on the right.",
      fen: "r3k2r/ppp2ppp/2n2n2/3pp3/3PP3/2N2N2/PPP2PPP/R3K2R w KQkq - 0 1", goal: "moves", solution: ["e1g1"],
      hint: "Tap the king, then the square two steps to its right.",
      explain: "Castling moves the king two squares and the rook jumps over it. It's the only move where two pieces move at once!",
    },
    {
      id: "enpassant", cat: "special", title: "En passant",
      prompt: "Black's pawn just jumped two squares to land beside yours. You can capture it \"in passing\" as if it had moved only one square!",
      fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2", goal: "moves", solution: ["e5d6"],
      hint: "Move your pawn diagonally to the square right behind the black pawn.",
      explain: "En passant (French for \"in passing\") only works on the very next move after the enemy pawn jumps two squares.",
    },
    {
      id: "promote", cat: "special", title: "Pawn to queen",
      prompt: "When a pawn reaches the far end of the board it can turn into a queen! Promote your pawn.",
      fen: "4k3/1P6/8/8/8/8/8/4K3 w - - 0 1", goal: "moves", solution: ["b7b8q"],
      hint: "Walk the pawn one more step and choose the queen.",
      explain: "This is called promotion. The new queen even gives check right away!",
    },
    {
      id: "underpromote", cat: "special", title: "Knight is right",
      prompt: "Promote your pawn, but think: is a queen really the best choice here? Win the black queen!",
      fen: "8/2q1P1k1/8/8/8/8/8/K7 w - - 0 1", goal: "moves", solution: ["e7e8n", "g7f7", "e8c7"],
      accept: [], hint: "A new knight on e8 would attack two things at once.",
      explain: "You can promote to a queen, rook, bishop or knight. Here the knight gives check AND attacks the queen.",
    },

    // ---------- Checkmate in 1 ----------
    {
      id: "backrank", cat: "mate1", title: "Back row trap",
      prompt: "Black's king is hiding behind its own pawns. Checkmate in one move!",
      fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", goal: "mate", mateIn: 1, solution: ["a1a8"],
      hint: "The king can't step forward, its own pawns are in the way.",
      explain: "This is a back-rank mate. Leaving your king boxed in by its own pawns can be dangerous!",
    },
    {
      id: "kiss", cat: "mate1", title: "Queen with a buddy",
      prompt: "Your king and queen work together. Checkmate the black king!",
      fen: "4k3/7Q/4K3/8/8/8/8/8 w - - 0 1", goal: "mate", mateIn: 1, solution: ["h7e7"],
      hint: "Put the queen right next to the black king, where your king protects her.",
      explain: "The black king can't capture the queen because your king guards her. Teamwork!",
    },
    {
      id: "smother", cat: "mate1", title: "Smothered!",
      prompt: "The black king is squished in by its own pieces. One knight hop wins!",
      fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", goal: "mate", mateIn: 1, solution: ["g5f7"],
      hint: "Which square would let the knight attack h8?",
      explain: "A smothered mate: the king is trapped by its own rook and pawns and can't escape the knight.",
    },
    {
      id: "ladder", cat: "mate1", title: "Rook ladder",
      prompt: "One rook guards the 7th row. Use the other rook to checkmate!",
      fen: "7k/R7/8/8/8/8/8/1R4K1 w - - 0 1", goal: "mate", mateIn: 1, solution: ["b1b8"],
      hint: "The black king can't go down to the 7th row.",
      explain: "Two rooks working like the rungs of a ladder can push a king to the edge and checkmate it.",
    },
    {
      id: "arabian", cat: "mate1", title: "Knight and rook",
      prompt: "The knight is already guarding important squares. Bring in the rook for checkmate!",
      fen: "7k/R7/5N2/8/8/8/8/6K1 w - - 0 1", goal: "mate", mateIn: 1, solution: ["a7h7"],
      hint: "The knight protects the square h7.",
      explain: "This is an old pattern called the Arabian mate. The knight guards the rook and the square g8.",
    },
    {
      id: "scholar", cat: "mate1", title: "The four-move trap",
      prompt: "Black made a mistake. Your queen and bishop both aim at the same weak pawn. Checkmate!",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", goal: "mate", mateIn: 1, solution: ["h5f7"],
      hint: "The pawn on f7 is only protected by the king.",
      explain: "This is called Scholar's Mate. Remember it, so nobody can catch you with it!",
    },
    {
      id: "fool", cat: "mate1", title: "Black's turn: quickest win",
      prompt: "You are Black this time! White made two weak pawn moves. Checkmate in one!",
      fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2", goal: "mate", mateIn: 1, solution: ["d8h4"],
      hint: "Your queen can reach the white king along a diagonal.",
      explain: "Fool's Mate, the fastest checkmate possible. It shows why you shouldn't weaken the pawns in front of your king.",
    },
    {
      id: "nostalemate", cat: "mate1", title: "Don't make a tie!",
      prompt: "Checkmate the lonely black king. Careful: some moves leave Black with no moves at all, and that's a tie (stalemate)!",
      fen: "k7/3Q4/1K6/8/8/8/8/8 w - - 0 1", goal: "mate", mateIn: 1, solution: ["d7d8"],
      hint: "Your king already guards a7 and b7. Give check along the top row.",
      explain: "If the king isn't in check but has no legal moves, it's stalemate, and the game is a draw. Always leave a way out, or give check!",
    },

    // ---------- Clever tricks ----------
    {
      id: "fork", cat: "tricks", title: "Knight fork",
      prompt: "Find a knight move that attacks the king AND the rook at the same time.",
      fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", goal: "moves", solution: ["b5c7", "e8d7", "c7a8"],
      hint: "Look at the square c7.",
      explain: "Attacking two things at once is called a fork. The king must move, and the rook is yours!",
    },
    {
      id: "pawnfork", cat: "tricks", title: "Pawn fork",
      prompt: "Even a little pawn can attack two pieces at once. Win a knight!",
      fen: "6k1/8/2n1n3/8/3P4/8/8/6K1 w - - 0 1", goal: "moves", solution: ["d4d5"],
      hint: "Step forward between the two knights.",
      explain: "The pawn attacks both knights. Black can only save one of them.",
    },
    {
      id: "skewer", cat: "tricks", title: "Skewer",
      prompt: "Check the king with your bishop. When it steps away, the queen behind it is in trouble!",
      fen: "6q1/8/8/3k4/8/8/8/K2B4 w - - 0 1", goal: "moves", solution: ["d1b3", "d5e5", "b3g8"],
      hint: "Line the bishop up with the king and the queen on one diagonal.",
      explain: "A skewer attacks a valuable piece, and when it moves away, you capture the piece behind it.",
    },
    {
      id: "discovered", cat: "tricks", title: "Surprise attack",
      prompt: "Your knight is blocking your bishop. Move the knight with check, and the bishop will attack the queen!",
      fen: "8/4k1q1/8/8/3N4/8/1B6/2K5 w - - 0 1", goal: "moves", solution: ["d4c6", "e7d6", "b2g7"],
      accept: ["d4f5"], hint: "Which knight move gives check to the king on e7?",
      explain: "This is a discovered attack: moving one piece uncovers an attack by another one.",
    },
    {
      id: "safe", cat: "tricks", title: "Free lunch",
      prompt: "Your rook can capture two different pieces. Only one capture is safe. Which one?",
      fen: "7k/3n4/8/6p1/3R3b/8/8/K7 w - - 0 1", goal: "moves", solution: ["d4d7"],
      hint: "Check which black piece is protected by a pawn.",
      explain: "Before capturing, always ask: can they capture back? The knight had no protection, but the bishop was guarded by the g5 pawn.",
    },

    // ---------- Checkmate in 2 ----------
    {
      id: "sac", cat: "mate2", title: "Brave queen",
      prompt: "Give away your queen to set up checkmate! You have two moves.",
      fen: "2r3k1/5ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1", goal: "mate", mateIn: 2, solution: ["d2d8", "c8d8", "d1d8"],
      hint: "Check on d8. Black must capture, and then the rook follows.",
      explain: "Sometimes giving up your strongest piece is the fastest way to win. That's called a sacrifice.",
    },
    {
      id: "philidor", cat: "mate2", title: "Philidor's knight",
      prompt: "A famous trick over 250 years old. Sacrifice the queen, then the knight finishes the job!",
      fen: "5r1k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1", goal: "mate", mateIn: 2, solution: ["d5g8", "f8g8", "h6f7"],
      hint: "Put your queen on g8, right next to the king. The knight protects her.",
      explain: "Black had to capture with the rook, which then blocked the king in. The knight delivers a smothered mate!",
    },
    {
      id: "roller", cat: "mate2", title: "Rook roller",
      prompt: "Use your two rooks like a ladder to trap the black king on the top row.",
      fen: "4k3/8/8/8/8/8/1R6/R3K3 w - - 0 1", goal: "mate", mateIn: 2, solution: ["b2b7", "e8f8", "a1a8"],
      hint: "First move one rook to the 7th row to block the king.",
      explain: "One rook cuts off a row, the other gives check on the edge. This is the easiest way to win with two rooks.",
    },

    // =================== Tier 2: Explorer ===================

    // ---------- Tricky checkmates ----------
    {
      id: "caro", cat: "mates2", title: "Trap in six moves",
      prompt: "Black's knights got in each other's way. One knight jump is checkmate!",
      fen: "r1bqkb1r/pp1npppp/2p2n2/8/3PN3/8/PPP1QPPP/R1B1KBNR w KQkq - 3 6", goal: "mate", mateIn: 1, solution: ["e4d6"],
      hint: "The black pawn on e7 can't move: your queen pins it to the king.",
      explain: "Nd6 is checkmate! The e7 pawn can't capture because your queen pins it, and Black's own pieces fill every escape square. Many players have fallen into this trap in the Caro-Kann opening.",
    },
    {
      id: "legal", cat: "mates2", title: "L\u00e9gal's trap",
      prompt: "Black just took your queen! But it was a trap. Checkmate in 2 moves!",
      fen: "rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6", goal: "mate", mateIn: 2, solution: ["c4f7", "e8e7", "c3d5"],
      hint: "Start with a check on f7.",
      explain: "Bxf7+ forces the king to e7, and then Nd5 is checkmate: your bishop and two knights work together. This trap is more than 250 years old!",
    },
    {
      id: "opera", cat: "mates2", title: "Morphy's Opera Game",
      prompt: "In 1858 Paul Morphy played this game at the opera in Paris. Finish his famous game: checkmate in 2!",
      fen: "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16", goal: "mate", mateIn: 2, solution: ["b3b8", "d7b8", "d1d8"],
      hint: "Give away your queen with check on b8.",
      explain: "Qb8+! The knight has to take the queen, and that leaves d8 for your rook: Rd8 is checkmate. One of the most famous finishes in chess history.",
    },
    {
      id: "boden", cat: "mates2", title: "Boden's mate",
      prompt: "You are Black. White's king hides behind its pawns. Sacrifice your queen and checkmate with two bishops!",
      fen: "2k1rb1r/ppp3pp/2n2q2/3B1b2/5P2/2P1BQ2/PP1N1P1P/2KR3R b - - 0 14", goal: "mate", mateIn: 2, solution: ["f6c3", "b2c3", "f8a3"],
      hint: "Check on c3. If the pawn takes, which bishop can reach a3?",
      explain: "...Qxc3+ breaks the pawn shield, and ...Ba3 is checkmate: two bishops crossing like scissors. The pattern is named after Samuel Boden, who played it in 1853.",
    },
    {
      id: "anastasia", cat: "mates2", title: "Anastasia's mate",
      prompt: "Your knight guards the escape squares. Sacrifice the queen to open the h-file, then the rook finishes!",
      fen: "5r1k/4N1pp/8/8/8/4R2Q/5PPP/6K1 w - - 0 1", goal: "mate", mateIn: 2, solution: ["h3h7", "h8h7", "e3h3"],
      hint: "Take the h7 pawn with check.",
      explain: "Qxh7+! Kxh7 and Rh3 is checkmate. The knight on e7 stops the king from escaping to g6 or g8. The name comes from an old novel, 'Anastasia and Chess'.",
    },
    {
      id: "battery", cat: "mates2", title: "Rooks in a row",
      prompt: "Your two rooks stand one behind the other. Use them to break through the back row!",
      fen: "4r1k1/3q1ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1", goal: "mate", mateIn: 2, solution: ["e2e8", "d7e8", "e1e8"],
      hint: "Capture on e8 with the front rook.",
      explain: "Rxe8+ Qxe8 and Rxe8 is checkmate. Two rooks on the same file are called a battery: when the first one is captured, the second one takes over.",
    },
    {
      id: "waiting", cat: "mates2", title: "The waiting move",
      prompt: "Checkmate in 2, but the first move is NOT a check! Make a quiet move that leaves the black king only one square to go to.",
      fen: "6k1/8/5K2/8/8/8/8/1R6 w - - 0 1", goal: "mate", mateIn: 2, solution: ["b1h1", "g8f8", "h1h8"],
      hint: "Put your rook on the h-file.",
      explain: "Rh1! takes away h7 and h8. The king must go to f8, and Rh8 is checkmate. Sometimes the strongest move is a quiet one.",
    },

    // ---------- Sneaky tactics ----------
    {
      id: "doublecheck", cat: "tactics2", title: "Double check!",
      prompt: "Move the knight so that the knight AND the rook both give check. The king can't block two checks at once!",
      fen: "3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1", goal: "mate", mateIn: 1, solution: ["e4d6"],
      hint: "Your knight is blocking your rook's path to the king.",
      explain: "A double check is the strongest check there is: the only way out is to move the king, and here it has nowhere to go. Checkmate!",
    },
    {
      id: "queenfork", cat: "tactics2", title: "Queen fork",
      prompt: "Find a queen check that also attacks the rook in the corner.",
      fen: "r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1", goal: "moves", solution: ["d1d5", "g8h8", "d5a8"],
      hint: "Look for a square in the middle of the board, on the long diagonal.",
      explain: "Qd5+ attacks the king and the rook together. After the king steps away, the rook is yours. Queens make great forks because they move in every direction.",
    },
    {
      id: "pinqueen", cat: "tactics2", title: "Pin the queen",
      prompt: "Black's queen and king stand on the same diagonal. Pin the queen and win it!",
      fen: "r2k4/ppp1q1pp/8/8/7P/8/PPP2PP1/R1B2RK1 w - - 0 1", goal: "moves", solution: ["c1g5"],
      hint: "Your bishop can reach g5, and your h-pawn protects that square.",
      explain: "Bg5 pins the queen: she can't leave the line without exposing her king. Taking the bishop doesn't help, because the pawn takes back. A queen for a bishop!",
    },
    {
      id: "hiddenrook", cat: "tactics2", title: "The hidden rook",
      prompt: "Your bishop is hiding your rook. Move the bishop so the rook gives check, and attack the queen at the same time!",
      fen: "4k3/pp3ppp/8/8/q3B3/8/5PPP/4R1K1 w - - 0 1", goal: "moves", solution: ["e4c2", "e8d8", "c2a4"],
      accept: ["e4c6"],
      hint: "Which bishop moves attack the queen on a4?",
      explain: "This is a discovered check: the bishop moves away and the rook behind it gives check. Black must save the king, so the queen is lost.",
    },
    {
      id: "petrov", cat: "tactics2", title: "Petrov's trap",
      prompt: "Your queen is aiming at the black king, but your own knight is in the way. Move the knight with check and attack the queen!",
      fen: "rnbqkb1r/pppp1ppp/5n2/4N3/8/8/PPPPQPPP/RNB1KB1R w KQkq - 2 5", goal: "moves", solution: ["e5c6", "f8e7", "c6d8"],
      verify: { depth: 5 },
      hint: "Which knight move attacks d8?",
      explain: "Nc6+ is a discovered check from your queen, and the knight attacks the black queen too. Black must deal with the check, and then you take the queen. Players fall into this trap in the Petrov Defence.",
    },

    // ---------- Endgame skills ----------
    {
      id: "opposition", cat: "endgame", title: "The opposition",
      prompt: "Your king stands in front of your pawn. Find the king move that helps the pawn get all the way to the end!",
      fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", goal: "moves", solution: ["e6d6"],
      accept: ["e6f6"], verify: { depth: 10 },
      hint: "Step to the side, but stay on the 6th row so the black king can't get in front of your pawn.",
      explain: "Kd6 (or Kf6) keeps control of the squares in front of the pawn. Now the pawn walks forward with the king guarding it, and becomes a queen. Stepping back to the 5th row would let Black hold a draw.",
    },
    {
      id: "square", cat: "endgame", title: "The square of the pawn",
      prompt: "Black's pawn is running to become a queen! Can your king catch it? Find the right step.",
      fen: "k7/8/8/2p4K/8/8/8/8 w - - 0 1", goal: "moves", solution: ["h5g5"],
      accept: ["h5g4"], verify: { depth: 10 },
      hint: "Imagine a square from the pawn down to the bottom row. Your king has to step inside it.",
      explain: "Draw a square from the pawn to the last row (here from c5 to g1). If your king can step into the square, it catches the pawn. Kg5 or Kg4 does it; any other move is too slow.",
    },
    {
      id: "kingapproach", cat: "endgame", title: "Bring the king",
      prompt: "Checkmate in 2. The rook can't do it alone. Which piece should move first?",
      fen: "7k/8/5K2/8/8/8/8/R7 w - - 0 1", goal: "mate", mateIn: 2, solution: ["f6f7", "h8h7", "a1h1"],
      hint: "Bring your king one step closer.",
      explain: "The king steps closer to take away escape squares, and then the rook gives checkmate on the edge. In the endgame, the king is a fighting piece!",
    },

    // ---------- Finish it yourself ----------
    {
      id: "finishrooks", cat: "finish", title: "Two rooks vs king",
      prompt: "Checkmate the black king in 10 moves or fewer. The computer will try to run away!",
      fen: "8/8/8/3k4/8/8/8/R3K2R w - - 0 1", goal: "finish", maxMoves: 10, solution: [],
      hint: "Use the rooks like a ladder: one blocks a row, the other gives check on the next row.",
      explain: "Well done! The rook ladder pushes the king to the edge one row at a time.",
    },
    {
      id: "finishqueen", cat: "finish", title: "Queen vs king",
      prompt: "Checkmate with your queen and king in 15 moves or fewer. Careful not to stalemate!",
      fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", goal: "finish", maxMoves: 15, solution: [],
      hint: "Use the queen to shrink the king's box (stay a knight's jump away from it), then bring your own king to help.",
      explain: "Squeeze the king to the edge with the queen, bring your king close, then give checkmate. Always make sure the black king still has a move!",
    },

    // =================== Tier 3: Master ===================

    // ---------- Checkmate in 3 and 4 ----------
    {
      id: "reti", cat: "mate3", title: "R\u00e9ti's queen sacrifice",
      prompt: "Vienna, 1910. Richard Réti found a stunning finish against Tartakower. Checkmate in 3!",
      fen: "rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9", goal: "mate", mateIn: 3, solution: ["d3d8", "e8d8", "d2g5", "d8e8", "d1d8"],
      hint: "Give away your queen with check on d8.",
      explain: "Qd8+! Kxd8, then Bg5+ is a double check from the bishop and the rook. If Kc7, Bd8 is mate; if Ke8, Rd8 is mate.",
    },
    {
      id: "anastasia3", cat: "mate3", title: "Anastasia in 3",
      prompt: "Checkmate in 3. Start with a knight check, and then you know the pattern!",
      fen: "5rk1/6pp/8/3N4/8/4R2Q/5PPP/6K1 w - - 0 1", goal: "mate", mateIn: 3, solution: ["d5e7", "g8h8", "h3h7", "h8h7", "e3h3"],
      hint: "Knight to e7 with check.",
      explain: "Ne7+ drives the king into the corner, then Qxh7+! Kxh7 and Rh3 is mate. Spotting a pattern you already know is a superpower.",
    },
    {
      id: "rookking3", cat: "mate3", title: "Rook and king team",
      prompt: "Checkmate in 3 with just a rook and a king. The first move is a quiet king move!",
      fen: "6k1/4K3/8/2R5/8/8/8/8 w - - 0 1", goal: "mate", mateIn: 3, solution: ["e7f6", "g8h8", "f6f7", "h8h7", "c5h5"],
      hint: "Bring your king to f6.",
      explain: "Kf6! keeps the black king on the edge. Wherever it goes, your king follows, and the rook gives checkmate from the side.",
    },
    {
      id: "nostalemate3", cat: "mate3", title: "Squeeze, don't stalemate",
      prompt: "Checkmate in 3. Most queen moves let the king escape or leave it with no moves at all (stalemate). Find the careful one!",
      fen: "7k/8/8/7K/2Q5/8/8/8 w - - 0 1", goal: "mate", mateIn: 3, solution: ["c4c7", "h8g8", "h5g6", "g8f8", "c7d8"],
      hint: "Put the queen on the 7th row, but leave the king a square to step to.",
      explain: "Qc7! traps the king on the top row without stalemate. Then your king comes closer and the queen finishes the job.",
    },
    {
      id: "queenbox", cat: "mate3", title: "The queen's box",
      prompt: "Checkmate in 3. Your king is far away, so first your queen has to lock the black king in its corner.",
      fen: "4K2k/8/8/8/8/3Q4/8/8 w - - 0 1", goal: "mate", mateIn: 3, solution: ["d3g3", "h8h7", "e8f7", "h7h8", "g3g7"],
      hint: "A quiet queen move on the g-file locks the king in.",
      explain: "Qg3! leaves the king only h7 and h8. Your king walks to f7, and the queen gives mate on g7.",
    },
    {
      id: "philidor4", cat: "mate3", title: "Philidor's legacy",
      prompt: "The longest one yet: checkmate in 4! Your knight and queen work together, and every move is a check.",
      fen: "4r2k/5ppp/8/6N1/2Q5/8/8/6K1 w - - 0 1", goal: "mate", mateIn: 4, solution: ["g5f7", "h8g8", "f7h6", "g8h8", "c4g8", "e8g8", "h6f7"],
      hint: "Start by taking on f7 with the knight.",
      explain: "Nxf7+ Kg8, Nh6+ (double check!) Kh8, Qg8+! Rxg8 and Nf7 is a smothered mate. You solved the short version in the Beginner riddles: this is the whole story!",
    },

    // ---------- Master tricks ----------
    {
      id: "elephant", cat: "master", title: "The Elephant Trap",
      prompt: "You are Black. White just grabbed your d5 pawn with the knight. Find the surprising move that wins a piece!",
      fen: "r1bqkb1r/pppn1ppp/5n2/3N2B1/3P4/8/PP2PPPP/R2QKBNR b KQkq - 0 6", goal: "moves", solution: ["f6d5"],
      verify: { depth: 5 },
      hint: "Take the knight, even though White can then take your queen.",
      explain: "...Nxd5! If Bxd8, then ...Bb4+ forces Qd2, ...Bxd2+ Kxd2 Kxd8, and Black is a whole piece up. Giving away the queen was only a loan!",
    },
    {
      id: "breakthrough", cat: "master", title: "Pawn breakthrough",
      prompt: "Three pawns against three, and the kings are far away. Turn one of your pawns into a queen!",
      fen: "6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1", goal: "moves", solution: ["b5b6", "a7b6", "c5c6", "b7c6", "a5a6"],
      verify: { depth: 10 },
      hint: "Sacrifice the middle pawn first.",
      explain: "b6! If ...axb6 then c6!, and the a-pawn runs through. If ...cxb6, then a6! Two sacrifices clear the way for the third pawn.",
    },
    {
      id: "finishrook", cat: "master", title: "Rook vs king",
      prompt: "The hardest finish: checkmate with just a rook and a king, in 25 moves or fewer.",
      fen: "8/8/8/4k3/8/8/8/4K2R w - - 0 1", goal: "finish", maxMoves: 25, solution: [],
      hint: "Cut the king off with your rook, bring your king opposite it, and check only when the two kings face each other.",
      explain: "That's real endgame technique! A rook and king against a king is always a win, once you know how.",
    },

    // ---------- Save the game ----------
    {
      id: "stalematesave", cat: "save", title: "Stalemate rescue",
      prompt: "Black is about to checkmate you. But look: apart from your queen, you can't move anything... Find a way to make it a draw!",
      fen: "7k/8/8/8/1q6/p7/P3r3/K5Q1 w - - 0 1", goal: "moves", solution: ["g1g7", "h8g7"],
      accept: ["g1g8", "g1h1", "g1h2"], verify: { depth: 6 },
      hint: "If your queen were gone, would you have any legal move?",
      explain: "Give your queen away with check! When Black takes it, you have no legal moves and you're not in check: stalemate, a draw. (Checking with the queen again and again works too.)",
    },
    {
      id: "perpetual", cat: "save", title: "Perpetual check",
      prompt: "Black has much more material. Find a check, and keep checking forever, to save the game!",
      fen: "6k1/6p1/8/1Q6/8/8/qr3PPP/6K1 w - - 0 1", goal: "moves", solution: ["b5e8"],
      verify: { depth: 6 },
      hint: "Start with a check on e8.",
      explain: "Qe8+ Kh7, Qh5+ Kg8, Qe8+... The king can never escape the checks, so the game is drawn by repetition.",
    },
    {
      id: "retistudy", cat: "save", title: "R\u00e9ti's king walk",
      prompt: "A famous puzzle from 1921. Your king looks too far away to catch Black's pawn, and Black can catch yours. Find the move that saves the game!",
      fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1", goal: "moves", solution: ["h8g7"],
      verify: { depth: 10, onlyBest: true, deepDepth: 16 },
      hint: "Walk diagonally: one king can chase two goals at once.",
      explain: "Kg7! heads toward Black's pawn AND toward your own pawn at the same time. If Black chases your pawn, your king catches theirs; if Black's pawn runs, your pawn becomes a queen too. It's a draw.",
    },
  ];

  // ---------- Hebrew ----------
  const CATEGORIES_HE = {
    pieces: { name: "מכירים את הכלים", blurb: "איך כל כלי זז?" },
    special: { name: "מהלכים מיוחדים", blurb: "הצרחה, אן פסאן והכתרה." },
    mate1: { name: "מט במסע אחד", blurb: "מצאו את המהלך שמנצח במשחק." },
    tricks: { name: "תרגילים מחוכמים", blurb: "מזלגות, שיפודים והתקפות מפתיעות." },
    mate2: { name: "מט בשני מסעים", blurb: "חושבים שני מהלכים קדימה!" },
    mates2: { name: "מטים מתוחכמים", blurb: "מלכודות מפורסמות ומהלכים שקטים וקטלניים." },
    tactics2: { name: "תרגילים ערמומיים", blurb: "ריתוקים, מזלגות ושחים מפתיעים שזוכים בגדול." },
    endgame: { name: "סיומים", blurb: "נשארו מעט כלים: כל מהלך חשוב." },
    finish: { name: "סיימו בעצמכם", blurb: "תנו מט למחשב לפני שהמהלכים נגמרים." },
    mate3: { name: "מט בשלושה ובארבעה", blurb: "מתכננים כמה מהלכים קדימה." },
    master: { name: "תרגילי אלופים", blurb: "רעיונות עמוקים ששחקנים חזקים אוהבים." },
    save: { name: "הצילו את המשחק", blurb: "אתם מפסידים. מצאו את המהלך שמציל אתכם!" },
  };

  const PUZZLES_HE = {
    rook: {
      title: "זום, צריח!",
      prompt: "הצריח נוסע בקווים ישרים: למעלה, למטה, ימינה ושמאלה. תפסו את הרגלי השחור!",
      hint: "הסתכלו ישר למעלה מהצריח.",
      explain: "צריח יכול לנוע כמה משבצות שהוא רוצה בקו ישר, כל עוד שום דבר לא חוסם אותו.",
    },
    bishop: {
      title: "רץ באלכסון",
      prompt: "הרץ מחליק באלכסונים, כמו גולש במדרון. תפסו את הפרש השחור!",
      hint: "עקבו אחרי האלכסון מהרץ למעלה וימינה.",
      explain: "רץ תמיד נשאר על משבצות באותו צבע. הרץ הזה גר על המשבצות הכהות.",
    },
    knight: {
      title: "קפיצת פרש",
      prompt: "הפרש מוקף ברגלים! אבל פרשים קופצים בצורת האות L, ממש מעל כלים אחרים. תפסו את המלכה!",
      hint: "שתי משבצות לכיוון אחד, ואז משבצת אחת הצידה.",
      explain: "הפרש הוא הכלי היחיד שיכול לקפוץ מעל כלים אחרים. הקפיצה שלו היא שתי משבצות ועוד אחת הצידה.",
    },
    queen: {
      title: "המלכה החזקה",
      prompt: "המלכה זזה כמו צריח וגם כמו רץ. תפסו את הצריח במהלך אחד!",
      hint: "נסו אלכסון.",
      explain: "המלכה היא הכלי החזק ביותר, כי היא יכולה ללכת בכל קו ישר או אלכסון. ותראו: היא גם נותנת שח!",
    },
    king: {
      title: "זהירות, מלך!",
      prompt: "המלך צועד רק משבצת אחת בכל פעם. אכלו רגלי, אבל רק אחד מהם בטוח לאכול!",
      hint: "לרגלי ב-f3 יש חבר ששומר עליו.",
      explain: "מלך אף פעם לא יכול לזוז למשבצת שכלי של היריב מאיים עליה. הרגלי ב-f3 היה מוגן על ידי הרגלי ב-g4.",
    },
    pawn: {
      title: "כוח הרגלי",
      prompt: "רגלים הולכים ישר קדימה, אבל אוכלים באלכסון. אכלו משהו עם הרגלי שלכם!",
      hint: "הפרש חוסם את הדרך של הרגלי. איזה כלי נמצא באלכסון לפניו?",
      explain: "רגלי לא יכול לאכול את הכלי שעומד ישר מולו. במקום זה הוא צועד צעד אחד באלכסון קדימה.",
    },
    escape: {
      title: "בורחים מהשח",
      prompt: "המלך שלכם בשח! הצריח מאיים עליו. מצאו את המשבצת הבטוחה היחידה.",
      hint: "הרץ שומר על משבצת אחת, והצריח ב-a2 שומר על כל השורה השנייה.",
      explain: "כשיש שח צריך לצאת ממנו מיד: להזיז את המלך, לחסום, או לאכול את הכלי שתוקף.",
    },
    castle: {
      title: "הצרחה",
      prompt: "שמרו על המלך בעזרת הצרחה! הזיזו את המלך שתי משבצות לכיוון הצריח שמימין.",
      hint: "לחצו על המלך, ואז על המשבצת שנמצאת שתי משבצות מימינו.",
      explain: "בהצרחה המלך זז שתי משבצות והצריח קופץ מעליו. זה המהלך היחיד שבו שני כלים זזים ביחד!",
    },
    enpassant: {
      title: "אן פסאן",
      prompt: "הרגלי השחור קפץ עכשיו שתי משבצות ונחת ליד הרגלי שלכם. אפשר לאכול אותו \"בדרך\", כאילו זז רק משבצת אחת!",
      hint: "הזיזו את הרגלי שלכם באלכסון, למשבצת שמאחורי הרגלי השחור.",
      explain: "אן פסאן (בצרפתית: \"בדרך\") עובד רק במהלך שמיד אחרי שהרגלי של היריב קופץ שתי משבצות.",
    },
    promote: {
      title: "רגלי הופך למלכה",
      prompt: "כשרגלי מגיע לקצה השני של הלוח הוא יכול להפוך למלכה! הכתירו את הרגלי.",
      hint: "צעדו עם הרגלי עוד צעד אחד ובחרו במלכה.",
      explain: "זה נקרא הכתרה. המלכה החדשה אפילו נותנת שח מיד!",
    },
    underpromote: {
      title: "דווקא פרש",
      prompt: "הכתירו את הרגלי, אבל חשבו: האם מלכה היא באמת הבחירה הכי טובה כאן? זכו במלכה השחורה!",
      hint: "פרש חדש ב-e8 יאיים על שני דברים בבת אחת.",
      explain: "אפשר להכתיר למלכה, לצריח, לרץ או לפרש. כאן הפרש נותן שח וגם מאיים על המלכה.",
    },
    backrank: {
      title: "מלכודת השורה האחורית",
      prompt: "המלך השחור מסתתר מאחורי הרגלים של עצמו. מט במסע אחד!",
      hint: "המלך לא יכול לצעוד קדימה, הרגלים שלו חוסמים אותו.",
      explain: "זה מט שורה אחורית. מלך שכלוא מאחורי הרגלים של עצמו יכול להיות בסכנה!",
    },
    kiss: {
      title: "מלכה עם חבר",
      prompt: "המלך והמלכה שלכם עובדים ביחד. תנו מט למלך השחור!",
      hint: "שימו את המלכה ממש ליד המלך השחור, במקום שהמלך שלכם שומר עליה.",
      explain: "המלך השחור לא יכול לאכול את המלכה, כי המלך שלכם שומר עליה. עבודת צוות!",
    },
    smother: {
      title: "מט חנוק!",
      prompt: "המלך השחור דחוס בין הכלים של עצמו. קפיצת פרש אחת מנצחת!",
      hint: "מאיזו משבצת הפרש יאיים על h8?",
      explain: "מט חנוק: המלך כלוא בין הצריח והרגלים שלו ולא יכול לברוח מהפרש.",
    },
    ladder: {
      title: "סולם צריחים",
      prompt: "צריח אחד שומר על השורה השביעית. השתמשו בצריח השני כדי לתת מט!",
      hint: "המלך השחור לא יכול לרדת לשורה השביעית.",
      explain: "שני צריחים שעובדים כמו שלבים של סולם יכולים לדחוק מלך לקצה הלוח ולתת לו מט.",
    },
    arabian: {
      title: "פרש וצריח",
      prompt: "הפרש כבר שומר על משבצות חשובות. הביאו את הצריח בשביל המט!",
      hint: "הפרש מגן על המשבצת h7.",
      explain: "זו תבנית עתיקה שנקראת המט הערבי. הפרש מגן על הצריח ועל המשבצת g8.",
    },
    scholar: {
      title: "מלכודת ארבעת המסעים",
      prompt: "השחור עשה טעות. המלכה והרץ שלכם מכוונים שניהם לאותו רגלי חלש. מט!",
      hint: "הרגלי ב-f7 מוגן רק על ידי המלך.",
      explain: "זה נקרא מט הנער. כדאי לזכור אותו, כדי שאף אחד לא יתפוס אתכם ככה!",
    },
    fool: {
      title: "תור השחור: הניצחון הכי מהיר",
      prompt: "הפעם אתם משחקים בשחור! הלבן עשה שני מהלכי רגלי חלשים. מט במסע אחד!",
      hint: "המלכה שלכם יכולה להגיע למלך הלבן באלכסון.",
      explain: "מט השוטה הוא המט הכי מהיר שיש. הוא מראה למה לא כדאי להחליש את הרגלים שלפני המלך.",
    },
    nostalemate: {
      title: "לא לעשות תיקו!",
      prompt: "תנו מט למלך השחור הבודד. זהירות: יש מהלכים שמשאירים לשחור אפס מהלכים, וזה תיקו (פט)!",
      hint: "המלך שלכם כבר שומר על a7 ועל b7. תנו שח לאורך השורה העליונה.",
      explain: "אם המלך לא בשח אבל אין לו אף מהלך חוקי, זה פט, והמשחק נגמר בתיקו. תמיד להשאיר דרך מילוט, או לתת שח!",
    },
    fork: {
      title: "מזלג פרש",
      prompt: "מצאו מהלך פרש שמאיים על המלך וגם על הצריח באותו הזמן.",
      hint: "הסתכלו על המשבצת c7.",
      explain: "התקפה על שני כלים בבת אחת נקראת מזלג. המלך חייב לזוז, והצריח שלכם!",
    },
    pawnfork: {
      title: "מזלג רגלי",
      prompt: "גם רגלי קטן יכול לאיים על שני כלים בבת אחת. זכו בפרש!",
      hint: "צעדו קדימה, בין שני הפרשים.",
      explain: "הרגלי מאיים על שני הפרשים. השחור יכול להציל רק אחד מהם.",
    },
    skewer: {
      title: "שיפוד",
      prompt: "תנו שח למלך עם הרץ. כשהמלך יזוז, המלכה שמאחוריו בצרות!",
      hint: "שימו את הרץ על אלכסון אחד עם המלך והמלכה.",
      explain: "שיפוד מאיים על כלי חשוב, וכשהוא זז, אוכלים את הכלי שמאחוריו.",
    },
    discovered: {
      title: "התקפת הפתעה",
      prompt: "הפרש שלכם חוסם את הרץ. הזיזו את הפרש עם שח, והרץ יאיים על המלכה!",
      hint: "איזה מהלך פרש נותן שח למלך ב-e7?",
      explain: "זו התקפה נגלית: הזזה של כלי אחד חושפת התקפה של כלי אחר.",
    },
    safe: {
      title: "ארוחה חינם",
      prompt: "הצריח שלכם יכול לאכול שני כלים שונים. רק אכילה אחת בטוחה. איזו?",
      hint: "בדקו איזה כלי שחור מוגן על ידי רגלי.",
      explain: "לפני שאוכלים, תמיד לשאול: האם אפשר לאכול אותי בחזרה? הפרש לא היה מוגן, אבל הרץ היה שמור על ידי הרגלי ב-g5.",
    },
    sac: {
      title: "מלכה אמיצה",
      prompt: "ותרו על המלכה כדי להכין מט! יש לכם שני מהלכים.",
      hint: "תנו שח ב-d8. השחור חייב לאכול, ואז הצריח מגיע.",
      explain: "לפעמים לוותר על הכלי הכי חזק זו הדרך המהירה לנצח. זה נקרא הקרבה.",
    },
    philidor: {
      title: "הפרש של פילידור",
      prompt: "תרגיל מפורסם בן יותר מ-250 שנה. הקריבו את המלכה, ואז הפרש מסיים את העבודה!",
      hint: "שימו את המלכה ב-g8, ממש ליד המלך. הפרש מגן עליה.",
      explain: "השחור היה חייב לאכול עם הצריח, ואז הצריח חסם את המלך. הפרש נותן מט חנוק!",
    },
    roller: {
      title: "מכבש צריחים",
      prompt: "השתמשו בשני הצריחים כמו בסולם, כדי ללכוד את המלך השחור בשורה העליונה.",
      hint: "קודם הזיזו צריח אחד לשורה השביעית, כדי לחסום את המלך.",
      explain: "צריח אחד חוסם שורה, והשני נותן שח בקצה. זו הדרך הכי קלה לנצח עם שני צריחים.",
    },
    caro: {
      title: "מלכודת בשישה מסעים",
      prompt: "הפרשים השחורים הפריעו זה לזה. קפיצת פרש אחת היא מט!",
      hint: "הרגלי השחור ב-e7 לא יכול לזוז: המלכה שלכם מרתקת אותו למלך.",
      explain: "Nd6 הוא מט! הרגלי ב-e7 לא יכול לאכול, כי המלכה שלכם מרתקת אותו, והכלים השחורים עצמם חוסמים כל משבצת מילוט. הרבה שחקנים נפלו במלכודת הזאת בפתיחת קארו-קאן.",
    },
    legal: {
      title: "המלכודת של לגאל",
      prompt: "השחור אכל עכשיו את המלכה שלכם! אבל זו הייתה מלכודת. מט בשני מסעים!",
      hint: "התחילו בשח ב-f7.",
      explain: "Bxf7+ מכריח את המלך ל-e7, ואז Nd5 הוא מט: הרץ ושני הפרשים עובדים ביחד. למלכודת הזאת יותר מ-250 שנה!",
    },
    opera: {
      title: "משחק האופרה של מורפי",
      prompt: "ב-1858 שיחק פול מורפי את המשחק הזה באופרה בפריז. סיימו את המשחק המפורסם שלו: מט בשני מסעים!",
      hint: "ותרו על המלכה עם שח ב-b8.",
      explain: "Qb8+! הפרש חייב לאכול את המלכה, וזה משאיר את d8 לצריח שלכם: Rd8 הוא מט. אחד הסיומים המפורסמים בהיסטוריה של השחמט.",
    },
    boden: {
      title: "המט של בודן",
      prompt: "אתם משחקים בשחור. המלך הלבן מסתתר מאחורי הרגלים שלו. הקריבו את המלכה ותנו מט עם שני רצים!",
      hint: "תנו שח ב-c3. אם הרגלי אוכל, איזה רץ יכול להגיע ל-a3?",
      explain: "...Qxc3+ שובר את חומת הרגלים, ו-...Ba3 הוא מט: שני רצים שמצטלבים כמו מספריים. התבנית נקראת על שם סמואל בודן, ששיחק אותה ב-1853.",
    },
    anastasia: {
      title: "המט של אנסטסיה",
      prompt: "הפרש שלכם שומר על משבצות המילוט. הקריבו את המלכה כדי לפתוח את טור h, ואז הצריח מסיים!",
      hint: "אכלו את הרגלי ב-h7 עם שח.",
      explain: "Qxh7+! המלך אוכל, ו-Rh3 הוא מט. הפרש ב-e7 מונע מהמלך לברוח ל-g6 או ל-g8. השם בא מרומן ישן בשם \"אנסטסיה והשחמט\".",
    },
    battery: {
      title: "צריחים בטור",
      prompt: "שני הצריחים שלכם עומדים זה מאחורי זה. השתמשו בהם כדי לפרוץ את השורה האחורית!",
      hint: "אכלו ב-e8 עם הצריח הקדמי.",
      explain: "Rxe8+, המלכה אוכלת, ו-Rxe8 הוא מט. שני צריחים באותו טור נקראים סוללה: כשהראשון נאכל, השני ממשיך את העבודה.",
    },
    waiting: {
      title: "מהלך המתנה",
      prompt: "מט בשני מסעים, אבל המהלך הראשון הוא לא שח! עשו מהלך שקט שמשאיר למלך השחור רק משבצת אחת ללכת אליה.",
      hint: "שימו את הצריח בטור h.",
      explain: "Rh1! לוקח מהמלך את h7 ואת h8. המלך חייב ללכת ל-f8, ו-Rh8 הוא מט. לפעמים המהלך הכי חזק הוא מהלך שקט.",
    },
    doublecheck: {
      title: "שח כפול!",
      prompt: "הזיזו את הפרש כך שגם הפרש וגם הצריח ייתנו שח. המלך לא יכול לחסום שני שחים בבת אחת!",
      hint: "הפרש שלכם חוסם לצריח את הדרך למלך.",
      explain: "שח כפול הוא השח הכי חזק שיש: הדרך היחידה לצאת ממנו היא להזיז את המלך, וכאן אין לו לאן. מט!",
    },
    queenfork: {
      title: "מזלג מלכה",
      prompt: "מצאו שח עם המלכה שגם מאיים על הצריח בפינה.",
      hint: "חפשו משבצת באמצע הלוח, על האלכסון הארוך.",
      explain: "Qd5+ תוקף את המלך ואת הצריח ביחד. אחרי שהמלך זז, הצריח שלכם. מלכות עושות מזלגות מעולים, כי הן זזות לכל הכיוונים.",
    },
    pinqueen: {
      title: "לרתק את המלכה",
      prompt: "המלכה והמלך השחורים עומדים על אותו אלכסון. רתקו את המלכה וזכו בה!",
      hint: "הרץ שלכם יכול להגיע ל-g5, והרגלי ב-h4 מגן על המשבצת הזאת.",
      explain: "Bg5 מרתק את המלכה: היא לא יכולה לעזוב את הקו בלי לחשוף את המלך שלה. גם לאכול את הרץ לא עוזר, כי הרגלי אוכל בחזרה. מלכה תמורת רץ!",
    },
    hiddenrook: {
      title: "הצריח המוסתר",
      prompt: "הרץ שלכם מסתיר את הצריח. הזיזו את הרץ כך שהצריח ייתן שח, ובאותו הזמן תקפו את המלכה!",
      hint: "אילו מהלכי רץ מאיימים על המלכה ב-a4?",
      explain: "זה שח נגלה: הרץ זז, והצריח שמאחוריו נותן שח. השחור חייב להציל את המלך, אז המלכה אבודה.",
    },
    petrov: {
      title: "המלכודת של פטרוב",
      prompt: "המלכה שלכם מכוונת אל המלך השחור, אבל הפרש שלכם עומד בדרך. הזיזו את הפרש עם שח ותקפו את המלכה!",
      hint: "איזה מהלך פרש מאיים על d8?",
      explain: "Nc6+ הוא שח נגלה מהמלכה שלכם, והפרש גם מאיים על המלכה השחורה. השחור חייב לטפל בשח, ואז אוכלים את המלכה. במלכודת הזאת נופלים בהגנת פטרוב.",
    },
    opposition: {
      title: "אופוזיציה",
      prompt: "המלך שלכם עומד לפני הרגלי. מצאו את מהלך המלך שיעזור לרגלי להגיע עד הסוף!",
      hint: "צעדו הצידה, אבל הישארו בשורה השישית, כדי שהמלך השחור לא יוכל לעמוד מול הרגלי.",
      explain: "Kd6 (או Kf6) שומר על המשבצות שלפני הרגלי. עכשיו הרגלי יתקדם כשהמלך שומר עליו, ויהפוך למלכה. חזרה לשורה החמישית הייתה נותנת לשחור להשיג תיקו.",
    },
    square: {
      title: "ריבוע הרגלי",
      prompt: "הרגלי השחור רץ להפוך למלכה! האם המלך שלכם יכול לתפוס אותו? מצאו את הצעד הנכון.",
      hint: "דמיינו ריבוע מהרגלי ועד השורה התחתונה. המלך שלכם חייב להיכנס לתוכו.",
      explain: "ציירו ריבוע מהרגלי ועד השורה האחרונה (כאן מ-c5 עד g1). אם המלך יכול להיכנס לריבוע, הוא תופס את הרגלי. Kg5 או Kg4 עושים את זה; כל מהלך אחר איטי מדי.",
    },
    kingapproach: {
      title: "הביאו את המלך",
      prompt: "מט בשני מסעים. הצריח לא יכול לבד. איזה כלי צריך לזוז קודם?",
      hint: "קרבו את המלך שלכם צעד אחד.",
      explain: "המלך מתקרב ולוקח משבצות מילוט, ואז הצריח נותן מט בקצה. בסיום, גם המלך הוא כלי לוחם!",
    },
    finishrooks: {
      title: "שני צריחים נגד מלך",
      prompt: "תנו מט למלך השחור ב-10 מהלכים או פחות. המחשב ינסה לברוח!",
      hint: "השתמשו בצריחים כמו בסולם: אחד חוסם שורה, והשני נותן שח בשורה הבאה.",
      explain: "כל הכבוד! סולם הצריחים דוחק את המלך לקצה, שורה אחרי שורה.",
    },
    finishqueen: {
      title: "מלכה נגד מלך",
      prompt: "תנו מט עם המלכה והמלך ב-15 מהלכים או פחות. זהירות לא לעשות פט!",
      hint: "השתמשו במלכה כדי להקטין את הקופסה של המלך (הישארו במרחק קפיצת פרש ממנו), ואז הביאו את המלך שלכם לעזור.",
      explain: "דוחקים את המלך לקצה עם המלכה, מקרבים את המלך שלכם, ואז נותנים מט. תמיד לבדוק שלמלך השחור עדיין יש מהלך!",
    },
    reti: {
      title: "הקרבת המלכה של רטי",
      prompt: "וינה, 1910. ריכרד רטי מצא סיום מדהים נגד טרטקובר. מט בשלושה מסעים!",
      hint: "ותרו על המלכה עם שח ב-d8.",
      explain: "Qd8+! המלך אוכל, ואז Bg5+ הוא שח כפול מהרץ ומהצריח. אם Kc7, אז Bd8 מט; אם Ke8, אז Rd8 מט.",
    },
    anastasia3: {
      title: "אנסטסיה בשלושה",
      prompt: "מט בשלושה מסעים. התחילו בשח עם הפרש, ואת ההמשך כבר אתם מכירים!",
      hint: "פרש ל-e7 עם שח.",
      explain: "Ne7+ דוחק את המלך לפינה, ואז Qxh7+! המלך אוכל, ו-Rh3 מט. לזהות תבנית שאתם כבר מכירים זה כוח-על.",
    },
    rookking3: {
      title: "צוות צריח ומלך",
      prompt: "מט בשלושה מסעים עם צריח ומלך בלבד. המהלך הראשון הוא מהלך מלך שקט!",
      hint: "הביאו את המלך ל-f6.",
      explain: "Kf6! משאיר את המלך השחור בקצה. לאן שהוא הולך, המלך שלכם עוקב, והצריח נותן מט מהצד.",
    },
    nostalemate3: {
      title: "לדחוק בלי פט",
      prompt: "מט בשלושה מסעים. רוב מהלכי המלכה נותנים למלך לברוח, או משאירים אותו בלי מהלכים בכלל (פט). מצאו את המהלך הזהיר!",
      hint: "שימו את המלכה בשורה השביעית, אבל השאירו למלך משבצת לזוז אליה.",
      explain: "Qc7! כולא את המלך בשורה העליונה בלי פט. אחר כך המלך שלכם מתקרב, והמלכה מסיימת את העבודה.",
    },
    queenbox: {
      title: "הקופסה של המלכה",
      prompt: "מט בשלושה מסעים. המלך שלכם רחוק, אז קודם המלכה צריכה לנעול את המלך השחור בפינה.",
      hint: "מהלך מלכה שקט בטור g נועל את המלך.",
      explain: "Qg3! משאיר למלך רק את h7 ואת h8. המלך שלכם הולך ל-f7, והמלכה נותנת מט ב-g7.",
    },
    philidor4: {
      title: "המורשת של פילידור",
      prompt: "הארוכה ביותר עד עכשיו: מט בארבעה מסעים! הפרש והמלכה עובדים ביחד, וכל מהלך הוא שח.",
      hint: "התחילו באכילה ב-f7 עם הפרש.",
      explain: "Nxf7+ Kg8, Nh6+ (שח כפול!) Kh8, Qg8+! הצריח אוכל, ו-Nf7 הוא מט חנוק. את הגרסה הקצרה פתרתם בחידות המתחילים; זה הסיפור המלא!",
    },
    elephant: {
      title: "מלכודת הפיל",
      prompt: "אתם משחקים בשחור. הלבן אכל עכשיו את הרגלי ב-d5 עם הפרש. מצאו את המהלך המפתיע שזוכה בכלי!",
      hint: "אכלו את הפרש, למרות שאז הלבן יכול לאכול את המלכה שלכם.",
      explain: "...Nxd5! אם Bxd8, אז ...Bb4+ מכריח Qd2, ...Bxd2+ Kxd2 Kxd8, ולשחור יש כלי שלם יותר. הוויתור על המלכה היה רק הלוואה!",
    },
    breakthrough: {
      title: "פריצת רגלים",
      prompt: "שלושה רגלים מול שלושה, והמלכים רחוקים. הפכו אחד מהרגלים שלכם למלכה!",
      hint: "הקריבו קודם את הרגלי האמצעי.",
      explain: "b6! אם ...axb6, אז c6!, והרגלי בטור a רץ קדימה. אם ...cxb6, אז a6! שתי הקרבות פותחות את הדרך לרגלי השלישי.",
    },
    finishrook: {
      title: "צריח נגד מלך",
      prompt: "הסיום הכי קשה: מט עם צריח ומלך בלבד, ב-25 מהלכים או פחות.",
      hint: "חסמו את המלך עם הצריח, הביאו את המלך שלכם מולו, ותנו שח רק כששני המלכים עומדים זה מול זה.",
      explain: "זו טכניקת סיום אמיתית! צריח ומלך נגד מלך זה תמיד ניצחון, כשיודעים איך.",
    },
    stalematesave: {
      title: "הצלה בפט",
      prompt: "השחור עומד לתת לכם מט. אבל שימו לב: חוץ מהמלכה, אתם לא יכולים להזיז שום דבר... מצאו דרך לסיים בתיקו!",
      hint: "אם המלכה שלכם הייתה נעלמת, היה לכם בכלל מהלך חוקי?",
      explain: "תנו את המלכה עם שח! כשהשחור אוכל אותה, אין לכם אף מהלך חוקי ואתם לא בשח: פט, תיקו. (גם לתת שח שוב ושוב עם המלכה עובד.)",
    },
    perpetual: {
      title: "שח נצחי",
      prompt: "לשחור יש הרבה יותר כלים. מצאו שח, והמשיכו לתת שח לנצח, כדי להציל את המשחק!",
      hint: "התחילו בשח ב-e8.",
      explain: "Qe8+ Kh7, Qh5+ Kg8, Qe8+... המלך אף פעם לא בורח מהשחים, אז המשחק נגמר בתיקו בגלל חזרה על אותו מצב.",
    },
    retistudy: {
      title: "צעדת המלך של רטי",
      prompt: "חידה מפורסמת מ-1921. המלך שלכם נראה רחוק מדי מכדי לתפוס את הרגלי השחור, והשחור יכול לתפוס את שלכם. מצאו את המהלך שמציל את המשחק!",
      hint: "לכו באלכסון: מלך אחד יכול לרדוף אחרי שתי מטרות בבת אחת.",
      explain: "Kg7! מתקדם גם לעבר הרגלי השחור וגם לעבר הרגלי שלכם. אם השחור רודף אחרי הרגלי שלכם, המלך שלכם תופס את שלו; אם הרגלי השחור בורח קדימה, גם הרגלי שלכם הופך למלכה. תיקו.",
    },
  };

  for (const c of CATEGORIES) c.he = CATEGORIES_HE[c.id];
  for (const p of PUZZLES) p.he = PUZZLES_HE[p.id];

  const api = { TIERS, CATEGORIES, PUZZLES };
  root.SugiPuzzles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
