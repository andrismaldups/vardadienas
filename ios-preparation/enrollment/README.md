# App Attest un pirmreizējā servera reģistrācija — 22.11.2026.

## Stāvoklis

Ieviests native App Attest sagatavošanas kods, servera verifikācijas adapters un
pirmreizējās reģistrācijas pakalpojums ar reālu lokālu Node SQLite transakciju.
Tas nav izvietots D1/serverī un nav pieslēgts lietotnes UI vai dzīviem HTTP maršrutiem.
Nav iegūts mūsu lietotnes īsts pozitīvs App Attest vai App Store pierādījums.

Pamatfunkcijas paliek neatkarīgas no servera/App Attest. Saskaņotais maksas modelis
nemainās: 4,99 EUR par lejupielādi, trīs gadi Push, brīvprātīga pagarināšana.

## Native kods

`VerifiedAppPurchase.swift` satur agrāko StoreKit .verified/bundle/ierīces SHA-384
pārbaudi. To kopīgi izmanto AppPurchaseProofPlugin un AppAttestEnrollmentPlugin.
App Attest metode nepieņem signedAppTransaction no JavaScript — tā pierādījumu
nolasa pati un apliecinājumā iekļauj tieši šī JWS SHA-256.

App Attest `status` tikai pārbauda DCAppAttestService.isSupported. Atslēga netiek
ģenerēta adaptera izveidē, statusa nolasīšanā vai lietotnes palaišanā. Atsevišķā
`attest` metodē pārbauda servera izaicinājuma formu, bundle un ierīces saderību;
izveido vienu App Attest atslēgu un saglabā tās identifikatoru UserDefaults.
Privāto atslēgu pārvalda Apple/Secure Enclave; JS to nesaņem. Identifikators un
Apple attestation-completed atzīme nav servera credential vai maksas aktivizācijas statuss.

Apple serverUnavailable gadījumā saglabā to pašu gaidošo atslēgu atkārtojumam.
Pēc citas pašas attestKey kļūmes izmet gaidošās atslēgas ID; StoreKit kļūme pirms
attestKey neatmet iepriekš sagatavotu atslēgu. Jau apliecinātu atslēgu nepārrada
klusējot — nepieciešama servera atjaunošanas plūsma. Atslēgas metadati nav iekļauti
personīgo datu JSON kopijā. App Attest neveic AppTransaction.refresh un neatver jaunu
App Store atjaunošanas dialogu.

Jaunais entitlement ir tikai nesaistīts `AppAttestDevelopment.entitlements.example`.
Pagaidu bundle nav derīgs attest izsaukumam. Reālai darbībai vajadzīgs reģistrēts
Apple App ID, capability un provisioning. Native kods nav kompilēts/pārbaudīts iPhone.
Unsupported ierīcei pašlaik nav pārskatīta alternatīva servera identitātes pārbaude;
pirms publiskas maksas izlaides tas jāatrisina, saglabājot lokālās pamatfunkcijas.

## Konteksta kodējums

Native un serveris izmanto ASCII/UTF-8 virkni ar LF starp laukiem, bez LF beigās:

1. `vardadienas.enroll.v1`
2. servera challengeId (UUID)
3. servera installationId (UUID)
4. bundleId
5. 32 nejaušu baitu servera challenge (base64url bez padding)
6. Apple keyId (standarta base64)
7. no native StoreKit iegūtā JWS SHA-256 (64 mazie hex simboli)

`clientDataHash = SHA256(konteksta UTF-8 baiti)`. App Attest tādējādi saista
vienreizējo izaicinājumu ar konkrētu instalācijas ID, atslēgu, lietotni un pirkuma
pierādījumu. Šis ir mūsu protokola konteksts, nevis vispārīgs patvaļīga JS payload parakstītājs.

## Servera verifikācija

`attestation-verifier.mjs` izmanto precīzi fiksētu trešās puses node-app-attest 2.2.0,
CBOR dekodēšanai cbor2 2.4.2. Tā NAV Apple oficiālā servera bibliotēka. Pārskatītā
realizācija pārbauda Apple App Attestation Root CA ķēdi, sertifikāta nonce, atslēgas
ID/hash, App ID RP hash, sākotnējo counter=0, credential ID un AAGUID vidi.

Mūsu adapters papildus ierobežo CBOR izmēru/dziļumu, pārbauda abu x5c sertifikātu
termiņus/secību, EC P-256 publisko atslēgu un precīzu vidi. Tas pārbauda konteksta
hash un bibliotēkai nodod nehashotus konteksta baitus: bibliotēka pati tos hash vienu
reizi. Jau gatava clientDataHash nodošana šajā parametrā radītu kļūdainu dubulto hash.
Apple App ID prefix ir uzticama servera konfigurācija, ne klienta norādīts Team.
Root uzticamība balstās fiksētās bibliotēkas CA; CA atjauninājumi/saderība jāpārskata
pirms reālas izlaides. Pozitīvs šīs integrācijas Apple apliecinājums vēl nav testēts.

Pakalpojumā verifikators pēc noklusējuma ir null — tad nevar izdot pat izaicinājumu.
Testi skaidri injicē imitāciju datubāzes/plūsmas testiem; imitācija nav production
konfigurācija. Nav ieslēdzamas klienta `verified=true` alternatīvas.

Production identitāšu vide pieprasa Production Apple pirkuma un production App Attest
vidi. Sandbox/testing ir atsevišķa konfigurācija un nevar nokļūt Production API
credential nosaukumvietā. APNs transporta vide ir atsevišķs iepriekšējā APNs posma jēdziens.

## Pirmreizējās reģistrācijas plūsma

`service.mjs` izveido servera UUID challenge/instalācijas ID un 32 nejaušu baitu
izaicinājumu ar 5 minūšu derīgumu. DB glabā challenge hash, ne pašu nonce.

Atbildē pārbauda izaicinājumu, Apple App Attest un StoreKit sākotnējo pirkumu ar esošo
purchaseReader. Unknown/refund/revoked nedod reģistrāciju. Verificēts, jau izbeidzies
pirkuma Push periods var saglabāt identitāti, bet nepārstartē trīs gadus un pats
par sevi neaktivizē Push. Testu Sandbox pirkumi paliek Sandbox nosaukumvietā.

API atslēga ir 32 kriptogrāfiski nejauši servera ģenerēti baiti. Atbildi ar šo atslēgu
sagatavo tikai pēc apstiprināta commit. DB glabā SHA-256 hash. Klienta Keychain store
un HTTPS enrollment koordinators vēl nav pieslēgti šim servera pakalpojumam.

## SQLite transakcija

`schema.draft.sql` papildina agrāko D1 struktūras un Apple tabulu lokālo kopiju ar
challenge, iOS credential un App Attest key tabulām. `sqlite-repository.mjs` ir Node
SQLite atsauces adapters (nevis D1 Worker adapters). Tas pieprasa ieslēgtas foreign keys.

Vienā BEGIN IMMEDIATE transakcijā atkārtoti pārbauda nonce/scope/derīgumu, saglabā
verificēto pirkuma vēsturi, izveido instalāciju, credential hash, attested key,
pirkuma saiti un patērē nonce. Jebkura kļūme atceļ visas šīs izmaiņas. Vienu atslēgu
nepiesaista divām instalācijām. Nemaina parakstīto sākotnējo pirkuma datumu vai vecākas
revokācijas stāvokli bez saskaņošanas. Reģistrācijas datums nav trīs gadu perioda sākums.

Pašreizējās PWA tabulas/abonementi nav mainīti vai dzēsti. Neviena migrācija nav
palaista dzīvajā D1. Node backend sagatavei tagad vajadzīgs Node 24+; bibliotēkas un
Node SQLite/X509 darbība Cloudflare Worker vidē nav apstiprināta.

## Atlikušais pirms publiska endpoint — būtisks ierobežojums

**Zudušas pirmās reģistrācijas atbildes atjaunošana vēl nav ieviesta.** Ja DB commit
izdodas, bet atbilde ar vienreiz izsniegto API noslēpumu pazūd, klientam var būt jau
attested key, bet nav Keychain credential. To nedrīkst risināt ar klusu jaunas
instalācijas/atslēgas izveidi vai atkārtotu tās pašas attestation izmantošanu.

Vajadzīga recovery/assertion plūsma ar jaunu servera challenge, vecās App Attest
atslēgas pierādījumu, monotona counter pārbaudi un atomāru credential atjaunošanu.
Arī lietotnes aizvēršana pēc attestation pirms servera commit vai challenge noildze
jāatjauno pārbaudāmā veidā. Līdz tam publisku enrollment maršrutu neieslēdzam.

Vēl nepieciešams:

- īsts uzņēmuma App ID/provisioning un iPhone StoreKit/App Attest pozitīvais tests;
- HTTP robežslānis ar limitiem, nonce tīrīšanu, rate limiting un iOS klienta koordinators;
- App Attest assertion verifikācija un counter atjaunināšana tajā pašā DB transakcijā;
- uzticams sākotnējā maksas pirkuma refund/revocation avots (resolveBaseAccess paliek
  unknown, kamēr tas nav pārbaudīts), D1/izvēlētā servera adapters un piegādes testi;
- lietotāja datu dzēšana/atslēgas atsaukšana, pārinstalēšana un pirkuma atjaunošana;
- reāla infrastruktūras saderības un drošības pārbaude. Tests ar imitāciju nav tās aizstājējs.

## Pārbaudes

Mobilais projekts 101; servera JS/jaunās SQLite reģistrācijas pārbaudes 81; kopīgais
JSON 45; UI 20; agrākās Python SQLite pārbaudes 9 — kopā 256 izdevās. Jaunie
transakcijas testi izmanto reālu SQLite; pozitīva Apple attest/pirkuma puse ir imitēta.
Negatīvi nederīgi dati tiek nodoti arī īstajam CBOR/verifikācijas kodam. Swift testi
šajā vidē pārbauda avotu piesaisti/protokolu, ne kompilāciju vai Secure Enclave.

## Avoti

- https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity
- https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
- https://github.com/uebelack/node-app-attest


## Credential recovery server reference — 22.11.2026

`recovery.mjs` adds an isolated SQLite reference for a committed enrollment whose
credential reply was lost. It is not an HTTP endpoint and is not enabled in the
native application or deployed to D1.

The existing attested key identifies the existing installation. A five-minute
random nonce binds the current key counter and credential hash. An App Attest
assertion covers the nonce, installation, app and environment, recovery ID, and
replacement credential hash. The actual pinned `node-app-attest` assertion
verifier checks the ECDSA signature, App ID and increasing counter. A transaction
rechecks expiry, revocation and the original counter/hash, then consumes the
nonce and updates both credential hash copies and the counter atomically.
Purchase, renewal and purchase-link tables are never written by recovery.

The client MUST generate a cryptographically random 32-byte replacement token
and durably save it in device-only Keychain BEFORE requesting its assertion.
Only its SHA-256 over the ASCII base64url token is sent to this service. If a
reply is lost, the same pending token and recovery ID MUST be reused with a fresh
challenge and assertion. Never create a new token on every retry. The returned
acknowledgement contains no secret. The client may promote the pending Keychain
record only after a trusted server acknowledgement matches all three fields.

**Native preparation added:** `InstallationIdentityPlugin.swift` now stages a
device-only pending Keychain credential before generating an assertion with the
existing attested key, and promotes it after a matching acknowledgement.
`mobile/src/identity-recovery.mjs` coordinates an explicitly injected transport.
The pending record is retained as an idempotent receipt, including after success.
This is retry recovery, not a general credential rotation or compromise response.
**Transport preparation added:** `mobile/src/recovery-transport.mjs` and
`recovery-http.mjs` provide a fixed-origin HTTPS client and deployment-neutral
Request/Response adapter, tested together locally.
**Remaining release blocker:** deployment, trusted ingress/rate limits and real
iPhone/Swift/TLS verification are not implemented/completed yet.
The pre-commit case now has the cached-proof/fresh-assertion resume reference
below; its HTTP/UI wiring remains unfinished. No automatic key reset is allowed.

Six local recovery tests use generated EC keys with real cryptographic
verification and SQLite: repeated lost replies, replay/tampering/concurrent
stale challenges, expiration/revocation, transaction rollback, counter replay,
and forbidden purchase-table writes. These are synthetic assertions, not
positive tests on an Apple device. Full server suite: 100 passing tests.


## HTTP boundary preparation

`recovery-http.mjs` exposes no Worker/default fetch entry point and has no D1
binding. A caller must inject both the service and an `admitRequest` ingress /
rate-limit decision. Without that gate, it returns 503 before database access;
false returns 429, and gate exceptions return 503. The test gate returning true
is ONLY a test double, not a deployed rate limiter. A production gate must derive
identifiers from trusted ingress metadata, never a spoofable client body/header.

Only POST on `/v1/ios/recovery/challenge` and `/v1/ios/recovery/complete` at the
configured HTTPS origin is accepted. Query strings, other paths and extra JSON
fields are rejected. JSON request bodies are capped at 24 KiB while streaming and
have a five-second read deadline. Compressed bodies are rejected. Output is
non-cacheable JSON without reflected CORS; error responses contain no proof,
credential, database or personal data. The existing key's cryptographic assertion,
not a missing/old Bearer credential, authorizes recovery. Six HTTP boundary tests
cover default-deny admission, routes/origin/method, body limits, stalled input,
sanitized errors and malformed complete requests.

No live URL, CSP exception, database migration, signing identifier or rate-limit
binding is enabled by this work. Initial/resumed enrollment HTTP and the D1
adapter remain separate work before production.


## Pre-commit enrollment resume — 22.11.2026

`resume.mjs` covers an Apple-attested key whose enrollment never committed.
The native plugin caches the original server challenge, installation ID, key ID,
attestation and internally read AppTransaction JWS in a fixed device-only,
non-synchronizing Keychain item before returning the proof to JS. Exact cached
proof is reused; original nonce/context is never rewritten to fit a new challenge.
The installation marker binds this cache to the local installation. Invalid,
missing-marker or conflicting cache fails closed, without resetting the key.

When the original five-minute challenge has expired, the server issues a NEW
five-minute resume nonce bound to the original challenge ID and key. Native code
reads its own cached proof and signs the `vardadienas.enroll.resume.v1` context,
including hashes of both attestation and JWS. The server verifies the original
Apple attestation against the ORIGINAL context, rechecks Apple purchase/history,
and verifies the fresh assertion with that attested public key. Only this path
permits an expired original challenge. Direct initial enrollment still rejects
an expired challenge, and an expired resume challenge also cannot commit.

One transaction consumes both original and resume nonces, stores the actual
verified assertion counter, and creates the same original installation plus its
purchase link. The original verified purchase date is preserved. Other initial
or resumed attempts cannot create another identity from either consumed nonce.
If the server already committed and its reply was lost, use the existing-key
credential recovery protocol instead; resuming an already consumed enrollment is
rejected. `assertion-verifier.mjs` shares the real bounded ECDSA verification with
that recovery path.

`mobile/src/enrollment-resume.mjs` is a passive, injected-transport coordinator.
It validates cached/native/response scope, keeps JS proof out of native signing
arguments, and confirms Keychain credential readback. It creates no HTTP route
and is not called by startup/UI. Original cached proof is retained, including
after success, until a future server-aware cleanup policy is integrated.

Seven server resume tests cover original expiry, tampering, fresh expiry/counter,
parallel/lost-reply behavior, transaction rollback, missing verifier/foreign
scope/revocation, and expiry during verification. Seven client coordinator tests
include a complete local ECDSA + SQLite flow after a pre-commit network failure;
one additional compiled-boundary test blocks deletion for pending attestation.
The initial Apple attestation is a test double in positive tests; actual ECDSA
assertions use locally generated EC keys. This is not a real Apple/iPhone test.

**Remaining device failure window:** if the process terminates after Apple
produces an attestation but before its callback/proof is durably cached, the
proof may be unrecoverable. That state must stay blocked; it is not solved by
blindly generating a new key. Keychain failure, missing cache, reinstall/marker
loss, native crashes and certificate expiry require explicit policy and device
tests before release. Initial/resumed HTTP admission, D1, trusted TLS and signing
configuration also remain unconnected.

## Isolated HTTPS integration test

Run `node --test mobile/tests/registration-tls.test.mjs` from the repository root
after installing both projects' dependencies. The test uses OpenSSL to create a
temporary certificate and binds the HTTPS server to a random loopback port.
It checks certificate trust, interrupts the first submission before delivery,
advances the database fixture clock past the original challenge deadline, and
resumes registration over a new HTTPS connection. It verifies that the original
installation and purchase date are preserved.

The test uses a temporary SQLite database and simulated Apple purchase and
attestation data. The resume assertion is verified with a generated EC key.
The listener is a test harness for the Request/Response adapter. A hosted iOS
test environment still needs its own HTTPS origin, server configuration and
Apple signing credentials for testing a signed build on an iPhone.
