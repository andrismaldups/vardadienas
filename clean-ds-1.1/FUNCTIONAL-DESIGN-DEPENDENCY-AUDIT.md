# VD Design — funkcionālā koda un dizaina atkarību audits (1.0)
Datums: 2026-11-08. Darba zars: `design-system-clean-v1-1`. Audits balstīts uz šī zara faktiskajiem avota failiem; nav produkcijas izmaiņu.

## Galvenais secinājums
**Nav pamata pārrakstīt aplikācijas funkcionalitāti no nulles.** Funkciju pamatkodols `clean-ds-1.1/app-core.js` (1949 rindas) nesatur tiešas atsauces uz `designStyle`, `dataset.design` vai `dataset.theme`. Dizaina izvēle un gaišais/tumšais režīms koncentrēti `theme-bootstrap.js`. Tas ir labs sākumpunkts neatkarīgam vizuālajam slānim, bet DOM struktūras un CSS klases joprojām saista funkcionalitāti ar saskarni.

## Atkarību karte
| Slānis | Pašreizējais fails | Atkarības un risks | Lēmums |
|---|---|---|---|
| Funkcijas un dati | `clean-ds-1.1/app-core.js` | DOM elementu ID, stāvokļa klases, 48 `localStorage` pieminējumi, 8 `fetch(` pieminējumi; 10 `innerHTML` pieminējumi | **Saglabāt**, sadalīt moduļos tikai ar regresijas testiem |
| Tēmas stāvoklis | `clean-ds-1.1/theme-bootstrap.js` | `designStyle`, `appearanceMode`, `html[data-design]`, `html[data-theme]`; pārslēdz `ds-app`, `ds-card`, `ds-button` klases | Vienkāršot: tēma nosaka tikai vizuālos tokenus; DOM komponentu klases kļūst pastāvīgas |
| Agrīnā inicializācija | `clean-ds-1.1/body-theme-init.js` | Atsevišķa `ds11` nosacīta klases pievienošana | Pēc vienotas komponentu sistēmas ieviešanas apvienot ar bootstrap |
| Saskarnes struktūra | `index.html` | 20 `section` elementi; kopīgi ID un klašu nosaukumi ir JS un testu līgums | Saglabāt ID, pārveidot tikai noformējuma klases |
| Sākotnējie stili | `clean-ds-1.1/legacy-layout.css` | ~72 KB; ~127 atsauces uz `lavender` | **Nedzēst lielos blokos**; pakāpeniski pārcelt kopīgo izkārtojumu uz komponentiem |
| Vēsturiskā tēmu sistēma | `design-system.css` | ~60 KB; ~86 `nature-d3`, ~218 `festive-s1`, ~309 `!important` atsauces | Atšķirt S1 tokenus no kopīgajiem noteikumiem; D3 dekorācijas izņemt tikai pēc atkarību testiem |
| Jaunā sistēma | `clean-ds-1.1/components.css`, `app-integration.css`, `d3-theme.css` | C-komponenti, DS11 klases un etalona D3 krāsu tokeni | Izmantot kā mērķa arhitektūras pamatu, saglabājot noderīgos tokenus |
| PWA / izolācija | `service-worker.js`, `isolation-guard.js`, `push-design-guard.js` | Bezsaistes kešatmiņa, TEST Worker bloķēšana, push UI aizsardzība | Nemainīt, izņemot jaunu resursu pievienošanu kešatmiņai |

## Konkrētas sasaistes
1. `app-core.js` lieto `active` klases, lai norādītu izvēli/kārtošanu, un `push-active-status` — push UI stāvoklim. Šīs ir **semantiskas stāvokļa klases**, nevis dizaina nosaukumi; CSS drīkst tās noformēt, bet nedrīkst mainīt to nozīmi.
2. `app-core.js` dinamiski iestata apsveikuma lauka augstumu un emoji paneļa `top`, `right`, `maxHeight`. Šīs ir **izkārtojuma atkarības**; nedrīkst pieņemt, ka dizaina maiņa automātiski būs droša, kamēr nav atsevišķu vizuālo testu.
3. `theme-bootstrap.js` pie `ds11` ieslēdz un izslēdz `ds-card` un `ds-button` klases. Tas nozīmē, ka dizaina maiņa pašlaik maina **komponentu DOM klases**, ne tikai paleti.
4. Lielais Z3 CSS bloks tika izņemts un Playwright pārbaudēs #118 izgāzās iPhone platuma testi. Bloks tika atjaunots; #120 bija sekmīga. Tas pierāda **regresiju pēc izņemšanas**, nevis precīzi identificē, kurš selektors to izraisīja.
5. HTML ir viena kopīga struktūra dažādiem dizainiem; pašreizējā izvēlnē ir tikai `classic`, `festive-s1`, `ds11`. Z3/D3/J1 saglabātās izvēles tiek novirzītas uz `classic`.

## Mērķa arhitektūra
```text
app-core (dati, aprēķini, notikumi)  ->  DOM ar nemainīgiem ID un semantiskām stāvokļa klasēm
                                          |
                                          v
                                C01–C18 kopīgie komponenti
                                          |
                                          v
                          html[data-design] + html[data-theme]
                                          |
                                          v
                          tēmas tokeni, foni un dekoratīvie slāņi
```
Pamatnoteikums: `designStyle` pārslēgšana nedrīkst pārveidot DOM struktūru, mainīt JS notikumu apstrādi, glabāšanas atslēgas, push darbību vai satura datus.

## Darbu secība un pieņemšanas kritēriji
1. **Fiksēt bāzi:** saglabāt veiksmīgo CI #120 un pārbaudīt, ka VD Design izolācija un iPhone izkārtojums darbojas.
2. **Izveidot tēmu kontrakta testus:** visām trim izvēlēm vienādi galveno DOM elementu ID, pamatfunkciju rezultāti, `localStorage` saturs; mainās tikai vizuālie tokeni. Testēt arī gaišo/tumšo režīmu.
3. **Vienādot C01–C18 komponentu klases:** piešķirt tās pastāvīgi, nevis tikai `ds11` gadījumā. Sākumā vienam skata fragmentam; vizuāli salīdzināt K1/S1/DS11.
4. **Pārcelt kopīgos CSS izkārtojuma noteikumus:** tikai pēc testu apstiprinājuma; izvairīties no plašiem dzēšanas blokiem.
5. **Tēmas atdalīt tokenu failos:** K1, S1 un DS11 paletes, gaišais/tumšais, fons/dekorācijas; izņemt liekās vēsturiskās tēmas tikai tad, kad tām vairs nav ietekmes.
6. **Pārbaudīt iPhone PWA un offline:** Playwright mobile WebKit + reāla iPhone pārbaude, kad automatizētā bāze ir stabila. Tikai tad nepieciešama lietotāja iesaiste.

## Robežas
Nemainīt Vardadienas produkciju, VardadienasT, push Worker, abonementus, glabāšanas atslēgas vai datu formātus. Neveidot jaunu Cloudflare projektu vai ceturto aplikāciju. Nākamais darbs ir **atkarību testu izstrāde**, nevis visa koda pārrakstīšana.
