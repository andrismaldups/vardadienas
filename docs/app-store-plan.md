# App Store ieviešanas plāns — 22.11.2026.

## Saskaņotais

- iPhone izplatīšana App Store; vēlāk Android Google Play.
- Pārdevējs uzņēmums, visticamāk jaunizveidota SIA.
- Sākotnējā kopējā cena 4,99 EUR par trim gadiem, Push iekļauts.
- Nav automātiskas pagarināšanas; nākamais periods tikai ar apzinātu pirkumu.
- Pēc apmaksātā termiņa bez pagarināšanas Push beidzas, bet pamatfunkcijas, personīgie dati un lokālā apsveikumu veidošana/dalīšanās paliek.
- 2,99 EUR un sākotnējā pārdošana savā PWA vietnē ir aizstāti lēmumi.

## Apple dokumentācijas pārbaudes rezultāts

Apple piedāvā Non-Renewing Subscription: terminētu pakalpojuma pirkumu bez automātiskas atjaunošanas. Lietotnei jāuzskaita periods, jānodrošina brīvprātīga atkārtota iegāde un pirkumu atjaunošana ierīcēs. Trīs gadu periods ir mūsu termiņa loģikas projekts, nevis Apple automātiskā abonementa gatavs trīs gadu iestatījums. Konkrēto produktu un lietotni iesniedz Apple pārskatīšanai; apstiprinājums vēl nav saņemts.

Automātiskajiem abonementiem dokumentētie periodi ir līdz vienam gadam, un tie automātiski atjaunojas; tie neatbilst saskaņotajam modelim.

## Saskaņotā iegādes plūsma

Lietotājs 22.11.2026. izvēlējās B variantu: 4,99 EUR par lejupielādi App Store. Pēc iegādes visas saskaņotās funkcijas ir pieejamas bez otra aktivizēšanas maksājuma; sākotnējā cenā iekļauts trīs gadu Push periods. Vēlāk atsevišķs Apple pirkums tikai brīvprātīgai Push perioda pagarināšanai. Pagarināšanas cena vēl nav atsevišķi saskaņota.

Bezmaksas lejupielādes un maksas aktivizēšanas variants noraidīts. Bezmaksas priekšskatījuma vai funkciju ierobežošanas režīmu neieviešam.

Sākotnējās tiesības un termiņš jābalsta pārbaudītā lietotnes iegādē. Apple pirkuma atjaunošana nedrīkst kļūdaini piešķirt jaunus trīs gadus; viena darījuma atkārtota apstrāde nedrīkst pagarināt tiesības.

Lietotājs plāno pēc uzņēmuma izveides iegādāties jaunu Mac. Pašreizējais MacBook Air (Retina, 13-inch, 2018), Intel Core i5 1,6 GHz, macOS Sonoma 14.8.9 paliek sagatavošanas darbam; aktuālai App Store būvēšanai vajadzīgs atbilstošs jaunāks Mac/Xcode.

## iOS tehniskie darbi

1. Saglabāt pārbaudīto PWA kā atskaites versiju; iOS darbu izolēt atsevišķā zarā.
2. Izvērtēt esošā HTML/CSS/JavaScript atkārtotu izmantošanu lokāli iepakotā iOS projektā, piemēram ar Capacitor, salīdzinot ar SwiftUI. Capacitor nav apstiprināta galīgā izvēle.
3. Lokāli iepakot kalendāra datus, bibliotēkas un resursus, nodrošinot darbību jau pirmajā palaišanā bez interneta. PWA service worker nav vienīgais iOS bezsaistes nodrošinājums.
4. Pielāgot dalīšanos, failu eksportu/importu, drošu glabāšanu un atgādinājumu atļaujas iOS videi.
5. StoreKit pirkumi, atcelšana/neveiksme, gaidoši darījumi, atjaunošana, servera verifikācija un atmaksas. JSON dublējums nepārnes maksājuma tiesības.
6. Pārbaudīt esošo Cloudflare Worker, izstrādāt Apple darījumu piesaisti un licences termiņa uzskaiti serverī.
7. iOS Push nepieciešama natīvā APNs integrācija; esošais PWA Web Push abonements automātiski netiek izmantots kā natīvais abonements. Neaizskart esošos PWA testa abonementus.
8. Ierīces maiņa, pārinstalēšana, vairāku lietotāja ierīču atjaunošana, termiņa beigas un pagarināšana. Identitātes un ierīču politika vēl jāprojektē, neuzspiežot kontu tikai ērtības dēļ.
9. StoreKit testa vide, iPhone pārbaudes, TestFlight, App Review.

Vienkārša attālas vietnes parādīšana WebView nedod App Store apstiprinājuma garantiju. Apple 4.2 prasa lietotnei raksturīgu lietderību; esošās kalendāra, bezsaistes, personīgo sarakstu, apsveikumu un iOS integrācijas funkcijas jānodrošina pilnvērtīgi.

## Uzņēmuma un publicēšanas priekšnosacījumi

- Reģistrēta juridiska persona un pārstāvības tiesības.
- D-U-N-S numurs, uzņēmuma domēnam piesaistīta funkcionējoša publiska vietne un darba e-pasts.
- Apple konts ar divu faktoru autentifikāciju un Apple Developer Program Organization dalība. Dokumentētā maksa 99 USD gadā vai vietējā valūtā, kur pieejams; galīgo cenu pārbauda reģistrējoties.
- App Store Connect līgumi, uzņēmuma bankas un nodokļu informācija.
- Privātuma/apkalpošanas vietne, atbalsta adrese, lietošanas un pirkuma noteikumi, datu deklarācijas un veikala materiāli.
- Izvērtēt Small Business Program; 15% komisija ir piesaistīta programmas kritērijiem un apstiprinājumam, nevis automātisks pieņēmums.
- Pārbaudīt lietotāja Mac modeli, mikroshēmu un macOS atbilstību vajadzīgajai Xcode/SDK versijai. Neizdarīt secinājumus pēc pārlūka user-agent.

## Atvērtie lēmumi

- Sākotnējā iegādes plūsma atrisināta: maksas lejupielāde. Vēl jānosaka pagarinājuma cena.
- Pirmā termiņa sākums, priekšlaicīgas pagarināšanas aprēķins un 29.februāra politika.
- Pirkuma atjaunošanas identitāte un iPhone/Android tiesību savstarpēja izmantošana.
- iOS tehnoloģija pēc neliela prototipa pārbaudes.
- Pirms publicēšanas uzņēmuma dati un galīgā pieejamā EUR cena App Store Connect.

## Oficiālie avoti

- https://developer.apple.com/help/app-store-connect/manage-subscriptions/create-non-renewing-subscriptions
- https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-types
- https://developer.apple.com/documentation/storekit/handling-subscriptions-billing
- https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information/
- https://developer.apple.com/help/account/membership/program-enrollment/
- https://developer.apple.com/help/account/membership/D-U-N-S/
- https://developer.apple.com/app-store/small-business-program/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/xcode/system-requirements
- https://capacitorjs.com/docs
- https://capacitorjs.com/docs/apis/push-notifications

Stāvoklis: dokumentācijas izpēte un ieviešanas plāns. iOS projekts, uzņēmuma konts un pirkuma produkts vēl nav izveidoti. Esošās PWA funkcijas ar šo dokumentu netiek mainītas.
