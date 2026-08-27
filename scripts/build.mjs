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
const worker = `import ember from './api/ember.js';\nimport gdelt from './api/gdelt.js';\n\nconst assets = ${JSON.stringify(Object.fromEntries(entries))};\nconst aliases = { '/': 'index.html', '/country-live': 'country-live.html', '/country': 'country.html', '/europe': 'europe.html', '/news-france': 'news-france.html', '/sources': 'sources.html' };\n\nexport default {\n  async fetch(request, env, ctx) {\n    const pathname = new URL(request.url).pathname;\n    if (pathname === '/briefing') return gdelt.fetch(request, env, ctx);\n    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);\n    const asset = assets[aliases[pathname] || pathname.slice(1)];\n    return asset ? new Response(asset.body, { headers: { 'content-type': asset.type, 'cache-control': 'public, max-age=300' } }) : new Response('Not found', { status: 404 });\n  }\n};\n`;
await writeFile('dist/server/index.js', worker);
console.log(`TerraScope build complete: ${staticFiles.length} static files.`);
