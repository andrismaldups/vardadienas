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
Pārnesamā JSON versija paliek 1. iOS importa poga tagad atver UIDocumentPicker caur precīzi fiksētu
Capawesome File Picker 8.1.1. Izvēle: viens `application/json`, `readData=false`.
Spraudnis izveido pagaidu kopiju; JS pārbauda, ka adrese ir tieši Cache/UUID/fails,
izmērs ir līdz 5 MiB un tas nav mainījies, tad nolasa UTF-8. Nelasām Base64 un
neaugšupielādējam failu. Pēc nolasīšanas/darbības kļūmes kopiju iztīra bez rekursīvas
mapju dzēšanas; avota fails Files/iCloud netiek dzēsts. Atcelšana neko neimportē.
Pati iOS izvēlne var vispirms lejupielādēt/kopēt iCloud failu — 5 MiB pārbaude notiek
pēc izvēles, pirms satura nodošanas JavaScript. iCloud nepieejamība bez interneta
paliek kļūme, nevis tukšs imports. Spraudņa kopijas ceļa pārbaude ir piesaistīta
pārskatītajai 8.1.1 Swift realizācijai; atjauninot spraudni, tā jāpārskata.

Iegūtais fails nonāk tajā pašā kopīgajā JSON validatorā, priekšskatījumā un
apstiprinātā apvienošanā; dati pirms apstiprināšanas nemainās. PWA HTML file input
ceļš saglabāts. iOS kļūme neizraisa klusu pāreju uz HTML faila izvēli.

Apsveikuma “Dalīties” iOS izmanto Share ar tikai `{text}`; netiek pievienots URL,
virsraksts vai faila pielikums. “Kopēt” izmanto Clipboard 8.0.1 ar tikai `{string}`.
Nekad nelasām starpliktuvi. Rediģētais teksts/emoji/rindu pārtraukumi saglabājas.
Dalīšanās atcelšana ir klusa un neko nekopē. Kļūmes gadījumā var atsevišķi nospiest
“Kopēt”; automātiska starpliktuves pārrakstīšana nenotiek. PWA turpina izmantot savas
pārlūka funkcijas. Arī datu faila eksporta atcelšana normalizēta uz “Eksports atcelts”.

Filesystem 8.1.5, Preferences 8.0.1 un Share 8.0.3 fiksēti npm/SPM; esbuild 0.28.2
komplektē klienta adapterus. SHA-256 izmanto precīzi fiksētu @noble/hashes 2.4.0,
nesaistot palaišanu ar crypto.subtle pieejamību; sagataves failu ID izmanto getRandomValues. Xcode Resources iekļauts PrivacyInfo.xcprivacy ar
FileTimestamp/C617.1 un UserDefaults/CA92.1. Pirms izlaides jāpārskata visas lietotnes deklarācijas.

Nākamajos posmos vēl nepieciešams:

1. Xcode kompilācija un reāli iPhone glabāšanas testi: aukstā palaišana, OS piespiedu
   aizvēršana saglabāšanas laikā, lietotnes atjaunināšana, lieli faili, pilna ierīce,
   bloķēšana/atbloķēšana un iCloud ierīces dublējuma atjaunošana. JS/native apstiprinājums
   nav pierādījums par fsync vai garantiju pēkšņa strāvas zuduma gadījumā.
2. Ieviestā JSON faila izvēles un apsveikumu natīvās dalīšanās pārbaude īstā iPhone,
   tostarp On My iPhone/iCloud, atcelšana, īsziņas, Mail un citas izvēlētās lietotnes.
3. Ieviestās APNs reģistrācijas sagataves piesaiste autentificētam serverim, pirkuma
   tiesībām un reālai Apple konfigurācijai. Skatīt `../ios-preparation/apns/README.md`.
4. StoreKit pirkuma pārbaude/atjaunošana un brīvprātīga pagarināšana.
5. Sagatavotā Keychain/HTTP klienta/autentifikācijas koda reāla pārbaude un enrollment,
   atsaukšanas, licences un kopīgās datu dzēšanas piesaiste. Skatīt `../ios-preparation/identity/README.md`.
6. Safe-area, tastatūra, pieejamība un visu funkciju atkārtota pārbaude īstā iPhone.

## Atkārtošana uz jaunā Mac

Nepieciešams Node 24+ un Capacitor 8 atbilstošs Xcode 26+ ar saderīgu macOS.
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

File Picker 8.1.1 un Clipboard 8.0.1 pievienoti npm/SPM; nav ieslēgta piekļuve
foto bibliotēkai, kontaktiem vai starpliktuves lasīšana. UIDocumentPicker izvēle nav
“Open in Vārdadienas”/Share Extension integrācija — failu izvēlas lietotnes pogā.
`THIRD_PARTY_NOTICES.txt` tiek iekļauts lokālajā paketē ar pašreizējo izpildlaika
pakotņu licencēm. Pirms izlaides vēl jāpārskata Xcode atrisinātās Swift atkarības.

## APNs klienta sagatave

Push Notifications 8.1.3 un AppDelegate callback savienojums pievienoti. Apple serverim
nav nosūtītu reģistrāciju/paziņojumu; nav īsta tokena vai Apple konta konfigurācijas.
Esošā iOS sagatave rāda neieslēgtu Push un neveic OS atļaujas pieprasījumu, kamēr nav
uzticamā servera adaptera. Atgādinājumu izvēles turpina saglabāties lokāli ar esošajiem
vadības elementiem; native ceļš neizmanto produkcijas Web Push reģistrāciju.
`VardadienasPlatform.nativePush` pagaidām paliek false — sagatave nav aktīva piegāde.
Tokens netiek saglabāts personalizācijas krātuvē vai JSON eksportā. Detalizētais statuss,
servera līgums un atlikušās darbības: `../ios-preparation/apns/README.md`.

## iOS identitātes un HTTPS klienta sagatave

Pievienots lokāls Keychain plugin un tā reģistrācija pielāgotā bridge kontrolierī;
SceneDelegate un Main.storyboard izmanto šo kontrolieri. Glabā tikai servera izsniegtu
instalācijas API credential, nevis APNs tokenu. Ieraksti ir ThisDeviceOnly un pieejami
atbloķētā ierīcē. Bojāta/nesaistīta identitāte netiek automātiski pārrakstīta.
Lietotnes lokālā dzēšana vispirms pārbauda, vai nav nepieciešama servera identitātes
atsaukšana; pie tukša Keychain dzēšanas funkcija turpina darboties.

Autentificētā HTTPS klienta un servera tokena pārbaudes prototipi ir testējami, bet
nav pieslēgti reālam serverim vai jaunai DB shēmai. CSP un tīkla izolācija paliek spēkā.
Plašāk: `../ios-preparation/identity/README.md`. Keychain Swift kods nav kompilēts ar
Xcode; tā krātuves īpašības šajā vidē netiek apstiprinātas ar imitētiem JS testiem.

## StoreKit sākotnējā pirkuma pierādījums

Pievienots lokāls AppPurchaseProofPlugin: AppTransaction.shared, .verified un ierīces
SHA-384 pārbaude, tikai parakstīta JWS nodošana servera adapterim. Refresh atsevišķi
pieļauj tikai lietotāja ierosinātu atjaunošanas darbību; automātiska App Store dialoga
atvēršana nav pievienota. Pašreizējā UI šo adapteri vēl neizsauc. Capacitor tilta
loggingBehavior=none, lai atkļūdošanā neizdrukātu credential vai JWS rezultātus.
Nepieciešams iOS 16; saglabāta pieejamības pārbaude, bet ietvara provizoriskais
mērķis 15 vēl nav veikala minimālās saderības lēmums.

Servera sasaistes pakalpojuma līgums, imitācijas un atlikušais:
`../ios-preparation/purchases/README.md`. Pirkuma perioda sākums nāk no verificēta
sākotnējā Apple pirkuma, nevis instalēšanas/sasaistes datuma. Faktiska App Attest
pārbaude, enrollment un DB transakcijas adapters vēl nav realizēti.

## App Attest un pirmreizējā reģistrācija

Pievienots AppAttestEnrollmentPlugin un kopīgs VerifiedAppPurchase native palīgs,
lai attest kods pats nolasītu StoreKit pierādījumu un nepieņemtu to no JS.
Konteksts sasaista servera vienreizējo nonce, instalācijas ID, bundle, keyId un
native JWS hash. Statusa pārbaude/adaptera izveide neģenerē atslēgas. Pašreizējā UI
App Attest neizsauc; entitlement piemērs nav piesaistīts būvējumam.

Servera adapters izmanto node-app-attest 2.2.0 un papildu sertifikātu/scope pārbaudes.
Node SQLite atsauces transakcija pārbaudīta lokāli; D1 migrācija vai HTTP endpoint
nav izvietots. Zudušas reģistrācijas atbildes recovery/assertion prototipam pievienota native
Keychain sagatave un koordinators; uzticams HTTP savienojums un īsta iPhone pārbaude
vēl nepieciešami pirms reālas reģistrācijas pieslēgšanas. Pilns statuss: `../ios-preparation/enrollment/README.md`.

## Veiktās pārbaudes 22.11.2026.

- Mobilais projekts: 108 automatizētas pārbaude.
- Kopīgais JSON: 45; importa/eksporta UI: 20.
- Servera sagataves un jaunā Node SQLite reģistrācija: 87; agrākā Python SQLite shēma: 9.
- Kopā 269 pārbaudes. Pozitīva Apple/App Attest puse testos ir imitēta; Swift/Secure
  Enclave/īsts iPhone šajā vidē nav pārbaudīts.
- `npm run ios:sync` izdevās. Dzīvais PWA/Cloudflare nav mainīts.

## Oficiālie avoti

- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/ios
- https://capacitorjs.com/docs/ios/spm
- https://capacitorjs.com/docs/config

- https://capacitorjs.com/docs/apis/filesystem
- https://capacitorjs.com/docs/apis/share

- https://capacitorjs.com/docs/apis/preferences

- https://github.com/paulmillr/noble-hashes

- https://capawesome.io/docs/sdks/capacitor/file-picker/
- https://capacitorjs.com/docs/apis/clipboard

- https://capacitorjs.com/docs/apis/push-notifications

- https://developer.apple.com/documentation/security/keychain-services
- https://capacitorjs.com/docs/ios/custom-code

- https://developer.apple.com/documentation/storekit/apptransaction/shared

- https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity


## Zudušas reģistrācijas atbildes atjaunošana

`identity-recovery.mjs` ir pasīva rūpnīca ar obligāti injicētu transportu; tā netiek
palaista no UI vai starta un neatver CSP/tīklu. Native plugin izmanto esošo App Attest
atslēgu. Pirms `generateAssertion` tas izveido 32 nejaušu baitu API noslēpumu ar
`SecRandomCopyBytes`, saglabā to atsevišķā fiksētā `ios-recovery-v1` Keychain account
un pārbauda nolasīšanu. JS saņem tikai hash/recovery ID/apliecinājumu. Atkārtojums
izmanto to pašu pending ierakstu ar jaunu servera nonce; nekad neģenerē jaunu App Attest
atslēgu. Pēc atbilstoša servera apstiprinājuma native serializēti aizstāj galveno
credential un nolasa pārbaudei. Pending ieraksts paliek kā idempotents apliecinājums
arī pēc sekmīgas darbības; šis protokols nav vispārēja kompromitētas atslēgas rotācija.

`finishRecovery` lokāli salīdzina apstiprinājuma laukus, bet pats nav servera
kriptogrāfiskās autentifikācijas mehānisms. Koordinatoram jāsaņem atbilde tikai no
uzticamā, fiksētā HTTPS servera; šis transports vēl nav pieslēgts. Atjaunošanas
apstiprinājums nepiešķir pirkuma/Push perioda tiesības. Dzēšanas aizsargs pārbauda gan
galveno, gan pending ierakstu un nepieļauj lokālu dzēšanu, pirms atrisināta servera
identitāte. Nav automātiskas kļūdainu Keychain ierakstu tīrīšanas.

Jauni 6 koordinatora testi imitē native/transporta robežu; viens sakomplektētā koda
tests pārbauda dzēšanas aizsardzību pending-only gadījumā. Tie neizpilda Swift,
Keychain vai Secure Enclave. Vajadzīga parakstīta Xcode/iPhone pārbaude, arī procesa
izbeigšana pirms/pēc katra Keychain ieraksta un pazudis callback.
