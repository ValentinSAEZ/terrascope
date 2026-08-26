/**
 * Revue de presse côté serveur.
 * GDELT est tenté en premier ; Google News RSS constitue un repli de lecture
 * lorsque l'index GDELT ne répond pas dans le délai imparti.
 */
const countries = {
  Allemagne: 'Germany', Autriche: 'Austria', Belgique: 'Belgium', Bulgarie: 'Bulgaria', Chypre: 'Cyprus', Croatie: 'Croatia', Danemark: 'Denmark', Espagne: 'Spain', Estonie: 'Estonia', Finlande: 'Finland', France: 'France', Grèce: 'Greece', Hongrie: 'Hungary', Irlande: 'Ireland', Italie: 'Italy', Lettonie: 'Latvia', Lituanie: 'Lithuania', Luxembourg: 'Luxembourg', Malte: 'Malta', 'Pays-Bas': 'Netherlands', Pologne: 'Poland', Portugal: 'Portugal', Roumanie: 'Romania', Slovaquie: 'Slovakia', Slovénie: 'Slovenia', Suède: 'Sweden', Tchéquie: 'Czechia'
};

const decode = value => String(value || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const timeoutFetch = async (url, ms = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { signal: controller.signal, headers: { accept: 'application/json, application/xml;q=0.9' } }); }
  finally { clearTimeout(timer); }
};
const parseRss = xml => [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => {
  const item = match[1];
  const take = tag => decode(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
  return { title: take('title'), url: take('link'), seendate: take('pubDate'), domain: take('source') || 'Google News' };
}).filter(article => article.title && article.url).slice(0, 6);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    const englishCountry = countries[country];
    if (!englishCountry) return Response.json({ error: 'Pays invalide.' }, { status: 400 });
    const query = `"${englishCountry}" (climate OR emissions OR energy OR decarbonisation)`;
    const gdelt = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    gdelt.search = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '6', timespan: '1week', sort: 'DateDesc' });
    try {
      const response = await timeoutFetch(gdelt, 8000);
      const payload = response.ok ? await response.json() : null;
      const articles = Array.isArray(payload?.articles) ? payload.articles.filter(article => article.title && article.url).slice(0, 6) : [];
      if (articles.length) return Response.json({ provider: 'GDELT', articles }, { headers: { 'cache-control': 'public, max-age=600' } });
    } catch { /* Le repli RSS ci-dessous maintient la rubrique disponible. */ }
    const rss = new URL('https://news.google.com/rss/search');
    rss.search = new URLSearchParams({ q: `"${englishCountry}" climate`, hl: 'fr', gl: 'FR', ceid: 'FR:fr' });
    try {
      const response = await timeoutFetch(rss, 8000);
      const articles = response.ok ? parseRss(await response.text()) : [];
      return Response.json({ provider: 'Google News RSS · repli', articles }, { headers: { 'cache-control': 'public, max-age=600' } });
    } catch {
      return Response.json({ error: 'Revue de presse indisponible.' }, { status: 502 });
    }
  }
};
