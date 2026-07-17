// ACH key→glyph map (ARCH-A3 / GAP-2). The server sends the achievement `key` (a1_first_print …
// b8_the_regifter) — the api-contract draws a `glyph`, so the CLIENT owns the key→icon mapping. Each
// entry is a set of react-native-svg path `d` strings drawn on a 0 0 24 24 viewBox (stroke = the tier
// colour, set on the <Svg> so it inherits — the mockup <use>-sprite lesson). A NEW seeded key that
// isn't here falls back to DEFAULT_GLYPH (a trophy) — no blank tile. `MYSTERY_GLYPH` is the locked ???
// slot's lock. Adding an egg is a seed edit (ACH-01); its glyph is a one-line addition here.
//
// The 18 seeded keys (decision 0077): a1_first_print · a2_press_operator · a3_shelf_starter ·
// a5_player_two · a6_full_lobby · a7_good_taste · a9_contributor · a10_ladder_graduate · a12_beaten_path
// · a13_first_adoption · a14_house_style · a15_cornerstone · b1_neat_freak · b3_renaissance ·
// b4_patron_of_the_arts · b6_night_shift · b7_strawberry_hunter · b8_the_regifter.

/** An achievement glyph = an ordered list of SVG `<Path d>` strings (fill:none, stroke inherited). */
export type GlyphPaths = readonly string[];

// A trophy — the default for any key not explicitly mapped (never a blank tile).
export const DEFAULT_GLYPH: GlyphPaths = ['M7 4h10v4a5 5 0 0 1-10 0V4z', 'M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3', 'M9 18h6M10 14v4M14 14v4'];

// The locked-secret lock (the ??? mystery slot + the D3 sealed sheet).
export const MYSTERY_GLYPH: GlyphPaths = ['M5 11h14v9H5z', 'M8 11V8a4 4 0 0 1 8 0v3'];

const GLYPHS: Record<string, GlyphPaths> = {
  // ── milestones (standard) ──────────────────────────────────────────────────────────────────────
  a1_first_print: ['M12 16V5', 'M7 10l5-5 5 5', 'M5 19h14'], // publish first card — upload
  a2_press_operator: ['M4 6h12v14H4z', 'M8 4h12v14', 'M8 20h8'], // more cards — a press stack
  a3_shelf_starter: ['M3.5 3.5h7v7h-7z', 'M13.5 3.5h7v7h-7z', 'M3.5 13.5h7v7h-7z', 'M13.5 13.5h7v7h-7z'], // collection — 4-grid
  a5_player_two: ['M9 8a3.2 3.2 0 1 0 0-.01', 'M3.5 19a5.5 5.5 0 0 1 11 0', 'M17.5 9a2.6 2.6 0 1 0 0-.01', 'M16 19a5 5 0 0 1 6-4.8'], // first friend — two people
  a6_full_lobby: ['M12 8a3 3 0 1 0 0-.01', 'M6.5 19a5.5 5.5 0 0 1 11 0', 'M4 9.5a2.4 2.4 0 1 0 0-.01', 'M2.5 18a4.4 4.4 0 0 1 3-4.2', 'M20 9.5a2.4 2.4 0 1 0 0-.01', 'M21.5 18a4.4 4.4 0 0 0-3-4.2'], // full lobby — a crowd
  a7_good_taste: ['M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 17.5 6.4 20.5 8 14.2l-5-4.2 6.5-.5z'], // taste — star
  a9_contributor: ['M5 20V9l7-5 7 5v11', 'M9 20v-6h6v6'], // add a game — home
  a10_ladder_graduate: ['M4 20h4v-4H4z', 'M10 20h4v-9h-4z', 'M16 20h4V6h-4z'], // daily ladder — steps
  a12_beaten_path: ['M6 21V4', 'M6 4h11l-2 4 2 4H6'], // beat games — a flag
  // ── milestones (prestige) ──────────────────────────────────────────────────────────────────────
  a13_first_adoption: ['M12 20s-7-4.4-7-9.5A3.5 3.5 0 0 1 12 9a3.5 3.5 0 0 1 7 1.5C19 15.6 12 20 12 20z'], // adopted — heart
  a14_house_style: ['M4 20l4-1 9.5-9.5-3-3L5 16z', 'M14.5 6.5l3 3'], // signature style — brush
  a15_cornerstone: ['M4 13h7v7H4z', 'M13 13h7v7h-7z', 'M8.5 4h7v7h-7z'], // reach — stacked blocks
  // ── secrets (magenta) ──────────────────────────────────────────────────────────────────────────
  b1_neat_freak: ['M4 5h16v15H4z', 'M4 9h16', 'M9 14l2 2 4-4'], // tidy — a checked board
  b3_renaissance: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2z'], // range — a compass
  b4_patron_of_the_arts: ['M12 20s-7-4.4-7-9.5A3.5 3.5 0 0 1 12 9a3.5 3.5 0 0 1 7 1.5C19 15.6 12 20 12 20z', 'M12 3l1.3 3 3 .2-2.3 2 .8 2.9L12 9.4'], // patron — heart+star
  b6_night_shift: ['M20 13.5A8 8 0 1 1 10.5 4 6.2 6.2 0 0 0 20 13.5z'], // night — moon
  b7_strawberry_hunter: ['M12 8c4 0 6 3 6 6a6 6 0 0 1-12 0c0-3 2-6 6-6z', 'M12 8V5', 'M9 5h6'], // strawberry
  b8_the_regifter: ['M4 9h16v11H4z', 'M4 9h16', 'M12 9v11', 'M12 9c-2-4-6-3-4 0M12 9c2-4 6-3 4 0'], // gift box
};

/** The glyph paths for a seeded key, or the trophy default (unknown key → no blank tile). */
export function glyphForKey(key: string | undefined): GlyphPaths {
  return (key && GLYPHS[key]) || DEFAULT_GLYPH;
}
