# VD Design — tīra `index.html` pārbūve

**Statuss:** 1. posms — faktiskais koda inventārs un migrācijas robežas. **Lēmums:** pārbūvēt `index.html` modulāri esošajā VD Design vidē, neveidojot ceturto aplikāciju. Šis fails ir izstrādes plāns, nevis pierādījums, ka pārbūve jau veikta.

## 1. Faktiskais koda inventārs (zars `design-system-clean-v1-1`)

Esošais saknes `index.html`: **266 708 rakstzīmes, 2 684 rindas**. Tajā ir divi iekšējie CSS bloki un septiņi iekšējie JavaScript bloki. Šie skaitļi raksturo avota stāvokli audita brīdī, nevis turpmāko mērķi.

| Bloks | Aptuvenais apjoms | Funkcija | Migrācijas prioritāte |
|---|---:|---|---|
| Iekšējais CSS #1 | 72 152 rakstzīmes | Vēsturiskie stili un dizainu izņēmumi | Pēc funkciju inventāra; neakli pārnest |
| Iekšējais CSS #2 | 551 rakstzīme | C18/N22 izvēršamo rindu atstarpes | Pārcelt uz kopīgo komponentu slāni tikai ar regresijas testu |
| JS #1 | 2 350 rakstzīmes | Sākotnējā tēma, režīms, `ds11` ieslēgšana | Pārcelt uz agrīni ielādējamu `theme-bootstrap.js`; jānovērš FOUC |
| JS #2 | 714 rakstzīmes | **DESIGN TEST izolācija** no vecā TEST servera | Kritiska drošības barjera; saglabāt pirms visiem lietotnes skriptiem |
| JS #3 | 184 rakstzīmes | `body.ds-app` sākotnējā piesaiste | Apvienot ar tēmas bootstrap tikai pēc testiem |
| JS #4 | 163 457 rakstzīmes | Vārdadienas, kalendārs, apsveikumi, personas, dati, iestatījumi, push loģika | **Neizgriezt uzreiz**; sadalīt pēc atkarību kartes |
| JS #5 | 148 rakstzīmes | Service Worker reģistrācija | Saglabāt reģistrācijas ceļu un tvērumu |
| JS #6 | 2 264 rakstzīmes | Atgādinājumu laika izvēles UI | Pārcelt atsevišķi, saglabājot sākotnējos `select` kā autoritatīvus |
| JS #7 | 852 rakstzīmes | **DESIGN TEST push aktivizācijas bloķēšana** | Kritiska drošības barjera; nepazaudēt pārbūvē |

**Novērojums:** CSS un JS sadalīšana ārējos failos pati par sevi vēl neatrisina savstarpējās atkarības. Pirmajā posmā jānodrošina uzvedības identiskums, nevis vienlaikus jāpārraksta visa loģika.

## 2. Mērķa arhitektūra

```text
index.html                    # minimāls DOM karkass un secīgi ielādes punkti
styles/
  layout.css                 # kopīgo skatu izvietojums, bez tēmas krāsām
  views.css                  # skatu ģeometrija
clean-ds-1.1/
  components.css             # C01–C18 kopīgie komponenti
  themes/                    # jaunās tēmas semantiskie tokeni un dekorācijas
js/
  theme-bootstrap.js         # agrīna tēmas izvēle un body klase
  isolation-guard.js         # TEST servera piekļuves bloķēšana
  app-core.js                # esošā loģika pārejas periodā
  reminder-time-picker.js    # laika izvēles UI
  push-design-guard.js       # DESIGN TEST push UI bloķēšana
  sw-register.js             # Service Worker reģistrācija
```

**Pārejas princips:** vispirms pārnest esošo loģiku bez funkcionālas pārrakstīšanas, pēc tam sadalīt `app-core.js` mazākos moduļos. Veco Z3/D3/J1-E dizainu CSS neiekļaut galīgajā tēmu sistēmā; **D3 etalonam vajadzīgos tokenus saglabāt līdz to aizstāšanas pārbaudei**. K1/S1 likteni izlemt pēc atkarību pārbaudes, nevis izdzēst klusējot.

## 3. Izpildes posmi un vārtejas

1. **A — atkarību karte:** uzskaitīt HTML ID, globalos mainīgos, `localStorage` atslēgas, `fetch` galapunktus, Service Worker tvērumu, `manifest` un izsaukumu secību.
2. **B — uzvedību fiksējoši testi:** pirms pārbūves izveidot testus visiem galvenajiem skatiem, tēmu pārslēgšanai, ievadei, saglabāšanai un DESIGN TEST drošības barjerām.
3. **C — mehāniska sadalīšana:** pārcelt CSS/JS ārējos failos, saglabājot ielādes secību un DOM. Pēc katra neliela soļa palaist CI.
4. **D — tīrs `index.html`:** atstāt semantisku HTML un moduļu pieslēgumus; saglabāt tos pašus ID un datu formātus.
5. **E — jaunās tēmas:** izveidot vienu jaunu variantu tikai no specifikācijas 1.2 tokeniem un kopīgajiem komponentiem; bez vēsturiskajiem selektoru izņēmumiem.
6. **F — iPhone pārbaude:** esošajā VD Design PWA pārbaudīt gaišo/tumšo režīmu, kalendāru, meklēšanu, personīgos sarakstus, apsveikumus un iestatījumus.

## 4. Nepārkāpjamās robežas

- Produkcijas **Vardadienas** un veco **VardadienasT** neaiztikt; Cloudflare jaunu projektu neveidot.
- Nekad neaktivizēt push testus, neatcelt abonementus, nedzēst lietotāja datus pārbūves laikā.
- `DESIGN_TEST_ISOLATED` un push bloķēšanai jāpaliek spēkā arī pēc skriptu sadalīšanas.
- Pārbūves gaitā **nemainīt** `localStorage` atslēgas, saglabāto personu/vārdu formātu, API maršrutus, manifest vai Service Worker scope bez atsevišķa migrācijas plāna.
- Pirms saknes `index.html` nomaiņas jābūt atpakaļatgriešanās punktam (Git commit) un sekmīgai automatizētai pārbaudei.
- **Jauna dizaina pievienošana nedrīkst prasīt mainīt biznesa loģiku.**

## 5. Pirmā posma rezultāts

Koda uzbūve ir inventarizēta, kritiskās drošības barjeras identificētas, pārbūves secība definēta. **Šajā posmā netiek pārrakstīts vai dzēsts pašreizējais `index.html`.** Nākamais tehniskais solis — atkarību kartes un uzvedību fiksējošu testu izveide.
