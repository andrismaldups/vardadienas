# VD Design — esošās Cloudflare Pages vides izmantošana

**Spēkā esošais lēmums (2026-11-08):** jaunu Cloudflare Pages projektu, GitHub repozitoriju vai iPhone PWA instalāciju **neveidot**. Jaunās dizaina sistēmas un jauno dizaina variantu izstrāde turpinās **esošajā VD Design** vidē.

## Trīs aplikāciju robežas
- **Vardadienas** — produkcija; neaiztikt.
- **VardadienasT** — iepriekšējā TEST vide; neaiztikt.
- **VD Design** — vienīgā jaunās dizaina sistēmas izstrādes un vizuālās pārbaudes PWA.

## Esošā GitHub struktūra
- Repozitorijs: `andrismaldups/vardadienas`.
- Izstrādes zars: `design-system-clean-v1-1`.
- Reālās VD Design aplikācijas ievade: repozitorija saknes `index.html`.
- Komponentu demonstrācija: `clean-ds-1.1/gallery.html`.
- `clean-ds-1.1/index.html` tikai pāradresē uz galeriju un **nav** pilnā VD Design aplikācija.
- Komponentu CSS: `clean-ds-1.1/components.css`.
- D3 tokeni: `clean-ds-1.1/d3-theme.css`.
- Reālo skatu opt-in integrācija: `clean-ds-1.1/app-integration.css`.
- Dizaina ieslēgšana: `html[data-design="ds11"]`.
- CI: `.github/workflows/clean-ds-1-1.yml`.

## Cloudflare konfigurācijas drošības pārbaude
1. Atvērt **esošā VD Design** Pages projekta iestatījumus, nevis izveidot jaunu projektu.
2. Pārbaudīt tā sasaisti ar zaru `design-system-clean-v1-1` un publicēšanas direktoriju. Ja publicēšanas direktorija ir `clean-ds-1.1`, tās sakne atver tikai galeriju, nevis pilno aplikāciju.
3. Pirms jebkādas publicēšanas iestatījumu maiņas salīdzināt faktiski strādājošās VD Design PWA URL, manifest, aktīvu ceļus un Service Worker tvērumu. **Nemainīt konfigurāciju tikai uz dokumentācijas pamata.**
4. Nekopēt produkcijas vai VardadienasT Worker, push abonementus, API noslēpumus vai lietotāja datus.
5. Pēc koda izmaiņām pārbaudīt GitHub Actions un tad to pašu **esošo** VD Design PWA iPhone, neinstalējot ceturto aplikāciju.

## Pašreizējais pārbaudes statuss
GitHub kodā ir reālās aplikācijas `ds11` pārslēgšana, izolācijas pazīme `DESIGN_TEST_ISOLATED` un Playwright testi, kuri pārbauda pilno aplikāciju un tēmu pārslēgšanu. GitHub Actions rezultātu pārbauda pēc konkrētā publicējamā commit. Tas **neapliecina**, kāda tieši Cloudflare publicēšanas direktorija pašlaik ir iestatīta vai ka pēdējā izmaiņa jau ir redzama iPhone: šie fakti jāpārbauda pašā esošajā Pages projektā un PWA.

**Iepriekšējā instrukcija veidot jaunu atsevišķu Pages projektu ir atsaukta.**
