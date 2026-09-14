# Simulátor úhradové vyhlášky 2027

Webová aplikace pro simulativní průchod výpočty návrhu vyhlášky o stanovení hodnot bodu, výše úhrad hrazených služeb a regulačních omezení pro rok 2027. Bez backendu – vše se počítá v prohlížeči, data zůstávají v `localStorage`.

## Co umí

| Modul | Vyhláška | Obsah |
|---|---|---|
| Paušální úhrada (A, D) | příl. 1, část A, bod 3 | IZS, koridor ZS_min/ZS_max, PU_2025,A, IPU, redukce casemixu za překlady, tolerance poklesu, I_ZP, ÚHR_PU |
| Vyčleněná úhrada (C, E) | bod 4 | max(JPL; DRG·NM_CE)·CZS·KC po skupinách, stupně NM_CE, BON_mRS-90 |
| Případový paušál (B, F, G, H) | bod 5 | max(JPL; DRG·NM_PP), dětská onkologie, psychiatrie (redukce LOS, K_DZ vč. K_TransNLP) |
| Poskytovatelé pod 50 případů | bod 6 | ZS_pod50 = CZS·NM_PP |
| Ambulantní složka nemocnic | body 7.15–7.20 | Úhr_amb_ref (narovnání), KN, I_zp_amb, IZ_GAUP, strop hodnotou péče |
| Centrové léky | příl. 15 | 17 skupin s INU/ICS, min{ref·INU·ICS; skut.·ICS}·IZP_CL |
| Indexy ARCTG | – | průběh I_ZP, I_zp_amb, IZP_CL; body odlepení, sklon, stropy; modelace konstant |
| Parametry vyhlášky | – | všechny číselné konstanty editovatelné (CZS, růsty, tolerance, NM, X, KN, K_DZ, INU/ICS) |
| Scénáře a porovnání | – | uložení, načtení, export/import JSON, porovnání dvou scénářů |

Každý modul zobrazuje **krokový průchod výpočtem**: symbol proměnné podle vyhlášky, obecný vzorec, dosazení konkrétních hodnot a výsledek; kroky, kde se uplatnilo krácení nebo strop, jsou zvýrazněny. Grafy citlivosti ukazují závislost úhrady na změně produkce (resp. LOS, růstu unikátních pojištěnců).

## Spuštění

```bash
cd simulator
npm install
npm run dev        # http://localhost:5173
npm test           # jednotkové testy výpočetního jádra (vitest)
npm run build      # statický build do dist/ (relativní base – lze nasadit kamkoli, např. GitHub Pages)
```

## Struktura

```
src/model/       výpočetní jádro bez závislosti na UI
  params.ts      výchozí parametry návrhu vyhlášky
  indexes.ts     ARCTG indexy a jejich vlastnosti
  acute.ts       akutní lůžková péče (PU, vyčleněná, případový paušál, K_DZ, pod50)
  ambulance.ts   ambulantní složka nemocnic
  centreDrugs.ts centrové léky
  scenario.ts    typ scénáře, výchozí modelová data, normalizace při importu
  model.test.ts  testy (spojitost indexů, koridor, redukce, stropy…)
src/pages/       stránky modulů
src/components/  formulářové prvky, krokový průchod, grafy (recharts)
src/state/       kontext scénáře + localStorage
```

## Zjednodušení modelu

- Součty Σ_i Σ_j max(JPL_ij; DRG_ij·NM) se zadávají po skupinách (řádcích) v jednotkách casemixu; JPL ocenění zadejte přepočtené na CM (Kč / CZS).
- Hodnota ambulantní péče se zadává jako Σ body × HB_2027 + korunové položky; bonifikace jako součet koeficientů (BON = 1 + součet).
- Výchozí scénář je ilustrační modelová nemocnice, nikoli skutečný subjekt.

Aplikace není oficiálním nástrojem MZ ČR ani zdravotních pojišťoven. Vychází z návrhu vyhlášky a důvodové zprávy; detailní rozbor vzorců je v `../analyza_vzorcu_uhradova_vyhlaska_2027.md`.
