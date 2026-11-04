# DS 1.1 — reālās aplikācijas CSS atbilstības audits (1. posms)

Avots: `index.html` no `design-system-v1-1` zara (pārmantots no `design-system-v1`). Pārbaudīta iegultā CSS sadaļa līdz pirmajam `</style>`.

## Konstatējums
Pirmajā statiskajā izlasē identificēti **377 CSS noteikumu bloki**, no kuriem **192 satur tiešas HEX/RGB/RGBA krāsu vērtības**. Tas ir aptuvens **statiskās inventarizācijas** rādītājs, nevis 192 kļūdas: tajā ietilpst arī vēsturiskās tēmas, apzināti dekoratīvie slāņi un dublēti noteikumi. Šis skaits nedrīkst kalpot par automātisku migrācijas mērķi.

## C01–C18: reālās aplikācijas selektoru kartējums (sākotnējs)
| Komponents | Faktiskie piemēri `index.html` | Krāsu lomas, kas jāpārbauda |
|---|---|---|
| C01 Virsmas | `:root`, `.card`, `.tomorrow`, `.interesting`, `.latvia-today` | page, surface, surface-alt, text, border, decoration |
| C02 Pogas | `.btn`, `.primary`, `.back-btn`, `.greeting-options button` | primary/on-primary, secondary/on-secondary, disabled, selected |
| C03 Ikonu pogas | `.menu-btn`, `.greeting-entry-arrow`, `.birthday-chevron` | text, icon, hover, focus, disabled |
| C04 Ievadlauki | `input`, `.date-suggestions button`, `.settings-card input[type=time]` | surface-raised, text, placeholder, caret, border, focus |
| C05 Teksta redaktors | `.greeting-form textarea`, `.greeting-result-text` | surface-raised, text, focus, caret, disabled |
| C06 Izvēles | `.greeting-options button.active`, `.favorites-sort button.active`, `.birthday-sort button.active` | selected/on-selected, unselected, focus |
| C07 Saites | `.name-link`, `.birthday-edit-btn` | link, link-hover, focus |
| C08 Saraksti | `.birthday-saved-row`, `.favorite-add-selected button`, `.remove-favorite` | surface-alt, border, danger, muted |
| C09 Akordeons | `.about-row`, `.about-content` | surface-alt, border, icon, expanded |
| C10 Statuss | `.birthday-feedback`, `.greeting-validation`, `.push-active-status` | success, error, warning, info, disabled |
| C11 Uznirstošs panelis | `.date-suggestions` | surface-raised, border, shadow, selected |
| C12 Navigācija | `.settings-back-bar`, `.back-btn` | surface, border, secondary, sticky |
| C13 Kalendārs | `.week div`, `.day.sel`, `.day.today` | text-muted, selected/on-selected, today, disabled |
| C14 Slēdži | `.switch-slider`, `.switch input:checked+.switch-slider`, `.settings-card input[type=checkbox]` | toggle-track, toggle-thumb, selected, disabled |
| C15 Cilnes / kārtošana | `.favorites-sort`, `.birthday-sort` | tab-bg, tab-active, tab-text, border |
| C16 Etiķetes | `.tag`, `.extra`, `.extra-title` | badge-bg, badge-text, border, muted |
| C17 Emoji | `.greeting-emoji-panel`, `.greeting-emoji-close`, `.greeting-emoji-grid button` | popup, overlay, icon, tile-bg, tile-selected |
| C18 Modālie logi | `.greeting-emoji-panel` (pārklājuma uzvedība jāpārbauda DOM), citas dialogu struktūras | overlay, surface-raised, border, shadow, z-index |

## Konkrēti neatrisinātie jautājumi
1. **Krāsu semantika:** DS 1.1 galerijas 28 tokeni aptver pamatu, bet vēl trūkst specializētu lomu: `--link`, `--link-hover`, `--icon`, `--today-ring`, `--toggle-track`, `--toggle-thumb`, `--badge-bg`, `--badge-text`, `--tab-bg`, `--tab-active`, `--emoji-tile-bg`, `--popup-shadow`. Šīs lomas jāiekļauj nākamajā validācijas iterācijā.
2. **Stāvokļi:** galerija pārbauda `focus-visible`, atlasījumu un disabled tikai daļēji. Jāpārbauda hover, active, expanded, invalid, read-only un mobilā iOS fokusa/klaviatūras uzvedība.
3. **Vizuālā un funkcionālā nošķiršana:** nepareizi būtu vienkārši pārrakstīt visu `index.html` CSS. Sākumā jāizveido adapteris, kas kartē reālās aplikācijas selektorus uz DS tokeniem.
4. **Savietojamība:** adapteris sākotnēji jāaktivizē tikai izolētā 1.1 pārbaudes vidē, nevis esošajās K1/Z3/D3/S1/J1-E tēmās.
5. **Pārbaudes rīks:** galerijas pašreizējā validācija pārbauda tikai tokenu *esamību*. Tā vēl nepārbauda kontrastu, CSS specifiskuma konfliktus, aizliegtas fiksētās krāsas vai faktiskos DOM komponentus. Tātad galerijas „✓” nav apliecinājums pilnai atbilstībai.

## Nākamā tehniskā darbība
Paplašināt tokenu līgumu un validāciju, izveidot selektoru adapteri, pēc tam pieslēgt adapteri **atsevišķai reālās aplikācijas pārbaudes kopijai**. Tikai pēc tās iPhone testiem lemt par integrāciju.
