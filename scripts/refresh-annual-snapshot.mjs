import { readFile, writeFile } from 'node:fs/promises';

try {
  const localEnv = await readFile(new URL('../.env', import.meta.url), 'utf8');
  for (const rawLine of localEnv.split(/\r?\n/)) {
    const match = rawLine.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const REFERENCE_YEAR = Number(process.env.REFERENCE_YEAR || 2024);
const OUTPUT = new URL('../data/annual-snapshot.json', import.meta.url);
const OBSERVED_TEMPERATURE = new URL('../data/era5-observed-eu.json', import.meta.url);
const ANNUAL_TEMPERATURE = new URL('../data/era5-annual-eu.json', import.meta.url);
const HOT_DAYS = new URL('../data/era5-land-hot-days-eu.json', import.meta.url);

if (!Number.isInteger(REFERENCE_YEAR) || REFERENCE_YEAR < 1990 || REFERENCE_YEAR > 2100) {
  throw new Error(`Invalid REFERENCE_YEAR: ${process.env.REFERENCE_YEAR}`);
}

const countries = {
  AUT: { iso2: 'AT', eurostat: 'AT', name_fr: 'Autriche' },
  BEL: { iso2: 'BE', eurostat: 'BE', name_fr: 'Belgique' },
  BGR: { iso2: 'BG', eurostat: 'BG', name_fr: 'Bulgarie' },
  HRV: { iso2: 'HR', eurostat: 'HR', name_fr: 'Croatie' },
  CYP: { iso2: 'CY', eurostat: 'CY', name_fr: 'Chypre' },
  CZE: { iso2: 'CZ', eurostat: 'CZ', name_fr: 'Tchéquie' },
  DNK: { iso2: 'DK', eurostat: 'DK', name_fr: 'Danemark' },
  EST: { iso2: 'EE', eurostat: 'EE', name_fr: 'Estonie' },
  FIN: { iso2: 'FI', eurostat: 'FI', name_fr: 'Finlande' },
  FRA: { iso2: 'FR', eurostat: 'FR', name_fr: 'France' },
  DEU: { iso2: 'DE', eurostat: 'DE', name_fr: 'Allemagne' },
  GRC: { iso2: 'GR', eurostat: 'EL', name_fr: 'Grèce' },
  HUN: { iso2: 'HU', eurostat: 'HU', name_fr: 'Hongrie' },
  IRL: { iso2: 'IE', eurostat: 'IE', name_fr: 'Irlande' },
  ITA: { iso2: 'IT', eurostat: 'IT', name_fr: 'Italie' },
  LVA: { iso2: 'LV', eurostat: 'LV', name_fr: 'Lettonie' },
  LTU: { iso2: 'LT', eurostat: 'LT', name_fr: 'Lituanie' },
  LUX: { iso2: 'LU', eurostat: 'LU', name_fr: 'Luxembourg' },
  MLT: { iso2: 'MT', eurostat: 'MT', name_fr: 'Malte' },
  NLD: { iso2: 'NL', eurostat: 'NL', name_fr: 'Pays-Bas' },
  POL: { iso2: 'PL', eurostat: 'PL', name_fr: 'Pologne' },
  PRT: { iso2: 'PT', eurostat: 'PT', name_fr: 'Portugal' },
  ROU: { iso2: 'RO', eurostat: 'RO', name_fr: 'Roumanie' },
  SVK: { iso2: 'SK', eurostat: 'SK', name_fr: 'Slovaquie' },
  SVN: { iso2: 'SI', eurostat: 'SI', name_fr: 'Slovénie' },
  ESP: { iso2: 'ES', eurostat: 'ES', name_fr: 'Espagne' },
  SWE: { iso2: 'SE', eurostat: 'SE', name_fr: 'Suède' },
};

const sourceDefinitions = {
  co2: {
    id: 'gcb-fossil-co2',
    label: 'Global Carbon Budget · national fossil CO₂ emissions, via OWID Grapher',
    url: 'https://globalcarbonbudget.org/gcb-2025/',
    dataset_url: 'https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?csvType=full&useColumnShortNames=true',
    definition: 'Territorial fossil and industrial CO₂ emissions; land-use change and other greenhouse gases are excluded.',
  },
  population: {
    id: 'world-bank-population',
    label: 'World Bank · World Development Indicators',
    url: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
    definition: 'Total population for the same reference year, used only as the denominator of CO₂ per capita.',
  },
  gdp: {
    id: 'world-bank-gdp-ppp',
    label: 'World Bank · GDP, PPP (constant 2021 international $)',
    url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.PP.KD',
    definition: 'GDP in purchasing-power-parity terms at constant 2021 international dollars.',
  },
  electricity: {
    id: process.env.EMBER_API_KEY ? 'ember-yearly-electricity' : 'eurostat-electricity',
    label: process.env.EMBER_API_KEY ? 'Ember · Yearly Electricity Data' : 'Eurostat · monthly net electricity generation, annualised from 12 complete months',
    url: process.env.EMBER_API_KEY ? 'https://api.ember-energy.org/v1/docs' : 'https://ec.europa.eu/eurostat/databrowser/view/nrg_cb_pem/default/table',
    definition: 'Share of electricity generation. It is not the share of renewables in total final energy consumption.',
  },
  warming: {
    id: 'era5-monthly',
    label: 'Copernicus Climate Change Service · ERA5 monthly averaged reanalysis',
    url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means',
    definition: 'Annual mean 2 m air-temperature anomaly relative to the 1991–2020 national mean.',
  },
  hot_days: {
    id: 'era5-land-daily',
    label: 'Copernicus Climate Change Service · ERA5-Land daily statistics',
    url: 'https://cds.climate.copernicus.eu/datasets/derived-era5-land-daily-statistics',
    definition: 'Area-weighted mean annual count of grid-cell days whose daily maximum 2 m temperature is at least 30 °C.',
  },
  fire: {
    id: 'gwis-mcd64a1-burned-area',
    label: 'JRC Global Wildfire Information System · MCD64A1 burned area',
    url: 'https://gwis.jrc.ec.europa.eu/apps/country.profile/downloads',
    definition: 'Satellite-derived annual burned area in hectares, using one MCD64A1 method for every country. It may include intentional vegetation-management fires.',
  },
};

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const available = (value, unit, source, extra = {}) => ({ status: 'available', value: round(value), unit, year: REFERENCE_YEAR, source, ...extra });
const unavailable = (reason, unit, source) => ({ status: 'not_available', value: null, unit, year: REFERENCE_YEAR, source, reason });

async function fetchWithRetry(url, kind = 'json', attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'TerraScope annual data pipeline/1.0' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return kind === 'text' ? await response.text() : await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 700 * attempt));
    }
  }
  throw new Error(`Unable to retrieve ${url}: ${lastError?.message}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift();
  return rows.filter(item => item.length === header.length).map(item => Object.fromEntries(header.map((key, index) => [key, item[index]])));
}

async function optionalJson(url) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function worldBankIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?date=${REFERENCE_YEAR}&format=json&per_page=400`;
  const response = await fetchWithRetry(url);
  const records = Array.isArray(response) ? response[1] : null;
  if (!Array.isArray(records)) throw new Error(`Unexpected World Bank response for ${indicator}`);
  return new Map(records.filter(record => record.countryiso3code && Number.isFinite(record.value)).map(record => [record.countryiso3code, Number(record.value)]));
}

function eurostatSum(data, code) {
  const months = Object.keys(data.dimension?.time?.category?.index || {});
  const codes = data.dimension?.siec?.category?.index || {};
  if (!(code in codes)) return 0;
  const offset = Number(codes[code]) * months.length;
  return months.reduce((sum, _month, index) => sum + Number(data.value?.[offset + index] || 0), 0);
}

async function eurostatElectricity(country) {
  const query = new URLSearchParams({
    freq: 'M', unit: 'GWH', geo: country.eurostat,
    sinceTimePeriod: `${REFERENCE_YEAR}-01`, untilTimePeriod: `${REFERENCE_YEAR}-12`, lang: 'EN',
  });
  for (const code of ['TOTAL', 'RA000', 'N9000', 'FE']) query.append('siec', code);
  const data = await fetchWithRetry(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_cb_pem?${query}`);
  const months = Object.keys(data.dimension?.time?.category?.index || {});
  if (months.length !== 12) throw new Error(`${country.iso2}: Eurostat returned ${months.length}/12 months`);
  const total = eurostatSum(data, 'TOTAL');
  const renewable = eurostatSum(data, 'RA000');
  const nuclear = eurostatSum(data, 'N9000');
  const fossil = eurostatSum(data, 'FE');
  if (!(total > 0) || renewable < 0) throw new Error(`${country.iso2}: invalid electricity total`);
  const components = {
    renewables: renewable / total * 100,
    nuclear: nuclear / total * 100,
    fossil: fossil / total * 100,
  };
  components.adjustment = Math.max(0, 100 - components.renewables - components.nuclear - components.fossil);
  return { renewableShare: components.renewables, components, provider: 'eurostat-electricity' };
}

function emberRows(response) {
  if (Array.isArray(response)) return response;
  for (const key of ['data', 'results', 'records']) if (Array.isArray(response?.[key])) return response[key];
  return [];
}

async function emberElectricity(code) {
  const query = new URLSearchParams({
    entity_code: code, is_aggregate_series: 'false', start_date: String(REFERENCE_YEAR), end_date: String(REFERENCE_YEAR), api_key: process.env.EMBER_API_KEY,
  });
  const response = await fetchWithRetry(`https://api.ember-energy.org/v1/electricity-generation/yearly?${query}`);
  const rows = emberRows(response).filter(row => Number(row.year ?? String(row.date).slice(0, 4)) === REFERENCE_YEAR);
  if (!rows.length) throw new Error(`${code}: Ember returned no rows for ${REFERENCE_YEAR}`);
  const valueOf = row => Number(row.generation_twh ?? row.value ?? row.generation ?? NaN);
  const groups = { renewables: 0, nuclear: 0, fossil: 0, adjustment: 0 };
  const renewableNames = /wind|solar|hydro|bioenergy|geothermal|other renewables/i;
  const fossilNames = /coal|gas|other fossil|oil/i;
  let total = 0;
  for (const row of rows) {
    const name = String(row.series ?? row.variable ?? row.category ?? '');
    const value = valueOf(row);
    if (!Number.isFinite(value) || value < 0) continue;
    if (renewableNames.test(name)) groups.renewables += value;
    else if (/nuclear/i.test(name)) groups.nuclear += value;
    else if (fossilNames.test(name)) groups.fossil += value;
    else groups.adjustment += value;
    total += value;
  }
  if (!(total > 0)) throw new Error(`${code}: Ember generation values could not be interpreted`);
  const components = Object.fromEntries(Object.entries(groups).map(([name, value]) => [name, value / total * 100]));
  return { renewableShare: components.renewables, components, provider: 'ember-yearly-electricity' };
}

async function gwisBurnedArea(code) {
  const query = new URLSearchParams({
    level: 'ADM0', value: code, year: String(REFERENCE_YEAR),
    yearFrom: String(REFERENCE_YEAR), yearTo: String(REFERENCE_YEAR), env: 'PROD',
  });
  const response = await fetchWithRetry(`https://cprof.effis.emergency.copernicus.eu/api/v3/banf?${query}`);
  const record = response?.banfyear?.find(item => Number(item.year) === REFERENCE_YEAR);
  const value = Number(record?.lc_tot);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${code}: GWIS returned no valid MCD64A1 burned area`);
  return value;
}

async function mapLimit(entries, limit, mapper) {
  const results = new Array(entries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const index = cursor++;
      results[index] = await mapper(entries[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, entries.length) }, worker));
  return results;
}

console.log(`Building TerraScope comparable snapshot for ${REFERENCE_YEAR}…`);
const [co2Csv, population, gdp, observed, annualObserved, hotDays] = await Promise.all([
  fetchWithRetry(sourceDefinitions.co2.dataset_url, 'text'),
  worldBankIndicator('SP.POP.TOTL'),
  worldBankIndicator('NY.GDP.MKTP.PP.KD'),
  optionalJson(OBSERVED_TEMPERATURE),
  optionalJson(ANNUAL_TEMPERATURE),
  optionalJson(HOT_DAYS),
]);

const co2Rows = parseCsv(co2Csv).filter(row => Number.isFinite(Number(row.emissions_total)));
const co2ByCode = new Map();
for (const row of co2Rows) {
  const values = co2ByCode.get(row.code) || [];
  values.push({ year: Number(row.year), value: Number(row.emissions_total) / 1e6 });
  co2ByCode.set(row.code, values);
}
for (const values of co2ByCode.values()) values.sort((a, b) => a.year - b.year);
const world = co2ByCode.get('OWID_WRL')?.find(row => row.year === REFERENCE_YEAR);
if (!world) throw new Error(`Global CO₂ is unavailable for ${REFERENCE_YEAR}`);

const electricityEntries = await mapLimit(Object.entries(countries), 5, async ([code, country]) => {
  const result = process.env.EMBER_API_KEY ? await emberElectricity(code) : await eurostatElectricity(country);
  return [code, result];
});
const electricity = new Map(electricityEntries);
const fireEntries = await mapLimit(Object.keys(countries), 5, async code => [code, await gwisBurnedArea(code)]);
const burnedArea = new Map(fireEntries);

const euTotalCo2 = Object.keys(countries).reduce((sum, code) => sum + (co2ByCode.get(code)?.find(row => row.year === REFERENCE_YEAR)?.value || 0), 0);
const euPopulation = Object.keys(countries).reduce((sum, code) => sum + (population.get(code) || 0), 0);
if (!(euTotalCo2 > 0) || !(euPopulation > 0)) throw new Error('EU comparison denominator is incomplete');
const euPerCapita = euTotalCo2 * 1e6 / euPopulation;

const snapshotCountries = {};
for (const [code, country] of Object.entries(countries)) {
  const emissionsSeries = (co2ByCode.get(code) || []).filter(row => row.year >= 1990 && row.year <= REFERENCE_YEAR);
  const co2 = emissionsSeries.find(row => row.year === REFERENCE_YEAR)?.value;
  const co2In1990 = emissionsSeries.find(row => row.year === 1990)?.value;
  const people = population.get(code);
  const economy = gdp.get(code);
  const power = electricity.get(code);
  const temperature = observed?.countries?.[code];
  const annualTemperatureRecord = annualObserved?.year === REFERENCE_YEAR ? annualObserved.countries?.[code] : null;
  const annualTemperature = Number(annualTemperatureRecord?.annual_temperature_c ?? temperature?.annual_temperature_c?.[REFERENCE_YEAR]);
  const baselineTemperature = Number(annualTemperatureRecord?.baseline_1991_2020_c ?? temperature?.baseline_1991_2020_c);
  const fire = burnedArea.get(code);
  const heat = hotDays?.year === REFERENCE_YEAR ? hotDays.countries?.[code] : null;

  const metrics = {
    co2_territorial_mt: Number.isFinite(co2) ? available(co2, 'MtCO₂/year', 'gcb-fossil-co2') : unavailable('No GCB observation for the reference year.', 'MtCO₂/year', 'gcb-fossil-co2'),
    population: Number.isFinite(people) ? available(people, 'people', 'world-bank-population', { decimals: 0 }) : unavailable('No population observation for the reference year.', 'people', 'world-bank-population'),
    co2_per_capita_t: Number.isFinite(co2) && Number.isFinite(people) ? available(co2 * 1e6 / people, 'tCO₂/person', 'terrascope-derived', { numerator_source: 'gcb-fossil-co2', denominator_source: 'world-bank-population' }) : unavailable('Requires same-year CO₂ and population.', 'tCO₂/person', 'terrascope-derived'),
    gdp_ppp_billion: Number.isFinite(economy) ? available(economy / 1e9, 'billion constant 2021 international $', 'world-bank-gdp-ppp') : unavailable('No GDP PPP observation for the reference year.', 'billion constant 2021 international $', 'world-bank-gdp-ppp'),
    co2_intensity_g_per_dollar: Number.isFinite(co2) && Number.isFinite(economy) ? available(co2 * 1e12 / economy, 'gCO₂/constant 2021 international $', 'terrascope-derived', { numerator_source: 'gcb-fossil-co2', denominator_source: 'world-bank-gdp-ppp' }) : unavailable('Requires same-year CO₂ and GDP.', 'gCO₂/constant 2021 international $', 'terrascope-derived'),
    renewable_electricity_share_pct: power ? available(power.renewableShare, '% of electricity generation', power.provider) : unavailable('No complete electricity year.', '% of electricity generation', sourceDefinitions.electricity.id),
    warming_anomaly_c: Number.isFinite(annualTemperature) && Number.isFinite(baselineTemperature) ? available(annualTemperature - baselineTemperature, '°C relative to 1991–2020', 'era5-monthly') : unavailable('National ERA5 aggregation is unavailable at the retained resolution.', '°C relative to 1991–2020', 'era5-monthly'),
    hot_days_ge_30_c: heat?.status === 'available' && Number.isFinite(heat.mean_hot_days) ? available(heat.mean_hot_days, 'days/year', 'era5-land-daily', { method: 'area-weighted national mean of grid-cell counts' }) : unavailable('Annual ERA5-Land processing has not produced a validated national value.', 'days/year', 'era5-land-daily'),
    burnt_area_ha: Number.isFinite(fire) ? available(fire, 'ha/year', 'gwis-mcd64a1-burned-area') : unavailable('No harmonised satellite estimate for the reference year.', 'ha/year', 'gwis-mcd64a1-burned-area'),
  };

  snapshotCountries[code] = {
    name_fr: country.name_fr,
    iso2: country.iso2,
    metrics,
    derived: {
      world_emissions_share_pct: Number.isFinite(co2) ? round(co2 / world.value * 100, 3) : null,
      difference_from_eu_per_capita_pct: metrics.co2_per_capita_t.status === 'available' ? round((metrics.co2_per_capita_t.value / euPerCapita - 1) * 100, 1) : null,
      emissions_change_since_1990_pct: Number.isFinite(co2) && Number.isFinite(co2In1990) && co2In1990 !== 0 ? round((co2 / co2In1990 - 1) * 100, 1) : null,
    },
    electricity_mix_pct: power ? Object.fromEntries(Object.entries(power.components).map(([name, value]) => [name, round(value, 2)])) : null,
    series: { co2_territorial_mt: emissionsSeries.map(row => ({ year: row.year, value: round(row.value) })) },
  };
}

const metricNames = Object.keys(snapshotCountries.FRA.metrics);
const coverage = Object.fromEntries(metricNames.map(metric => {
  const count = Object.values(snapshotCountries).filter(country => country.metrics[metric].status === 'available').length;
  return [metric, { available: count, total: Object.keys(countries).length, percentage: round(count / Object.keys(countries).length * 100, 1) }];
}));

const snapshot = {
  schema_version: 1,
  reference_year: REFERENCE_YEAR,
  scope: 'EU-27',
  generated_at: new Date().toISOString(),
  publication_policy: 'All observed headline metrics use the same reference year. A missing value is never replaced with zero or another year.',
  status: 'candidate',
  sources: sourceDefinitions,
  coverage,
  countries: snapshotCountries,
};

await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUTPUT.pathname} for ${Object.keys(snapshotCountries).length} countries.`);
for (const [metric, result] of Object.entries(coverage)) console.log(`${metric}: ${result.available}/${result.total}`);
