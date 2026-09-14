# Simulátor úhradové vyhlášky 2027

Webová aplikace pro simulativní průchod výpočty návrhu vyhlášky o stanovení hodnot bodu, výše úhrad hrazených služeb a regulačních omezení pro rok 2027. Bez backendu – vše se počítá v prohlížeči, data zůstávají v `localStorage`.

## Co umí

### Akutní lůžková péče (příloha č. 1, část A)

| Modul | Vyhláška | Obsah |
|---|---|---|
| Paušální úhrada (A, D) | bod 3 | IZS, koridor ZS_min/ZS_max, PU_2025,A, IPU, redukce casemixu za překlady, tolerance poklesu, I_ZP, ÚHR_PU |
| Vyčleněná úhrada (C, E) | bod 4 | max(JPL; DRG·NM_CE)·CZS·KC po skupinách, stupně NM_CE, BON_mRS-90 |
| Případový paušál (B, F, G, H) | bod 5 | max(JPL; DRG·NM_PP), dětská onkologie, psychiatrie (redukce LOS, K_DZ vč. K_TransNLP) |
| Poskytovatelé pod 50 případů | bod 6 | ZS_pod50 = CZS·NM_PP |

### Další úhrady nemocnic

| Modul | Vyhláška | Obsah |
|---|---|---|
| Urgentní příjem, LPS, ERN a paušály | body 8–9 | paušál UP I.–III. typu, limit výkonové úhrady UP, krácení při výpadku provozu, příjem od ZZS (09564), LPS, CKP, ERN (za síť + za pojištěnce), paliativní týmy, centrum provázení, výkony 51887 / 78890 |
| Následná lůžková péče | část B | paušální sazba za OD × ZKN × KN (personální kritérium, akreditace, paliativní lékař, geriatr, děti), BON_Geri, transformační plán, mimořádně nákladní pojištěnci, U572, výkonová část podle OD |
| Jednodenní péče | část C | Σ pevných úhrad za výkon − extramurální péče |
| Ambulantní složka nemocnic | body 7.15–7.20 | Úhr_amb_ref (narovnání), KN, I_zp_amb, IZ_GAUP, strop hodnotou péče |
| Centrové léky | příl. 15 | 17 skupin s INU/ICS, min{ref·INU·ICS; skut.·ICS}·IZP_CL |
| Regulace nemocnic | část D | snížení casemixu po revizi (jednotlivé případy ×2, vzorek 20 %/80 %), odstupňovaná regulace léčiv a vyžádané péče ambulancí |

### Primární péče

| Modul | Vyhláška | Obsah |
|---|---|---|
| Praktičtí lékaři (001, 002) | příl. 2 | kapitace podle věkových indexů a rozsahu hodin, bonifikace (vzdělávání, prevence, akreditace), HB výkonů, epizody péče, POCUS, týmová praxe, sestra v ordinaci / terénní sestra, regulace 120 % / 115 % |
| Gynekologie (603, 604) | příl. 4 | měsíční agregovaná sazba s bonifikacemi, trimestrální úhrady těhotenství (koef. UZ / genetika), léčba neplodnosti, epizody péče, neregistrované pojištěnky, regulace |

### Ambulantní segmenty

| Modul | Vyhláška | Obsah |
|---|---|---|
| Ambulantní specialisté | příl. 3 | HB 0,98 + bonifikace, KN, maximum (1,06 + KN)·POP·PURO_O + max[…], min. HB 0,90, výjimka do 100 UP (n/30), regulace ZULP / léčiva / vyžádaná péče |
| Fyzioterapie (902) | příl. 7 | HB 0,73 + bonifikace, maximum PURO s min. HB 0,60, péče vybraných diagnóz mimo limit, bonus za včasné zahájení 400–800 Kč |
| Domácí a paliativní péče | příl. 6 | 925/916 s maximem PURO, 926 s limitem dnů (30 / 180) a HB 1,23, odbornost 913 s růstem PMUP 5 % |
| Laboratoře a radiodiagnostika | příl. 5 | HBred = FS + (HB − FS)·min{1; KN·(PB_ref/UOP_ref)/(PB_ho/UOP_ho)} po skupinách RDG, laboratoře a genetika (816) s maximem PURO |
| Dialýza | příl. 8 | HB 1,18 (18530/18550 0,92), kvalitativní bonifikace, domácí dialýza ≥ 6 %, BON_TR = N_min + S·(N_max − N_min), signální výkony čekací listiny, regulace |

### Nástroje

| Modul | Obsah |
|---|---|
| Přehled | souhrn všech segmentů (nemocnice, primární péče, ambulantní segmenty) s odkazy do modulů |
| Indexy ARCTG | průběh I_ZP, I_zp_amb, IZP_CL; body odlepení, sklon, stropy; modelace konstant |
| Parametry vyhlášky | všechny číselné konstanty editovatelné (CZS, růsty, tolerance, NM, X, KN, K_DZ, INU/ICS, paušály UP, ERN, následná péče, regulace, PURO segmenty, kapitace, gynekologie, dialýza, laboratoře) |
| Scénáře a porovnání | uložení, načtení, export/import JSON, porovnání dvou scénářů po všech segmentech |

Každý modul zobrazuje **krokový průchod výpočtem**: symbol proměnné podle vyhlášky, obecný vzorec, dosazení konkrétních hodnot a výsledek; kroky, kde se uplatnilo krácení nebo strop, jsou zvýrazněny. Grafy citlivosti ukazují závislost úhrady na změně produkce (resp. LOS, růstu unikátních pojištěnců, K_TR, dnů do zahájení péče).

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
  urgent.ts      urgentní příjem, LPS, ZZS, ERN a ostatní paušály nemocnic
  aftercare.ts   následná lůžková péče
  oneDay.ts      jednodenní péče
  ambulance.ts   ambulantní složka nemocnic
  centreDrugs.ts centrové léky
  hospitalRegulation.ts  revize případů a regulace ambulancí nemocnic
  regulation.ts  společná odstupňovaná regulace léčiv / ZULP / vyžádané péče
  puro.ts        společný mechanismus maxima úhrady (PURO_O, POPzpo, UHRMh)
  gp.ts          praktičtí lékaři
  gyn.ts         gynekologie
  specialists.ts ambulantní specialisté
  physio.ts      fyzioterapie 902
  homecare.ts    domácí péče 925/916, mobilní paliativní péče 926, odbornost 913
  labs.ts        laboratoře, genetika a radiodiagnostika
  dialysis.ts    dialyzační péče
  all.ts         přepočet všech modulů pro přehled a porovnání scénářů
  scenario.ts    typ scénáře, výchozí modelová data, normalizace při importu
  model.test.ts, segments.test.ts  testy (spojitost indexů, koridor, redukce, stropy, regulace, PURO…)
src/pages/       stránky modulů
src/components/  formulářové prvky, krokový průchod, grafy (recharts)
src/state/       kontext scénáře + localStorage
```

## Zjednodušení modelu

- Součty Σ_i Σ_j max(JPL_ij; DRG_ij·NM) se zadávají po skupinách (řádcích) v jednotkách casemixu; JPL ocenění zadejte přepočtené na CM (Kč / CZS).
- Hodnota ambulantní péče se zadává jako Σ body × HB_2027 + korunové položky; bonifikace jako součet koeficientů (BON = 1 + součet).
- Ambulantní segmenty jsou modelovány za jednu odbornost jednoho poskytovatele; vyhláška počítá maxima a regulace za každou odbornost a zdravotní pojišťovnu zvlášť.
- Regulační omezení se zadávají jako průměrná úhrada na unikátního pojištěnce v referenčním a hodnoceném období; celostátní průměry (praktici) se zadávají ručně.
- Výchozí scénář je ilustrační modelová nemocnice s přidruženými ambulantními odbornostmi, nikoli skutečný subjekt.

Aplikace není oficiálním nástrojem MZ ČR ani zdravotních pojišťoven. Vychází z návrhu vyhlášky a důvodové zprávy; detailní rozbor vzorců je v `../analyza_vzorcu_uhradova_vyhlaska_2027.md`.
