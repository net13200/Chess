/* Friendly chess pieces with little faces, drawn as inline SVG (viewBox 0 0 100 100). */
(function (root) {
  "use strict";

  const THEMES = {
    w: { fill: "#fffaf0", shade: "#efe1c4", line: "#4a3b6b", eye: "#3a2e5c", cheek: "#ffb3c6" },
    b: { fill: "#5a4a86", shade: "#45366f", line: "#22183a", eye: "#ffffff", cheek: "#ff8fb1" },
  };

  const BASE = '<path class="pc-shade" d="M22 83 Q22 77 28 77 H72 Q78 77 78 83 V89 H22 Z"/>';

  function face(cx, cy, k) {
    const e = k.eye;
    return (
      `<circle cx="${cx - 5.5}" cy="${cy}" r="2.7" fill="${e}" stroke="none"/>` +
      `<circle cx="${cx + 5.5}" cy="${cy}" r="2.7" fill="${e}" stroke="none"/>` +
      `<ellipse cx="${cx - 10}" cy="${cy + 5}" rx="2.8" ry="1.7" fill="${k.cheek}" stroke="none" opacity="0.8"/>` +
      `<ellipse cx="${cx + 10}" cy="${cy + 5}" rx="2.8" ry="1.7" fill="${k.cheek}" stroke="none" opacity="0.8"/>` +
      `<path d="M${cx - 4} ${cy + 5} Q${cx} ${cy + 8.5} ${cx + 4} ${cy + 5}" fill="none" stroke="${e}" stroke-width="2.2" stroke-linecap="round"/>`
    );
  }

  const SHAPES = {
    p: (k) =>
      BASE +
      '<path d="M34 78 C34 66 42 60 44 52 H56 C58 60 66 66 66 78 Z"/>' +
      '<rect class="pc-shade" x="37" y="47" width="26" height="8" rx="4"/>' +
      '<circle cx="50" cy="33" r="15"/>' + face(50, 32, k),
    r: (k) =>
      BASE +
      '<path d="M32 78 L35 48 H65 L68 78 Z"/>' +
      '<path d="M27 20 H38 V28 H45 V20 H55 V28 H62 V20 H73 V44 Q73 49 68 49 H32 Q27 49 27 44 Z"/>' +
      `<path d="M34 62 H66 M35 70 H65" fill="none" stroke="${k.line}" stroke-width="2.5" opacity="0.4"/>` + face(50, 35, k),
    n: (k) =>
      BASE +
      '<path d="M70 78 H32 C32 66 38 60 44 55 C36 57 28 57 24 51 C20 46 22 40 28 36 L41 24 C43 16 50 11 56 11 L58 4 L64 12 C75 18 79 32 77 47 C75 61 70 67 70 78 Z"/>' +
      `<path d="M61 15 C70 24 72 42 67 60" fill="none" stroke="${k.line}" stroke-width="3" stroke-linecap="round" opacity="0.45"/>` +
      `<circle cx="47" cy="29" r="3.4" fill="${k.eye}" stroke="none"/>` +
      `<circle cx="29.5" cy="44" r="1.9" fill="${k.eye}" stroke="none"/>` +
      `<ellipse cx="44" cy="40" rx="3" ry="1.8" fill="${k.cheek}" stroke="none" opacity="0.8"/>` +
      `<path d="M27 51 Q31 53.5 35 51" fill="none" stroke="${k.eye}" stroke-width="2.2" stroke-linecap="round"/>`,
    b: (k) =>
      BASE +
      '<path d="M36 78 C38 67 42 61 43 56 H57 C58 61 62 67 64 78 Z"/>' +
      '<rect class="pc-shade" x="35" y="51" width="30" height="8" rx="4"/>' +
      '<path d="M50 13 C65 23 69 39 62 52 H38 C31 39 35 23 50 13 Z"/>' +
      '<circle cx="50" cy="9" r="5"/>' +
      `<path d="M57 21 L49 30" fill="none" stroke="${k.line}" stroke-width="3" stroke-linecap="round"/>` +
      face(50, 39, k),
    q: (k) =>
      BASE +
      '<path d="M32 78 C34 67 40 61 42 55 H58 C60 61 66 67 68 78 Z"/>' +
      '<rect class="pc-shade" x="36" y="50" width="28" height="8" rx="4"/>' +
      '<circle cx="50" cy="38" r="14"/>' +
      '<path class="pc-crown" d="M36 29 L33 14 L42 21 L50 10 L58 21 L67 14 L64 29 Z"/>' +
      '<circle class="pc-crown" cx="33" cy="13" r="3.6"/><circle class="pc-crown" cx="50" cy="8.5" r="3.6"/><circle class="pc-crown" cx="67" cy="13" r="3.6"/>' +
      face(50, 39, k),
    k: (k) =>
      BASE +
      '<path d="M29 78 C31 66 38 61 41 55 H59 C62 61 69 66 71 78 Z"/>' +
      '<rect class="pc-shade" x="34" y="50" width="32" height="8" rx="4"/>' +
      '<circle cx="50" cy="39" r="14"/>' +
      '<path class="pc-crown" d="M35 30 V17 L42.5 23 L50 16 L57.5 23 L65 17 V30 Z"/>' +
      '<path class="pc-crown" d="M47 2 H53 V6 H57 V11 H53 V17 H47 V11 H43 V6 H47 Z"/>' +
      face(50, 40, k),
  };

  // color: "w" | "b", type: one of "pnbrqk"
  function pieceSvg(color, type) {
    const k = THEMES[color];
    return (
      `<svg class="piece-svg" viewBox="0 0 100 100" aria-hidden="true" ` +
      `fill="${k.fill}" stroke="${k.line}" stroke-width="3.5" stroke-linejoin="round" ` +
      `style="--shade:${k.shade}">` +
      SHAPES[type](k) +
      "</svg>"
    );
  }

  const NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

  root.SugiPieces = { pieceSvg, NAMES };
})(typeof self !== "undefined" ? self : this);
