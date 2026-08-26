import { cp, mkdir, rm } from 'node:fs/promises';

const staticFiles = [
  'index.html', 'country-live.html', 'country.html', 'europe.html', 'news-france.html', 'sources.html',
  'data-sources.js', 'script.js', 'styles.css', 'economist.css', 'structure.css'
];

await rm('public', { recursive: true, force: true });
await mkdir('public', { recursive: true });
await Promise.all(staticFiles.map(file => cp(file, `public/${file}`)));
console.log(`TerraScope build complete: ${staticFiles.length} static files.`);
