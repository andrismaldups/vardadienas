# App Store sagatavošana — maksas lejupielāde

## Stāvoklis

Izolēts aprēķina prototips zarā `app-store-ios-preparation`. Tas nav pieslēgts PWA,
Cloudflare, StoreKit vai App Store. Tas nepārbauda Apple parakstus un pats par sevi
nepiešķir pirkuma tiesības. Nav veikta Swift/Xcode kompilēšana vai īsti Apple pirkumi.

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

Pirms integrācijas vajag uzticamu adapteri, kas:

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
node --test ios-preparation/entitlements/periods.test.mjs
```

18 automatizēti testi izpildīti 22.11.2026. Tie pārbauda periodu aprēķinu, nevis
kriptogrāfisko pārbaudi, Apple pirkuma dialogu vai servera ieviešanu.

## Nākamais ievades materiāls

Aktuālais izvietotais Cloudflare Worker avots un datubāzes tabulu struktūra (bez
slepeno atslēgu vērtībām). GitHub main zarā šo servera failu pašlaik nav. Lietotāja
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
