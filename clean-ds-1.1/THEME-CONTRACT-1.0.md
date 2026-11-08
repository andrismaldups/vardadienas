# VD Design — tēmu neatkarības kontrakts 1.0

## Mērķis
Viena funkcionāla aplikācija ar vairākām vizuālām tēmām. Dizaina pārslēgšana drīkst mainīt tikai prezentāciju, nevis aplikācijas funkcijas, datu saturu, DOM elementu identitāti vai notikumu apstrādi.

## Esošais līgums
- `html[data-design]`: `classic`, `festive-s1`, `ds11`. Saglabāšana: `localStorage.designStyle`.
- `html[data-theme]`: `light`, `dark` (vai `auto` izvēles aprēķinātais režīms). Saglabāšana: `localStorage.appearanceMode`.
- `body.ds-app`: pagaidu DS11 noformējuma ieslēgšanas slēdzis, **nevis** funkcionalitātes pazīme.
- `body[data-mode]`: pagaidu DS11 krāsu režīma sinhronizācija.
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

## Pārejas risinājums
Vēsturiskie K1/S1 stili pagaidām paliek. DS11 izmanto `clean-ds-1.1/components.css` un `app-integration.css`. Vecās tēmas nedrīkst masveidā dzēst, pirms nav pierādīta iPhone izkārtojuma un pamatfunkciju regresijas testu sekmīga darbība.

## Pieņemšanas kritēriji
1. Pārslēgšana K1 → S1 → DS11 → K1 saglabā DOM identitāti, ievadlauku saturu un lietotāja datus.
2. Dizaina izvēle saglabājas pēc lapas pārlādes.
3. Gaišais/tumšais režīms nemaina funkcionālos elementus.
4. DS11 kartītes un primārās pogas saņem noformējumu pēc nemainīgajiem komponentu identifikatoriem.
5. Pārbaudes izpildās Chromium, WebKit un mobile-WebKit.
6. Pēc automatizētām pārbaudēm — reāla iPhone PWA pārbaude ar lietotāja iesaisti.

## Nākamais tehniskais uzdevums
Samazināt `body.ds-app` nepieciešamību, pārceļot DS11 vizuālo ieslēgšanu uz `html[data-design="ds11"]`, bet tikai pēc atbilstošu testu un stilu specifiskuma audita. Atsevišķi vēlāk izdalīt K1/S1 paletes no kopīgā izkārtojuma.
