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
- **Chess riddles**: 56 riddles in three tiers, each riddle worth up to three stars. Progress is saved on the device.
  - 🌱 **Beginner** (27): meet the pieces, special moves, checkmate in 1 and 2, first tactics.
  - 🌳 **Explorer** (17): famous traps and quiet mates, sneaky tactics, endgame skills, and "finish it yourself" riddles where you mate a defending computer within a move limit.
  - 🌲 **Master** (12): mates in 3 and 4 (including Réti vs. Tartakower, 1910), master tricks such as the Elephant Trap and the pawn breakthrough, and "save the game" riddles: stalemate traps, perpetual check and Réti's 1921 king walk.

  Checkmate riddles accept any mate in time, not just the intended line, and the computer defends as stubbornly as it can. Explorer and Master hints come in three steps: the idea, then the piece, then the square.

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

To add a riddle, add an entry to `puzzles.js` (including its Hebrew text in `PUZZLES_HE`) and run `npm test`. The test checks every riddle with the engine:

- The position and every solution move are legal.
- Checkmate riddles are mates in exactly the stated number of moves.
- In Explorer and Master riddles, at every step the good moves are exactly the expected ones (search depth per riddle in `verify`).
- "Finish it yourself" riddles are won by the engine within the move limit against the same defence the app uses.

`DEEP=1 npm test` also runs the slow full-depth check for Réti's king walk.

## Deploy

`.github/workflows/deploy.yml` runs the tests on every push to `main` and on pull requests. For pushes to `main` it then publishes the site to GitHub Pages. In the repository settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**.
