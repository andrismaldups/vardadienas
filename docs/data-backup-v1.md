# Vārdadienu datu eksports un imports

Formāta versija 1. Ieviests 2026. gada 22. novembrī.

Sadaļā **Iestatījumi → Mani dati** lietotājs eksportē vai importē datu kopiju.
Eksports ir UTF-8 JSON fails ar paplašinājumu `.json`. Ierīcēs ar failu dalīšanās
atbalstu atveras sistēmas izvēlne, kur var izvēlēties **Saglabāt Failos**; pārējās
ierīcēs fails tiek nodots lejupielādei. Eksporta atcelšana nemaina datus.

## Pārnesamie dati

- Saglabātie vārdi kā tekstu saraksts.
- Dzimšanas dienas: pilns vārds, diena, mēnesis, dzimšanas gads vai `null`.
- Dizains un gaišais, tumšais vai automātiskais krāsu režīms.
- Dzimšanas dienu kārtošanas izvēle.
- Atgādinājumu laiki, iepriekšējās dienas un svētku dienas izvēle, visas vai tikai
  saglabātās vārdadienas un dzimšanas dienu atgādinājumu izvēle.

Netiek eksportēti instalācijas identifikatori, piekļuves tokeni, lokālie personu
ID, Push abonements, pārlūka paziņojumu atļauja vai galvenais atgādinājumu
ieslēgšanas slēdzis. Importējot pēdējie trīs paliek saņēmējierīces ziņā.

## Formāts

```json
{
  "format": "lv.vardadienas.backup",
  "version": 1,
  "exportedAt": "2026-11-22T08:00:00.000Z",
  "favorites": ["Andris", "Mārtiņš"],
  "birthdays": [
    {"name": "Aiga Riepa", "day": 29, "month": 2, "year": null}
  ],
  "settings": {
    "appearance": {"design": "sea", "mode": "auto"},
    "birthdaySort": "date",
    "reminders": {
      "previousDay": {"enabled": true, "time": "18:00"},
      "sameDay": {"enabled": true, "time": "07:00"},
      "nameDays": "favorites",
      "birthdays": true,
      "timeZone": "Europe/Riga"
    }
  }
}
```

`appearance.design`: `classic`, `gold`, `nature`, `sea`, `cherry`, `sun`.
`appearance.mode`: `auto`, `light`, `dark`.
`birthdaySort`: `alpha`, `date`. `nameDays`: `all`, `favorites`.
Laiks ir `HH:MM` (00:00–23:59); atļautas arī agrāk saglabātas minūšu vērtības,
piemēram, 20:05, lai kopija tās nezaudētu. Pašreiz atbalstītā laika josla ir
Europe/Riga, kas atbilst aplikācijas atgādinājumu serverim.

Formāts nav piesaistīts Apple ierīču datu struktūrām. Tāda paša formāta lasīšanu
un rakstīšanu var ieviest Android lietotnē; tas nav apgalvojums, ka atsevišķa
Android lietotne jau ir izveidota vai pārbaudīta.

## Importa darbība

1. Lietotājs izvēlas failu. Pirms jebkādām datu izmaiņām pārbauda tā saturu.
2. Priekšskatījumā rāda faila nosaukumu, eksporta datumu, sarakstu lielumus,
   pievienojamo un izlaisto ierakstu skaitu un iestatījumus.
3. Lietotājs var atcelt vai apstiprināt apvienošanu. Var noņemt atzīmi pie
   iestatījumu pārņemšanas, lai importētu tikai sarakstus.
4. Esošie ieraksti netiek dzēsti vai pārrakstīti. Jaunajiem dzimšanas dienu
   ierakstiem piešķir jaunus šīs instalācijas ID.
5. Atkārtoti importējot to pašu failu, ieraksti un sinhronizācijas darbības
   nedublējas. Vārdu salīdzināšanai lieto NFC, atstarpju sakārtošanu un mazo
   burtu formu; vārdadienu nosaukumus saskaņo ar lokālo kalendāru.
6. Dzimšanas dienu dublikāts ir vienāds normalizēts vārds, diena, mēnesis un
   gads. Ja vārds sakrīt, bet datums vai gads atšķiras, abus ierakstus saglabā.

Ja importējamais vārds nav šīs aplikācijas versijas vārdadienu kopumā, visu
importu noraida ar skaidrojumu. Ierakstus nedrīkst nemanāmi izlaist vai
izdomāt tiem svētku datumu. Nepazīstamu formāta versiju noraida. Nezināmus
papildu laukus ignorē, nepārnesot tos uz ierīces krātuvi vai nākamo eksportu.

## Pārbaudes un kļūdu apstrāde

Limits ir 5 MiB (saskarnē 5 MB), līdz 10 000 ierakstiem katrā sarakstā un
200 rakstzīmēm normalizētā vārdā. Diena un mēnesis ir veseli skaitļi, gads ir
vesels skaitlis 1–9999 vai `null`. 29. februāri bez gada atļauj; norādītam gadam
pārbauda garo gadu, arī gadsimtu izņēmumus. Nederīgs fails, neatbalstīta versija
vai atcelšana nemaina datus. Priekšskatījuma datiem izmanto `textContent`.

Sarakstus, izvēlētos iestatījumus un jaunās sinhronizācijas rindas saglabā vienā
žurnalētā darbībā. Pirms rakstīšanas saglabā maināmo atslēgu vecās vērtības.
Kļūmes gadījumā tās atjauno; ja pārlūkprogramma aizveras rakstīšanas vidū,
atjaunošanu izpilda nākamajā startā pirms aplikācija nolasa datus. Ja atjaunošanu
nevar pabeigt, servera sinhronizācija un jauns imports/eksports ir bloķēti.
Datu dzēšanas un paziņojumu aktivizēšanas laikā importu neveic.

Dzimšanas dienu un vārdu jaunās rindas saglabā arī bez interneta. Pēc savienojuma
atjaunošanas izmanto esošo šīs instalācijas sinhronizāciju. Importēto
atgādinājumu preferenču sinhronizācijai ir atsevišķa atliktā atzīme; atkārtojums
notiek pie savienojuma, fokusa vai redzamības atjaunošanas. Uz jaunas ierīces
vietējās preferences izmanto, kad lietotājs aktivizē tās paziņojumus. Globālo
ieslēgšanas slēdzi imports nepārslēdz.

## Pārbaudes izstrādātājam

```sh
node tests/data-backup.cjs
node tests/data-backup-ui.cjs
```

45 pamatpārbaudes aptver formātu, Unicode, robežvērtības, datumu pārbaudi,
dublikātus, atkārtotu importu, krātuves kļūmes un pārtrauktas darbības atjaunošanu.
14 saskarnes darbību pārbaudes izmanto izolētu DOM modeli, pārbauda
priekšskatījumu, apstiprināšanu, atcelšanu, eksportu, bezsaistes rindas un
paziņojumu stāvokļa saglabāšanu. Tās nav pilna īstas pārlūkprogrammas pārbaude.
Pēc publicēšanas vēl jāveic iPhone saglabāšanas un faila izvēles pārbaude.

## iPhone faila saglabāšanas precizējums

Eksporta faila dalīšanās izsaukumam nodod tikai `files: [file]`, bez `title`,
`text` vai `url`. Lietotāja pārbaudē iPhone saglabāja papildus nodoto virsrakstu
kā atsevišķu 23 baitu failu `text`, nevis JSON kopiju. Papildu virsraksts ir
noņemts. Eksporta statusā rāda īstā JSON faila nosaukumu un tā UTF-8 izmēru
baitos, lai tos varētu salīdzināt ar saglabāto failu. Pievienota regresijas
pārbaude, kas pārbauda tieši faila saturu un neļauj pievienot teksta laukus.
