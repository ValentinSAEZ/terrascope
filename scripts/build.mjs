import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import {isPublished,validateSnapshot} from '../data-contract.js';
import {validateProjections} from '../projection-contract.js';
import {registry, renderCountryPage, sitemap, robots} from './country-pages.mjs';

const snapshot=JSON.parse(await readFile('data/annual-snapshot.json','utf8'));
const report=validateSnapshot(snapshot);
if(!isPublished(snapshot)||report.errors.length)throw Error('Build blocked: '+report.errors.join('; '));
validateProjections(JSON.parse(await readFile('data/climate-projections.json','utf8')), Object.keys(snapshot.countries));

const staticFiles = [
  'index.html', 'country-live.html', 'country.html', 'europe.html', 'news-france.html', 'sources.html', 'ranking.html', 'data-health.html',
  'data/annual-snapshot.json',
  'data/cmip-ssp245-cnrmesm21.json',
  'data/climate-projections.json', 'data/headline.json', 'climate-projections.js', 'projection-contract.js', 'climate-projections.css',
  'health-ui.css', 'health-ui.js',
  'blueprint-ui.css', 'blueprint-ui.js',
  'terrascope-runtime.js', 'ranking-runtime.js', 'data-contract.js', 'script.js', 'country-ui.js', 'country-ui.css', 'country-charts.js', 'country-charts.css', 'polish.css', 'country-registry.js',
  ...(await readdir('assets/flags')).map(file => `assets/flags/${file}`), 'assets/world-natural-earth.svg',
  'styles.css', 'economist.css', 'structure.css', 'search-ui.css', 'responsive-ui.css', 'ranking-ui.css',
];

await rm('public', { recursive: true, force: true });
await mkdir('public/data', { recursive: true });
await Promise.all(staticFiles.map(file => cp(file, `public/${file}`)));

// Versionnage par empreinte : chaque « fichier.js?v=… » ou « fichier.css?v=… »
// publié pointe vers un hash de son contenu réel, calculé à chaque build.
const fingerprint = {};
for (const file of staticFiles.filter(f => /\.(js|css)$/.test(f))) fingerprint[file] = createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 10);
const withHashes = text => text.replace(/([\w./-]+\.(?:js|css))\?v=[\w.-]+/g, (match, file) => {
  const key = file.replace(/^\.?\//, '');
  return fingerprint[key] ? `${file}?v=${fingerprint[key]}` : match;
});
for (const file of staticFiles.filter(f => /\.(html|js|css)$/.test(f))) {
  await writeFile(`public/${file}`, withHashes(await readFile(file, 'utf8')));
}

// Pages statiques par pays, sitemap et robots.txt (servis tels quels par le serveur de fichiers).
const shell = withHashes(await readFile('country-live.html', 'utf8'));
const generated = {};
for (const place of registry.list) generated[`pays/${place.slug}/index.html`] = renderCountryPage(shell, place, snapshot);
generated['sitemap.xml'] = sitemap(snapshot.generated_at.slice(0, 10));
generated['robots.txt'] = robots();
for (const [file, body] of Object.entries(generated)) {
  await mkdir(dirname(`public/${file}`), { recursive: true });
  await writeFile(`public/${file}`, body);
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist/server/api', { recursive: true });
await cp('public', 'dist/public', { recursive: true });
await cp('api/gdelt.js', 'dist/server/api/gdelt.js');
await cp('api/ember.js', 'dist/server/api/ember.js');

const mime = file => {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (file.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
};
const entries = await Promise.all(staticFiles.map(async file => [file, { body: await readFile(`public/${file}`, 'utf8'), type: mime(file) }]));
for (const [file, body] of Object.entries(generated)) entries.push([file, { body, type: mime(file) }]);
const worker = `import ember from './api/ember.js';
import gdelt from './api/gdelt.js';

const assets = ${JSON.stringify(Object.fromEntries(entries))};
const aliases = {
  '/': 'index.html',
  '/country-live': 'country-live.html',
  '/country': 'country.html',
  '/europe': 'europe.html',
  '/news-france': 'news-france.html',
  '/sources': 'sources.html',
  '/ranking': 'ranking.html',
  '/data-health': 'data-health.html'
};

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname;
    if (pathname === '/briefing') return gdelt.fetch(request, env, ctx);
    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);
    const key = aliases[pathname] || pathname.slice(1);
    const asset = assets[key] || (key.endsWith('/') ? assets[key + 'index.html'] : assets[key + '/index.html']);
    if (!asset) return new Response('Not found', { status: 404 });
    const mustRevalidate = asset.type.includes('text/html') || asset.type.includes('javascript') || pathname === '/data/annual-snapshot.json';
    return new Response(asset.body, {
      headers: {
        'content-type': asset.type,
        'cache-control': mustRevalidate ? 'no-cache' : 'public, max-age=300',
        'x-content-type-options': 'nosniff'
      }
    });
  }
};
`;

await writeFile('dist/server/index.js', worker);
console.log(`TerraScope build complete: ${staticFiles.length} static files, ${Object.keys(generated).length} generated.`);
