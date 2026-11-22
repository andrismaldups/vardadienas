# Vārdadienas iOS projekta pamats

## Ko šis posms dod

Capacitor 8.6.2 projekts, kas atkārtoti izmanto repozitorija saknē esošo lietotni.
Nav otra ar roku uzturama kalendāra vai apsveikumu koda kopija. `npm run build`
iepako 24 esošos HTML/JS/CSS/datu/attēlu failus lokālā `www` mapē, un Capacitor tos
ievieto Xcode projektā. Pirmās palaišanas saskarnei un kalendāra/apsveikumu datiem
nav nepieciešama attāla vietne. Apple servera bibliotēka no `ios-preparation` netiek
iekļauta klienta paketē.

Saglabājas esošais dizains un funkcionālie inline skripti. Tikai ģenerētajā HTML:

- izņem PWA manifestu un service worker reģistrēšanu;
- pievieno viewport-fit=cover un lokālu native preview inicializāciju;
- izņem neaktīvā Lavandas dizaina trūkstošā attēla HTML tagu;
- ierobežo ārējos savienojumus ar CSP un fetch aizsargu.

Esošie pieci neaktīvo Lavandas/nature-d3 CSS noteikumu attēlu ceļi paliek sākotnējā
CSS; šie dizaini nav izvēles sarakstā. Tos identificē tests. Izvēlamo dizainu lokālie
resursi ir iekļauti. Iepakošana nemaina avotus. Šajā izstrādes zarā `data-backup.js` ir pievienots izvēles iOS eksporta adapters; pārlūka eksporta ceļš saglabāts. Publicētās PWA zars nav mainīts.

## Izveidots, bet vēl nav izlaists

- Izveidots īsts Xcode projekta ietvars `ios/App/App.xcodeproj` ar Swift Package Manager.
- Capacitor core/CLI/iOS ir precīzi fiksēti 8.6.2 un npm lock failā; SPM norāda to pašu versiju.
- `appId = lv.example.vardadienas.preview` ir PAGAIDU identifikators. Uzņēmuma galīgais
  bundle ID/Team ID un App Store Connect ieraksts vēl nav izveidots.
- AppIcon un sākuma ekrāns ir Capacitor sagataves attēli. Pirms publiskošanas
  vajadzīgs zīmola 1024 px App Store ikonas un sākuma ekrāna risinājums.
- iOS 15 mērķis ir ietvara sākotnējais noklusējums, nevis galīgā veikala saderības
  garantija. Pirms StoreKit AppTransaction integrācijas jāsaskaņo minimums/availability
  (AppTransaction pamatā pieejams no iOS 16).
- Xcode kompilēšana, parakstīšana, simulators un īsts iPhone NAV pārbaudīti Linux vidē.
- Nav iesniegts App Store vai TestFlight; šis ietvars nepierāda App Review apstiprinājumu.

## Apzināti nepieslēgtās funkcijas

Sagataves pakete bloķē visus ārējos fetch savienojumus, arī esošā PWA produkcijas API.
Tā nevar automātiski veidot vai dzēst produkcijas instalācijas un sūtīt Push.
`VardadienasPlatform` skaidri norāda remoteSync/storePurchases/nativePush=false.
Šis ir izstrādes režīms, nevis bezmaksas App Store produkta variants. Saskaņotā
pārdošana paliek 4,99 EUR par lejupielādi un atsevišķa brīvprātīga Push pagarināšana.

Personīgie saraksti un iestatījumi tagad pieslēgti natīvajai krātuvei. Esošajiem
skriptiem saglabāta sinhronā `localStorage` metožu saskarne; dati šajā režīmā tiek
lasīti no atmiņas un secīgi saglabāti iOS Library failos, nevis paļaujas uz WebView
localStorage noturību.

### Palaišana un ierakstīšana

- `www/index.html` ir palaišanas pārbaude. Tā nolasa Preferences norādi, izvēlēto
  failu un SHA-256 kontrolsummu; tikai pēc pārbaudes atver `app.html`.
- Divi privāti faili `Library/vardadienas/storage-a.json` un `storage-b.json`.
  Jaunais ieraksts iet neaktīvajā failā. To nolasa un pārbauda pirms Preferences
  norādes maiņas. Preferences 8.0.1 glabā tikai mazo norādi, nevis sarakstu datubāzi.
- Trūkstošs/bojāts jau apstiprināts fails aptur palaišanu; nav automātiskas atiestates
  vai klusējošas pārejas uz vecāku kopiju. Trūkstoša norāde kopā ar esošu failu arī aptur palaišanu. Iepriekšējā kopija paliek diagnostikai.
- Tikai pašā pirmajā natīvās krātuves palaišanā, kad norādes un abu datu failu vēl nav, var pārņemt
  šīs pašas iOS sagataves WebView personīgos datus. PWA instalācijas datiem nav
  automātiskas piekļuves — tos pārnes ar JSON failu.
- Pārņem tikai atļautos personīgo datu laukus, ieskaitot gaidošās sarakstu izmaiņas
  un importa atjaunošanas žurnālu. Instalācijas/tokeni/Push abonementa ID nav šajā
  krātuvē; nākotnes iOS piekļuves datiem vajadzēs atsevišķu Keychain risinājumu.
- Native palaišanas pārbaude nodod vienreizēju, patērējamu sessionStorage kopiju
  sinhronajam lietotnes sākumam. Pirms jauna faila apstiprināšanas pārbauda arī šīs
  nodošanas ietilpību. Robeža ir mazākā no 32 MiB privātā formāta un faktiskās
  WebView ietilpības; pilna 5 MiB pārnesamā JSON robeža iOS vēl nav garantēta.
- Parastās izmaiņas savāc vienā secīgā saglabāšanas rindā. Kamēr ieraksta datus,
  saskarne rāda “Saglabā datus…” un tās pārējās daļas ir inert. Kļūme saglabā
  nesaglabāto kopiju atmiņā un piedāvā atkārtot, bloķējot tālākas izmaiņas.
- Imports atsevišķā transakcijā saglabā vienu gala kopiju, gaida apstiprinājumu un
  tikai tad maina lietotnes sarakstus/paziņo pabeigšanu. Neskaidra importa kļūme
  prasa atkārtotu palaišanas pārbaudi; tā nevar turpināt rakstīt novecojušus datus.
- Pieņēmums: viena iOS aina/WebView (projektā MultipleScenes=false). Norādes
  atkārtota pārbaude atklāj novecojušu rakstītāju, bet nav daudzprocesu CAS bloķēšana.
- Natīvajā izolētajā sagatavē “Dzēst manus datus” prasa atsevišķu lokālu apstiprinājumu,
  saglabā iztīrītu aktīvo kopiju, iztīra arī iepriekšējo failu un WebView personīgo
  datu paliekas. Izskata izvēle saglabājas. Produkcijas servera dzēšana netiek izsaukta.
  Tā nav SSD fiziskās dzēšanas garantija un neizdzēš lietotāja atsevišķi eksportētos failus.

### JSON eksports un atlikušie posmi

Eksportam ir Filesystem/Share adapters: UTF-8 fails privātajā Cache mapē, tikai
faila pielikums bez teksta/virsraksta, tīrīšana pēc dalīšanās izvēlnes aizvēršanas.
Tas nenozīmē, ka lietotājs failu noteikti saglabāja. Eksports vispirms gaida krātuves
saglabāšanas rindu. Natīvās kļūmes gadījumā nav pārejas uz pārlūka lejupielādi.
Pārnesamā JSON versija paliek 1. Importa faila izvēle joprojām ir HTML ievade;
tā jāpārbauda īstā iPhone.

Filesystem 8.1.5, Preferences 8.0.1 un Share 8.0.3 fiksēti npm/SPM; esbuild 0.28.2
komplektē klienta adapterus. SHA-256 izmanto precīzi fiksētu @noble/hashes 2.4.0,
nesaistot palaišanu ar crypto.subtle pieejamību; sagataves failu ID izmanto getRandomValues. Xcode Resources iekļauts PrivacyInfo.xcprivacy ar
FileTimestamp/C617.1 un UserDefaults/CA92.1. Pirms izlaides jāpārskata visas lietotnes deklarācijas.

Nākamajos posmos vēl nepieciešams:

1. Xcode kompilācija un reāli iPhone glabāšanas testi: aukstā palaišana, OS piespiedu
   aizvēršana saglabāšanas laikā, lietotnes atjaunināšana, lieli faili, pilna ierīce,
   bloķēšana/atbloķēšana un iCloud ierīces dublējuma atjaunošana. JS/native apstiprinājums
   nav pierādījums par fsync vai garantiju pēkšņa strāvas zuduma gadījumā.
2. JSON faila izvēles un apsveikumu natīvās dalīšanās pārbaude/pielāgošana.
3. Natīvais APNs, atļaujas un servera piesaiste; Web Push nav APNs tokens.
4. StoreKit pirkuma pārbaude/atjaunošana un brīvprātīga pagarināšana.
5. iOS servera autentifikācija/Keychain, piesaiste, licence un kopīgā datu dzēšanas plūsma.
6. Safe-area, tastatūra, pieejamība un visu funkciju atkārtota pārbaude īstā iPhone.

## Atkārtošana uz jaunā Mac

Nepieciešams Node 22+ un Capacitor 8 atbilstošs Xcode 26+ ar saderīgu macOS.
Izvēlas izstrādes zaru `app-store-ios-preparation`, tad:

```sh
cd mobile
npm ci --ignore-scripts
npm test
npm run ios:sync
npm run ios:open
```

Xcode jāizvēlas sava uzņēmuma Team un galīgais bundle ID, kad tie būs izveidoti.
Kamēr uzņēmuma konta nav, produkcijas konfigurāciju vai maksājumus neaktivizē.
Ģenerētās `www`, `ios/App/App/public`, konfigurācijas un node_modules netiek glabātas git;
tās atjauno iepriekš minētās komandas. Xcode projekta avoti tiek glabāti git.

## Veiktās pārbaudes 22.11.2026.

- `npm test` mobilajā projektā: 40 pārbaudes — 9 iepakošana/izolācija, 5 faila
  eksports, 22 krātuve/transakcijas/palaišana/dzēšana, 1 pārnēsājama kontrolsumma un 3 sakomplektēto skriptu
  integrācijas pārbaudes ar imitētu Capacitor tiltu. Tās nav Swift vai WKWebView pārbaudes.
- Kopīgā JSON moduļa 45 un saskarnes 17 pārbaudes izdevās, ieskaitot gaidīšanu
  pirms sekmīga importa paziņojuma un kļūmi bez eksporta/sarakstu izmaiņām.
- `npm run ios:sync`: resursi un trīs spraudņi pievienoti SPM.
- Xcode kompilācija, simulators un īsts iPhone šajā vidē nav pārbaudīti.

## Oficiālie avoti

- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/ios
- https://capacitorjs.com/docs/ios/spm
- https://capacitorjs.com/docs/config

- https://capacitorjs.com/docs/apis/filesystem
- https://capacitorjs.com/docs/apis/share

- https://capacitorjs.com/docs/apis/preferences

- https://github.com/paulmillr/noble-hashes
