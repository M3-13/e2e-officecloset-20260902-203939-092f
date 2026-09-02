# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkle, warme Red-Carpet-Optik: tiefes Anthrazit und Elfenbein mit Champagner-Gold als Akzent – glamourös und hochwertig, aber ruhig genug für eine klare Garderoben-Verwaltung.

## Colors

- `--color-bg`: **#14120F**
- `--color-surface`: **#1E1B17**
- `--color-surface_raised`: **#26221C**
- `--color-fg`: **#F4EDE1**
- `--color-muted`: **#A79C8B**
- `--color-border`: **#3A3429**
- `--color-accent`: **#C9A227**
- `--color-accent_hover`: **#DCB84E**
- `--color-accent_active`: **#A3841F**
- `--color-wine`: **#7B2D3B**
- `--color-danger`: **#C0504D**
- `--color-success`: **#7A9E7E**
- `--color-overlay`: **rgba(20,18,15,0.82)**

## Typography

- `font_family`: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif
- `heading_font`: Didot, 'Bodoni MT', 'Playfair Display', Georgia, 'Times New Roman', serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: 13px / 15px / 16px / 20px / 28px / 36px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 10px
- `--radius-lg`: 20px
- `--radius-pill`: 999px

## Components

### Button

min-height 44px (mobile touch), padding 12px 24px, radius pill, font-weight 600, letter-spacing 0.02em; Primär: bg=accent, text=bg, border none; hover: bg=accent_hover; active: bg=accent_active; disabled: opacity 0.45, cursor not-allowed; Sekundär: bg transparent, border 1px accent, text accent, hover bg rgba(201,162,39,0.12); Gefahr: bg transparent, border 1px danger, text danger, hover bg rgba(192,80,77,0.12); Fokus-Ring: 3px rgba(201,162,39,0.35), offset 2px.

### Card

bg=surface, border 1px border, radius lg, padding 24px (16px mobil), box-shadow 0 12px 30px rgba(0,0,0,0.35); Hover (interaktiv): translateY(-2px), border accent bei Hover, Übergang 160ms ease.

### Input

min-height 44px, padding 12px 16px, radius md, bg=surface, text=fg, border 1px border; placeholder: muted; focus: border accent + box-shadow 0 0 0 3px rgba(201,162,39,0.25); Fehler: border danger, Hilfetext danger; Label: 13px, muted, margin-bottom 8px.

### FilterChip

min-height 36px, padding 8px 16px, radius pill, border 1px border, bg=surface, text=fg, cursor pointer; active: bg=accent, text=bg, border accent; hover (inaktiv): border accent, text accent; Übergang 120ms ease.

### Nav

sticky top, height 64px, bg rgba(20,18,15,0.88) mit backdrop-filter blur(10px), border-bottom 1px border; Logo/Schriftzug in heading_font, 20px, text=accent; Links: 15px, muted, hover fg, aktiver Link accent; mobil: Hamburger-Menü mit Dropdown bg=surface_raised.

### Modal

Overlay: bg=overlay, z-index 100, zentriert; Panel: bg=surface, radius lg, border 1px border, max-width 560px, width calc(100% - 32px), padding 32px; Titel heading_font 28px; Schließen-Button 44px, Icon muted, hover fg.

### Toast

fixed unten rechts, bg=surface_raised, border 1px border, border-left 4px accent, radius md, padding 16px, min-width 280px, box-shadow 0 16px 40px rgba(0,0,0,0.5); Erfolg: border-left success; Fehler: border-left danger; Text 15px, Dauer ~4s, Übergang fade/slide.

### GarmentTile

Card-Variante: Bildbereich 3:4, bg=surface_raised, Bild object-fit cover, radius md innen; darunter Name 15px fw 600, Kategorie/Farbe 13px muted; Aktionen (Bearbeiten/Löschen) als 44px Icon-Buttons oben rechts mit bg rgba(20,18,15,0.6) über dem Bild.

### OutfitCard

Card-Variante: horizontale Miniatur-Leiste der enthaltenen Kleidungsstücke (44px Mini-Thumbnails, radius sm, Lücken 8px), Name 16px fw 600, Meta 13px muted; Aktionen als Text-Buttons unterhalb.

## Layout Principles

- Container max-width 1200px, zentriert, Padding 24px mobil / 48px ab 1024px.
- Breakpoints: 640px (mobil), 1024px (Desktop); unter 640px einspaltig, ab 640px zweispaltig, ab 1024px mehrspaltige Raster.
- Garderobe als responsives Grid: auto-fill, minmax(180px, 1fr), Gap 24px; auf mobil 2 Spalten mit minmax(140px, 1fr).
- Outfit-Creator auf Desktop zweispaltig: Galerie (2fr) links, Auswahl-/Detail-Panel (1fr, sticky) rechts; mobil untereinander mit sticky Footer-Aktionsleiste.
- Sektionen vertikal mit 32px Abstand; Seitenkopf mit Titel (heading_font, 36px, fg) und Untertitel (muted) bekommt 24px Abstand zum Inhalt.
- Leere Zustände zentriert mit Icon, Titel (20px) und Sekundär-Button; Ladezustände als Skeleton-Tiles in identischen Kartenmaßen.
- Kontrastregel: Fließtext immer fg auf bg/surface, muted nur für Meta-Infos; Gold nur als Akzent, nie als Fließtext auf dunklem Grund in kleinen Größen.
