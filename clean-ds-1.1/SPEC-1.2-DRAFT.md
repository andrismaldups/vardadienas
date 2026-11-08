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
- **Kataloga nākamais solis:** katram no 46 attēliem izmantot Pielikuma C pastāvīgo identifikatoru, skatu, režīmu, komponentu ID un novērtējumu; attēlu indeksu neizdomāt, kamēr nav izveidota pārbaudāma attēlu-failu atbilstība.

## 12. Galīgā pieņemšana
2026-11-08 saņemtie D3 gaišā/tumšā režīma iPhone ekrānattēli, tostarp **“Mani dati” / “Par aplikāciju” / C17** stāvoklis pirms un pēc labojuma, veido vizuālā audita pierādījumu kopumu. Tie glabājas sarunas pielikumos; **nav iegulti GitHub dokumentā** un nav jāuzdod par visu C01–C18 pilnu katalogu.

**1.2 redakcijas statuss:** tehniski pārbaudīta un papildināta ar 46 attēlu kataloga tvērumu; pilnais individuāli indeksētais vizuālais katalogs vēl nav pabeigts, bet **nav automātiski lietotāja apstiprināta**. Pirms publiskās versijas migrācijas atsevišķi jāvienojas par pārējo tēmu pieņemšanu, offline/push regresiju un vizuālā kataloga pilnu tvērumu.

## Pielikums A — tematiskais vizuālās pārbaudes katalogs

**Kataloga mērķis:** piesaistīt redzamos lietotnes stāvokļus pārbaudes kritērijiem, **neizdomājot** attēlu individuālo numerāciju. Vienīgais apstiprinātais attēlu kopums ir 46 kadri trīs sūtījumos (20 + 20 + 6; skat. Pielikumu C). Iepriekšējie pagaidu A01–A20/B01–B05 numuri tika veidoti pēc nepilnīga sarunas fragmenta, tādēļ **atsaukti**; tie nav uzticami attēlu ID.

| Kataloga grupa | Redzamie skati / stāvokļi | Galvenie komponenti | Kas jāvērtē |
|---|---|---|---|
| T01 | Sākums, dienu pārslēgšana, informācijas paneļi | C01/C02/C03/C09 | Satura salasāmība, navigācija, paneļu atstarpes |
| T02 | Kalendārs, šodiena, atlasītā diena | C16 | Today/selected prioritāte, dienas atšķiramība |
| T03 | Vārda un datuma meklētājs, rezultāti, iOS tastatūra | C07/C13 | Fokuss, ieteikumi, vertikāla sasniedzamība |
| T04 | Hamburgera izvēlne | C05/C13 | Atvēršana, apmales un satura pieejamība |
| T05 | Mani vārdi, saraksts, pievienošana, dzēšanas ikonas | C03/C05/C06/C07/C10 | Saraksta darbību vizuālā hierarhija |
| T06 | Dzimšanas dienas, saraksts, personas un datuma ievade | C03/C05/C07/C10 | Ievades stāvokļi, skārienmērķi |
| T07 | Vārda informācija | C02/C03 | Darbību un informācijas atšķiršana |
| T08 | Apsveikuma veidošana, gatavais teksts, rediģēšana, emoji | C03/C04/C06/C07/C13 | Teksta pārskatāmība, emoji paneļa novietojums |
| T09 | iOS kopīgošanas lapa | Sistēmas dialogs, ne C komponents | Lietotnes/sistēmas robeža |
| T10 | Atgādinājumi un atvērta laika izvēlne | C06/C13/C14 | Izvēlētā vērtība, pārklājuma secība |
| T11 | Izskats: tēmas un krāsu režīms | C06 | Radio izvēles atlasītais stāvoklis |
| T12 | Mani dati, Dzēst manus datus | C04/C17 | Neitrāla poga, apstiprināšanas prasība |
| T13 | Par aplikāciju, trīs izvēršamās rindas | C18 | Pilnas apmales, 8 px atstarpes |

**Sūtījums III (6 kadri) — pārbaudāms pēc šajā sarunā redzamās secības:**
1. `III01`: Apsveikums ar atvērtu iOS kopīgošanas lapu (T08/T09).
2. `III02`: Iestatījumi — atgādinājumi, paziņojumu DESIGN TEST drošības teksts (T10).
3. `III03`: Iestatījumi — atvērta laika izvēlne ar atlasītu `06:00` (T10).
4. `III04`: Iestatījumi — dizaina tēmu izvēle un režīma sadaļas sākums (T11).
5. `III05`: Iestatījumi — krāsu režīms un Mani dati (T11/T12).
6. `III06`: Iestatījumi — Mani dati un Par aplikāciju (T12/T13).

**Sūtījumi I un II:** katrā ir 20 attēli. To individuālās secības un komponentu atbilstības vēl nav pietiekami droši rekonstruētas; `I01–I20` un `II01–II20` saglabātas kā rezervētas pozīcijas, nevis aizpildītas ar minējumiem. Tematiskā tabula neapgalvo, ka katrai grupai ir savs unikāls kadrs.

**Vizuālo pierādījumu robeža:** ekrānattēli neapliecina, ka darbības nostrādā, dati saglabājas, paziņojumi tiek nosūtīti vai lietotne darbojas bezsaistē. iOS kopīgošanas un tastatūras virsmas nav aplikācijas CSS komponenti.

## Pielikums B — pieņemšanas un izsekojamības vārtejas

| Vārteja | Pārbaudāmais kritērijs | Pašreizējais pierādījums | Statuss |
|---|---|---|---|
| B1 — komponentu ID | C01–C18 kartējums pret `components.css` | Šīs redakcijas 5. sadaļa; C15 skaidri atzīmēts kā nedefinēts atsevišķi | Dokumentācijas kartējums precizēts |
| B2 — automatizētā regresija | Statika, integrācija, kontrasts, Chromium, WebKit, mobile-WebKit | GitHub Actions #70/#72/#73 | Iepriekšējais pārbaudes tvērums sekmīgs |
| B3 — D3 iPhone izskats | Gaišais/tumšais, C17 pēc labojuma | Lietotāja iPhone ekrānattēli un apstiprinājums | Apstiprināts iepriekš saskaņotajā tvērumā |
| B4 — vizuālā kataloga pilnīgums | Visiem 46 attēliem stabila atsauce un individuāls ieraksts | Pielikums A: tematiskais katalogs; Pielikums C: 46 pozīcijas | **Tvērums: 46 trīs sūtījumos; individuālā sasaistīšana vēl nav pabeigta** |
| B5 — virsmu alfa | V02–V05 izmērītas gala renderējumā | Nav mērījumu protokola | Atvērts pierādījumu jautājums |
| B6 — pārējās tēmas | K1, Z3, S1, J1-E individuāla iPhone pieņemšana | Nav šīs iterācijas individuāla protokola | Atvērts |
| B7 — datu drošība | Offline, push un dzēšanas darbību regresija | Vizuālā pārbaude to neapliecina | Atvērts; **nedrīkst testēt ar reālu datu dzēšanu bez atsevišķas saskaņošanas** |
| B8 — 1.0 numerācijas savietojamība | 1.0 komponentu tabula salīdzināta ar faktisko 1.2 implementāciju | Nav pilnas 1.0 ID tabulas šajā dokumentā | Atvērts |

**Saskaņošanas lēmums:** 1.2 dokumentu drīkst nodot **satura pārskatīšanai**, bet ne pasludināt par pilnībā pierādītu visu 46 attēlu, visu tēmu vai offline/push pieņemšanu. Atvērtie punkti nav automātiski aplikācijas defekti.


## Pielikums C — 46 lietotāja iesūtīto ekrānattēlu tvērums

**Vienīgais apstiprinātais vizuālā audita attēlu kopums:** lietotāja trīs secīgi sūtījumi šajā sarunā:
- **Sūtījums I:** 20 attēli, secības ID `I01–I20`.
- **Sūtījums II:** 20 attēli, secības ID `II01–II20`.
- **Sūtījums III:** 6 attēli, secības ID `III01–III06`.
- **Kopā: 46 attēli.** Citus attēlus neiekļaut, nemeklēt un nepieskaitīt.

**Korekcija:** iepriekšējā šī pielikuma redakcijā tika izveidots 50 lokālu mobilā attēla failu un sešu darbvirsmas failu saraksts. Tas **nebija droši sasaistīts** ar trim lietotāja noteiktajiem sūtījumiem, tādēļ ir atsaukts un izņemts. Failu kopijas, tehniskie ekrānattēli, dublikāti vai citu sarunas posmu materiāli **nav** šā audita pierādījumi.

### C.1. Kataloga identifikācijas noteikums
Katram attēlam saglabāt identifikatoru pēc **sūtījuma un vietas sūtījumā**, nevis pēc lokāla faila nosaukuma, alfabētiskās kārtības vai līdzības ar citu kadru. Ja precīza attēla un secības pozīcijas atbilstība nav droši pārbaudāma, tās skata, režīma un C-komponenta laukus atstāt **“jāprecizē”**, nevis aizpildīt ar minējumu.

| Sūtījums | Attēlu skaits | Pastāvīgo ID diapazons | Individuālās sasaistes statuss |
|---|---:|---|---|
| I | 20 | `I01–I20` | Jāsaskaņo ar oriģinālā sūtījuma secību |
| II | 20 | `II01–II20` | Jāsaskaņo ar oriģinālā sūtījuma secību |
| III | 6 | `III01–III06` | Jāsaskaņo ar oriģinālā sūtījuma secību |
| **Kopā** | **46** | | **Tvērums apstiprināts; individuālā sasaistīšana turpinās** |

### C.2. Attiecības ar Pielikumu A
Pielikums A ir tematiskais pārbaudes katalogs (T01–T13), nevis individuālu attēlu secības saraksts. Vienīgi Pielikuma C `I`, `II` un `III` apzīmējumi rezervē attēlu vietas lietotāja apstiprinātajos trīs sūtījumos. Iepriekšējie `A`/`B` numuri ir atsaukti.

**Vizuālā audita robeža:** attēli pamato tikai redzamos dizaina stāvokļus; tie paši par sevi neapstiprina offline darbību, push piegādi vai datu dzēšanas funkcionalitāti.

### C.3. Individuālais 46 pozīciju reģistrs

> Šis ir **sūtījumu secības reģistrs**, nevis apgalvojums, ka visi 46 attēli jau individuāli analizēti. Pirmo divu sūtījumu laukus aizpildīt tikai pēc tiešas pārbaudes oriģinālajā sūtījumā.

| ID | Skats / stāvoklis | Režīms | T grupa | C komponents / novērojums | Pierādījuma statuss |
|---|---|---|---|---|---|
| I01 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I02 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I03 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I04 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I05 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I06 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I07 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I08 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I09 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I10 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I11 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I12 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I13 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I14 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I15 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I16 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I17 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I18 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I19 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| I20 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II01 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II02 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II03 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II04 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II05 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II06 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II07 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II08 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II09 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II10 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II11 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II12 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II13 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II14 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II15 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II16 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II17 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II18 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II19 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| II20 | Jāprecizē | Jāprecizē | Jāprecizē | Jāprecizē | Attēls ietilpst apstiprinātajā sūtījumā; individuāli nav piesaistīts |
| III01 | Apsveikums; iOS kopīgošanas lapa | tumšais | T08/T09 | C04/C07; iOS sistēmas lapa | Redzamais stāvoklis identificēts; funkcionalitāte nav testēta |
| III02 | Iestatījumi; atgādinājumi | tumšais | T10 | C06/C14; DESIGN TEST push drošības teksts | Redzamais stāvoklis identificēts; funkcionalitāte nav testēta |
| III03 | Iestatījumi; atvērta laika izvēlne 06:00 | tumšais | T10 | C13; izvēlētā laika izcēlums | Redzamais stāvoklis identificēts; funkcionalitāte nav testēta |
| III04 | Iestatījumi; izskata tēmu izvēle | tumšais | T11 | C06; atlasītais stils | Redzamais stāvoklis identificēts; funkcionalitāte nav testēta |
| III05 | Iestatījumi; krāsu režīms un Mani dati | tumšais | T11/T12 | C06/C17 | Redzamais stāvoklis identificēts; funkcionalitāte nav testēta |
| III06 | Iestatījumi; Mani dati un Par aplikāciju | tumšais | T12/T13 | C17/C18 | Redzamais stāvoklis identificēts; funkcionalitāte nav testēta |

**Kontrole:** 20 + 20 + 6 = **46** rindas. Pirmie 40 ieraksti apzināti nav aizpildīti ar spekulatīviem datiem. Trešā sūtījuma sešas pozīcijas atbilst lietotāja pēdējā sešu attēlu ziņojuma secībai.

## Pielikums D — vizuālās pieņemšanas protokols

### D.1. Vienots vērtējums
Katram pārbaudes punktam izmanto vienu no četrām vērtībām: **Atbilst** (konkrēts attēls vai lietotāja apstiprinājums to pierāda), **Neatbilst** (redzams konkrēts defekts ar atsauci), **Nav pārbaudīts** (trūkst pietiekama pierādījuma), **Neattiecas** (komponents nav attiecīgajā skatā). Automatizēts CI tests drīkst pamatot tikai savu tehnisko tvērumu, nevis iPhone vizuālu pieņemšanu.

### D.2. Kritēriju matrica
| ID | Pārbaudes kritērijs | Pierādījuma metode | Pašreizējais statuss |
|---|---|---|---|
| P01 | Gaišajā un tumšajā D3 režīmā teksts salasāms uz apstiprinātajām virsmām | iPhone ekrānattēli + vizuāla pārbaude | D3 lietotāja pārbaudītajā tvērumā apstiprināts; visu 46 individuāls protokols nav pabeigts |
| P02 | V01–V05 caurspīdīgums atbilst specifikācijas skaitliskajiem etaloniem | Gala computed-style un alfa mērījumi | Nav pārbaudīts pilnā tvērumā |
| P03 | C03 primārajām un C04 sekundārajām pogām ir atšķirīga vizuālā hierarhija | iPhone skati + CSS stāvokļu testi | CI pārbaudes veiktas; pilns manuālais protokols nav pabeigts |
| P04 | C05 ikonu pogām ir 44×44 px skārienlaukums un atbilstošs danger stāvoklis | CSS + pārlūka testi | CI tvērumā pārbaudīts |
| P05 | C06 atlasītā izvēle nepārprotami atšķiras no neatlasītās | Iestatījumu un apsveikumu skati | Redzami piemēri; visu izvēļu stāvokļi nav pārbaudīti |
| P06 | C07/C08 ievadē fokusa apmale un kursors ir redzami; iOS tastatūra neaizsedz darbības neatgriezeniski | Fokusētas ievades attēli + reāla skārienu pārbaude | Redzami piemēri; pilna interakcija nav pārbaudīta |
| P07 | C09 apakšējā navigācija ir centrēta un respektē iPhone safe-area | Skati ar “Uz sākumu” | Vizuāli novērots; pilns ierīču diapazons nav pārbaudīts |
| P08 | C13 laika izvēlnē ir skaidri izcelta atlasītā vērtība un izvēlne netiek nogriezta | III03 | Redzamais 06:00 stāvoklis identificēts; izvēles saglabāšana nav pārbaudīta |
| P09 | C16 šodienas un atlasītās dienas stāvokļi ievēro prioritāti | Kalendāra skati + CI | CI tvērumā pārbaudīts; individuāla attēlu sasaistīšana nepabeigta |
| P10 | C17 “Dzēst manus datus” vizuāli ir neitrāla sekundārā poga abos D3 režīmos | Lietotāja apstiprinājums + CI #72/#73 | **Atbilst — iepriekš apstiprināts** |
| P11 | C18 trīs izvēršamajām rindām ir pilnas sānu apmales un 8 px atstarpes | “Par aplikāciju” iPhone skati | **Atbilst — iepriekš apstiprināts N22** |
| P12 | Emoji panelis atrodas aiz teksta ievades lauka un netraucē rediģēšanai | Apsveikumu skati | Redzams stāvoklis; precīza pozicionējuma pilna pārbaude nav dokumentēta |
| P13 | iOS kopīgošanas lapa atveras, saglabājot gatavā apsveikuma saturu | III01 + funkcionāla pārbaude | Attēls apliecina atvērtu sistēmas lapu; piegādes rezultāts nav pārbaudīts |
| P14 | DESIGN TEST paziņojumi ir apzināti atspējoti, neietekmējot esošos abonementus | III02 + integrācijas drošības pārbaude | Drošības teksts redzams; servera stāvoklis nav pārbaudīts |
| P15 | PWA offline, datu saglabāšana un push piegāde darbojas atbilstoši atsevišķai funkcionalitātes specifikācijai | Funkcionāli testi, nevis attēli | Ārpus šā vizuālā audita tvēruma |

### D.3. Neatbilstību reģistrēšanas forma
Ja rodas jauns defekts, ierakstīt **ID, attēla ID (I/II/III), skatu, režīmu, komponentu C-ID, sagaidāmo izskatu, faktisko izskatu, reproducēšanas darbības, prioritāti un labošanas commit**. Ja nav drošas attēla atsauces, nelietot izdomātu ID. Iepriekš slēgtos N21/N22/N23/N25 un C17 neatvērt no jauna bez konkrēta regresijas pierādījuma.

### D.4. Dokumenta galīgās saskaņošanas nosacījumi
1. Pabeigta pirmo divu sūtījumu `I01–I20` un `II01–II20` individuālā sasaistīšana ar redzamajiem stāvokļiem.
2. Pārbaudīta 1.0 un 1.2 komponentu numerācijas savietojamība, īpaši C15.
3. Izšķirti neapstiprinātie V02–V05 alfa mērījumi un atlikušie vizuālās pārbaudes punkti.
4. Lietotājs apstiprina 1.2 redakciju kā dizaina sistēmas dokumentu. Tas **nav** automātiska atļauja migrēt produkciju vai veikt push/datu dzēšanas testus.

**Darba secība:** vispirms pierādījumi un dokumenta saskaņošana, pēc tam — tikai atsevišķi saskaņoti koda labojumi un regresijas pārbaudes.
