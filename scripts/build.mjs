import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const staticFiles = [
  'index.html', 'country-live.html', 'country.html', 'europe.html', 'news-france.html', 'sources.html',
  'data/cmip-ssp245-cnrmesm21.json',
  'data/era5-observed-eu.json',
  'terrascope-runtime.js', 'script.js', 'styles.css', 'economist.css', 'structure.css'
];

await rm('public', { recursive: true, force: true });
await mkdir('public', { recursive: true });
await mkdir('public/data', { recursive: true });
await Promise.all(staticFiles.map(file => cp(file, `public/${file}`)));
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server/api', { recursive: true });
await cp('public', 'dist/public', { recursive: true });
await cp('api/gdelt.js', 'dist/server/api/gdelt.js');
await cp('api/ember.js', 'dist/server/api/ember.js');
const mime = file => file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/octet-stream';
const entries = await Promise.all(staticFiles.map(async file => [file, { body: await readFile(file, 'utf8'), type: mime(file) }]));
const worker = `import ember from './api/ember.js';\nimport gdelt from './api/gdelt.js';\n\nconst assets = ${JSON.stringify(Object.fromEntries(entries))};\nconst aliases = { '/': 'index.html', '/country-live': 'country-live.html', '/country': 'country.html', '/europe': 'europe.html', '/news-france': 'news-france.html', '/sources': 'sources.html' };\nconst datasets = {\n  '/data/owid/co2': 'https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?csvType=full&useColumnShortNames=true',\n  '/data/owid/capita': 'https://ourworldindata.org/grapher/co2-emissions-per-capita.csv?csvType=full&useColumnShortNames=true',\n  '/data/owid/mix': 'https://ourworldindata.org/grapher/share-elec-by-source.csv?csvType=full&useColumnShortNames=true',\n  '/data/owid/gdp': 'https://ourworldindata.org/grapher/gdp-worldbank.csv?csvType=full&useColumnShortNames=true'\n};\n\nexport default {\n  async fetch(request, env, ctx) {\n    const requestUrl = new URL(request.url);\n    const pathname = requestUrl.pathname;\n    if (pathname === '/briefing') return gdelt.fetch(request, env, ctx);\n    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);\n    if (datasets[pathname]) {\n      const response = await fetch(datasets[pathname]);\n      return new Response(response.body, { status: response.status, headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'public, max-age=3600' } });\n    }\n    if (pathname === '/data/eurostat') {\n      const geo = requestUrl.searchParams.get('geo');\n      if (!/^[A-Z]{2}$/.test(geo || '')) return new Response('Bad geo', { status: 400 });\n      const upstream = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sdg_13_40?geo=' + geo + '&lastTimePeriod=1&lang=EN';\n      const response = await fetch(upstream);\n      return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' } });\n    }\n    const asset = assets[aliases[pathname] || pathname.slice(1)];\n    return asset ? new Response(asset.body, { headers: { 'content-type': asset.type, 'cache-control': 'public, max-age=300' } }) : new Response('Not found', { status: 404 });\n  }\n};\n`;
await writeFile('dist/server/index.js', worker);
const eurostatEnergyRoute = [
  "    if (pathname === '/data/eurostat-energy') {",
  "      const geo = requestUrl.searchParams.get('geo');",
  "      const year = requestUrl.searchParams.get('year');",
  "      if (!/^[A-Z]{2}$/.test(geo || '') || !/^20\\d{2}$/.test(year || '')) return new Response('Bad energy query', { status: 400 });",
  "      const siec = ['TOTAL','RA000','N9000','FE'];",
  "      const params = new URLSearchParams({ freq: 'M', unit: 'GWH', geo, sinceTimePeriod: year + '-01', untilTimePeriod: year + '-12', lang: 'EN' });",
  "      siec.forEach(value => params.append('siec', value));",
  "      const response = await fetch('https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_cb_pem?' + params);",
  "      if (!response.ok) return new Response('Eurostat unavailable', { status: response.status });",
  "      const data = await response.json();",
  "      const months = Object.keys(data.dimension?.time?.category?.index || {});",
  "      const index = data.dimension?.siec?.category?.index || {};",
  "      const values = data.value || {};",
  "      const sum = code => months.reduce((total, month, position) => total + Number(values[(index[code] || 0) * months.length + position] || 0), 0);",
  "      const total = sum('TOTAL'), renewable = sum('RA000');",
  "      const complete = months.length === 12 && total > 0 && renewable >= 0;",
  "      const raw = [['Renouvelables et biocarburants','RA000','#397d74'],['Nucléaire','N9000','#355c92'],['Énergies fossiles','FE','#b85a32']];",
  "      const fuels = raw.map(([name, code, color]) => ({ name, value: total ? sum(code) / total * 100 : 0, color })).filter(item => item.value > 0);",
  "      const residual = 100 - fuels.reduce((sum, item) => sum + item.value, 0);",
  "      if (residual > 0.01) fuels.push({ name: 'Ajustement de périmètre', value: residual, color: '#a9a59a' });",
  "      return Response.json({ complete, year: Number(year), renewableShare: total ? renewable / total * 100 : null, fuels, source: 'Eurostat nrg_cb_pem', updated: data.updated || null }, { headers: { 'cache-control': 'public, max-age=86400' } });",
  "    }"
].join('\n');
await writeFile('dist/server/index.js', worker.replace("    if (pathname === '/data/eurostat') {", eurostatEnergyRoute + "\n    if (pathname === '/data/eurostat') {"));
await writeFile('dist/server/index.js', (await readFile('dist/server/index.js', 'utf8')).replace(
  "  '/data/owid/gdp': 'https://ourworldindata.org/grapher/gdp-worldbank.csv?csvType=full&useColumnShortNames=true'",
  "  '/data/owid/gdp': 'https://ourworldindata.org/grapher/gdp-worldbank.csv?csvType=full&useColumnShortNames=true',\n  '/data/owid/temperature-anomaly': 'https://ourworldindata.org/grapher/annual-temperature-anomalies.csv?csvType=full&useColumnShortNames=false'"
));
await writeFile('dist/server/index.js', (await readFile('dist/server/index.js', 'utf8')).replace(
  "'cache-control': 'public, max-age=300'",
  "'cache-control': asset.type.includes('text/html') || asset.type.includes('javascript') ? 'no-cache' : 'public, max-age=300'"
));
console.log(`TerraScope build complete: ${staticFiles.length} static files.`);
