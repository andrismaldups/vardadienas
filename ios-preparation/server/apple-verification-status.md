# Apple darījumu savienojums — 22.11.2026.

## Ieviestais izstrādes zarā

- `apple-purchase-reader.mjs` izmanto Apple oficiālo Node bibliotēku
  `@apple/app-store-server-library`, precīzi fiksēta versija 3.1.0 un lock fails.
- `createOfficialApplePurchaseReader` savieno `SignedDataVerifier` un
  `AppStoreServerAPIClient` ar periodu aprēķinu. Saknes sertifikāti un API
  privātā atslēga nāk tikai no uzticamas servera konfigurācijas, nevis HTTP pieprasījuma.
- `SignedDataVerifier` pārbauda parakstus; sertifikātu termiņa/atsaukšanas tiešsaistes
  pārbaudes ieslēgtas. Nav varianta klusām pāriet no Production uz Sandbox.
- AppTransaction pārbauda bundle ID, Apple app ID, receiptType un obligātos
  identifikatorus/datumus. Parakstītā JSON laukus normalizē pēc Apple modeļiem,
  nevis pēc līdzīgi nosauktām Swift īpašībām.
- Pagarinājumu vēsturi iegūst ar servera autentificētu V2 history API, iekļaujot
  atsauktos darījumus un nolasot visas lapas. Ierobežojumi: 100 lapas, 10000 ieraksti,
  64 KiB katram parakstītam ierakstam. Ierobežojuma sasniegšana nedod daļējas tiesības.
- Pārbauda produkta ID, Non-Renewing Subscription tipu, konta lietotnes darījuma ID,
  PURCHASED piederību un quantity=1. Family Sharing šajā prototipā nav ieviests.
- Atkārtotām viena darījuma versijām izmanto jaunāko parakstīšanas datumu;
  pretrunīgas versijas ar vienādu datumu noraida.
- Pārbaudīto vēsturi nodod jau testētajam trīs kalendāro gadu aprēķinam.
- Sandbox rezultātam `pushActive` un `baseAccess` ir false; simulācijas rezultāts
  nodalīts `testPushActive`/`testPeriodStatus`. Testa tiesības nedrīkst rakstīt Production.

## Būtiskā neatrisinātā robeža

Parakstīts AppTransaction pats par sevi nav pilna ierīces piederības, apmaksas un
aktuālu atmaksas tiesību pārbaude. ID ir stabils arī pēc atmaksas. Tāpēc
`resolveBaseAccess` ir uzticams SERVERA integrācijas punkts ar active/revoked/unknown;
tas NAV klienta nosūtāms lauks vai Apple payload īpašība. Noklusējums ir unknown:
servera sagatavošanas kods maksas tiesības nepiešķir. Tas nav pieslēgts lokālo
pamatfunkciju bloķēšanai un nemaina esošās PWA darbību.

Pirms produkcijas jāievieš un jāpārbauda:

1. Ierīces/lietotāja tiesību pierādījums un droša instalācijas piesaiste (nevis tikai
   kopējams appTransactionId), pretatkārtošanas mehānisms un konta maiņas uzvedība.
2. Sākotnējās maksas lejupielādes aktuālā derīguma/atmaksas politika, Family Sharing,
   atkārtota iegāde pēc atmaksas un daļējas atmaksas. Pašlaik pagarinājuma revocationDate
   konservatīvi izņem visu tā periodu; tas vēl nav apstiprināts daļējas atmaksas produkta noteikums.
3. Atomāra vēstures un instalācijas saišu glabāšana D1 un aizsardzība pret vecāku
   momentuzņēmumu pārrakstīšanu. Šis lasītājs neveic nevienu datubāzes ierakstu.
4. HTTP autentifikācija, lietošanas ierobežojumi, laika limiti un kļūmju atkārtošana;
   šajā posmā nav publiska API maršruta.
5. Cloudflare Workers savietojamība. Apple Node bibliotēka izmanto Node kriptogrāfiju
   un HTTPS/OCSP; veiksmīgi Node testi NEPIERĀDA darbību Worker. Jāpārbauda nodejs_compat
   izolētā D1/Worker vidē vai jāizvēlas atsevišķs uzticams Node verifikācijas serviss.
6. Apple konts, galīgie bundle/app/product ID, servera API atslēga, oficiālie Apple
   saknes sertifikāti un īsts Sandbox/TestFlight pirkuma cikls. API privāto atslēgu
   neievieto GitHub, klienta kodā vai parastā JSON eksporta failā.
7. Natīva APNs reģistrācija un Push tiesību pārbaude pirms piegādes; nav ieviesta ar
   šo lasītāju. Esošie PWA abonementi netiek pārveidoti vai ierobežoti.

## Pārbaudes un reproducēšana

```sh
cd ios-preparation
npm ci --ignore-scripts
npm test
npm run test:schema
```

- 40 JavaScript testi: 18 periodu un 22 savienojuma/pārbaudes plūsmas testi; visi izdevās.
- 9 SQLite shēmas/dzēšanas testi; visi izdevās.
- Pozitīvās vēstures plūsmas ir modelētas ar Apple API/verifikatora testu aizvietotājiem.
- Īstā Apple bibliotēka negatīvajā testā noraida bojātus un neparakstītus ierakstus.
  Sertifikāts šajā testā ir publiska CA konstrukcijas testu ievade, nevis Apple pirkuma
  apliecinājums vai produkcijas saknes konfigurācija. Nav īsta pozitīva Apple paraksta testa.
- `npm audit --omit=dev` izpildes brīdī: 0 zināmu ievainojamību. Apple bibliotēkai ir
  transitīva novecojusi jsrsasign atkarība; versiju turpmāk jāuzrauga ar upstream atjauninājumiem.
- Nav Xcode kompilācijas, īstu maksājumu, izvietošanas Cloudflare vai izmaiņu main zarā.

## Primārie tehniskie avoti

- https://github.com/apple/app-store-server-library-node
- https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html
- https://github.com/apple/app-store-server-library-node/blob/main/models/AppTransaction.ts
- https://github.com/apple/app-store-server-library-node/blob/main/models/JWSTransactionDecodedPayload.ts
- https://developer.apple.com/documentation/appstoreserverapi/historyresponse

Izstrādē izmantota npm 3.1.0; GitHub main avots pārskatīts 22.11.2026. Konkrētā npm
versija fiksēta package-lock.json, lai main avota turpmākas izmaiņas neizmainītu testu bāzi.
