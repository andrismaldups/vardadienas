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
resursi ir iekļauti. PWA saknes faili netiek mainīti.

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

PWA kods vēl izmanto localStorage un tīmekļa kopēšanu/dalīšanos/failus. Sagatave to
iepako, bet negarantē šo funkciju darbību WKWebView. Nākamajos posmos jāpievieno:

1. Noturīga iOS glabāšana ar pārbaudāmu migrāciju; nepazaudēt sarakstus un gaidošās izmaiņas.
2. Natīva dalīšanās un JSON failu saglabāšana/atvēršana, saglabājot esošo JSON formātu.
3. Natīvais APNs, atļaujas un servera piesaiste; Web Push abonementi nav pārnesami kā APNs tokeni.
4. StoreKit maksas lietotnes darījuma pārbaude/atjaunošana un brīvprātīgā pagarināšana;
   izmantot servera sagatavi no `ios-preparation`, neievietojot API privātās atslēgas klientā.
5. iOS servera izcelsmes/autentifikācijas risinājums, datu dzēšanas plūsma un licence.
6. Safe-area, tastatūras, pieejamības, gaišā/tumšā režīma un visu lietotāja funkciju
   atkārtota pārbaude īstā iPhone. PWA sekmīgie testi nav automātiski iOS testu rezultāti.

## Atkārtošana uz jaunā Mac

Nepieciešams Node 22+ un Capacitor 8 atbilstošs Xcode 26+ ar saderīgu macOS.
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

## Veiktās pārbaudes 22.11.2026.

- `npm test`: 9 iepakošanas/izolācijas pārbaudes izdevās. Tās pārbauda resursu
  pieejamību, datu/bibliotēku baitu nemainību, funkcionālo inline skriptu nemainību,
  sintaksi, lokālās ielādes konfigurāciju un produkcijas tīkla pieprasījumu bloķēšanu.
- `npx cap add ios --packagemanager SPM`: projekta ģenerēšana izdevās.
- `npm run ios:sync`: resursu un SPM konfigurācijas sinhronizācija izdevās.
- Native kompilācija un lietotāja saskarnes pārbaude ierīcē vēl nav veikta.

## Oficiālie avoti

- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/ios
- https://capacitorjs.com/docs/ios/spm
- https://capacitorjs.com/docs/config
