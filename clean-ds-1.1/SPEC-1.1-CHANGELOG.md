# Dizaina sistēmas specifikācija 1.1 — saskaņoto grozījumu reģistrs

Datums: 2026-11-05. Šis fails dokumentē saskaņotās prasības; tas **nav** apliecinājums, ka T01–T17 tehniskie labojumi jau veikti. Pilnā specifikācija ar 1.0 tekstu un tehnisko pielikumu sagatavota atsevišķā Word dokumentā.

## Apstiprinātie grozījumi

- G01: C03 primārā, C04 sekundārā, C05 ikonu, C06 izvēles, C17 destruktīvā darbība — klasifikācija pēc nozīmes.
- G02: semantiskās pogu krāsas un visi stāvokļi abos režīmos; C06 izvēle izmanto `--ds-selected-bg` / `--ds-selected-text`, nevis C03 lomu.
- G03: kopīgs mobilo dienu navigācijas pogu izkārtojums bez nogriezta teksta.
- G04: C18 izvēršamo pogu vertikālā atstarpe **8 px**.
- G05: meklēšanas rezultātu, ieteikumu un sekundāro darbību tēmas tokeni.
- G06: `Dzēst manus datus` kā C17 destruktīvā darbība.
- G07: JavaScript ģenerētajiem elementiem tās pašas komponentu lomas un tokeni.
- G08: C01–C18 pārbaude abos režīmos un iPhone, tostarp computed styles.
- G09: C16 šodienas datuma **46 × 46 px**, **1 px** noapaļota apmale ar `--ds-calendar-today-border`; izvēlētajam datumam prioritāte, `--ds-selected-bg` / `--ds-selected-text`.
- G10: vārdu izcēlumiem, rezultātu etiķetēm un ieteikumiem semantiskas tēmas virsmas; nav fiksētu pelēku/zilganzaļu fonu.
- G11: C05 dzēšanas un rediģēšanas ikonu fona, teksta, apmales un stāvokļu lomas.
- G12: izvērstās hamburgera izvēlnes virsma, teksts un apmale no tēmas tokeniem.

## Saglabājamie etaloni

- V01 17%, V02 68%, V03 84%, V04 91%, V05 93–95% — alfa attiecas tikai uz virsmu.
- D3 „Rīta rasa” ir vizuālais etalons; esošās K1, Z3, D3, S1 tēmas netiek mainītas bez saskaņojuma.
- Nav patvaļīgu jaunu HEX krāsu vai tēmas CSS izņēmumu.

## Atvērtie tehniskie darbi

T01–T17: C03/C04/C06/C17 krāsu audits, C06 stāvokļi, laika izvēlne, sekundārās darbības, mobilā navigācija, C18 atstarpe, C17, JS elementi, virsmu alfa, C01–C18 iPhone testi, C16 šodienas apmale un datumu stāvokļi, vārdu izcēlumi, ikonu foni, hamburgera izvēlne, ieteikumi, C03 konsekvence.

Konstatējumi N01–N14 ir saskaņoti; N14 daļēji pārklājas ar N07. Šajā dokumentēšanas posmā netiek mainīta aplikācijas loģika, produkcija, TEST vai push abonementi.
