# VD Design — konsolidētais audita un pārbaužu statuss

Datums: 2026-11-08. Darba dokuments; nav jauns audits un nav specifikācijas apstiprinājums.
Avoti: iepriekšējās sarunas saskaņojumi (novembra 5.–8. datums), `SPEC-1.1-CHANGELOG.md`, `INTEGRATION-NOTES.md`, `components.css`, `d3-theme.css`, `app-integration.css` un testu kods zarā `design-system-clean-v1-1`.

## Apstiprinātais darba process
1. Atjaunot esošo auditu rezultātus, neatvērt jau apstiprinātos jautājumus bez regresijas pierādījuma.
2. Novērst identificētās **koda** konfliktu un prioritāšu problēmas izolētajā VD Design vidē.
3. Veikt automatizētos statiskos, pārlūka un funkcionalitātes regresijas testus.
4. Lietotājs vizuāli pārbauda **VD Design → “Jaunā dizaina sistēma 1.1 – izmēģinājums”** iPhone gaišajā un tumšajā režīmā. Nejaukt ar iepriekšējo “Rīta rasa” izvēli.
5. Tikai pēc apstiprinājuma pabeigt specifikāciju 1.2 un ekrānattēlu katalogu.

## Iepriekš apstiprinātie / neatsākt bez regresijas
| ID | Iepriekšējais statuss | Piezīme |
|---|---|---|
| N21 | Apstiprināts | Saglabāt iepriekšējo rezultātu |
| N22 | Ieviests, iPhone vizuāli apstiprināts abos režīmos | “Par aplikāciju” 8 px atstarpes; nav atvērts jauns uzdevums |
| N23 | Apstiprināts | Saglabāt iepriekšējo rezultātu |
| N25 | Pabeigts | Fokusa apmales; tikai regresijas kontrole |
| G09–G12, C06, C17, C18 | Iepriekš vizuāli pārbaudīti kā atbilstoši (2026-11-05) | Neuzskatīt vecāku T01–T17 sarakstu par aktuālu defektu sarakstu |

## Jāprecizē no pilnā audita
- N01–N20, N24: pilns sākotnējais formulējums, apstiprinājuma pierādījumi un commit saites vēl jāsavāc; **neatzīmēt kā atvērtus defektus tikai tādēļ, ka šeit nav pierādījumu**.
- N26: iepriekš pārbaudīts koda līmenī, vizuālais noslēgums nav pilnībā fiksēts.
- Iepriekš atlikušie audita mērķi: C03 primāro pogu konsekvence un tumšā režīma sekundārā teksta kontrasts. Pārbaudīt esošos testus un kodu pirms labojumiem.

## Konkrēti statiski konstatējumi pašreizējā clean DS kodā
| ID | Atrašanās vieta | Pierādījums | Darbība | Statuss |
|---|---|---|---|---|
| K01 | `components.css` C05 un vispārīgais `:active` | Ikonas destruktīvajai lomai nav pilna atsevišķa hover/pressed/focus stāvokļu līguma | Precizēt stāvokļus, pārbaudīt computed styles | Tehnisks uzdevums |
| K02 | `components.css` C16 | `.ds-day[data-today=true]` lieto `--ds-focus-ring`, lai gan `d3-theme.css` definē `--ds-calendar-today-border` | Pieslēgt paredzēto tokenu, saglabāt selected prioritāti | Apstiprināta statiska neatbilstība |
| K03 | `components.css` C18 | Atstarpe starp vairākām izvēršamām vienībām nav tieši kodēta komponenta līgumā | Pārbaudīt faktiskā skata izkārtojumu; 8 px jau iPhone apstiprināti N22 | **Nav jauns vizuāls defekts** |
| K04 | `components.css` pogu stāvokļi | Vispārīgā aktīvā stāvokļa selektors aptver arī ikonu un izvēles pogas | Pārbaudīt CSS kaskādi un lomu specifiskos stāvokļus | Jāvalidē |
| K05 | `d3-theme.css` virsmas | V01–V05 vērtības sadalītas starp tokeniem/slāņiem; nevar secināt regresiju tikai no statiska faila | Pārbaudīt gala computed styles, nepārrakstīt apstiprinātās vērtības | Jāvalidē |
| K06 | `app-integration.css` | Izmanto plašu opt-in integrācijas selektoru kopu; potenciāla pārklāšanās ar mantotajiem stiliem | Salīdzināt reālo CSS kaskādi, novērst tikai pierādītus konfliktus | Jāvalidē |

## Tehniskā drošība
- Strādāt tikai `design-system-clean-v1-1` un izolētajā VD Design preview.
- Nemainīt produkciju, Vārdadienas TEST, push abonementus un lietotāju datus.
- Pirms labojuma saglabāt bāzes stāvokli un testu rezultātus; pēc labojuma atkārtot.
- Vizuāls iPhone apstiprinājums nav aizstājams ar Playwright testu.

## Tuvākais izpildāmais solis
Izlabot pierādīto K02 tokena neatbilstību; K01/K04/K06 pārbaudīt ar CSS kaskādes testiem, nevis akli mainīt dizainu. Pēc tehniskās pārbaudes nodot lietotājam konkrētu izmaiņu sarakstu iPhone salīdzinājumam.


## 2026-11-08 — tehnisko labojumu un testu žurnāls
- C16 K02: `9dbb8b71` — šodienas datumam pieslēgts `--ds-calendar-today-border`.
- C05 K01: `c992be91` — destruktīvajai ikonai pievienoti atsevišķi hover/active stāvokļi.
- Regresijas testi: `50e0df1e`, `d5c4e26a` — papildinātas C05 un C16 computed-style pārbaudes, tostarp reāls pointer-down.
- CI pārbaude: pēdējam pārbaudītajam commit `50e0df1e` GitHub combined statuses un PR-triggered workflow runs atgrieza tukšus sarakstus. Tas **nepierāda**, ka CI nav palaists; **nav pieejams izpildes apliecinājums**. Statuss: **nav apstiprināts**.
- `.github/workflows/clean-ds-1-1.yml` paredz `validate.py`, `validate-app-integration.py`, `contrast_audit.py`, un Playwright chromium/webkit/mobile-webkit. Pirms iPhone pārbaudes nepieciešams redzēt faktisko izpildes rezultātu.
- K03/K04/K05/K06 nav automātiski atzīmēti kā defekti. Jāapstiprina ar kaskādes un reālās integrācijas testiem.
