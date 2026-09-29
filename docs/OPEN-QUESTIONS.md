# Otevřené otázky

Rozhodnuto 2026-09-27: brand manuál = dodané správné vizuály. Hlavní formát je 3:4. Fotky nahrává správce v rozhraní. Formáty se testují postupně jeden po druhém.

| # | Otázka | Výchozí volba (platí, dokud se nerozhodne jinak) |
|---|---|---|
| Q3 | Kompozice pro 9:16 a 16:9 | Zatím nepotřeba, z nabídky odstraněno (2026-09-28). A4/A3 hotové se stejnou kompozicí jako 3:4. |
| Q8 | Limity délek textů | Nastavené v BRAND-RULES §8. Doladíme na reálných akcích. |
| Q9 | Tisk A4/A3: spadávka, ořezové značky, PDF, CMYK? | PNG/JPEG 300 DPI bez spadávky. PDF lze přidat přes Playwright `page.pdf`. |
| Q11 | Další šablony (např. varianta „1946“ s městem a místem v páskách) | Zatím jen `event-classic`. |
| Q-host | Hosting: export potřebuje Chromium na serveru | Vyřešit při nasazení (VPS / Node server, nebo `@sparticuz/chromium`). |

## Rozhodnuté (pro historii)

| # | Rozhodnutí |
|---|---|
| Q1 | Pásky nadpisu zkosené o −3,5° podle Lidic (původně rovně podle Náchoda, změněno 2026-09-28). |
| Q2 | Jediné pole „Město v nadpisu“, bez automatického návrhu (zjednodušeno 2026-09-28). |
| Q5 | Vstupenky z plakátu odstraněny (2026-09-28). |
| Q4 | Fotky dodává PD hotové ve variantě ČB i barva, aplikace je neupravuje (změněno 2026-09-28, dříve převod do ČB). |
| Q6 | Výřez nastavuje správce ohniskem u fotky. |
| Q7 | Logo vyčištěné, tmavá barva `#000`. |
| Q10 | Plná varianta fotky má max. 5000 px, což stačí pro A3. Menší fotky se nezvětšují. |
| Q12 | Speciální kampaně generátor nepodporuje. |
| Q13 | Pevný nadpis „Přepište dějiny / v [městě]!“. |
| Q14 | Bez roku v datu. |
| Q15 | Samostatný brand manuál nebude, platí BRAND-RULES.md. |
