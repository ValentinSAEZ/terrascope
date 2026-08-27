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

## Main data sources

| Theme | Source | Use in TerraScope |
| --- | --- | --- |
| Territorial CO2 emissions, CO2 per capita, GDP | [Our World in Data](https://ourworldindata.org/) / Global Carbon Budget, World Bank | Historical emissions, rankings, economic context. |
| Electricity production | [Eurostat](https://ec.europa.eu/eurostat/) `nrg_cb_pem` | Harmonised electricity production by source for European countries. |
| Observed climate | [Copernicus Climate Change Service](https://climate.copernicus.eu/) ERA5 / ERA5-Land | Area-weighted national temperature indicators and hot-day processing. |
| Climate simulations | [CMIP6](https://esgf-node.llnl.gov/projects/cmip6/) | Illustrative annual temperature anomalies under SSP2-4.5; clearly labelled as model simulations. |
| Wildfire impacts | [EFFIS / Copernicus Emergency Management Service](https://forest-fire.emergency.copernicus.eu/) | National burnt-area observations where EFFIS publishes a country total. |
| Flood-risk context | [European Environment Agency](https://www.eea.europa.eu/) | Links and methodological context; no aggregated loss figure is shown as a flood-only observation without an appropriate hazard filter. |
| Policy | [UNFCCC](https://unfccc.int/) and European Union | NDC context, Paris Agreement and EU climate-law references. |
| News | [GDELT 2.0](https://www.gdeltproject.org/) | Country-specific climate, energy and economy news links. |

## Architecture

TerraScope is intentionally lightweight:

- Static HTML, CSS and browser JavaScript for the editorial interface.
- A Cloudflare Worker-compatible runtime built by `scripts/build.mjs`.
- Small Worker endpoints that proxy selected public datasets, keeping requests consistent and avoiding browser CORS issues.
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
scripts/process_*.py       Reproducible data-processing utilities
```

## Reproducible data processing

Some datasets need processing before they can be presented at country level.

- `scripts/process_era5_observed.py` processes ERA5 monthly data into area-weighted national temperature indicators.
- `scripts/fetch_era5_land_hot_days.py` requests ERA5-Land daily maximum temperature data from Copernicus CDS. It reads `COPERNICUS_CDS_API_KEY` from a local `.env` file only.
- `scripts/process_era5_land_hot_days.py` calculates the **area-weighted mean annual count of grid-cell days with daily maximum temperature >= 30 °C**. This is not a population-weighted or station-based count.
- `scripts/process_effis_burnt_area.py` turns EFFIS national annual burnt-area tables into the static asset used by the country profiles.

Raw downloads are deliberately excluded from Git. They can be large, may have source-specific licences, and are reproducible from their documented source and processing script.

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

Never commit API keys. Use a local `.env` file based on `.env.example` when running Copernicus data collection tools. The `.gitignore` excludes `.env`, `.cdsapirc`, raw downloads and generated build output.

If a credential has been shared publicly, revoke or rotate it in the source provider's dashboard.

## Current scope and limitations

- European country coverage is prioritised where sources offer comparable national definitions.
- Source update schedules differ: an indicator's visible reference year can vary across data providers.
- Electricity mixes describe electricity production and do not represent all national greenhouse-gas emissions.
- Wildfire and flood indicators must retain their exact hazard definition; they must not be merged into a vague “climate damage” total.
- “Live” means TerraScope fetches the latest value available from its connected public source; it does not imply real-time measurement.

## Contributing

Contributions are welcome, especially for source review, methodological clarification, country coverage, accessibility and visualisation quality. Please preserve the distinction between observed values, calculated indicators, policy targets and model scenarios in every proposed change.

## License

The code licence has not yet been selected. Dataset reuse remains subject to each provider's terms of use and attribution requirements.
