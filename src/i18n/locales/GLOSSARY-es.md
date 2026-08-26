# Spanish glossary — Anachrony

Terminology for `es.json`, so the app names a component the same way the box in the
player's hands does.

## Where these come from

**Official** terms are transcribed from the **Spanish base-game rulebook**
(`Anachrony-rulebook_Spanish.pdf`, "REGLAMENTO", 36 pp., in the OneDrive reference folder
under `languages/`). Page numbers below are that PDF's.

**Inferred** terms are our own, built from the patterns the official translation uses —
there is **no Spanish edition of the "Chronobot & Chronossus Solo Opponents" rulebook**, so
every solo-only term is a guess. They are marked ⚠. If an official Spanish solo edition
ever appears, those are the entries to revisit first.

> **This is why `es.json` ships `officialRulebook: false`.** That flag asserts the verbatim
> 📖 rule text was transcribed from the official edition *in that language*. The solo rules
> have no Spanish edition, so the rule boxes stay English and the app says so. The
> terminology below is still used everywhere else.

## Official — base game

| English | Spanish | Page |
|---|---|---|
| Exosuit | **Exotraje** | 2, 3, 6, 7, 9, 10 |
| Worker | **Trabajador** | 2, 5, 6, 7 |
| Genius / Engineer | **Genio** / **Ingeniero** | 2, 11, 13 |
| Scientist / Administrator | **Científico** / **Administrador** | 2, 11, 13 |
| Titanium / Uranium / Gold | **Titanio** / **Uranio** / **Oro** | 2, 8, 14, 15 |
| Neutronium / Water | **Neutronium** / **Agua** | 2, 4, 8 / 2, 5, 6 |
| Victory Points (VP) | **Puntos de Victoria (PV)** | 2, 5, 7 |
| Breakthrough | **Descubrimiento** | 3, 5, 6, 7 |
| Superproject | **Superproyecto** | 3, 5, 7, 10 |
| Factory / Lab | **Fábrica** / **Laboratorio** | 3, 5, 27 |
| Power Plant / Life Support | **Central Eléctrica** / **Soporte Vital** | 16, 31 / 3, 5, 27 |
| Anomaly | **Anomalía** | 3, 5, 7, 8 |
| Paradox | **Paradoja** | 3, 5, 7, 8 |
| Time Travel | **Viaje Temporal** | 2, 6, 7, 8 |
| Energy Core | **Núcleo de Energía** | 2, 9, 15, 27 |
| Timeline tile | **Loseta de Línea Temporal** | 5, 8, 9, 10 |
| Impact tile | **Loseta de Impacto** | 3, 22 |
| **Warp tile** | **Loseta de Disformidad** | 372, 475, 951¹ |
| World Council | **Consejo Mundial** | 4, 6, 11, 12 |
| Evacuation | **Evacuación** | 3, 5, 6, 15 |
| Focus | **Foco** | — |
| First Player | **Primer Jugador** | 23, 24, 26 |
| Action space | **Espacio de Acción** | 10, 11, 12, 13 |
| New Earth | **Nueva Tierra** | — |

¹ line numbers in the extracted text, not pages.

### Phases — note two are not what you would guess

| English | Spanish | Page |
|---|---|---|
| Preparation | **Fase de Preparación** | 7, 21, 22 |
| Paradox | **Fase de Paradojas** | 7, 8, 17 |
| **Power Up** | **Fase de Activación** | 7, 9, 23 |
| **Warp** | **Fase de Disformidad** | 7, 9, 23 |
| Action Rounds | **Fase de Rondas de Acción** | 7, 10, 16 |
| Clean Up | **Fase de Limpieza** | 7, 10, 11 |

**Power Up → Activación** and **Warp → Disformidad** are the two a translator working
without the book would almost certainly get wrong.

### Actions

| English | Spanish | Note |
|---|---|---|
| Construct | **Construir** | Capital Action space, p. 768¹ |
| Recruit | **Reclutar** | the space is **Reclutamiento** |
| Research | **Investigar** | the space is **Investigación** |
| Mine Resource | **Extraer Recurso** | the space is **Mina** |

## ⚠ Inferred — solo-only, no official Spanish source

Each is reasoned from an official pattern, not invented freely.

| English | Spanish | Why |
|---|---|---|
| Chronobot | ⚠ **Cronobot** | Spanish drops the *h* in *chrono-* (cronómetro, cronología) |
| Chronossus | ⚠ **Cronossus** | same |
| Command token | ⚠ **Ficha de Mando** | official uses **Ficha de …** for tokens, **Marcador de …** for markers |
| AI die | ⚠ **Dado de IA** | official **Dado de Paradojas**, **Dados de Investigación** |
| Flux Core | ⚠ **Núcleo de Flujo** | directly parallel to official **Núcleo de Energía** |
| Blink | ⚠ **Parpadeo** | literal; no official source |
| Autoleap | ⚠ **Autosalto** | official favours compound nouns |
| Solo board | ⚠ **Tablero Solitario** | official **Tablero central**, **Tablero de Jugador** |
| Failed Action | ⚠ **Acción Fallida** | the term does not appear in the base rulebook |
| Collapsing Capital tile | ⚠ **Loseta de Capital en Colapso** | **Capital** is official |
| Guardians of the Council | ⚠ **Guardianes del Consejo** | **Consejo Mundial** is official |
| Pioneers of New Earth | ⚠ **Pioneros de Nueva Tierra** | **Nueva Tierra** is official (p. 214¹) |
| Fractures of Time | ⚠ **Fracturas del Tiempo** | — |
| Quantum Loops | ⚠ **Bucles Cuánticos** | — |
| Alternate Timelines | ⚠ **Líneas Temporales Alternativas** | **Línea Temporal** is official |
| Variable Anomalies | ⚠ **Anomalías Variables** | **Anomalía** is official |
| Hypersync | ⚠ **Hipersincronía** | — |

## Adding to `es.json`

See `README.md` for the mechanics. `es.json` is **partial by design** — it covers the
terminology families, the Chronobot's instructions and the main chrome. Everything else
falls back to English **per key**, which is a valid, useful file.
