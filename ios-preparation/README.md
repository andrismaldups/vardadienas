# App Store sagatavošana — maksas lejupielāde

## Stāvoklis

Izolēts aprēķina un Apple darījumu savienojuma prototips zarā `app-store-ios-preparation`.
Tas izmanto Apple oficiālo servera bibliotēku 3.1.0, bet nav pieslēgts PWA vai izvietotam
Cloudflare serverim. Sākotnējā pirkuma derīguma pārbaude pēc noklusējuma paliek unknown;
bez uzticama apstiprinājuma maksas Push nepiešķir. Nav veikta Swift/Xcode kompilēšana,
īsti Apple pirkumi vai pozitīva īsta Apple paraksta pārbaude. Detalizēti:
`server/apple-verification-status.md`.

Saskaņotais: 4,99 EUR par lejupielādi App Store, visas funkcijas uzreiz un trīs gadu
Push periods. Nav otra aktivizēšanas maksājuma vai automātiskas pagarināšanas.
Pēc perioda pamatfunkcijas paliek; Push pagarināšana ir brīvprātīgs Apple pirkums.
Pagarināšanas cena vēl nav atsevišķi saskaņota.

## Tehniskie noklusējumi prototipā

- Sākotnējo periodu skaita no pārbaudīta sākotnējā lietotnes pirkuma datuma.
- Trīs kalendārie gadi UTC; 29. februāra gadījumā mērķa gadu pielāgo uz 28. februāri.
- Priekšlaicīgs pagarinājums sākas pēc jau apmaksātā perioda beigām.
- Pēc pārtraukuma jauns periods sākas no jaunā pirkuma datuma.
- Perioda beigu mirklis nav iekļauts apmaksātajā laikā.
- Viena transactionId atkārtota saņemšana nepiešķir vēl vienu periodu.
- Pilnā, saskaņotā vēsturē atsaukti pagarinājumi netiek ieskaitīti; periodus pārrēķina.

Tie ir ieviešanas noklusējumi turpmākai pārskatīšanai, nevis jauni lietotāja saskaņoti
komercnoteikumi. Nekas no tā vēl neietekmē esošās instalācijas.

## Uzticamības robeža

`entitlements/periods.mjs` ir tīra funkcija jau pārbaudītiem, normalizētiem ierakstiem.
Lietotāja JSON, localStorage, HTTP body vai paša klienta apgalvojumu nedrīkst izmantot
kā pārbaudīta pirkuma avotu. `appTransactionId` identificē pirkuma vēsturi; tas nav
autentifikācijas parole vai patstāvīgs maksājuma/derīguma apliecinājums.

Pirms produkcijas jānoslēdz šādas adaptera un integrācijas prasības (1., 2. un 4. plūsmas
kods jau sagatavots, bet īstā Apple vidē vēl nav pārbaudīts):

1. Pārbauda Apple parakstīto AppTransaction un darījumu vēsturi, pareizo bundle ID,
   app ID, vidi, pirkumu produktu un darījumu savstarpējo piederību.
2. Nošķir Production un Sandbox/TestFlight; testa vēsture nedod produkcijas Push.
   Apple sandbox sākotnējais pirkuma datums var būt konstants 2013. gada datums;
   testa periodam vajag skaidru testa konfigurāciju, nevis produkcijas datuma pārrakstīšanu.
3. Droši sasaista iegādi ar pašreizējo instalāciju un novērš cita lietotāja apliecinājuma atkārtošanu.
4. Iegūst pilnu pagarinājumu vēsturi un saskaņo atkārtotas/novecojušas darījumu versijas.
   `currentEntitlements` vien nepietiek visu iepriekšējo periodu saskaitīšanai.
5. Nosaka atceltas/atmaksātas sākotnējās iegādes politiku no uzticamiem avotiem.
   Prototipa `app.revoked` ir normalizētā adaptera lauks, NEVIS Apple AppTransaction lauks.
   appTransactionID saglabājas arī pēc atmaksas, tāpēc ID esamība nenozīmē aktīvas tiesības.
   Šī sākotnējā maksas pirkuma stāvokļa pilna pārbaude vēl nav realizēta.
6. Atsevišķi izlemj Family Sharing uzvedību: Apple izsniedz atšķirīgu ID katram ģimenes
   dalībniekam. Pašreizējais prototips neapvieno ģimenes tiesības vai iPhone/Android pirkumus.
7. Nodrošina servera laiku, darījumu atomisku glabāšanu, atjaunošanu un tiesību pārbaudi
   pirms Push sūtīšanas. Lokālos datus neizdzēš tikai termiņa izbeigšanās dēļ.

## Pārbaude

```sh
cd ios-preparation
npm ci --ignore-scripts
npm test
npm run test:schema
```

22.11.2026. izdevās 40 JavaScript testi un 9 SQLite testi. Pozitīvās darījumu plūsmas
ir modelētas; reālā Apple bibliotēka negatīvajos testos noraida bojātus/neparakstītus
ierakstus. Nav pārbaudīts īsts pirkums, pirkuma dialogs vai izvietots serveris.

## Nākamais ievades materiāls

Saņemts `vardadienas-push-test23.rtf`, pārskatīts `server/worker-review-2026-11-22.md`.
Saņemti arī faktiskās D1 shēmas ekrānattēli; struktūra pārrakstīta testu fixture failā.
Jauno tabulu projekts pārbaudīts ar šo shēmu: 9 SQLite testi izdevās, arī Worker dzēšanas
batch un atcelšanas scenārijiem. Apple bibliotēkas savienojuma kods ir izveidots;
klienta piederības, sākotnējās iegādes derīguma un atomiskās persistences integrācija vēl nav pabeigta. Lietotāja
plānotais jaunais Mac un uzņēmuma Apple konts būs vajadzīgi iOS būvēšanai un veikala testiem.

## Apple primārie avoti

- https://developer.apple.com/documentation/storekit/apptransaction
- https://developer.apple.com/documentation/storekit/apptransaction/apptransactionid
- https://developer.apple.com/documentation/storekit/apptransaction/originalpurchasedate
- https://developer.apple.com/documentation/storekit/transaction/all
- https://developer.apple.com/documentation/storekit/transaction/currententitlements
- https://developer.apple.com/documentation/appstoreserverapi/get-app-transaction-info
- https://developer.apple.com/help/app-store-connect/manage-subscriptions/create-non-renewing-subscriptions

Pārskatāms kopā ar `docs/app-store-plan.md` un `docs/project-status-2026-11-22.md`.

## APNs sagatave

`apns/README.md` apraksta iOS klienta reģistrācijas kontrolieri un tīru APNs pieprasījuma
veidotāju. Nav dzīva APNs transporta, DB piesaistes vai Apple atslēgu; sagataves
pieprasījuma veidotājs nav pirkuma/autentifikācijas pārbaude.
