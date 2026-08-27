import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const staticFiles = [
  'index.html', 'country-live.html', 'country.html', 'europe.html', 'news-france.html', 'sources.html',
  'terrascope-runtime.js', 'script.js', 'styles.css', 'economist.css', 'structure.css'
];

await rm('public', { recursive: true, force: true });
await mkdir('public', { recursive: true });
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
console.log(`TerraScope build complete: ${staticFiles.length} static files.`);
