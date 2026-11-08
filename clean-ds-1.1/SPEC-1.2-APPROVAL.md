# Dizaina sistēmas specifikācija 1.2 — apstiprināšanas lēmums

**Datums:** 2026-11-08

**Lēmums:** lietotājs apstiprina atjaunoto specifikāciju 1.2 kā **jauna dizaina varianta izstrādes bāzes versiju**. Apstiprinātais artefakts ir Word redakcija ar ilustrācijām, C marķējumiem un tehnisko parametru matricu. Šis lēmums nav apliecinājums, ka katra ilustrācijas C norāde individuāli pārbaudīta.

## Saistošie principi

1. Izmantot kopīgos dizaina tokenus un komponentu noteikumus; konstatējot sistēmisku kļūdu, labot kopīgo noteikumu, nevis ieviest atsevišķus izņēmumus.
2. Jauno dizaina variantu vispirms izstrādāt un pārbaudīt izolētajā VD Design vidē; neizmainīt produkciju, esošo TEST, lietotāja datus vai push abonementus.
3. iPhone PWA ir primārais vizuālās un lietojamības pieņemšanas mērķis. Jāpārbauda gaišais un tumšais režīms, ievade, izvēlnes, apsveikumi, navigācija un kalendārs.
4. C atzīmes ilustrācijās un tehnisko parametru matrica ir pārskatīšanas pamats; to precīza atbilstība faktiskajiem elementiem ir **verifikācijas vārteja**, nevis jau izpildīts fakts.
5. C15 numerācijas savietojamība un V02–V05 alfa etalonu interpretācija jāatrisina pēc faktiskā koda un renderējuma. D3 jau apstiprināto izskatu nemainīt tikai skaitliskas vienādošanas dēļ.
6. Jaunā varianta ieviešana notiek secīgi: komponents → reālo skatu piesaiste → automatizētie testi → iPhone vizuālā pārbaude → precizējumi → atsevišķs lēmums par tālāku ieviešanu.

**Tvērums:** šis ir dokumentācijas apstiprināšanas lēmums, nevis atļauja migrēt uz produkciju vai veikt datu dzēšanas/push abonementu darbības.
