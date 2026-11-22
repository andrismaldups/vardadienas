# StoreKit sākotnējā pirkuma pierādījums — 22.11.2026.

## Šī posma rezultāts

Pievienots iOS StoreKit `AppTransaction` pierādījuma nolasīšanas kods un esošas,
autentificētas instalācijas pirkuma piesaistes servera pakalpojuma prototips. Nav
veikts īsts App Store pirkums, izvietots sasaistes HTTP maršruts vai DB rakstīšana.
Pilna pirmreizējā enrollment un App Attest pārbaude vēl nav realizēta.

Saskaņotais modelis saglabājas: 4,99 EUR par App Store lejupielādi, pamatfunkcijas
uzreiz, trīs gadi Push un brīvprātīga vēlākā pagarināšana. Kodā nav izveidots otrs
aktivizēšanas pirkums vai pagarinājuma produkts/cena.

## iOS StoreKit kods

- `AppPurchaseProofPlugin.swift` reģistrēts esošajā lokālajā bridge kontrolierī un
  Xcode Sources. `read` izmanto `AppTransaction.shared`; neizdodas — atgriež kļūdu,
  nevis automātiski palaiž App Store autentifikāciju.
- `refresh` izmanto `AppTransaction.refresh()` tikai ar skaidru userInitiated=true
  izsaukumu. Tas var atvērt App Store autentifikācijas logu; nākamajai atjaunošanas UI
  tas jāizsauc tikai pēc pogas nospiešanas. Pašreizējā UI šāda jauna pirkuma/atjaunošanas
  poga nav pievienota, un startējot StoreKit pierādījums netiek automātiski pieprasīts.
- Atgriež tikai StoreKit `.verified` rezultāta `jwsRepresentation`; `.unverified`,
  nepareizs bundle vai nepieejama ierīces pārbaude tiek noraidīta. Pirms atgriešanas
  salīdzina Apple ierīces pārbaudi: SHA-384 no nonce UUID mazajiem burtiem +
  deviceVerificationID UUID mazajiem burtiem (šādā secībā). Pašu ierīces UUID nesūta JS.
- JS saņem tikai signedAppTransaction — ne klienta paša purchaseDate/expiry/active
  vērtības. Paraksts ir līdz 64 KiB; tā forma tiek pārbaudīta, bet formas pārbaude
  nav Apple kriptogrāfiskā verifikācija.
- `native-app-purchase.mjs` dod skaidru native adaptera izveidi; moduļa importēšana
  neizsauc read/refresh. `app-purchase-proof.mjs` atdala vienkāršu lasīšanu no lietotāja
  atjaunošanas darbības, serializē izsaukumus un filtrē kļūdu saturu.
- Parakstīto pirkuma pierādījumu neglabā JSON kopijā, personīgo datu krātuvē, Keychain
  instalācijas credential vai UI statusā. Capacitor loggingBehavior=none, lai tilta
  atkļūdošanas atbildēs neizdrukātu šo pierādījumu vai Keychain atslēgu.
- API vajadzīgs iOS 16. Native kodā ir pieejamības pārbaude. Projekta iOS 15 ietvara
  mērķis joprojām ir provizorisks; tas negarantē maksas Push iOS 15. Galīgais veikala
  minimums vai vecāku iOS versiju risinājums vēl jānosaka pirms izlaides.

Swift kods nav kompilēts ar Xcode un nav pārbaudīts īstā iPhone/StoreKit vidē.
Ierīces pārbaudes koda klātbūtne un JS imitācija nav pierādījums par reālu Apple pirkumu.

## Servera sasaistes pakalpojums

`bind-purchase.mjs` izmanto jau esošo `createApplePurchaseReader` līgumu, kas
kriptogrāfiski pārbauda AppTransaction/atjaunojumus ar oficiālo Apple bibliotēku un
izmanto verificētos sākotnējā pirkuma datumus. Esošā trīs kalendāra gadu loģika nav mainīta.

1. Pieņem tikai šajā procesā ar servera `authenticateInstallation` iegūtu, iesaldētu
   identitātes kontekstu. Privāts WeakSet nošķir šo kontekstu no klienta iesūtīta vai
   JSON nokopēta objekta. Katram HTTP pieprasījumam jāveic autentifikācija no jauna.
   Šī procesa atzīme pati par sevi nav Apple/App Attest pārbaude.
2. Neatkarīgs, serverī konfigurēts `verifyDeviceBinding` pārbauda instalācijas,
   signedAppTransaction SHA-256, bundle, identitāšu vides un vienreizējās nonce saistību.
   Pēc noklusējuma tas izmet DEVICE_BINDING_NOT_CONFIGURED — nenotiek Apple lasīšana
   vai DB piesaiste. Pieprasījuma boolean nevar šo verifikatoru aizstāt.
3. Apple reader neatkarīgi pārbauda parakstu, lietotni, vidi, vēsturi un sākotnējā
   maksas pirkuma derīguma stāvokli. Ja pēdējais ir unknown, atgriež pending-verification
   un neko nepiesaista. Klienta installation/linking datumu neizmanto kā pirkuma datumu.
4. Pēc Apple operācijām vēlreiz pārbauda servera laiku un nonce derīgumu. Tikai tad
   izsauc uzticamu repository.commitVerifiedBinding. Ja adaptera vai apstiprinājuma
   nav, sekmīgu piesaisti nepaziņo.
5. Atgriež tikai linked/status/baseAccess/pushActive un verificētā perioda beigas;
   neizeksportē sākotnējo JWS vai darījumu ID. Sandbox nevar piešķirt production tiesību
   boolean vērtības, pat ja cits uzticamā adaptera kods tajās kļūdītos.

## Repozitorija transakcijas līgums — vēl nav DB adaptera

Testos ir atklāti nosaukts in-memory repository test double. Tas NAV D1/SQLite
transakcijas realizācija un nav izvietots maršruts. Esošie 9 SQLite testi attiecas uz
agrāko Apple shēmas/dzēšanas sagatavi, nevis uz jaunu nonce sasaistes migrāciju.

Reālajam adapterim vienā atomārā darbībā jāpaveic:

- atkārtoti jāpārbauda pašreizējā iOS identitāte, scope un atsaukums/credential versija;
- jāpārbauda un jāpatērē tieši šai identitātei/JWS piesaistītā nonce, derīguma laiks
  un App Attest assertion counter; vienlaicīgs atkārtojums nevar radīt otro piesaisti;
- jāsaglabā verificēta pirkuma/atjaunojumu vēsture, atsaukuma stāvoklis un parakstīšanas
  versija; nedrīkst pārrakstīt jaunāku revokāciju ar vecāku derīgu parakstu;
- jāsaglabā sākotnējais parakstītais purchaseDate. Tā maiņa esošam pirkumam ir
  atjaunošanas/izmeklēšanas gadījums, nevis jauna trīs gadu perioda pamats;
- jāpiesaista instalācija pirkumam idempotenti; citāda jau piesaistītā pirkuma maiņai
  nepieciešams atjaunošanas risinājums, nevis klusa pārsaistīšana;
- atsauktam pirkumam jāsaglabā atsaukuma informācija un jāizslēdz tiesības; jaunu derīgu
  piesaisti tam nepiešķir. Arī kļūmes/zudušas atbildes gadījumam vajadzīgs atjaunošanas
  protokols, kas neizveido jaunu sākotnējo periodu.

## Testos pārbaudītais

- Sākotnējais pirkums 22.11.2026. dod perioda beigas 22.11.2029. Jauna instalācija,
  atkārtota piesaiste un pārbaude 2030. gadā beigas nepārbīda; statuss paliek expired.
- Nepareiza identitāte/JWS saistība, nepareiza Apple vide, atkārtota nonce, nonce
  noildze, slikts paraksts un neapstiprināta repository darbība nedod sekmīgu piesaisti.
- Unknown, revoked un Sandbox atšķirti no derīgas production tiesības.
- Mobilajā projektā kopā 96 JS/iepakošanas pārbaudes; servera sagatavēs 66 JS;
  kopīgais JSON 45, UI 20 un agrākā SQLite shēma 9 — kopā 236 izdevās.
- Pozitīvie StoreKit/Apple/device-binding ceļi izmanto imitācijas. Reālā Apple bibliotēka
  pārbauda arī negatīvus nederīgu parakstu gadījumus; īsts pozitīvs Apple pirkums nav testēts.

## Nākamie darbi

Nepieciešami galīgie Apple lietotnes/uzņēmuma identifikatori, parakstīts Xcode būvējums,
īsts StoreKit pierādījums un servera App Attest challenge/verifikators. Pēc tam var
realizēt pirmreizējo enrollment/restore, reālo DB transakciju un HTTP maršrutus un
pieslēgt pārbaudīto servera klientu. Maksas sākotnējā pirkuma refund/atsaukuma uzticamo
avotu resolveBaseAccess joprojām nedrīkst aizstāt ar minējumu no klienta JWS esamības.

## Oficiālie avoti

- https://developer.apple.com/documentation/storekit/apptransaction/shared
- https://developer.apple.com/documentation/storekit/apptransaction/refresh()
- https://developer.apple.com/documentation/storekit/verificationresult/jwsrepresentation-6ma59
- https://developer.apple.com/documentation/storekit/appstore/deviceverificationid
