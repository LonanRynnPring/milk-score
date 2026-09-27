# Milk Score

Paste a Commander decklist and get a **Milk Score** from 0–100: the average
"obscurity" of the deck's cards, weighted by how rarely EDHREC says the format
actually plays each one. Staples score low, deep cuts score high. Basic lands
are excluded entirely.

Live: **https://lonanrynnpring.github.io/milk-score/**

## How it works

Every card carries an EDHREC play-rank (rank 1 = most-played card in
Commander). Rank is compressed with a fractional exponent so the crowded top
of the ladder doesn't dominate the average:

```
card milk = 100 × (rank ÷ maxRank) ^ 0.4     unranked card = 100
deck milk = average card milk, weighted by copies
```

Card names and ranks ship as a static snapshot in `cards.json` (built from
Scryfall's Oracle Cards bulk data) rather than being queried live, so the page
has no server and no API key.

## Files

- `index.html` — the app (single file, no build step)
- `cards.json` — card name → EDHREC rank snapshot, ~36k cards
- `tools/update-cards.mjs` — regenerates `cards.json` from Scryfall's bulk
  data; run `node tools/update-cards.mjs` occasionally to pick up new sets

## Hosting

Static site, no build step. Served via GitHub Pages from `main` / root.
