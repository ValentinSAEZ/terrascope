import { cp, mkdir, rm } from 'node:fs/promises';

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
await cp('sites-worker.js', 'dist/server/index.js');
console.log(`TerraScope build complete: ${staticFiles.length} static files.`);
