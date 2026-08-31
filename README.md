# TerraScope

**TerraScope** is a public-facing climate and transition intelligence website. It turns large international datasets into concise country profiles that help readers understand the links between emissions, energy systems, observed climate change, physical impacts, policy commitments, and future climate simulations.

The project is designed for a broad audience without sacrificing traceability: every published indicator is accompanied by its source, reference year, unit, definition, and methodological status.

## What the site does

TerraScope provides a country-level reading experience built around three levels of depth:

1. **Climate portrait** — a small set of headline indicators for a quick overview.
2. **Country profile** — emissions history, electricity generation mix, economic context, observed climate signals, impacts, climate policy, and links to current reporting.
3. **Verification layer** — sources, definitions, methodological notes, and direct links to the originating datasets.

Readers can also open an indicator ranking to place a country in a European context.

## Data principles

Scientific clarity is a core product requirement. TerraScope distinguishes four kinds of information:

| Label | Meaning |
| --- | --- |
| **Observed** | A value published by a statistical or scientific source, with a stated reference year. |
| **Calculated** | A transparent calculation derived from displayed series. |
| **Scenario / simulation** | An illustrative model result, never presented as an official national forecast. |
| **Policy target** | A legal or political commitment, separate from observations. |

The project avoids silently substituting missing values with zero. When a harmonised country value is not available, the interface states that the indicator is not published rather than inventing a figure.

### Common-year publication policy

All headline observations and every ranking are read from `data/annual-snapshot.json`. The current comparable reference year is **2024**. CO₂, population, GDP, electricity and derived indicators are joined by ISO3 code **and exact year** before publication. A metric cannot silently fall back to another year.

Scenarios and policy targets are deliberately outside this annual join: 2030, 2050 and 2100 describe future targets or conditional simulations, not 2024 observations.

## Main data sources

| Theme | Source | Use in TerraScope |
| --- | --- | --- |
| Territorial CO2 emissions | [Global Carbon Budget](https://globalcarbonbudget.org/) via the OWID Grapher distribution | Historical fossil and industrial territorial emissions. |
| Population and GDP | [World Bank WDI](https://data.worldbank.org/) | Same-year population and constant-2021 PPP GDP used for per-capita and intensity calculations. |
| Electricity production | [Ember](https://ember-energy.org/data/api/) yearly API when a server key is configured; [Eurostat](https://ec.europa.eu/eurostat/) `nrg_cb_pem` otherwise | Same-year electricity generation by source. Eurostat fallback requires all twelve monthly observations. |
| Observed climate | [Copernicus Climate Change Service](https://climate.copernicus.eu/) ERA5 / ERA5-Land | Area-weighted national temperature indicators and hot-day processing. |
| Climate simulations | [CMIP6](https://esgf-node.llnl.gov/projects/cmip6/) | Illustrative annual temperature anomalies under SSP2-4.5; clearly labelled as model simulations. |
| Wildfire impacts | [JRC Global Wildfire Information System](https://gwis.jrc.ec.europa.eu/apps/country.profile/downloads) / MCD64A1 | One satellite-derived annual burned-area method for every country. |
| Flood-risk context | [European Environment Agency](https://www.eea.europa.eu/) | Links and methodological context; no aggregated loss figure is shown as a flood-only observation without an appropriate hazard filter. |
| Policy | [UNFCCC](https://unfccc.int/) and European Union | NDC context, Paris Agreement and EU climate-law references. |
| News | [GDELT 2.0](https://www.gdeltproject.org/) | Country-specific climate, energy and economy news links. |

## Architecture

TerraScope is intentionally lightweight:

- Static HTML, CSS and browser JavaScript for the editorial interface.
- A Cloudflare Worker-compatible runtime built by `scripts/build.mjs`.
- Server-side APIs and an annual collection job that retrieve the selected source year without exposing credentials.
- A validated, versioned annual snapshot read by every headline card and ranking.
- Processed JSON assets for datasets that require reproducible pre-processing before publication.
- No user accounts, trackers, database, or private visitor data.

### Important files

```text
country-live.html          Country profile page shell
terrascope-runtime.js      Country profile rendering and data loading
ranking.html               European indicator rankings
ranking-runtime.js         Ranking data loading and sorting
sources.html               Sources and methodology page
api/                       Worker handlers for news and electricity data
data/                      Versioned, processed public data assets
scripts/build.mjs          Build script for static assets and Worker runtime
scripts/refresh-annual-snapshot.mjs  Same-year API collection and derivation
scripts/validate-annual-snapshot.mjs Blocking scientific and coverage checks
scripts/process_*.py       Reproducible data-processing utilities
.github/workflows/refresh-annual-data.yml  Annual cloud refresh
```

## Reproducible data processing

Some datasets need processing before they can be presented at country level.

- `scripts/process_era5_observed.py` processes ERA5 monthly data into area-weighted national temperature indicators.
- `scripts/fetch_era5_land_hot_days.py` requests ERA5-Land daily maximum temperature data from Copernicus CDS. It reads `COPERNICUS_CDS_API_KEY` from a local `.env` file only.
- `scripts/process_era5_land_hot_days.py` calculates the **area-weighted mean annual count of grid-cell days with daily maximum temperature >= 30 °C**. This is not a population-weighted or station-based count.
- `scripts/process_effis_burnt_area.py` is retained for historical comparison; the comparable snapshot now queries GWIS/MCD64A1 directly.

Raw downloads are deliberately excluded from Git. They can be large, may have source-specific licences, and are reproducible from their documented source and processing script.

## Annual automatic update

The scheduled workflow runs each 15 June. By default it tests the calendar year two years before the run: a 2026 run therefore evaluates 2024. This conservative delay prevents a partly published new year from entering some cards before the others.

The workflow:

1. selects one candidate reference year;
2. retrieves ERA5 monthly and ERA5-Land daily data in the GitHub Actions runner when the Copernicus secret is configured;
3. calls the Global Carbon Budget/OWID, World Bank, GWIS and Ember or Eurostat APIs;
4. derives per-capita and intensity values only from exact-year joins;
5. validates 27 country records, units, bounds, electricity totals and coverage;
6. builds the deployable site;
7. commits the generated JSON only when every core check passes.

The temporary NetCDF files live only on the runner and are discarded after the job. Contributors and site visitors do not download them.

To run the same process manually:

```bash
REFERENCE_YEAR=2024 npm run data:update
npm run build
```

## Climate simulations: an important caveat

The future-climate panel currently uses CMIP6 output from the **CNRM-ESM2-1** model under **SSP2-4.5**. Values are displayed as simulated annual temperature anomalies relative to the model's 1991–2020 baseline.

This is useful for illustrating the direction and scale of climate change, but it is **not** a local weather forecast, an official national projection, or a multi-model probabilistic estimate. A future release should add a multi-model ensemble and uncertainty ranges before using simulations for decision support.

## Running locally

Requirements: Node.js 18+.

```bash
npm run build
npx wrangler dev
```

The build creates:

- `public/` — static assets served by the site;
- `dist/public/` — deployment-ready static assets;
- `dist/server/index.js` — the Worker-compatible application entry point.

## Secrets and safety

Never commit API keys. Use a local `.env` file based on `.env.example` when running collectors. For the annual GitHub workflow, configure `COPERNICUS_CDS_API_KEY` and `EMBER_API_KEY` as repository Actions secrets. If Ember is not configured, the EU-27 snapshot uses the no-key Eurostat API and records that provider in its metadata.

The `.gitignore` excludes `.env`, `.cdsapirc`, raw downloads and generated build output. Hosted keys are read server-side or by the annual workflow and are never returned to the browser.

If a credential has been shared publicly, revoke or rotate it in the source provider's dashboard.

## Current scope and limitations

- European country coverage is prioritised where sources offer comparable national definitions.
- Headline observations use one common year. Source vintages and download dates can differ, but the statistical reference year cannot.
- Electricity mixes describe electricity production and do not represent all national greenhouse-gas emissions.
- Wildfire and flood indicators must retain their exact hazard definition; they must not be merged into a vague “climate damage” total.
- “Live” refers to the published website. The scientific snapshot is intentionally updated annually after validation, not on every page load.

## Contributing

Contributions are welcome, especially for source review, methodological clarification, country coverage, accessibility and visualisation quality. Please preserve the distinction between observed values, calculated indicators, policy targets and model scenarios in every proposed change.

## License

The code licence has not yet been selected. Dataset reuse remains subject to each provider's terms of use and attribution requirements.
