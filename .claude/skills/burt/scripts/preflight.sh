#!/usr/bin/env bash
# Burt pre-flight — the mechanical DS-compliance net for an InGame screen mockup.
# Usage:  bash preflight.sh <path/to/mockup.html>
#
# Every hit is a CANDIDATE, not a confirmed violation — greps can't read intent.
# Confirm each by reading the cited line, then do the rule-by-rule pass. This only
# tells Burt WHERE to look. Exit code is always 0 (informational).

set -u
F="${1:-}"
if [ -z "$F" ] || [ ! -f "$F" ]; then
  echo "Burt pre-flight: file not found — usage: bash preflight.sh <mockup.html>" >&2
  exit 0
fi

hr() { printf '%s\n' "------------------------------------------------------------"; }
section() { printf '\n### %s\n' "$1"; }
# run a grep; print results or "— clean —"
net() {
  local title="$1"; shift
  section "$title"
  local out; out="$("$@" 2>/dev/null)"
  if [ -n "$out" ]; then printf '%s\n' "$out"; else printf '  — clean —\n'; fi
}

echo "Burt pre-flight · $F"
hr

# F-06 — on-screen Chakra-Petch type off the 21/15/11/9 scale (shorthand form).
# Leading space before the size avoids matching e.g. 8px inside 18px. Doc-chrome + card plates excluded.
f06_short() {
  grep -nE 'font:[^;}]*( 8px| 8\.5px| 10px| 10\.5px| 12px| 12\.5px| 13px| 14px| 16px| 17px| 18px| 19px| 20px)[^;}]*var\(--pk\)' "$F" \
    | grep -vE '\.plate|canvas-head|\.caption|stage-label|artboard-label'
}
net "F-06 off-scale type (shorthand, var(--pk)) → snap to 21/15/11/9" f06_short

# F-06 — explicit/inline font-size overrides off the scale (catch style="font-size:17px" etc.).
f06_inline() {
  grep -nE 'font-size:\s*(8|8\.5|10|10\.5|12|12\.5|13|14|16|17|18|19|20)px' "$F" \
    | grep -vE 'nav-lbl\.big'
}
net "F-06 off-scale font-size overrides (confirm on-screen vs doc-chrome)" f06_inline

# F-08 — a third font voice (only Chakra Petch + Paytone One allowed).
f08_font() { grep -niE "font[^;]*(arial|helvetica|times|courier|silkscreen|system-ui|-apple-system|monospace|\bserif\b|sans-serif)" "$F"; }
net "F-08 foreign font (only Chakra Petch + Paytone One) — sans-serif fallback in --pk/--shell defs is OK" f08_font

# F-08 — confirm the print-onload font load + noscript fallback are present (absence is the finding).
f08_load() {
  grep -nE 'media="print"|<noscript' "$F" | head -3
}
net "F-08 font-load pattern present? (expect a media=print link + a <noscript> fallback)" f08_load

# F-02 — gold-TOKEN uses: each must be acquisitive — card-creating (ADD a card), the PIXELS economy
# (currency/PriceChip/BuyBar/CLAIM, ECON-01), or a primary add-to-collection/queue — or the Store nav key.
# (GameCard art/plate shades like #f0d36e are card faces, not the gold token — not F-02's concern.)
f02_gold() { grep -nE '\-\-gold\b|#ffd23f' "$F"; }
net "F-02 gold (--gold/#ffd23f) — confirm each is acquisitive (card / PIXELS / add-to-collection) or the Store nav key, NOT a non-acquisitive button" f02_gold

# F-03 — raised drop-edge / press-travel on SCREEN controls (should be flat Inset-Recess). Shell nav keys excluded.
f03_3d() {
  grep -nE 'filter:\s*drop-shadow\(0 [0-9]+px 0|box-shadow:[^;]*\b0 3px 0|translateY' "$F" \
    | grep -vE '\.nav-btn|nav-item'
}
net "F-03 raised-edge / travel on screen (owner pick = FLAT) — shell nav keys (0 4px 0) excluded & OK" f03_3d

# F-05 / F-09 — pink shell accent rendered on screen (on-screen selection must be the orange StateMark).
f05_pink() { grep -nE 'background:[^;]*(--accent\b|#ff3d77)' "$F"; }
net "F-05/F-09 pink --accent as a background — confirm it's the SHELL pip/LED, not on-screen selection" f05_pink

# F-07 — border-radius on on-screen chrome (rounding lives on plastic only). Shell classes excluded.
f07_radius() {
  grep -nE 'border-radius:\s*[1-9]' "$F" \
    | grep -vE '\.device|\.screen|screen-bezel|\.nav-btn|\.screw|\.led|\.pip|grille|mini-dev|\.power|caption|canvas-head|artboard-label|stage-label|border-radius:\s*0\b'
}
net "F-07 on-screen border-radius (screen chrome is 90°; the step is a clip-path) — shell classes excluded" f07_radius

# F-01 — GameCard SIZE must be one of the catalog 5: /hero 138x193 · /grid 161x225 · /cell 96x134 · /mini 64x89 · /thumb 44x62.
# A correct 63:88 ratio is necessary but NOT sufficient — the size must be a catalog size, not a custom
# in-between (e.g. a hand-rolled 28x39 "peek"). Flags any .gcard.* whose width isn't 138/161/96/64/44.
gcard_size() {
  grep -nE '\.gcard\.[a-z0-9-]+\s*\{[^}]*width:\s*[0-9]+px' "$F" \
    | grep -vE 'width:\s*(138|161|96|64|44)px'
}
net "F-01 GameCard OFF the 5-size guide (allowed widths 138/161/96/64/44; ratio-right ≠ size-right)" gcard_size

# Standalone hygiene — raster artifacts + external (non-font) deps.
raster() { grep -nE '\.png|\.jpe?g|\.webp|<img ' "$F"; }
net "Raster artifacts / <img> (repo is HTML-only; SVG must be built-in)" raster
extdep() { grep -nE '<script src=|<link [^>]*href=' "$F" | grep -vE 'fonts\.googleapis|fonts\.gstatic'; }
net "External non-font deps (artboards must be self-contained)" extdep

# PIXELS mark on a non-commerce screen.
pixels() { grep -nE 'ic-pix|PIXELS' "$F"; }
net "PIXELS mark / ic-pix — only valid on Store/economy surfaces" pixels

hr
echo "Pre-flight done. Candidates only — confirm each by reading the line, then run the rule-by-rule pass (SKILL.md)."
