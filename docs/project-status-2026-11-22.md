# Vārdadienas — saskaņotais stāvoklis 22.11.2026.

Šis reģistrs papildina sākotnējo V1.0 specifikāciju ar vēlāk pieņemtajiem lēmumiem. Atliktās vai aizstātas prasības nav uzskatāmas par nepabeigtām funkcijām.

## Apstiprinātie lēmumi

- Pilna vārda meklēšana sākuma skatā; četru cilņu izkārtojums netiek ieviests.
- Apsveikumi tiek veidoti lokāli un darbojas bez interneta; papildu norāžu lauks izņemts.
- Vārdu izcelsme un vēsture atlikta.
- “Interesanti”: tikai dienu nosaukumi; bez izvērstiem paskaidrojumiem un avotu saitēm. Lietotājs atkārtoti apstiprināja 22.11.2026.
- Dzimšanas dienas un to atgādinājumi ir saskaņots papildinājums.
- Izplatīšana: vispirms iPhone lietotne App Store, vēlāk Android versija Google Play. Sākotnējā maksas PWA pārdošanas iecere aizstāta.
- Pārdevējs būs uzņēmums; lietotājs, visticamāk, dibinās jaunu SIA.
- Cena: 4,99 EUR par trim gadiem (aizstāj iepriekšējos 2,99 EUR), Push iekļauts; automātiskas abonēšanas nav, pagarināšana ir brīvprātīga.
- Pēc termiņa bez pagarināšanas pamatfunkcijas un lokāla apsveikumu veidošana/dalīšanās saglabājas; Push pārtrauc. Turpmāka uzturēšana un saderība pēc termiņa netiek garantēta. Datu eksports/imports nodrošina pārnešanu.

## Pabeigtais un pārbaudītais

- Datu dzēšanas labojums; lietotāja iPhone pārbaude apstiprināta.
- Apsveikumu attiecību filtri, frāžu saderība, uzrunas galotnes, rediģēšana, emoji, kopēšana, dalīšanās un bezsaistes darbība.
- Apsveikumu noteikumi un bibliotēkas aprakstīti atsevišķā Word dokumentā v1.1 (22.11.2026.).
- JSON eksports/imports: iPhone, bezsaistes atjaunošana, dublikātu izlaišana, pārnešana uz Mac, iestatījumu pārņemšana. Lietotājs apstiprināja 7 vārdu un 5 dzimšanas dienu saglabāšanos.
- Atkārtota tiešsaistes importa atgādinājumu iestatījumu servera apstiprinājums redzams lietotāja ekrānattēlā. Tas nav atsevišķs visu servera ierakstu audits.
- Atjauninājums 20: septiņas automatizētas service worker mehānisma pārbaudes; lietotājs apstiprināja jaunās versijas ielādi, datu/iestatījumu saglabāšanos un bezsaistes darbību.
- “Interesanti” koda pārbaude: 471 ieraksts 336 fiksētos datumos un 40 papildu nosaukumu noteikumi (26 n-tās nedēļas dienas, 6 pēdējās nedēļas dienas, 2 gada dienas, 4 citi aprēķini un 2 gada datumu tabulas). Kopā 511 bibliotēkas ieraksti/noteikumi; tas nenozīmē 511 parādīšanās katrā gadā. Renderēšana izvada tikai ekranētus nosaukumus ar rindu pārtraukumiem. Nav saišu vai izvērstu paskaidrojumu. Satura faktu pareizība šajā pārbaudē nav atkārtoti auditēta.

## Nākamais darba posms — izplatīšanas gatavība

Pašreiz pārbaudītajā main zarā nav pirkuma, licences termiņa vai brīvprātīgas pagarināšanas klienta saskarnes. Repo nav Cloudflare Worker avota vai datubāzes migrāciju; tādēļ servera licences kontroles esamību no šī repo nevar secināt.

1. Pārbaudīt aktuālo servera kodu un datu struktūru pret saskaņoto trīs gadu modeli.
2. Fiksēt konkrētas neieviestās daļas: pirkuma apstiprināšana, termiņš, Push tiesības, termiņa beigas un brīvprātīga pagarināšana.
3. Sagatavot iOS projektu, Apple veikala pirkumus un publicēšanas procesu. Skatīt app-store-plan.md; pirkuma plūsma (maksas lejupielāde vai bezmaksas lejupielāde ar maksas aktivizēšanu) vēl nav izvēlēta. Stripe vairs netiek plānots sākotnējai App Store plūsmai.

## Atskaites avoti

- Lietotāja lēmumi un pārbaudes projekta sarunā; atjauninājuma 20 pārbaude un “Interesanti” tvērums apstiprināts 22.11.2026.
- index.html pārbaudes objekts: dae79632602ffcfef807285554d8cd849463861a.
- Atjauninājuma 20 komits: 9d84918f79c2b1af08469a221782dc2934efd510.
