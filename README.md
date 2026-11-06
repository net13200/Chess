# Sugi Chess

A friendly chess game for kids, part of [SugiGames](https://net13200.github.io/SugiGames/).

**Play it:** https://net13200.github.io/Chess/

- **Play a friend**: two players on one screen, with a button to turn the board around.
- **Play the computer**: six levels named after growing plants.
  - 🌱 Seedling makes lots of silly moves.
  - 🍃 Leaf plays for fun and sometimes spots a free piece.
  - 🪴 Little Plant likes to capture and is starting to guard its pieces.
  - 🌿 Sprout grabs pieces but misses traps.
  - 🌳 Sapling thinks a few moves ahead.
  - 🌲 Cedar is a careful player.
- **Chess riddles**: 27 practice riddles in five groups.
  - Meet the pieces
  - Special moves: castling, en passant and promotion
  - Checkmate in 1
  - Clever tricks: forks, skewers and discovered attacks
  - Checkmate in 2

  Each riddle earns up to three stars, and progress is saved on the device.

It's built for kids: big pieces with friendly faces, and dots that show where the tapped piece can go. You can tap or drag pieces. Undo and hints are always available, along with gentle sounds (which can be muted) and confetti when you win. It opens with the SugiGames logo animation and works offline once it has loaded.

**Languages:** English and Hebrew (עברית), with a full right-to-left layout. Use the button on the home screen to switch. The app starts in Hebrew when the device language is Hebrew, and `?lang=he` or `?lang=en` in the address picks one directly.

## How it's built

It's a static site with no build step and no dependencies.

| File | What it does |
| --- | --- |
| `engine.js` | Chess rules: legal moves, check, mate, stalemate, the 50-move rule, repetition and insufficient material. Also has the alpha-beta search used by the computer levels and the riddle checker. |
| `ai-worker.js` | Runs the computer player in a Web Worker so the board stays smooth. |
| `puzzles.js` | The riddles, written as FEN plus the solution in UCI, with Hebrew text for each. |
| `i18n.js` | All English and Hebrew interface text. |
| `pieces.js` | The piece artwork, drawn as inline SVG. |
| `app.js`, `style.css`, `index.html` | The app itself. |
| `splash.js` | The SugiGames logo animation, shared with the portal. |

## Develop

```sh
npm start   # serves on http://localhost:8000
npm test    # perft move-generation tests + checks every riddle with the engine
```

To add a riddle, add an entry to `puzzles.js` (including its Hebrew text in `PUZZLES_HE`) and run `npm test`. The test checks that the position is legal and the solution is legal. For checkmate riddles it confirms the mate. For trick riddles it confirms that no other move is about as good.

## Deploy

`.github/workflows/deploy.yml` runs the tests on every push to `main` and on pull requests. For pushes to `main` it then publishes the site to GitHub Pages. In the repository settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**.
