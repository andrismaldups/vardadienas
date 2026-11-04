# Dizaina sistēma 1.1 — ieviešanas darba zars

Bāze: `design-system-v1`. Šis zars ir izolēts no produkcijas, TEST un esošajām K1/Z3/D3/S1/J1-E tēmām.

## Galvenais arhitektūras noteikums
Jauna tēma definē tikai dizaina tokenus, pamatfonu un dekoratīvo slāni. Komponentu CSS ir kopīgs visām tēmām; jaunas tēmas ieviešana nedrīkst prasīt atsevišķus komponentu selektoru labojumus.

## Obligātie audita virzieni
- C01–C18: katram komponentam kartēt reālos DOM selektorus un visus vizuālos stāvokļus.
- Krāsas: virsma, teksts, apmale, fokuss, atlasījums, neaktīvs stāvoklis, kļūda, brīdinājums, destruktīva darbība, sekundārā darbība.
- Modālie logi: fona necaurspīdīgums, pārklājums, slāņu secība.
- Gaišais/tumšais režīms: pilna tokenu definīcija abos.
- Pārbaudes galerija: katrs C01–C18 komponents un stāvoklis.
- Validācija: trūkstoši tokeni un aizliegtas fiksētas krāsas komponentu līmenī ir kļūdas.
- Atpakaļsavietojamība: vecās tēmas paliek neskartas līdz atsevišķai migrācijai.

## Pieņemšanas kritērijs
Jauna dizaina ieviešanai pietiek ar jaunas tēmas tokenu, pamatfona un dekoratīvā slāņa deklarācijām; visi komponenti ir korekti abos režīmos bez individuāliem labojumiem.

Statuss: izstrādes darba zars izveidots; tehniskā migrācija vēl nav pabeigta.
