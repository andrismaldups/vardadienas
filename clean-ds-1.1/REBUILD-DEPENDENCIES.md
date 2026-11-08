# VD Design — `index.html` atkarību karte (1. kārta)

**Avots:** `index.html` zarā `design-system-clean-v1-1`, statiskais teksta audits. Atsevišķi veidotās atslēgas un dinamiski URL var nebūt pilnīgi ietverti; šī nav izpildes izsekošana.

## Glabāšanas atslēgas, kuras nedrīkst mainīt bez migrācijas

`birthdaySortMode`, `birthdays`, `vardadienas_test_installation_v1`, `favorites`, `remindersEnabled`, `reminderTime`, `reminderEvening`, `reminderMorning`, `reminderEveningTime`, `reminderMorningTime`, `reminderTarget`, `reminderBirthdays`, `testPushSubscriptionId`.

Papildus agrīnajā tēmas skriptā izmantotas `designStyle` un `appearanceMode`. Šīs atslēgas nav iekļautas iepriekšējā statiskajā sarakstā, jo tiek lietotas arī ar mainīgo, ne tikai ar teksta literāli.

## Funkciju grupas esošajā galvenajā skriptā

| Atbildība | Esošo funkciju piemēri | Migrācijas risks |
|---|---|---|
| Apsveikumu ģenerēšana | `generateSincereGreeting`, `generateShortGreeting`, `generateFunGreeting`, `generateFormalGreeting`, `copyGreetingText` | Tekstu bibliotēkas un stāvokļa koplietošana |
| Apsveikumu UI | `resizeGreetingResult`, `positionGreetingEmojiPanel`, `setGreetingEmojiOpen` | DOM izvietojums, iOS tastatūra |
| Dzimšanas dienas | `renderBirthdays`, `renderBirthdayHome`, `openBirthdayEdit`, `deleteBirthday` | Lokālie dati un servera rindas |
| Mani vārdi | `renderFavorites`, `addFavorite`, `removeFavorite`, `loadTestFavorites` | Lokālais un servera stāvoklis |
| Sinhronizācijas rindas | `readBirthdayQueue`, `flushBirthdayQueue`, `readTestFavoritesQueue`, `flushTestFavoritesQueue` | Offline, atkārtošanas semantika |
| Kalendārs un meklēšana | `renderSelected`, `renderCalendar`, `findName`, `findDate`, `parseDate` | Datumu un vārdu dati |
| Sākumskats | `renderTomorrow`, `renderLatviaToday`, `renderInteresting` | Datumu atvasinājumi |
| Navigācija | `openNameDetail`, `closeSideMenu`, `toggleSideMenu` | Skatu redzamības stāvokļi |
| Atgādinājumi un push | `syncTestReminderSettings`, `queueTestReminderSync`, `saveSecureSubscription`, `refreshPushActivationAppearance` | **Augsts:** abonementu aizsardzība |
| Datu dzēšana | `readDeletionReceipt`, `deleteInstallationDataAfterConfirmation`, `deletionSyncBlocked` | **Kritisks:** nedrīkst testēt pret reāliem datiem |

## Kritiskā ielādes secība

1. Galvenie CSS un dizaina sistēmas CSS.
2. Agrīnais tēmas skripts, kas nolasa `designStyle` un `appearanceMode`.
3. **DESIGN TEST izolācijas skripts**, kas bloķē piekļuvi iepriekšējās TEST vides serverim.
4. DOM sākums un `ds-app` klase.
5. Esošais galvenais lietotnes skripts.
6. Service Worker reģistrācija.
7. Atgādinājumu laika izvēles UI.
8. **DESIGN TEST push bloķēšana**.

**Neatdalīt skriptus ar `async` vai `defer` mehāniski**, jo tas var mainīt drošības skriptu izpildes secību. Pārcelšanas laikā saglabāt sinhrono secību vai pierādīt ekvivalentu secību ar testiem.

## Pirms pirmās `index.html` pārveides

- Automatizēti pārbaudīt, ka DESIGN TEST izolācijas barjera ir aktivizēta pirms jebkura servera pieprasījuma.
- Pārbaudīt, ka push aktivizācijas UI paliek atspējots.
- Pārbaudīt, ka `designStyle=ds11` un `appearanceMode=light/dark` iedarbina pareizos CSS tokenus.
- Pārbaudīt personu un vārdu lokālo datu nolasīšanu bez to dzēšanas.
- Pārbaudīt sākumu, kalendāru, meklētājus, apsveikumus un iestatījumus mobile-WebKit.

**Nākamais solis:** pievienot šīs drošības pārbaudes esošajam Playwright komplektam, un tikai pēc tam mehāniski atdalīt pirmo mazo skriptu.
