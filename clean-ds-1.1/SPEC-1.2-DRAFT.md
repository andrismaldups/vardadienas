# Vārdadienas — Dizaina sistēmas specifikācija 1.2
**Redakcija:** precizēts darba projekts; tehniskie testi sekmīgi, vizuālā kataloga pārskatīšana turpinās. **Datums:** 2026-11-08.  
**Tvērums:** izolētais VD Design zars `design-system-clean-v1-1`, integrācija `clean-ds-1.1/`.  
**Svarīgi:** šis dokuments neapliecina produkcijas/TEST pārveidošanu, pilnu iPhone funkcionālo auditu vai visu tēmu individuālu vizuālu apstiprinājumu.

## 1. Mērķis un pārvaldība
Viena semantiska komponentu sistēma visiem Vārdadienas skatiem. Viena komponenta kļūdu labo kopīgajā noteikumā, nevis veido tēmas izņēmumu. Saglabāt iepriekš saskaņoto K1, Z3, D3, S1, J1-E izskatu, kamēr katras tēmas izmaiņas nav atsevišķi apstiprinātas. Galvenais lietojums: iPhone instalēta PWA, arī bezsaistē (izņemot servera push piegādi).

**Statusu termini:** `kods` = pārbaudāms failos; `CI` = sekmīgs GitHub Actions; `iPhone` = lietotāja vizuāli apstiprināts; `neapstiprināts` = nav pietiekamu pierādījumu. Nekad nejaukt CI ar iPhone pieņemšanu.

## 2. Arhitektūra un failu robežas
| Slānis | Fails | Atbildība |
|---|---|---|
| C01–C18 komponenti | `components.css` | Ģeometrija, semantiskie stāvokļi, vienoti komponentu noteikumi |
| Atsauces palete | `reference-theme.css` | Tehniskā galerija, **nav** apstiprināta publiska tēma |
| D3 palete | `d3-theme.css` | Rīta rasa/Nakts mežs tokenu vērtības gaišajā un tumšajā režīmā |
| Reālās aplikācijas piesaiste | `app-integration.css` | Opt-in kartējums starp esošajiem HTML selektoriem un semantiskajiem tokeniem |
| Integrācijas tests | `tests/full-app.spec.mjs` | Reālie skati, tēmas, C17, mobilais platums |
| Komponentu tests | `tests/gallery.spec.mjs` | Izolētās galerijas stāvokļi, tastatūra, WebKit |
| CI | `.github/workflows/clean-ds-1-1.yml` | Statika, integrācija, kontrasts, Chromium/WebKit/mobile-WebKit |

Integrācija aktīva tikai ar `html[data-design="ds11"] body.ds-app`. Neiejaukties vecajā TEST, produkcijā, datu glabāšanā, push Worker vai abonementos.

## 3. Semantisko krāsu un stāvokļu līgums
- **C03 primāra darbība:** `--ds-primary`, `--ds-on-primary`, `--ds-primary-border`, `--ds-primary-hover`, `--ds-primary-pressed`.
- **C04 sekundāra darbība:** `--ds-secondary-bg`, `--ds-secondary-text`, `--ds-secondary-border`; aktīvā stāvokļa pamatvirsma `--ds-pressed-bg`.
- **C05 ikonas:** `--ds-icon`, `--ds-icon-bg`, `--ds-icon-border`; destruktīvām ikonām saglabātas atsevišķas `--ds-danger-*` lomas.
- **C06 izvēle:** `--ds-unselected-*` pret `--ds-selected-*`; izvēlēts stāvoklis **nav** primāra darbība.
- **C17 “Dzēst manus datus”:** semantiski destruktīva darbība ar apstiprinājuma soli, bet **vizuāli neitrāla C04 virsma**, nevis sarkana poga. Abos D3 režīmos: fons `--ds-secondary-bg`, teksts `--ds-secondary-text`, apmale `--ds-secondary-border`, nospiesta virsma `--ds-pressed-bg`. Nedrīkst izņemt apstiprinājuma dialogu.
- **Fokuss:** `--ds-focus-ring`; **kļūdas stāvoklis:** `--ds-error`; **atspējots:** `--ds-disabled-*`; **teksta ievade:** `--ds-input-*` un `--ds-caret`.
- Prioritāte: lomas specifiskie `:hover`, `:active`, `:focus-visible` un izvēles stāvokļi nedrīkst tikt aizēnoti ar vispārīgajiem noteikumiem. Papildu `brightness()` filtrs nedrīkst mainīt semantisko nospiešanas krāsu.

## 4. V01–V05 virsmas un dekorācijas
| Virsma | Saskaņotais alfa etalons | Piemērošanas robeža |
|---|---|---|
| V01 | 17% | Tikai trīs sākumskata galveno paneļu pozīcijām |
| V02 | 68% | Atbilstošajām sekundārajām virsmām |
| V03 | 84% | Atbilstošajām pamatkartītēm |
| V04 | 91% | Atbilstošajām ievades virsmām |
| V05 | 93–95% | Atbilstošajām paceltajām virsmām |

Alfa attiecas uz virsmu, nevis tekstu, ikonām vai saturu. V01 realizācijas kartējums ir `#mainView>.card:first-child`, `#mainView>.grid>.card`, `#mainView>.grid>.side>.card` ar `--ds-home-panel-bg`. Pārējo V02–V05 skaitlisko alfa vērtību **pilnīga individuāla renderējuma pārbaude nav dokumentēta**; etalons paliek saistošs, bet nav pasludināms par izmērītu. D3 dekoratīvie SVG slāņi saglabājas atsevišķi no komponentu virsmām.

## 5. Komponentu katalogs C01–C18 — saskaņots ar faktisko `components.css`
Šajā tabulā ID tiek piesaistīti **tieši `clean-ds-1.1/components.css` komentāriem un selektoriem**. Tas labo iepriekšējās darba redakcijas C09–C15 sajaukumu. Galerijas komponentu ID nav automātiski pielīdzināmi iepriekšējās 1.0 specifikācijas ID, kamēr nav salīdzināta sākotnējā matrica.

| ID | Faktiskā loma / CSS klase | Pieņemšanas kritērijs |
|---|---|---|
| C01 | Panelis `.ds-card` | Virsmas, apmales, noapaļojums un ēna no tēmas tokeniem |
| C02 | Iekšējā virsma `.ds-inset` | `--ds-surface-soft` un kopīgā apmale |
| C03 | Primārā poga `.ds-button--primary` | Semantiskie default/hover/pressed stāvokļi |
| C04 | Sekundārā poga `.ds-button` | Sekundārā krāsa, nevis destruktīvs aizpildījums |
| C05 | Ikonu poga `.ds-icon-button` | 44 px skārienlaukums; atsevišķs danger stāvoklis |
| C06 | Izvēles poga `.ds-choice` | `aria-pressed`/`aria-selected` stāvokļi |
| C07 | Ievades lauks `.ds-input`, `.ds-textarea` | Fokuss, kursors, kļūda, disabled/readonly |
| C08 | Izvēlne `.ds-select` | Ievades tokeni, fokuss, kļūda |
| C09 | Fiksētā navigācija `.ds-nav` | Apakšējā drošā zona, centrējums |
| C10 | Saraksta rinda `.ds-list-row` | Satura atstarpes un atdalošā līnija |
| C11 | Statusa paziņojums `.ds-status` | Success/error/info semantika |
| C12 | Teksta saite `.ds-link` | Saites krāsa un hover stāvoklis |
| C13 | Uznirstošs panelis `.ds-popup` | Pārklājuma slānis, izmērs un ritināšana |
| C14 | Pārslēgs `.ds-switch` | Atlasītā stāvokļa akcenta krāsa |
| C15 | Rezervēts / nav deklarēts kā atsevišķs komponents | `components.css` izmanto C07/C08/C15 kopīgu komentāru, bet **atsevišķa `.ds-*` C15 klase nav definēta**; nepiedēvēt tam patstāvīgu implementāciju |
| C16 | Kalendāra diena `.ds-day` | Today 46 px augstums, today/selected apmales prioritāte |
| C17 | Destruktīvas darbības poga `.ds-button--danger`; reālajā integrācijā dzēšanas poga apzināti attēlota sekundārā stilā | Nodala darbības risku no vizuālās lomas; obligāts apstiprinājums |
| C18 | Izvēršamā rinda `.ds-accordion` | 48 px summary augstums, apmales, satura atvēršana |

**Papildu elementi ārpus 1:1 numerācijas:** `.ds-heading`, `.ds-muted`, `.ds-emoji-grid`, `.ds-modal` un `.ds-modal-backdrop`. Tie ir implementēti, bet nav korekti tiem piešķirt patvaļīgus C numurus. Komponentu kartējuma avots: `components.css`; reālo skatu integrācijai papildus izmanto `app-integration.css`.

## 6. Reālo skatu piesaistes matrica — faktiskās lomas
| Skats | Reālie selektori | Piesaistes tips / komponenti |
|---|---|---|
| Sākums | `#mainView`, `.card`, `.names`, `.name-link` | Integrācijas virsmas un saites; C01/C02 tikai pēc faktiskā CSS kartējuma |
| Kalendārs | `#calendar .day.today`, `#calendar .day.sel` | Reālā kalendāra stāvokļi; C16 ir galerijas ekvivalents |
| Meklētāji | `#nameInput`, `#dateInput`, `#nameResult`, `#dateSuggestions` | C07 ievade; ieteikumu uznirstošais panelis funkcionāli radniecīgs C13 |
| Mani vārdi | `.favorites-sort`, `.remove-favorite`, `#favoriteAddInput` | C05 ikonu darbība, C06 izvēle, C07 ievade |
| Dzimšanas dienas | `.birthday-sort`, `.birthday-edit-btn`, `.birthday-delete-btn`, `#birthdayAddForm` | C05/C06/C07 funkcionālās lomas |
| Apsveikums | `.greeting-options`, `.greeting-emoji-panel`, `.greeting-back-bar` | C06 izvēle; C13 uznirstošs panelis; C09 navigācijas ekvivalents |
| Iestatījumi | `.settings-section`, `.reminder-time-menu`, `#deleteMyDataButton` | C14 pārslēgs; C13 laika izvēlne; C17 dzēšanas darbība |
| Par aplikāciju | `.about-card .about-row-button`, `.about-accordion-list` | C18 izvēršamās rindas |
| Hamburgera izvēlne | `#sideMenu`, `.menu-btn` | C13 uznirstoša izvēlne, C05 ikonas poga pēc lomas |

**Interpretācija:** galerijas `.ds-*` klase un reālā skata selektors nav viens un tas pats. Matrica rāda **funkcionālo atbilstību**, nevis apliecina, ka reālajā DOM ir attiecīgā `.ds-*` klase. Visas integrācijas sasaistes jāvalidē ar `app-integration.css` un pārlūka computed styles.

## 7. Tēmas
K1 (klasiskais), Z3 (lavanda), D3 (Rīta rasa/Nakts mežs), S1 (zelta akcenti), J1-E (ūdens motīvs) ir saglabājamie etaloni. **Šīs 1.2 iterācijas pilnā CI un lietotāja iPhone vizuālā pieņemšana attiecas uz izolēto DS 1.1 integrāciju un D3 gaišo/tumšo režīmu; pārējo tēmu vizuāla pieņemšana ar šo dokumentu netiek apgalvota.** Tēmas maiņa maina tokenus un dekorāciju, ne komponenta pamatuzvedību.

## 8. iPhone PWA un pieejamība
Minimālais mērķa skārienlaukums 44×44 px; C16 šodienas diena 46×46 px. Neveidot horizontālu ritināšanu, ievades fokusā saglabāt redzamu apmali un kursora krāsu. C18 pogām saglabāt pilnas sānu malas un 8 px atstarpes. Tastatūras fokusam dialogā jāpaliek dialoga robežās. Push abonementu darbība, servera dzēšana un bezsaistes dati nav maināmi ar vizuālās sistēmas migrāciju.

## 9. Testēšana un pierādījumi
| Pārbaude | Pierādījums | Statuss |
|---|---|---|
| Tokeni, integrācija, kontrasts, Chromium/WebKit/mobile-WebKit | [GitHub Actions #70](https://github.com/andrismaldups/vardadienas/actions/runs/42458001687) | **CI success** |
| C17 neitrālās pogas CSS labojums | [GitHub Actions #72](https://github.com/andrismaldups/vardadienas/actions/runs/42458789362) | **CI success** |
| C17 regresijas testi abos režīmos | [GitHub Actions #73](https://github.com/andrismaldups/vardadienas/actions/runs/42458797111) | **CI success** |
| D3 gaišais/tumšais režīms iPhone | Lietotāja 2026-11-08 ekrānattēli un rakstisks apstiprinājums | **iPhone vizuāli apstiprināts** |
| C17 pēc labojuma iPhone | Lietotāja 2026-11-08 apstiprinājums “Tagad poga … redzama pareizi” | **iPhone vizuāli apstiprināts** |
| V02–V05 pilna alfa mērīšana | Nav atsevišķa protokola | **Nav apstiprināta** |
| Visu C01–C18 manuāla iPhone funkcionalitāte, offline/push | Nav pilna šīs iterācijas protokola | **Nav apstiprināta** |
| K1/Z3/S1/J1-E vizuālā pieņemšana šajā iterācijā | Nav atsevišķa protokola | **Nav apstiprināta** |

## 10. Slēgto neatbilstību reģistrs
- C16 šodienas apmales tokens un selected prioritāte: izlabots, CI #70.
- C05 destruktīvās ikonas hover/pressed stāvokļi: izlaboti, CI #70.
- Pogu `:active` liekais brightness filtrs: noņemts, CI #70.
- Integrācijas statiskā testa Service Worker v5 neatbilstība iepriekšējai v4 fiksētajai pārbaudei: tests pielāgots versijai >=4, CI #70.
- Mobile-WebKit nepareiza peles simulācija: aizstāta ar skārienam piemērotu testu, CI #70.
- C17 sarkanā poga D3 gaišajā/tumšajā režīmā: neitrāla virsma, CI #72/#73 un iPhone apstiprinājums.

Iepriekš saskaņotie N21/N22/N23/N25 nav atvērti no jauna. N26 atsevišķa pilna vizuālā slēgšanas protokola šajā iterācijā nav.

## 11. iPhone vizuālo pierādījumu katalogs — 46 ekrānattēli
Lietotājs precizēja, ka sarunā kopā iesniegti **46 iPhone ekrānattēli**. Šis skaits ir kataloga avotu kopskaits, **nevis** 46 atsevišķi pārbaudīti komponenti vai 46 apstiprināti testgadījumi. Attēli paliek sarunas pielikumos; šajā GitHub Markdown dokumentā tie nav automātiski iegulti vai piesaistīti ar stabilām failu saitēm.

| Pierādījumu grupa | Redzamie stāvokļi un ekrāni | Specifikācijas nozīme |
|---|---|---|
| D3 tēma | Gaišais “Rīta rasa” un tumšais “Nakts mežs” | Salīdzināt virsmas, tekstu, dekorācijas un kontrastu abos režīmos |
| Sākums un kalendārs | Dienu navigācija, šodiena, atlasītā diena, kalendāra režģis | C09/C16 atlases un navigācijas semantika |
| Meklētāji | Vārda/datuma ievade, ieteikumi, rezultāti, fokusēta tastatūra | C07/C13; iOS tastatūra nedrīkst neatgriezeniski aizsegt darbību |
| Mani vārdi / dzimšanas dienas | Saraksts, kārtošana, pievienošanas un ievades stāvokļi | C05/C06/C07; saraksta darbību pieejamība |
| Apsveikumi | Izveide, rediģēšana, emoji panelis, sistēmas kopīgošanas lapa | C07/C13; saglabāt teksta un darbību pieejamību |
| Iestatījumi | Atgādinājumi, atvērta laika izvēlne, izskata radio izvēle, datu dzēšana | C06/C13/C17; izvēles redzamība un pārklājumu hierarhija |
| Par aplikāciju | Datu avoti, privātums, lietošanas noteikumi | C18; pilni pogu gali un vienādas atstarpes |

### 11.1. Precizētie vizuālie un uzvedības noteikumi
1. **Atvērta laika izvēlne:** atlasītajai vērtībai jābūt atšķiramai no citām; izvēlnei jābūt redzamai virs pamatpaneļa, bez apgrieztām malām. Ekrānattēls pierāda attēlojumu, nevis visu vērtību saglabāšanas loģiku. Atvērta izvēlne drīkst īslaicīgi pārklāt saturu, bet tai jābūt aizveramai un lietojamai ar skārienu.
2. **iOS tastatūra un AutoFill josla:** fokusēta ievade, ieteikumu saraksts un galvenās darbības nedrīkst kļūt neatgriezeniski nepieejamas; atļauta vertikāla ritināšana. Ekrānattēli parāda šo stāvokļu esamību, bet nepierāda visas iPhone tastatūras konfigurācijas.
3. **Dekoratīvie D3 slāņi:** zāles stiebri, rasa un lokveida elements ir dekorācija, ne interaktīva virsma. Tiem nedrīkst pārtvert skārienus, mainīt fokusa secību vai aizsegt lasāmību tik lielā mērā, ka darbība kļūst nesaprotama. Saglabāt lietotāja apstiprināto dabisko, asimetrisko kompozīciju; nepārveidot dekorāciju tikai tāpēc, ka tā redzama caur caurspīdīgu paneli.
4. **Fiksētā “Uz sākumu” josla:** vienots centrējums un vizuālā loma visos skatos; tai jāpaliek sasniedzamai, ņemot vērā iPhone drošo apakšējo zonu. Atsevišķu skatu pogu izvietojumu nevajag pārveidot bez konstatētas neatbilstības.
5. **C17 dzēšana:** gaišajā un tumšajā D3 režīmā neitrāla sekundārā poga; izskata apstiprinājums nav pierādījums servera datu dzēšanas funkcijas izpildei. Datu dzēšanu vizuālā audita ietvaros neveikt.
6. **C18 trīs izvēršamās rindas:** “Datu avoti”, “Privātums”, “Lietošanas noteikumi” — pilnas sānu apmales, 8 px savstarpējā atstarpe, teksts un bultiņa ar pietiekamu iekšējo atkāpi.

### 11.2. Pieņemšanas robežas
- **Vizuāli apliecināts:** attēlos redzamie D3 gaišā/tumšā režīma skati un C17 labotais izskats, saskaņā ar iepriekšējo lietotāja apstiprinājumu.
- **CI apliecināts:** konkrētajā automatizēto testu tvērumā pārbaudītā statika, kontrasts un Chromium/WebKit/mobile-WebKit regresija.
- **Nav automātiski apliecināts:** katras pogas pilna darbība, visu 46 attēlu precīza sasaite ar C01–C18, visu V02–V05 alfa vērtību mērījumi, push/offline regresija, kā arī K1/Z3/S1/J1-E tēmu individuāla pieņemšana.
- **Kataloga nākamais solis:** katram no 46 attēliem piešķirt pastāvīgu identifikatoru, skatu, režīmu, komponentu ID un novērtējumu; attēlu indeksu neizdomāt, kamēr nav izveidota pārbaudāma attēlu-failu atbilstība.

## 12. Galīgā pieņemšana
2026-11-08 saņemtie D3 gaišā/tumšā režīma iPhone ekrānattēli, tostarp **“Mani dati” / “Par aplikāciju” / C17** stāvoklis pirms un pēc labojuma, veido vizuālā audita pierādījumu kopumu. Tie glabājas sarunas pielikumos; **nav iegulti GitHub dokumentā** un nav jāuzdod par visu C01–C18 pilnu katalogu.

**1.2 redakcijas statuss:** tehniski pārbaudīta un papildināta ar 46 attēlu kataloga tvērumu; pilnais individuāli indeksētais vizuālais katalogs vēl nav pabeigts, bet **nav automātiski lietotāja apstiprināta**. Pirms publiskās versijas migrācijas atsevišķi jāvienojas par pārējo tēmu pieņemšanu, offline/push regresiju un vizuālā kataloga pilnu tvērumu.

## Pielikums A — redzamo iPhone attēlu detalizēta uzskaite (darba indekss)
**Metode.** Indekss `A01–A20` attiecas tikai uz 20 attēliem, kas šajā sarunas fragmentā redzami pirmajā attēlu ziņojumā, un `B01–B05` — uz pieciem attēliem nākamajā ziņojumā. Šie **25 pagaidu ieraksti nav pilns 46 attēlu inventārs**. Numuri ir ziņojumu iekšējā secība, nevis failu identifikatori. Lai nepieļautu kļūdainu izsekojamību, neesošajiem 21 attēlu metadatiem netiek izdomātas pozīcijas vai rezultāti.

| ID | Režīms / skats | Redzamais stāvoklis | Komponenti / pārbaudes fokuss |
|---|---|---|---|
| A01 | D3 gaišais / Iestatījumi | Izskata tēmu radio izvēles un gaišais režīms | C06/C14; atlasītā stāvokļa redzamība |
| A02 | D3 gaišais / Iestatījumi | Mani dati, Par aplikāciju, trīs izvēršamās rindas | C17/C18; neitrāla dzēšanas poga, pilnas apmales |
| A03 | D3 tumšais / Sākums | Vārdadienas, rītdiena, informācijas kartītes, navigācija | C01/C02/C03/C11 |
| A04 | D3 tumšais / Kalendārs | Novembra kalendārs, atšķirīgas šodienas un atlases dienas | C16; today/selected atšķiršana |
| A05 | D3 tumšais / Kalendārs | Atlasītā diena sakrīt ar izceltu dienu | C16; prioritātes pārbaude |
| A06 | D3 tumšais / Meklēt vārdu | Vārda rezultāts, iOS tastatūra un AutoFill | C07/C13; fokusēts ievades lauks |
| A07 | D3 tumšais / Meklēt datumu | Datuma daļēja ievade un mēnešu ieteikumi | C07/C13 |
| A08 | D3 tumšais / Hamburgera izvēlne | Atvērta navigācijas izvēlne | C05/C09/C13 |
| A09 | D3 tumšais / Mani vārdi | Atvērta pievienošana un kārtošana | C03/C06/C07 |
| A10 | D3 tumšais / Mani vārdi | Saraksts bez ievades formas | C05/C06; rindas un dzēšanas ikonas |
| A11 | D3 tumšais / Mani vārdi | Meklēšanas ieteikumi, iOS tastatūra | C07/C13; ieteikumu sasniedzamība |
| A12 | D3 tumšais / Mani vārdi | Izvēlēts pievienojamais vārds, ievade un tastatūra | C03/C07/C13 |
| A13 | D3 tumšais / Dzimšanas dienas | Saraksts un kārtošana | C05/C06; rediģēšana/dzēšana |
| A14 | D3 tumšais / Dzimšanas dienas | Atvērta personas pievienošana un teksta tastatūra | C03/C07; ievades fokuss |
| A15 | D3 tumšais / Dzimšanas dienas | Datuma mēneša lauks ar ciparu tastatūru | C07; skārientastatūras tips |
| A16 | D3 tumšais / Vārda informācija | Vārds, datums, divas primārās darbības | C02/C03 |
| A17 | D3 tumšais / Apsveikums | Personas attiecību un stila izvēle | C03/C06 |
| A18 | D3 tumšais / Apsveikums | Gatavais teksts un darbību joslas | C04/C07/C09 |
| A19 | D3 tumšais / Apsveikums | Rediģējams teksts un tastatūra | C07; fokusa apmale |
| A20 | D3 tumšais / Apsveikums | Atvērts emoji panelis | C13; paneļa izvietojums |
| B01 | D3 tumšais / Apsveikums | Atvērta iOS kopīgošanas lapa | Sistēmas kopīgošanas integrācijas robeža |
| B02 | D3 tumšais / Iestatījumi | Atgādinājumi, laika izvēles un paziņojumu drošības teksts | C06/C14/C12 |
| B03 | D3 tumšais / Iestatījumi | Atvērta laika izvēlne ar izceltu 06:00 | C13; atlases izcēlums, pārklājuma secība |
| B04 | D3 tumšais / Iestatījumi | Izskata tēmu un krāsu režīma izvēles | C06/C14 |
| B05 | D3 tumšais / Iestatījumi | Mani dati, Par aplikāciju, trīs izvēršamās rindas | C17/C18; neitrāla poga, atstarpes |

### A.1. Interpretācijas ierobežojumi un turpmākā indeksēšana
- Šajā tabulā ir **redzamā stāvokļa apraksts**, nevis katra elementa klikšķa vai datu saglabāšanas tests.
- A01–A20 un B01–B05 nav oficiāli failu nosaukumi. Galīgajā katalogā jāaizstāj ar stabilām atsaucēm uz attēliem, pārbaudot attēlu skaitu un secību.
- Attēlos redzamais `AutoFill Contact` ir iOS sistēmas josla, nevis aplikācijas izstrādāts komponents.
- Paziņojumu teksts “DESIGN TEST nav pieejami” atspoguļo apzinātu izolētās vides drošības režīmu, nevis pierādījumu par produkcijas push darbības kļūmi.
- A05 un B03 parāda atlasītu stāvokli, bet neapliecina visu robežgadījumu darbību.
- 46 attēlu pilnu uzskaiti un visus attēlu failus nedrīkst pasludināt par pabeigtiem, kamēr nav pārbaudīta pārējo 21 attēla individuālā atbilstība.


## Pielikums B — pieņemšanas un izsekojamības vārtejas

| Vārteja | Pārbaudāmais kritērijs | Pašreizējais pierādījums | Statuss |
|---|---|---|---|
| B1 — komponentu ID | C01–C18 kartējums pret `components.css` | Šīs redakcijas 5. sadaļa; C15 skaidri atzīmēts kā nedefinēts atsevišķi | Dokumentācijas kartējums precizēts |
| B2 — automatizētā regresija | Statika, integrācija, kontrasts, Chromium, WebKit, mobile-WebKit | GitHub Actions #70/#72/#73 | Iepriekšējais pārbaudes tvērums sekmīgs |
| B3 — D3 iPhone izskats | Gaišais/tumšais, C17 pēc labojuma | Lietotāja iPhone ekrānattēli un apstiprinājums | Apstiprināts iepriekš saskaņotajā tvērumā |
| B4 — vizuālā kataloga pilnīgums | Visiem 46 attēliem stabila atsauce un individuāls ieraksts | A01–A20, B01–B05: 25 pagaidu ieraksti | **Daļējs; 21 vēl nav individuāli indeksēts** |
| B5 — virsmu alfa | V02–V05 izmērītas gala renderējumā | Nav mērījumu protokola | Atvērts pierādījumu jautājums |
| B6 — pārējās tēmas | K1, Z3, S1, J1-E individuāla iPhone pieņemšana | Nav šīs iterācijas individuāla protokola | Atvērts |
| B7 — datu drošība | Offline, push un dzēšanas darbību regresija | Vizuālā pārbaude to neapliecina | Atvērts; **nedrīkst testēt ar reālu datu dzēšanu bez atsevišķas saskaņošanas** |
| B8 — 1.0 numerācijas savietojamība | 1.0 komponentu tabula salīdzināta ar faktisko 1.2 implementāciju | Nav pilnas 1.0 ID tabulas šajā dokumentā | Atvērts |

**Saskaņošanas lēmums:** 1.2 dokumentu drīkst nodot **satura pārskatīšanai**, bet ne pasludināt par pilnībā pierādītu visu 46 attēlu, visu tēmu vai offline/push pieņemšanu. Atvērtie punkti nav automātiski aplikācijas defekti.


## Pielikums C — faktisko pievienoto attēlu failu inventarizācija

**Avots:** šīs sarunas pielikumu lokālās kopijas, pārskatītas 2026-11-08. Lietotājs norādīja **46** ekrānattēlus; pašreiz pieejamajā failu kopā ir **50 iPhone attēlu faili un 6 darbvirsmas ekrānattēli**. Daļa attēlu rāda līdzīgus vai atkārtotus stāvokļus. Tāpēc failu skaits nav automātiski unikālo ekrānattēlu skaits. Šeit inventarizēti visi pieejamie mobilie faili; to nosaukuma sākums ir lokāla atsauce, nevis GitHub URL.

| ID | Faila nosaukuma sākums | Režīms | Redzamais stāvoklis |
|---|---|---|---|
| M01 | `1089C81B` | gaišs | Apsveikums — emoji panelis |
| M02 | `118B3920` | tumšs | Kalendārs un meklēšana |
| M03 | `13EF6365` | tumšs | Vārda meklēšana un tastatūra |
| M04 | `227536E0` | gaišs | Iestatījumi — atgādinājumi |
| M05 | `22C4F02A` | tumšs | Apsveikuma rediģēšana |
| M06 | `2AC58A69` | gaišs | Vārda un datuma meklēšana |
| M07 | `31C14CD3` | gaišs | Apsveikuma izvēles |
| M08 | `3338EFB2` | gaišs | Dzimšanas dienu saraksts |
| M09 | `33649048` | tumšs | Iestatījumi — dizaina stili |
| M10 | `36D02AF1` | tumšs | iOS kopīgošanas lapa |
| M11 | `3C8D3FAE` | tumšs | Mani vārdi — ieteikumi |
| M12 | `418498D2` | gaišs | Iestatījumi — dizaina stili |
| M13 | `47B9FA0F` | tumšs | Dzimšanas dienu saraksts |
| M14 | `4A176FAA` | tumšs | Dzimšanas dienu ievade |
| M15 | `4AE274D8` | tumšs | Iestatījumi — atgādinājumi |
| M16 | `4ECAB5B1` | gaišs | Iestatījumi — par aplikāciju |
| M17 | `55033BC6` | gaišs | Sākumskats |
| M18 | `55034CE0` | tumšs | Dzimšanas dienu datuma ievade |
| M19 | `575EE392` | tumšs | Sākumskats un kalendārs |
| M20 | `576B34D2` | tumšs | Apsveikuma izvēles |
| M21 | `5E64E616` | gaišs | Manu vārdu saraksts |
| M22 | `5F336AAD` | gaišs | Iestatījumi — par aplikāciju |
| M23 | `6063F9AF` | tumšs | Vārda informācija |
| M24 | `646D3414` | tumšs | Mani vārdi — ievade |
| M25 | `65AE5205` | tumšs | Mani vārdi — pievienošana |
| M26 | `670E5BB5` | gaišs | Gatavais apsveikums |
| M27 | `70D067BB` | gaišs | Sākumskats |
| M28 | `732BD184` | tumšs | Iestatījumi — režīms |
| M29 | `74A20C30` | tumšs | Manu vārdu saraksts |
| M30 | `79A3A579` | gaišs | Vārda informācija |
| M31 | `7F4DD2F0` | tumšs | Meklēšana ar tastatūru |
| M32 | `8013C5DF` | gaišs | Iestatījumi — par aplikāciju |
| M33 | `80C70226` | tumšs | Dzimšanas dienu datuma ievade |
| M34 | `9401D4C4` | gaišs | Iestatījumi — atgādinājumi |
| M35 | `9A12E461` | gaišs | Mēnešu ieteikumi |
| M36 | `9A546B53` | tumšs | Hamburgera izvēlne |
| M37 | `9F423541` | tumšs | Gatavais apsveikums |
| M38 | `9F7117B5` | gaišs | Kalendārs — atlasīta diena |
| M39 | `A29C0020` | gaišs | Kalendārs — atlasīta diena |
| M40 | `A54190B3` | tumšs | Mani vārdi — ievade |
| M41 | `B3FB7034` | tumšs | Apsveikums — emoji panelis |
| M42 | `BF2410DD` | tumšs | Vārda un datuma meklēšana |
| M43 | `CECA3841` | tumšs | Dzimšanas dienu datuma ievade |
| M44 | `D1D86415` | tumšs | iOS kopīgošanas lapa |
| M45 | `D53A88ED` | tumšs | Kalendāra dienas atlase |
| M46 | `D6837E6A` | gaišs | Gatavais apsveikums |
| M47 | `D8E6138E` | tumšs | Iestatījumi — par aplikāciju |
| M48 | `F26BAA83` | tumšs | Iestatījumi — par aplikāciju |
| M49 | `F3C84706` | tumšs | Iestatījumi — par aplikāciju |
| M50 | `FAB6FBA3` | tumšs | Iestatījumi — atgādinājumi |

**Darbvirsmas tehniskie attēli D01–D06:** `Screenshot 2026-11-08 at 09.07.50.png`, `09.08.01.png`, `09.08.12.png`, `09.10.34.png`, `09.10.46.png`, `09.11.52.png`. Tie jāvērtē kā GitHub/darbvirsmas pārbaudes, nevis iPhone dizaina apstiprinājumi.

**Izsekojamības ierobežojums:** iepriekšējie A01–A20/B01–B05 ir sūtīšanas secības apraksti; M01–M50 ir failu nosaukumu alfabētiska inventarizācija. **Nedrīkst mehāniski pielīdzināt A/B un M numurus.** Lai galīgi saskaņotu lietotāja minētos 46 attēlus, vēl jāpārbauda oriģinālo ziņojumu secība un atkārtotie kadri.
