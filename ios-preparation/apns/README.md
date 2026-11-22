# APNs sagatavošanas stāvoklis — 22.11.2026.

Šis posms NAV izvietots serverī un NESŪTA paziņojumus. Nav pievienotu privāto atslēgu,
pirkuma pārbaudes apiešanas vai savienojuma ar pašreizējās PWA Web Push abonementiem.

## Ieviests

- `mobile` izmanto precīzi fiksētu Capacitor Push Notifications 8.1.3; AppDelegate
  nodod APNs reģistrācijas izdošanos/kļūmi Capacitor tiltam. SPM sinhronizācija izdevās.
- Konfigurācijā paredzēts priekšplāna banner/list/sound. iOS sistēmas atļaujas un
  lietotāja sistēmas iestatījumi joprojām nosaka, ko drīkst parādīt/atskaņot.
- Testējams klienta kontrolieris atdala servera piekļuves pārbaudi, OS atļauju,
  APNs reģistrāciju un autentificēta servera tokena apstiprinājumu. Vienkārša
  `register()` Promise pabeigšanās nav tokens vai sekmīga aktivizācija.
- Klausītāji pievienoti pirms reģistrēšanas; ir 15 sekunžu reģistrācijas noildze,
  kļūmju un atļauju atteikuma apstrāde, savu klausītāju tīrīšana. Tokena garums nav
  pieņemts par fiksētiem 32 baitiem. Tokens paliek tikai operatīvajā atmiņā un tiek
  saņemts no OS; to nesaglabā lokālajā krātuvē, JSON eksportā vai UI statusā.
- Tokena maiņa anulē veco aktivizācijas statusu. Mainoties tokenam servera pieprasījuma
  laikā, sagaida jaunākā tokena apstiprinājumu (ne vairāk kā 4 mēģinājumi).
- Reālā klienta sagatavē servera adapters ir apzināti `null`. Poga/galvenais slēdzis
  nerāda aktīvus paziņojumus un nepieprasa OS atļauju. Atgādinājumu izvēles joprojām
  saglabā esošie vadības elementi; Web Push API netiek izmantots APNs vietā.
- `requests.mjs` tīri sagatavo HTTP/2 APNs pieprasījuma parametrus ar galīgo topic,
  atsevišķiem sandbox/production hostiem, mainīga garuma tokenu, alert tipu un
  4096 UTF-8 baitu payload robežu. Collapse ID ir līdz 64 ASCII baitu iekšējā atslēga,
  nevis personas vārds. Derīguma laiku katram atgādinājumam norāda izsaucējs.
- Atbildes 200 nozīmē Apple pieņemšanu, nevis piegādi. 429/500/503 klasificētas
  atkārtošanai, nevis tokenu dzēšanai. 410/Unregistered ļauj invalidāciju tikai tad,
  ja reģistrācija nav jaunāka par Apple timestamp (abi laiki milisekundēs kopš Epoch).
  Funkcija pati neko DB nemaina; jālieto zemāk aprakstītā nosacītā DB darbība.

## Nepieciešamais servera adaptera līgums

Kontroliera testos lietotais adapters ir imitācija, nevis pabeigts HTTP klients:

- `checkAccess()` -> `{allowed:true}` tikai autentificētai instalācijai ar serverī
  pārbaudītu Apple pirkumu un derīgu Push periodu. Tas nedrīkst uzticēties klienta
  boolean/expiry. StoreKit/Apple pirkumu servera prototips nav pabeigta šī adaptera piesaiste.
- `upsertDevice({deviceToken})` -> `{active:true,tokenHash}`. Hash ir saņemtā tokena
  SHA-256 (normalizēts mazajiem burtiem). Apstiprinājums nedrīkst balstīties tikai uz
  klienta hash: serveris atkārtoti pārbauda tiesības, saglabā tokenu un tikai tad atbild.
- Serveris sasaista instalāciju, tokenu, galīgo bundle ID un pareizo APNs vidi no
  uzticamas lietotnes/servera konfigurācijas. Klients nevar pārslēgt sandbox uz production
  vai iegūt papildu Push periodu, norādot citu topic/environment/pirkuma datumu.
- Faktiskajam HTTP klientam jābūt ierobežotai pieprasījuma noildzei, autentifikācijai
  un atcelšanai; tās šajā kontroliera imitētajā līgumā nav reāli realizētas.
- Cron/sūtītājs pārbauda servera atļauju, maksas periodu un lietotāja atgādinājumu izvēles
  arī nosūtīšanas brīdī. Vārdu/dzimšanas dienu un iestatījumu sinhronizācijas piesaiste,
  laika josla un esošā plānotāja izmantošana vēl jāievieš.
- Invalidējot tokenu pēc 410, vienā nosacītā DB darbībā jāsakrīt tokenam, topic, videi
  un nosūtītās reģistrācijas versijai. Jaunāka tokena atjaunošana nedrīkst tikt dzēsta.
- Atkārtojumi ir ierobežoti ar atgādinājuma derīguma logu un backoff; atkārtotu piegāžu
  žurnāls/idempotence, servera disable/delete un vienlaicīgu mutāciju secība vēl jāievieš.
  Kontroliera `dispose()` noņem klausītājus; tas NEATCEĻ servera reģistrāciju.

## Vēl nepieciešams pirms reālas aktivizēšanas

1. Uzņēmuma Apple Developer konts, galīgais App ID/bundle ID un Xcode Team/parakstīšana.
   Xcode jāieslēdz Push Notifications capability konkrētajam App ID. Blakus ir tikai
   `PushDevelopment.entitlements.example`; tas NAV piesaistīts būvējumam. TestFlight/
   App Store izmanto provisioning profilam atbilstošu production vidi, nevis patvaļīgu
   klienta izvēli. Šajā projektā nav iestatīts viltus Team vai lietošanai gatavs entitlement.
2. Autentificēta iOS servera instalācija/Keychain piekļuve, StoreKit perioda pārbaude,
   iepriekšējā līguma HTTP maršruti un DB migrācija. PWA pašreizējās tabulas nemaina.
3. Servera APNs provider atslēga, Key ID un Team ID; ES256 provider JWT parakstīšana un
   derīguma/cache pārvaldība. APNs provider atslēga un App Store Server API atslēga ir
   atšķirīgu uzdevumu konfigurācija. Tās neliek lietotnē vai repozitorijā.
4. Reāls HTTP/2/TLS transports. `requests.mjs` neizmanto `fetch`, neveido JWT un nav
   izvēlēta/izvietota jauna mitināšana. Cloudflare Worker transporta saderība ar APNs
   jāapstiprina atsevišķi; sagatavots objekts nepierāda Apple HTTP/2 savienojumu.
5. Pēc uzticamas servera piesaistes: reģistrācija katrā palaišanā ar jau piešķirtu
   atļauju (`prompt:false`), atgriešanās no iOS Settings un atļauju maiņa, servera
   izslēgšana/dzēšana, tokena maiņas atjaunošana un notification-tap navigācija.
6. Xcode kompilācija, īsts iPhone: atļaut/atteikt/atsaukt, bez interneta, app aizvērta,
   priekšplāns/fons, tokena nomaiņa, sandbox/TestFlight production un īsta piegāde.
   Nav ieslēgts silent/background Push režīms — šis spraudnis to iOS neatbalsta.

Pamatfunkcijas un apsveikumi joprojām paliek pieejami bez Push. Saskaņotais biznesa
modelis nav mainīts: 4,99 EUR lejupielāde, trīs gadi Push un brīvprātīgs pagarinājums.

## Oficiālie avoti

- https://capacitorjs.com/docs/apis/push-notifications
- https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns
- https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
- https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns
- https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns
