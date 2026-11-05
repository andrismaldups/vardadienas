# VD Design — integrācijas robežas (2026-11-05)

Šis ir esošā koda pārbaudes pieraksts pirms dizaina sistēmas 1.1 integrācijas. **Tas nav paziņojums par pabeigtu integrāciju.**

## Apstiprināts no GitHub koda
- Repozitorija saknes `index.html` ir pilnās aplikācijas ievades dokuments, nevis C01–C18 galerija.
- Esošajā aplikācijā ir `nature-d3` dizaina izvēle.
- `index.html` importē esošos `design-system.css` un `design-water-j1.css`; šos stilus nedrīkst vienkārši sajaukt ar jaunajiem `components.css`.
- Kodā ir lietotāja datu, paziņojumu un service worker loģika. Funkcionalitāti nedrīkst pārrakstīt dizaina maiņas dēļ.
- Cloudflare projekta `vardadienas-ds11-preview` publicēšanas direktorija pašlaik ir `clean-ds-1.1`, tādēļ saknes `index.html` automātiski nekļūst par publisko ievades lapu.

## Integrācijas nosacījumi
1. Izmantot esošo aplikācijas DOM un JavaScript loģiku; pārcelt tikai vizuālo stilu slāni.
2. Saglabāt D3 kā dizaina vizuālo etalonu un jaunās tēmas definēt semantiskajos tokenos.
3. Izvairīties no platformas noklusētā datumu kalendāra, ja specifikācijā paredzēts aplikācijas pašu datumu meklētājs.
4. Destruktīvo darbību krāsas ir semantiski brīdinājuma stāvokļi, nevis pamatpaletes dekoratīvas krāsas; to lietojums jāsaskaņo specifikācijā.
5. Saglabāt atsevišķu Cloudflare preview vidi, neietekmējot produkciju, VārdadienasT vai push abonementus.
6. Pirms pārslēgt preview publicēšanas ievades lapu, jāpārbauda aktīvu ceļi, manifest, service worker un izolācija no reālajiem lietotāja datiem.

## Koda pazīmju pārbaude
```
<section id="settingsView": true
id="calendar: true
id="favorites: true
id="birthdays: true
design-water-j1.css: true
DESIGN_TEST_ISOLATED: true
serviceWorker: true
fetch(: true
```

## Pašreizējais statuss
**Integrācija vēl nav veikta.** Šis dokuments fiksē drošības un funkcionalitātes robežas, lai neieviestu jaunu tēmu kā vēl vienu veco CSS labojumu slāni.
