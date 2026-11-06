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

  const CATEGORIES = [
    { id: "pieces", name: "Meet the pieces", emoji: "♞", color: "#ff5e8a", blurb: "How does each piece move?" },
    { id: "special", name: "Special moves", emoji: "✨", color: "#e8913a", blurb: "Castling, en passant and promotion." },
    { id: "mate1", name: "Checkmate in 1", emoji: "👑", color: "#5b6ee1", blurb: "Find the move that wins the game." },
    { id: "tricks", name: "Clever tricks", emoji: "🎩", color: "#2fae64", blurb: "Forks, skewers and sneaky attacks." },
    { id: "mate2", name: "Checkmate in 2", emoji: "🏆", color: "#9b59d0", blurb: "Think two moves ahead!" },
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
  ];

  // ---------- Hebrew ----------
  const CATEGORIES_HE = {
    pieces: { name: "מכירים את הכלים", blurb: "איך כל כלי זז?" },
    special: { name: "מהלכים מיוחדים", blurb: "הצרחה, אן פסאן והכתרה." },
    mate1: { name: "מט במסע אחד", blurb: "מצאו את המהלך שמנצח במשחק." },
    tricks: { name: "תרגילים מחוכמים", blurb: "מזלגות, שיפודים והתקפות מפתיעות." },
    mate2: { name: "מט בשני מסעים", blurb: "חושבים שני מהלכים קדימה!" },
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
  };

  for (const c of CATEGORIES) c.he = CATEGORIES_HE[c.id];
  for (const p of PUZZLES) p.he = PUZZLES_HE[p.id];

  const api = { CATEGORIES, PUZZLES };
  root.SugiPuzzles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this);
