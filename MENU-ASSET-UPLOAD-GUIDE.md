# BARAMEEL Menu Artwork — Upload Guide

Target branch: `clean-development`

## 1. Menu Families Home
Upload only the Home screen's reusable category artwork to:

`assets/menu-families-home/`

Use the exact canonical `.webp` filenames listed in [assets/menu-families-home/README.txt](assets/menu-families-home/README.txt). These files are loaded by `menu-families-home.js`.

## 2. V Fries family, product detail, and anatomy screens
These are separate screens. Their full-screen artwork belongs in:

`assets/barameel-menu/`

Exact filenames:
- `01-menu-categories.webp` — menu categories artwork
- `02-v-fries-family.webp` — V Fries family artwork
- `03-nano-volt-product.webp` — Nano Volt product detail artwork
- `04-nano-volt-anatomy.webp` — Nano Volt anatomy artwork

Do not put these four full-screen artworks in the Home folder.

## Upload rules
- Preserve the exact filenames, spelling, hyphens, and lowercase extension `.webp`.
- Keep interactive controls as HTML/CSS/JS overlays; artwork is the visual background only.
- Replace an existing image only when its new artwork is approved for that exact screen.
- Upload to the `clean-development` branch.
