# Worker pārbaude pirms Apple integrācijas

## Pārbaudes pamats un robežas

Lietotāja iesniegtais `vardadienas-push-test23.rtf`, 22.11.2026. No tā izvilktajam
JavaScript ir 998 rindas; `node --check` izdevās. Koda sākums, rindu skaits un beigās
redzamā atgādinājumu plūsma atbilst lietotāja Cloudflare ekrānattēlam ar
`vardadienas-push`, Active Latest `d10eb209`. Tā nav neatkarīga izvietojuma hash pārbaude.

Oriģinālā RTF SHA-256:
`8d98768bcc4c7fb8413778a99464e8b649d40880567430130cb968d54642cfb6`.
RTF konvertēšanā sešas emoji rakstzīmes aizstātas ar aizstājējzīmēm; izvilkumu izmanto
analīzei, nevis kā precīzu izvietošanas failu. Oriģināls nav mainīts. Iepriekšējais
`vardadienas-push-test22.rtf` netiek izmantots par aktuālā Worker pamatu.

Nav veikti produkcijas HTTP pieprasījumi, izsūtīti paziņojumi, mainīti D1 dati vai
Worker iestatījumi. Šis ir mērķēts integrācijas izvērtējums, nevis pilns drošības audits.

## Esošais pamats

| Daļa | Atrastais kodā |
|---|---|
| Instalācijas identitāte | Nejaušs ID un tokens; serverī SHA-256 tokena hash |
| Izcelsme | `https://andrismaldups.github.io` |
| Personīgie dati | Ar instalāciju saistīti vārdi un dzimšanas dienas |
| Atgādinājumi | Iestatījumi, Web Push abonements un Europe/Riga datuma aprēķins |
| Darba slēdzis | `REMINDERS_LIVE` |
| Dublikātu kontrole | Atsevišķi vārdadienu un dzimšanas dienu piegādes žurnāli |
| Dzēšana | Atomārs instalācijas datu dzēšanas batch, septiņu dienu apstiprinājuma kvīts |
| Testa sūtīšana | Ar `TEST_PUSH_TOKEN` aizsargāts konkrēta abonementa tests |
| Apple pirkumi/termiņi | Nav atrasti |
| Natīvais APNs | Nav atrasts; VAPID/Web Push nav tas pats, kas natīvā iOS reģistrācija |

Kodā izmantotas astoņas tabulas: `app_installations`, `push_subscriptions`,
`reminder_settings`, `favorite_names`, `birthdays`, `reminder_delivery_log`,
`birthday_delivery_log`, `installation_deletion_receipts`.
To faktiskie CREATE TABLE/indeksi šajā failā nav iekļauti.

## Vajadzīgie papildinājumi izolētajai iOS videi

1. **Uzticama Apple iegādes pārbaude.** StoreKit/App Store parakstu, bundle/app ID,
   vides un darījumu vēstures validācija. Klienta ID vai paša nosūtīts termiņš nav
   pietiekams apliecinājums. `AppTransaction` vien neatrisina visas atmaksas un
   pirkuma tiesību anulēšanas situācijas; pirms produkcijas tas jāprojektē un jāpārbauda.
2. **Atjaunojama pirkuma un instalācijas sasaiste.** Pirkums pārdzīvo instalācijas
   maiņu. Saiste jāizveido ar pierādītu tiesību turētāju un pašreizējās ierīces
   identitāti. Family Sharing un turpmākā Android piekļuve vēl nav atrisināti.
3. **Pilna pagarinājumu vēsture.** Katra transaction ID tikai vienreiz, Sandbox un
   Production atsevišķi; saglabā un saskaņo pārbaudītas atsaukšanas izmaiņas.
4. **Termiņa aprēķins.** Izmanto jau sagatavoto `entitlements/periods.mjs` tikai pēc
   uzticamas validācijas. Datumu/29.februāra un pagarināšanas noklusējumi ir prototipa
   priekšlikumi, nevis jauni saskaņoti pirkuma noteikumi.
5. **Push nosūtīšanas tiesības.** iOS plūsmā pārbauda aktīvu Production termiņu
   pirms paziņojuma rezervēšanas un pirms sūtīšanas; licences neesamība vai pārbaudes
   kļūda nedod maksas Push. Perioda beigas neizdzēš lietotāja sarakstus.
6. **Natīvais APNs transports.** Atsevišķs iOS ierīces tokens, lietotnes topic,
   development/production vides un uzticama servera APNs autentifikācija. Nepārvērš
   esošos Web Push endpoint/p256dh/auth ierakstus par natīviem abonementiem.
7. **Dzēšanas plūsma.** Atvieno attiecīgo instalāciju un tās APNs tokenu, neizdzēšot
   citu instalāciju datus. Komerciālā pirkuma ieraksta saglabāšana/anonimizēšana un
   atjaunošana jāparedz arī privātuma noteikumos. Veco PWA abonementu darbību šis
   prototips neierobežo.

## Sagatavotais papildinājums

`apple-purchases.schema.draft.sql` paredz trīs jaunas tabulas: sākotnējās iegādes,
pagarinājumu darījumi un instalāciju saites. Tās ir atsevišķas no esošajiem datiem.
Šis fails NAV piemērojama produkcijas migrācija bez D1 shēmas pārbaudes un
atjaunotās dzēšanas/testēšanas plūsmas. Tajā vēl nav APNs tabulas vai maršrutu.

`schema.test.py` pārbauda astoņus ierobežojumu scenārijus SQLite atmiņas datubāzē.
18 periodu testi un 8 shēmas testi izdevās. Tie nepierāda izvietota D1 vai Apple
kriptogrāfiskās integrācijas darbību.

## Nākamais pārbaudāmais solis

Iegūt faktiskās astoņu D1 tabulu struktūras un indeksus, bez personīgajiem datiem:

```sql
SELECT type, name, sql
FROM sqlite_master
WHERE type IN ('table', 'index')
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE '_cf_%'
ORDER BY type, name;
```

Tas ir tikai SELECT; neko nemaina. Pirms izveides vajadzīga atsevišķa iOS testa
Worker/D1 vide vai ekvivalents izolēts tests. Esošajam Worker nepievieno trīs gadu
ierobežojumus, kamēr Apple iegādes vēl nav ieviestas un pārbaudītas.
