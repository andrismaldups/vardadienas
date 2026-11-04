# Dizaina sistēma 1.1 — tīrās realizācijas pārbaude

Šī direktorija ir **jauns vizuālo komponentu kods**, nevis iepriekšējo CSS labojumu adapteris.

## Faili
- `components.css` — C01–C18 komponentu vienotās stilu definīcijas, tikai semantiskie `--ds-*` tokeni.
- `reference-theme.css` — pilnas, savstarpēji neatkarīgas gaišā/tumšā režīma **tehniskās atsauces** paletes; tās nav lietotāja apstiprināts jaunais dizains.
- `gallery.html` — izolēta visu 18 komponentu galerija, kas neizmanto veco `index.html`, push abonementus vai lietotāja datus.
- `validate.py` — statisks komponentu, tokenu un izolācijas līguma tests.
- `contrast_audit.py` — 11 pāru WCAG AA teksta kontrasta tests katrā režīmā.

## Lokāla pārbaude
```sh
python3 clean-ds-1.1/validate.py
python3 clean-ds-1.1/contrast_audit.py
python3 -m http.server 8000
```
Atvērt `http://localhost:8000/clean-ds-1.1/gallery.html`.

## Kas vēl NAV pārbaudīts
- CSS faktiskā renderēšana Safari/iOS, fokuss ar tastatūru, iPhone drošās zonas un PWA uzvedība;
- caurspīdīgie slāņi, fona attēli un to kontrasts;
- visu 18 komponentu stāvokļi (hover, pressed, error, disabled, expanded, selected, dark);
- aplikācijas biznesa loģikas integrācija, bez regresa;
- neatkarīgas Cloudflare Pages izvietošanas konfigurācija.

## Drošības robeža
Neiekļaut šos failus esošajā TEST vai produkcijas aplikācijā, pirms nav pabeigta izolētā pārbaude. Esošās K1, Z3, D3, S1 un J1-E tēmas nemainīt.

## Pieņemšanas vārti
1. Statiskais tokenu tests ir sekmīgs abos režīmos.
2. Kontrasta tests ir sekmīgs, pēc tam atsevišķi pārbaudīti interaktīvie stāvokļi.
3. Vizuāli un funkcionāli pārbaudīti visi C01–C18 komponenti iPhone.
4. Tikai pēc tam: izolēta aplikācijas funkcionalitātes integrācija un jaunas tēmas ieviešanas tests bez individuāliem CSS labojumiem.
