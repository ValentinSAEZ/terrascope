import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../data/annual-snapshot.json', import.meta.url);
const snapshot = JSON.parse(await readFile(path, 'utf8'));
const expectedYear = Number(process.env.REFERENCE_YEAR || snapshot.reference_year);
const errors = [];
const warnings = [];
const coreMetrics = ['co2_territorial_mt', 'population', 'co2_per_capita_t', 'gdp_ppp_billion', 'co2_intensity_g_per_dollar', 'renewable_electricity_share_pct'];
const sentinelCountries = ['FRA', 'DEU', 'ESP', 'SWE', 'POL'];
const boundedMetrics = {
  co2_per_capita_t: [0, 100],
  co2_intensity_g_per_dollar: [0, 5000],
  renewable_electricity_share_pct: [0, 100],
  warming_anomaly_c: [-10, 10],
  hot_days_ge_30_c: [0, 366],
  burnt_area_ha: [0, 1e9],
};

if (snapshot.reference_year !== expectedYear) errors.push(`Snapshot year ${snapshot.reference_year} differs from expected ${expectedYear}.`);
const entries = Object.entries(snapshot.countries || {});
if (entries.length !== 27) errors.push(`Expected 27 EU countries, found ${entries.length}.`);

for (const [code, country] of entries) {
  if (!/^[A-Z]{3}$/.test(code)) errors.push(`${code}: invalid ISO3 code.`);
  for (const [metricName, metric] of Object.entries(country.metrics || {})) {
    if (metric.year !== expectedYear) errors.push(`${code}/${metricName}: year ${metric.year} is not ${expectedYear}.`);
    if (metric.status === 'available' && !Number.isFinite(metric.value)) errors.push(`${code}/${metricName}: available value is not finite.`);
    if (metric.status !== 'available' && metric.value !== null) errors.push(`${code}/${metricName}: unavailable value must be null.`);
    if (metric.status === 'available' && boundedMetrics[metricName]) {
      const [minimum, maximum] = boundedMetrics[metricName];
      if (metric.value < minimum || metric.value > maximum) errors.push(`${code}/${metricName}: ${metric.value} outside [${minimum}, ${maximum}].`);
    }
  }
  for (const metricName of coreMetrics) {
    if (country.metrics?.[metricName]?.status !== 'available') errors.push(`${code}/${metricName}: core comparable metric is missing.`);
  }
  const series = country.series?.co2_territorial_mt || [];
  if (!series.some(point => point.year === expectedYear)) errors.push(`${code}: CO₂ history lacks ${expectedYear}.`);
  if (!series.some(point => point.year === 1990)) warnings.push(`${code}: CO₂ history lacks the 1990 comparison base.`);
  const mix = country.electricity_mix_pct;
  if (mix) {
    const total = Object.values(mix).reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.15) errors.push(`${code}: electricity mix totals ${total}%, not 100%.`);
  }
}

for (const metric of ['warming_anomaly_c', 'hot_days_ge_30_c', 'burnt_area_ha']) {
  const coverage = snapshot.coverage?.[metric];
  if (!coverage || coverage.available < 1) warnings.push(`${metric}: no country has a published value.`);
}
for (const code of sentinelCountries) {
  const country = snapshot.countries?.[code];
  if (!country) errors.push(`${code}: required cross-country sentinel is missing.`);
  else if (coreMetrics.some(metric => country.metrics?.[metric]?.status !== 'available')) errors.push(`${code}: sentinel validation lacks a core metric.`);
}

if (errors.length) {
  console.error('Annual snapshot rejected:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

snapshot.status = warnings.length ? 'validated_with_documented_gaps' : 'validated';
snapshot.validation = {
  checked_at: new Date().toISOString(),
  exact_year_join: true,
  country_count: entries.length,
  core_metrics_complete: true,
  sentinel_countries: sentinelCountries,
  warnings,
};
await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Snapshot ${expectedYear} validated for ${entries.length} countries.`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);
