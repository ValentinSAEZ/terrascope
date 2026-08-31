import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const staticFiles = [
  'index.html', 'country-live.html', 'country.html', 'europe.html', 'news-france.html', 'sources.html', 'ranking.html',
  'data/annual-snapshot.json',
  'data/cmip-ssp245-cnrmesm21.json',
  'terrascope-runtime.js', 'ranking-runtime.js', 'script.js',
  'styles.css', 'economist.css', 'structure.css', 'search-ui.css', 'responsive-ui.css',
];

await rm('public', { recursive: true, force: true });
await mkdir('public/data', { recursive: true });
await Promise.all(staticFiles.map(file => cp(file, `public/${file}`)));

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
  return 'application/octet-stream';
};
const entries = await Promise.all(staticFiles.map(async file => [file, { body: await readFile(file, 'utf8'), type: mime(file) }]));
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
  '/ranking': 'ranking.html'
};

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname;
    if (pathname === '/briefing') return gdelt.fetch(request, env, ctx);
    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);
    const asset = assets[aliases[pathname] || pathname.slice(1)];
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
console.log(`TerraScope build complete: ${staticFiles.length} static files.`);
