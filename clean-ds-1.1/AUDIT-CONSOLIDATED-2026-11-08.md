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


## Papildu konstatējums — izolētās galerijas atsauces palete
- `reference-theme.css` nebija definēti `--ds-calendar-today-border`, `--ds-danger-bg`, `--ds-danger-text` un `--ds-danger-border` tokeni, ko izmanto C16 un C05; tas var radīt kļūdainus galerijas rezultātus.
- Labots ar commit `fd48c56d`: pievienoti tokeni gaišajai un tumšajai **atsauces** paletei, nemainot saskaņoto D3 tēmu.
- **Tests nav izpildīts:** šis ir koda līmeņa labojums; pārlūka/WebKit rezultāts joprojām jāiegūst.


## Koda statiskā salīdzināšana (2026-11-08)
- No GitHub nolasīti `components.css`, `reference-theme.css`, `d3-theme.css`, `gallery.html`, `tests/gallery.spec.mjs`.
- Neatkarīga tokenu salīdzināšana: **61 unikāla `var(--ds-*)` atsauce komponentu CSS; 0 trūkstošu deklarāciju abos `reference-theme.css` režīmos**.
- `components.css` atlasītie `:active` noteikumi rāda vispārīgo stāvokli un specifiskus primārās, destruktīvās un izvēles pogas noteikumus. Tas **nav pierādījums faktiskam konfliktam**; jāskatās computed styles reālā renderējumā.
- Pārbaudīta C05/C16 testu esamība. Testi nav izpildīti.
- Šis ir **statiskas koda analīzes rezultāts**, nevis `validate.py`, `contrast_audit.py` vai Playwright izpildes protokols. GitHub Actions veiksmīgs rezultāts joprojām nav iegūts.
- Tālāk: GitHub Actions izpildes protokols (statiskie testi, kontrasts, Chromium, WebKit, mobile-WebKit), pēc tam iPhone VD Design. Līdz tam **nepārcelt statusu uz “tehniski apstiprināts”**.


## Papildu neatkarīgā statiskā kontrasta pārbaude
- No GitHub nolasīta aktuālā `reference-theme.css` palete un `components.css`.
- Neatkarīgi aprēķinātas WCAG kontrasta attiecības visiem 11 pāriem, kurus definē `contrast_audit.py`, **abos režīmos**: **22/22 sasniedz vismaz 4,5:1**.
- Zemākais no šiem pāriem: gaišajā režīmā disabled-text/disabled-bg **4,89:1**; tumšajā **4,97:1**.
- Komponentu CSS (bez komentāriem) **nav fiksētu heksadecimālu vai rgb/rgba krāsu vērtību**; semantisko tokenu līgums saglabāts.
- Šie rezultāti iegūti ar neatkarīgu statisku aprēķinu no GitHub failu satura, **nevis** ar GitHub Actions vai reālu pārlūka renderēšanu. Neattiecas uz caurspīdīgiem slāņiem, fokusa indikatoriem vai saskaņotā D3 dizaina gala kontrastu.


## Papildu kaskādes labojums
- `components.css` saturēja vispārīgu `.ds-button:active { filter:brightness(.92) }` **papildus** specifiskajām `--ds-*-pressed` krāsām. Filtrs mainīja faktiski attēloto nospiešanas krāsu pēc tokena piemērošanas.
- Commit `dbe7619b`: liekais filtrs noņemts; paliek tikai kopīgie semantiskie `:active` stāvokļi. Tā ir pamatnoteikuma korekcija, nevis tēmas izņēmums.
- Commit `42cec8e7`: pievienoti regresijas testi filtram un C16 selected/today prioritātei.
- **CI/pārlūka izpilde vēl nav apstiprināta.** Šis labojums jāvērtē arī iPhone VD Design, jo nospiešanas animācijas izskats var nedaudz mainīties.


## Tehnisko pārbaužu slēgšana — GitHub Actions #70
- Izpilde: https://github.com/andrismaldups/vardadienas/actions/runs/42458001687
- Pārbaudītais commit: `fda6fd65fae0bdaba12fd479c6f4d1703d5b9afe`.
- GitHub Actions kopējais statuss: **completed / success**.
- Darba soļi: **Static token contract**, **Full VD Design integration contract**, **Contrast audit**, **Browser and mobile-WebKit checks** — visi **success**.
- Iepriekšējais #68: 71/72 pārlūku testi; pēdējā mobilā WebKit testa simulācijas neatbilstība labota, un #70 ir sekmīgs.
- **Tehniskais CI vārtejas posms slēgts.** Nākamais: iPhone PWA vizuālais un funkcionālais tests gaišajā/tumšajā režīmā; pēc lietotāja apstiprinājuma specifikācija 1.2.
- Šis statuss neapstiprina faktisku Cloudflare izvietojumu vai reāla iPhone pārbaudi.
