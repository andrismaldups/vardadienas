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

## 5. Komponentu katalogs C01–C18
| ID | Loma | Galvenā prasība |
|---|---|---|
| C01 | Virsmas/panelis | Vienots `--ds-surface` un `--ds-surface-border` |
| C02 | Informācijas teksts | `--ds-text`, `--ds-muted`, virsrakstiem `--ds-heading` |
| C03 | Primārā poga | Primārās krāsas un stāvokļi |
| C04 | Sekundārā poga | Neitrāla virsma un apmale |
| C05 | Ikonu poga | Vienota ikonu semantika, destruktīvām ikonām atsevišķs stāvoklis |
| C06 | Izvēles poga | Skaidrs selected/unselected stāvoklis |
| C07 | Teksta ievade | Kopīga fokusa ģeometrija un kursora krāsa |
| C08 | Pārslēgs/izvēles ievade | Pārslēgšanas krāsa no tēmas tokeniem |
| C09 | Informācijas rinda | Nav jāuzskata par navigācijas pogu “Uz sākumu” |
| C10 | Informācijas/satura rinda | Vienoti teksta, apmales un virsmas tokeni |
| C11 | Navigācijas kontrole | Bez nogriezta teksta un horizontālas pārplūdes |
| C12 | Uznirstoša izvēlne | `--ds-popup-*`, nepazaudēt atlasi |
| C13 | Dialogs | Fokusēšanas secība un apstiprinājums |
| C14 | Etiķete/izcēlums | `--ds-highlight-*`, ne fiksētas krāsas |
| C15 | Meklēšana | Ievades, ieteikumu un fokusa lomas |
| C16 | Kalendāra diena | Šodienai 46×46 px, 1 px `--ds-calendar-today-border`; selected prioritāte |
| C17 | Datu dzēšanas darbība | Neitrāla poga ar atsevišķu apstiprinājumu |
| C18 | Izvēršamais elements | 8 px atstarpe starp vienībām; apmales un ikonas nenogriezt |

**Piezīme:** šī ir funkcionāla katalogizācija 1.2 redakcijai. Detalizētie faktiskie CSS selektori un testu tvērums ir jālasa kopā ar `components.css`, `gallery.html` un iepriekš saskaņoto 1.0 komponentu katalogu; bez pilnās 1.0 atbilstības tabulas šīs rindas nedrīkst izmantot kā pierādījumu, ka katrs ID precīzi sakrīt ar sākotnējo numerāciju.

## 6. Reālo skatu piesaistes matrica
| Skats | Reālie selektori | Komponentu lomas |
|---|---|---|
| Sākums | `#mainView`, `.card`, `.names`, `.name-link` | Virsmas, vārdu saites, navigācija |
| Kalendārs | `#calendar .day.today`, `#calendar .day.sel` | C16 |
| Meklētāji | `#nameInput`, `#dateInput`, `#nameResult`, `#dateSuggestions` | C07/C15, sekundārās darbības |
| Mani vārdi | `.favorites-sort`, `.remove-favorite`, `#favoriteAddInput` | C05/C06/C07 |
| Dzimšanas dienas | `.birthday-sort`, `.birthday-edit-btn`, `.birthday-delete-btn`, `#birthdayAddForm` | C05/C06/C07 |
| Apsveikums | `.greeting-options`, `.greeting-emoji-panel`, `.greeting-back-bar` | C06, uznirstošs panelis |
| Iestatījumi | `.settings-section`, `.reminder-time-menu`, `#deleteMyDataButton` | C06/C17, informācijas virsmas |
| Par aplikāciju | `.about-card .about-row-button`, `.about-accordion-list` | C18 |
| Hamburgera izvēlne | `#sideMenu`, `.menu-btn` | Izvēlnes virsma un C05 |

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
| Sākums un kalendārs | Dienu navigācija, šodiena, atlasītā diena, kalendāra režģis | C11/C16 atlases un navigācijas semantika |
| Meklētāji | Vārda/datuma ievade, ieteikumi, rezultāti, fokusēta tastatūra | C07/C15; iOS tastatūra nedrīkst neatgriezeniski aizsegt darbību |
| Mani vārdi / dzimšanas dienas | Saraksts, kārtošana, pievienošanas un ievades stāvokļi | C05/C06/C07; saraksta darbību pieejamība |
| Apsveikumi | Izveide, rediģēšana, emoji panelis, sistēmas kopīgošanas lapa | C07/C12; saglabāt teksta un darbību pieejamību |
| Iestatījumi | Atgādinājumi, atvērta laika izvēlne, izskata radio izvēle, datu dzēšana | C06/C12/C17; izvēles redzamība un pārklājumu hierarhija |
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
| A01 | D3 gaišais / Iestatījumi | Izskata tēmu radio izvēles un gaišais režīms | C06/C08; atlasītā stāvokļa redzamība |
| A02 | D3 gaišais / Iestatījumi | Mani dati, Par aplikāciju, trīs izvēršamās rindas | C17/C18; neitrāla dzēšanas poga, pilnas apmales |
| A03 | D3 tumšais / Sākums | Vārdadienas, rītdiena, informācijas kartītes, navigācija | C01/C02/C03/C11 |
| A04 | D3 tumšais / Kalendārs | Novembra kalendārs, atšķirīgas šodienas un atlases dienas | C16; today/selected atšķiršana |
| A05 | D3 tumšais / Kalendārs | Atlasītā diena sakrīt ar izceltu dienu | C16; prioritātes pārbaude |
| A06 | D3 tumšais / Meklēt vārdu | Vārda rezultāts, iOS tastatūra un AutoFill | C07/C15; fokusēts ievades lauks |
| A07 | D3 tumšais / Meklēt datumu | Datuma daļēja ievade un mēnešu ieteikumi | C07/C12/C15 |
| A08 | D3 tumšais / Hamburgera izvēlne | Atvērta navigācijas izvēlne | C05/C11/C12 |
| A09 | D3 tumšais / Mani vārdi | Atvērta pievienošana un kārtošana | C03/C06/C07 |
| A10 | D3 tumšais / Mani vārdi | Saraksts bez ievades formas | C05/C06; rindas un dzēšanas ikonas |
| A11 | D3 tumšais / Mani vārdi | Meklēšanas ieteikumi, iOS tastatūra | C07/C15; ieteikumu sasniedzamība |
| A12 | D3 tumšais / Mani vārdi | Izvēlēts pievienojamais vārds, ievade un tastatūra | C03/C07/C15 |
| A13 | D3 tumšais / Dzimšanas dienas | Saraksts un kārtošana | C05/C06; rediģēšana/dzēšana |
| A14 | D3 tumšais / Dzimšanas dienas | Atvērta personas pievienošana un teksta tastatūra | C03/C07; ievades fokuss |
| A15 | D3 tumšais / Dzimšanas dienas | Datuma mēneša lauks ar ciparu tastatūru | C07; skārientastatūras tips |
| A16 | D3 tumšais / Vārda informācija | Vārds, datums, divas primārās darbības | C02/C03 |
| A17 | D3 tumšais / Apsveikums | Personas attiecību un stila izvēle | C03/C06 |
| A18 | D3 tumšais / Apsveikums | Gatavais teksts un darbību joslas | C04/C07/C11 |
| A19 | D3 tumšais / Apsveikums | Rediģējams teksts un tastatūra | C07; fokusa apmale |
| A20 | D3 tumšais / Apsveikums | Atvērts emoji panelis | C12; paneļa izvietojums |
| B01 | D3 tumšais / Apsveikums | Atvērta iOS kopīgošanas lapa | Sistēmas kopīgošanas integrācijas robeža |
| B02 | D3 tumšais / Iestatījumi | Atgādinājumi, laika izvēles un paziņojumu drošības teksts | C06/C08/C12 |
| B03 | D3 tumšais / Iestatījumi | Atvērta laika izvēlne ar izceltu 06:00 | C12; atlases izcēlums, pārklājuma secība |
| B04 | D3 tumšais / Iestatījumi | Izskata tēmu un krāsu režīma izvēles | C06/C08 |
| B05 | D3 tumšais / Iestatījumi | Mani dati, Par aplikāciju, trīs izvēršamās rindas | C17/C18; neitrāla poga, atstarpes |

### A.1. Interpretācijas ierobežojumi un turpmākā indeksēšana
- Šajā tabulā ir **redzamā stāvokļa apraksts**, nevis katra elementa klikšķa vai datu saglabāšanas tests.
- A01–A20 un B01–B05 nav oficiāli failu nosaukumi. Galīgajā katalogā jāaizstāj ar stabilām atsaucēm uz attēliem, pārbaudot attēlu skaitu un secību.
- Attēlos redzamais `AutoFill Contact` ir iOS sistēmas josla, nevis aplikācijas izstrādāts komponents.
- Paziņojumu teksts “DESIGN TEST nav pieejami” atspoguļo apzinātu izolētās vides drošības režīmu, nevis pierādījumu par produkcijas push darbības kļūmi.
- A05 un B03 parāda atlasītu stāvokli, bet neapliecina visu robežgadījumu darbību.
- 46 attēlu pilnu uzskaiti un visus attēlu failus nedrīkst pasludināt par pabeigtiem, kamēr nav pārbaudīta pārējo 21 attēla individuālā atbilstība.
