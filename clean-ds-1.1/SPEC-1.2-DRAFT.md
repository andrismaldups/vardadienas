# Dizaina sistēmas specifikācija 1.2 — darba projekts

Statuss: darba projekts; nav apstiprināta specifikācija. Datums: 2026-11-08.
Pamats: `clean-ds-1.1/SPEC-1.1-CHANGELOG.md`, `components.css`, `INTEGRATION-NOTES.md`.

## Pamatprincipi
- Viena C01–C18 komponentu uzvedības un izkārtojuma definīcija visām tēmām.
- Tēmas nosaka semantisko tokenu vērtības un dekoratīvos resursus; neievieš komponentu izņēmumus.
- D3 ir vizuālais etalons. K1, Z3, D3, S1 un J1-E nedrīkst patvaļīgi mainīt.
- Dokumentācijas prasība nav pierādījums, ka realizācija pārbaudīta.
- Produkciju, esošo TEST un push abonementus neaiztikt.

## Nodaļas
1. Mērķis un versiju pārvaldība
2. Komponentu, tokenu un tēmu arhitektūra
3. Semantiskās krāsas un stāvokļi
4. V01–V05 virsmas un dekoratīvie slāņi
5. C01–C18 komponentu specifikācijas
6. Komponentu piesaiste ekrāniem
7. K1, Z3, D3, S1, J1 tēmas
8. iPhone PWA, drošās zonas un offline režīms
9. Pieejamība un fokusa stāvokļi
10. Testēšanas un pieņemšanas kritēriji
11. Neatbilstību reģistrs
12. Vizuālais katalogs ar ekrānattēliem

## Pārbaudes reģistrs (sākotnējais)
| ID | Elements | Koda konstatējums | Prasība | Statuss |
|---|---|---|---|---|
| A12-01 | C03/C04/C05/C06 | Vispārīgais :active noteikums var pārņemt specializētus stāvokļus | Stāvokļu prioritātes pārbaudīt ar computed styles | Atvērts, statisks |
| A12-02 | C05 | Destruktīvās ikonas stāvokļi nav pilnībā izdalīti | Atsevišķa semantiska krāsu/state matrica | Atvērts, statisks |
| A12-03 | C16 | Šodienas apmale izmanto --ds-focus-ring | 46x46 px, 1 px apmale ar --ds-calendar-today-border; selected prioritāte | Atvērts, statisks |
| A12-04 | C18 | Nav nepārprotami noteikta 8 px vertikālā atstarpe starp izvēršamajiem elementiem | 8 px atstarpe | Atvērts, statisks |
| A12-05 | V01–V05 | Nepieciešama renderēto virsmu un alfa pārbaude | V01 17%, V02 68%, V03 84%, V04 91%, V05 93–95% | Nepārbaudīts |
| A12-06 | N22 | Iepriekš ziņots par vizuālu apstiprinājumu | Regresijas tests iPhone | Jāpārbauda |
| A12-07 | N25 | Iepriekš ziņots kā pabeigts | Regresijas tests iPhone | Jāpārbauda |
| A12-08 | Integrācija | INTEGRATION-NOTES norāda, ka pilna integrācija nav pabeigta | Izolēts funkcionālais tests | Nepabeigts |

## Pieņemšanas nosacījumi
- Statiskie tokenu un kontrasta testi; reālu stāvokļu computed-style pārbaude.
- C01–C18 iPhone Safari/PWA gaišajā un tumšajā režīmā.
- Nav horizontālas nogriešanas; minimālais interaktīvais laukums 44x44 px.
- Offline darbība un datu saglabāšana nemainās.
- Vizuālo katalogu pievienot tikai no verificētiem ekrānattēliem.
- Tikai pēc pārbaudes mainīt statusu uz “apstiprināts”.
