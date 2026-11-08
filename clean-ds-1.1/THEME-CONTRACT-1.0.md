# VD Design — tēmu neatkarības kontrakts 1.0

## Mērķis
Viena funkcionāla aplikācija ar vairākām vizuālām tēmām. Dizaina pārslēgšana drīkst mainīt tikai prezentāciju, nevis aplikācijas funkcijas, datu saturu, DOM elementu identitāti vai notikumu apstrādi.

## Tēmas stāvoklis
- `html[data-design]`: `classic`, `festive-s1`, `ds11`. Saglabāšana: `localStorage.designStyle`.
- `html[data-theme]`: `light`, `dark` (vai `auto` izvēles aprēķinātais režīms). Saglabāšana: `localStorage.appearanceMode`.
- `html[data-design="ds11"]`: DS11 noformējuma slēdzis pilnajā aplikācijā.
- `theme-bootstrap.js` iestata abus atribūtus uz `html` pirms satura attēlošanas. Sistēmas izskata izmaiņām seko tikai izvēle `auto`.
- Galerija atsevišķi izmanto `main.ds-app[data-mode]` un `reference-theme.css`.
- `[data-ui-component="card"]`: nemainīgs kartītes komponenta identifikators.
- `[data-ui-component="primary-action"]`: nemainīgs primārās darbības identifikators.
- `active`, `push-active-status`: lietotāja darbību/stāvokļa semantika, nevis tēmu izvēle.
- Visu elementu `id`, ievadlauku vērtības, lietotāja dati un TEST push izolācija paliek nemainīgi.

## Atļauts tēmas slānī
Krāsas, fontu vizuālie parametri, virsmas, apmales, ēnas, pamatfons, dekoratīvie slāņi, stāvokļu vizuālā atšķirība. Tēmu CSS jābalstās uz kopīgiem semantiskiem `--ds-*` tokeniem, kur iespējams.

## Aizliegts tēmas slānī
- Mainīt vai aizstāt DOM elementus, lai pārslēgtu tēmu.
- Pārrakstīt `app-core.js` biznesa loģiku, lai pielāgotu krāsas vai dekorācijas.
- Mainīt `localStorage` datu atslēgas vai formātus.
- Aktivizēt push paziņojumus VD Design vidē.
- Pārnest vizuālās klases uz un no pogām/kartītēm pie tēmas pārslēgšanas.
- Ietekmēt Vardadienas produkciju vai VardadienasT TEST.

## CSS slāņi

- `legacy-layout.css` un `design-system.css` satur visu trīs dizainu kopīgo lietotnes izkārtojumu, kā arī vēsturiskos K1/S1 noformējuma noteikumus.
- C09 apakšējās joslas un C18 akordeona atstarpes lietotnē izmanto kopīgus ģeometrijas noteikumus visās tēmās.
- `components.css` nodrošina galerijas katalogu un DS11 lietotnes komponentu pamatstilus. `app-integration.css` piesaista DS11 vizuālos noteikumus esošajiem lietotnes elementiem, savukārt `d3-theme.css` nodrošina DS11 krāsu tokenus.
- C15 specifikācijā 1.2 ir rezervēts. Galerijas `.ds-textarea` pārbaude ir tehniska un neapliecina atsevišķa C15 komponenta pieņemšanu.

## Pieņemšanas kritēriji
1. Pārslēgšana K1 → S1 → DS11 → K1 saglabā DOM identitāti, ievadlauku saturu un lietotāja datus.
2. Dizaina izvēle saglabājas pēc lapas pārlādes.
3. Gaišais/tumšais režīms nemaina funkcionālos elementus.
4. DS11 kartītes un primārās pogas saņem noformējumu pēc nemainīgajiem komponentu identifikatoriem.
5. Pārbaudes izpildās Chromium, WebKit un mobile-WebKit.
6. Pēc automatizētām pārbaudēm — reāla iPhone PWA pārbaude ar lietotāja iesaisti.

## Pārbaudes un atlikušais darbs

CI pārbauda komponentu katalogu, tokenu kontrastu un regresijas Chromium, WebKit un mobilā WebKit konfigurācijā. Lietotnes iestatījumu tests pārslēdz visas sešas dizaina un režīma kombinācijas 375 CSS pikseļu platumā. Chromium bezsaistes pārbaude izmanto VD Design service worker un testa pārlūka lokālos datus.

K1 un S1 paletes un vēsturiskie pārrakstījumi vēl jāpārceļ uz kopīgajiem komponentu tokeniem. Galerijas, lietotnes DOM un automatizētā kontrasta pārbaudes neaptver visu C01–C18 vizuālo atbilstību katrā tēmā. Instalētas iPhone PWA pārbaude paliek atsevišķs pieņemšanas solis.
