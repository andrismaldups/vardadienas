# Neatkarīga Cloudflare Pages galerija — DS 1.1

**Drošības robeža:** šī ir tikai statiska C01–C18 komponentu demonstrācija. Tā nav esošā Vārdadienas TEST PWA. Nepievienot Worker, push abonementus, API noslēpumus vai produkcijas domēnu.

## Cloudflare Pages iestatījumi (Git integrācija)
1. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
2. Atlasīt GitHub repozitoriju `andrismaldups/vardadienas`.
3. Izveidot **jaunu, atsevišķu Pages projektu** (piemēram, `vardadienas-ds11-preview`). Nepārkonfigurēt `vardadienas-test`.
4. Production branch: `design-system-clean-v1-1`.
5. Framework preset: `None`; build command: **tukšs**; build output directory: `clean-ds-1.1`; root directory: repozitorija sakne (ja šāds iestatījums ir redzams).
6. Saglabāt un izvietot. Pārbaudīt projekta `*.pages.dev` adresi un `/gallery.html`.
7. Ja Cloudflare piedāvā piekļuves ierobežošanu, priekšskatījuma testēšanai to var ieslēgt; `noindex` nav piekļuves kontrole.

## Pieņemšanas pārbaude
- Saknes adrese atver galeriju.
- 18 C01–C18 kartītes redzamas.
- Gaišais/tumšais režīms pārslēdzas.
- Emoji panelis, izvēles pogas un apstiprināšanas dialogs darbojas.
- iPhone Safari nav horizontālas ritināšanas.
- Galerija neizmanto lietotāja datus, push abonementus un esošās PWA funkcijas.

## Svarīgi
Cloudflare Pages izvietošana **nav** veikta tikai ar šo failu izveidošanu. Publicēšanas rezultātu apstiprina tikai faktiskā Pages adrese un tās atvēršana.
