# iOS instalācijas identitātes sagatave — 22.11.2026.

Jaunākais papildinājums: `../enrollment/README.md` apraksta App Attest verifikācijas
adapteri un pirmreizējās reģistrācijas Node SQLite transakciju. Šajā dokumentā
minētās pārbaudes/imitācijas attiecas uz konkrēto agrāko posmu. Reāls HTTP/D1 un
zudušas atbildes recovery joprojām nav pieslēgti.

## Lietotāja plūsma

Saglabājas saskaņotais maksas lejupielādes modelis: 4,99 EUR, visas pamatfunkcijas
uzreiz un trīs gadu Push periods. Šī ir tehniska instalācijas identitāte servera
saziņai. Lietotājam nav paredzēts ievadīt servera atslēgu vai pirkt otru aktivizāciju.
Personīgie saraksti un pamatfunkcijas turpina darboties bez identitātes/servera.

## Ieviestais kods

### Keychain savienojums

`InstallationIdentityPlugin.swift` glabā servera piešķirtu ierakstu tikai konkrētās
lietotnes Keychain servisā un vienā fiksētā account. Ieraksts satur versiju,
installationId, 32 baitu base64url API piekļuves noslēpumu, bundleId un servera
identitāšu vides nosaukumu (`Sandbox`/`Production`). Šī atslēga NAV APNs ierīces tokens.
APNs tokenu turpina pieprasīt no OS un tur tikai operatīvajā atmiņā.

- `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`: piekļuve atbloķētā ierīcē;
  ieraksts nepārceļas uz citu ierīci. Klienta saziņas sagatave paredzēta priekšplānam.
- `kSecAttrSynchronizable=false`; nav koplietojama Keychain access group vai biometrijas
  pieprasījuma. Servera API noslēpums netiek glabāts Preferences/localStorage/JSON eksportā.
- Atsevišķs UserDefaults instalācijas marķieris atklāj Keychain ierakstu, kura lokālā
  instalācijas saistība vairs nav derīga, piemēram, pēc pārinstalēšanas. Marķieris nav
  servera noslēpums. Ja tas trūkst/nesakrīt vai ieraksts ir bojāts, darbība apstājas ar
  atjaunošanas kļūdu. Nav automātiskas vecās identitātes dzēšanas/aizstāšanas.
- Swift metode `store` pieļauj pirmreizēju ierakstu vai identiska ieraksta atkārtojumu;
  citādu identitāti nepārraksta. Viena kopīga fona rinda serializē plugin darbības.
  Pēc ieraksta pārbauda nolasīšanu; kļūme netiek paziņota kā sekmīga glabāšana.
- Šajā posmā nav `clear`/tokena rotācijas API. Tām vajadzīgs servera atcelšanas un
  atjaunošanas protokols. `assertLocalDeletionAllowed` aiztur lokālo “Dzēst manus datus”,
  ja ir serverī reģistrēta identitāte vai Keychain stāvokli nevar apstiprināt. Ja Keychain
  ir tukšs, esošā lokālā abu datu kopiju dzēšana turpina darboties.
- `IdentityBridgeViewController` reģistrē plugin. Abi projekta iOS ieejas ceļi
  (SceneDelegate un Main.storyboard) izmanto šo kontrolieri; Swift faili pievienoti
  Xcode Sources. Pašreizējais pagaidu `lv.example.*` bundle nav derīgs jauna credential
  ierakstīšanai. Patiesu Swift/Keychain darbību jāpārbauda ar Xcode un parakstītu būvējumu.

`installation-identity.mjs` pārbauda saņemto ierakstu atbilstību bundle/videi un
nodrošina idempotentu saglabāšanu ar nolasīšanas pārbaudi. `native-identity.js` publiski
atklāj tikai dzēšanas priekšnosacījuma pārbaudi; pilna credential nav globālajā UI objektā.
Keychain credential lasīšana autentificētajam klientam tomēr ir īslaicīga JS atmiņas
operācija, nevis apliecinājums, ka ļaunprātīgs kods pašā WebView tam nevarētu piekļūt.
Esošā CSP/tīkla izolācija paliek ieslēgta.

### Autentificētā HTTP klienta prototips

`authenticated-client.mjs` ir testējama rūpnīca, vēl nav pieslēgta reālam endpoint.
Pēc noklusējuma `origin=null`: nav Keychain lasīšanas vai tīkla pieprasījuma.
Paredzētās darbības ir tikai `GET /v1/ios/access` un `PUT /v1/ios/device`.

Konfigurēts klients pieprasa vienu uzticamu HTTPS origin bez user-info, papildu ceļa,
query vai nestandarta porta. Izmanto Bearer un X-Installation-Id, nosūta tikai attiecīgās
operācijas parametrus, neizmanto pārlūka cookies, atsaka pāradresāciju un nepievieno
credentials URL. Pieprasījums/netraucēta JSON lasīšana ir ierobežota ar noildzi; atbildes
straume ir līdz 64 KiB ar UTF-8/JSON pārbaudi. 401/403 vai tīkla kļūme neizraisa jaunu
instalāciju, automātisku identitātes dzēšanu vai bezgalīgu atkārtošanu. Kļūdu teksti
nepārnes servera/native kļūdas saturu vai noslēpumu uz UI.

Pašreizējā pakete neinstancē šo klientu ar dzīvu origin, neaizstāj fetch aizsargu/CSP
un nesūta datus pašreizējam PWA serverim. APNs kontroliera adapters joprojām ir null.

### Servera autentifikācijas sagatave

`authenticate.mjs` ir tīra pārbaude ar injicētu uzticamu lookup, nevis izvietots maršruts.
Pārbauda ID/tokena formu, SHA-256 noslēpuma hash ar timingSafeEqual, platformu iOS,
bundle, identitāšu vidi un atsaukuma stāvokli. Atgriež tikai identitātes kontekstu.
Autentificēta instalācija pati par sevi NESNIEDZ pirkuma vai Push perioda tiesības.

Lookup jālasa no servera kontrolētiem iOS credential ierakstiem; tas nedrīkst atzīmēt
vispārējas PWA `app_installations` rindas kā iOS tikai klienta apgalvojuma dēļ. Šajā
posmā jauna DB tabula/migrācija vai HTTP maršruts nav izveidots/izvietots. Pašreizējās
PWA tabulas, tokeni, abonementi un personas nav mainīti.

`environment` šajā credential līgumā ir servera identitāšu nosaukumvieta. Tā nav
brīva klienta izvēle un nav automātiski pielīdzināma ne Apple pirkuma videi, ne APNs
transporta sandbox/production hostam. To galīgā piesaiste jāizstrādā atsevišķi,
tostarp TestFlight scenārijam. Nevienu no šīm vidēm nedrīkst pārslēgt pēc pieprasījuma body.

## Atlikušais līdz reālam servera savienojumam

1. Galīgais uzņēmuma bundle ID/Team un parakstīšana; īsts Keychain tests iPhone:
   atbloķēšana/bloķēšana, atkārtota palaišana, pārinstalēšana, kopijas atjaunošana,
   marķiera zudums, krātuves kļūmes un divi vienlaicīgi ierakstīšanas mēģinājumi.
   UserDefaults marķieris un Keychain nav viena starpkrātuvju transakcija; noildzes/
   negaidītas aizvēršanas pārbaudes ir obligātas pirms izlaides.
2. StoreKit sākotnējā pirkuma/atjaunošanas pierādījums un servera uzticamā pārbaude.
   Pārinstalēšana/jauna identitāte nedrīkst sākt jaunus trīs gadus; izmantot esošo
   verificētā pirkuma periodu. Šis posms pirkumus pats nepārbauda.
3. Instalācijas reģistrācijas/enrollment protokols: servera challenge, īslaicīga
   vienreizēja nonce, ierīces/lietotnes piesaiste (piem., App Attest) un aizsardzība
   pret sveša atkārtoti iesūtīta pirkuma pierādījuma izmantošanu. AppTransaction JWS
   vienatnē nav jaunās instalācijas/atslēgas īpašnieka pierādījums. Nekāds šāds
   pierādījums, challenge endpoint vai enrolment ieraksts šeit vēl nav realizēts.
4. Serveris piešķir identitāti un ģenerē 32 kriptogrāfiski nejaušus API noslēpuma baitus;
   glabā tikai hash. Reģistrācijai vajadzīga idempotence, zudušas atbildes atjaunošana,
   ierobežojumi, verifikācija un precīza pārinstalēšanas/pirkuma atjaunošanas politika.
   Tikai UUID vai lietotnes JSON nepietiek, lai piešķirtu derīgu servera identitāti.
5. iOS credential DB shēma, atsaukšana/rotācija, integrēta datu dzēšana un reālie
   maršruti. `checkAccess` un tokena saglabāšana atkārtoti pārbauda pirkuma tiesības.
   Servera dzēšanas apstiprinājums ir priekšnosacījums turpmākam Keychain clear.
6. Servera URL un uzticamās HTTPS izcelsmes piesaiste; tikai tad mērķtiecīgi paplašināt
   CSP/fetch atļauju un izveidot HTTP klientu. Pēc tam APNs/rindas/cron/piegādes pārbaude.

## Pārbaudes šajā posmā

- Mobilajā projektā kopā 89 automatizētas pārbaudes; no tām 13 identitātes/HTTP klienta,
  1 Xcode avotu piesaistes un 3 sakomplektētā native koda/identitātes dzēšanas pārbaudes.
- Servera sagatavēs kopā 53 JS pārbaudes, ieskaitot 6 identitātes autentifikācijas testus.
- Kopīgais JSON: 45; UI: 20; esošā SQLite migrācija/dzēšanas izolācija: 9.
- Kopā 216 pārbaudes. Swift struktūras pārbaude nav Swift kompilācija. Nav Xcode,
  simulācijas vai īsta iPhone Keychain/HTTPS/Apple pozitīvo pierādījumu pārbaudes.

## Avoti

- https://developer.apple.com/documentation/security/keychain-services
- https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlockedthisdeviceonly
- https://developer.apple.com/documentation/security/secitemadd(_:_:)
- https://capacitorjs.com/docs/ios/custom-code
