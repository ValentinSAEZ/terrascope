import ember from './api/ember.js';
import gdelt from './api/gdelt.js';

/** Cloudflare Worker entry point for TerraScope. */
const datasets = {
  '/data/owid/co2': 'https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?csvType=full&useColumnShortNames=true',
  '/data/owid/capita': 'https://ourworldindata.org/grapher/co2-emissions-per-capita.csv?csvType=full&useColumnShortNames=true',
  '/data/owid/mix': 'https://ourworldindata.org/grapher/share-elec-by-source.csv?csvType=full&useColumnShortNames=true',
  '/data/owid/gdp': 'https://ourworldindata.org/grapher/gdp-worldbank.csv?csvType=full&useColumnShortNames=true',
  '/data/owid/temperature-anomaly': 'https://ourworldindata.org/grapher/annual-temperature-anomalies.csv?csvType=full&useColumnShortNames=false'
};

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname;
    if (pathname === '/briefing') return gdelt.fetch(request, env, ctx);
    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);

    if (datasets[pathname]) {
      const response = await fetch(datasets[pathname]);
      return new Response(response.body, {
        status: response.status,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'cache-control': 'public, max-age=3600'
        }
      });
    }

    if (pathname === '/data/eurostat-energy') {
      const geo = requestUrl.searchParams.get('geo');
      const year = requestUrl.searchParams.get('year');
      if (!/^[A-Z]{2}$/.test(geo || '') || !/^20\d{2}$/.test(year || '')) {
        return new Response('Bad energy query', { status: 400 });
      }

      const siec = ['TOTAL', 'RA000', 'N9000', 'FE'];
      const params = new URLSearchParams({
        freq: 'M', unit: 'GWH', geo,
        sinceTimePeriod: `${year}-01`, untilTimePeriod: `${year}-12`, lang: 'EN'
      });
      siec.forEach(value => params.append('siec', value));
      const response = await fetch(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_cb_pem?${params}`);
      if (!response.ok) return new Response('Eurostat unavailable', { status: response.status });

      const data = await response.json();
      const months = Object.keys(data.dimension?.time?.category?.index || {});
      const index = data.dimension?.siec?.category?.index || {};
      const values = data.value || {};
      const sum = code => months.reduce((total, month, position) => total + Number(values[(index[code] || 0) * months.length + position] || 0), 0);
      const total = sum('TOTAL');
      const renewable = sum('RA000');
      const raw = [
        ['Renouvelables et biocarburants', 'RA000', '#397d74'],
        ['Nucléaire', 'N9000', '#355c92'],
        ['Énergies fossiles', 'FE', '#b85a32']
      ];
      const fuels = raw.map(([name, code, color]) => ({ name, value: total ? sum(code) / total * 100 : 0, color })).filter(item => item.value > 0);
      const residual = 100 - fuels.reduce((accumulator, item) => accumulator + item.value, 0);
      if (residual > 0.01) fuels.push({ name: 'Ajustement de périmètre', value: residual, color: '#a9a59a' });

      return Response.json({
        complete: months.length === 12 && total > 0 && renewable >= 0,
        year: Number(year),
        renewableShare: total ? renewable / total * 100 : null,
        fuels,
        source: 'Eurostat nrg_cb_pem',
        updated: data.updated || null
      }, { headers: { 'cache-control': 'public, max-age=86400' } });
    }

    if (pathname === '/data/eurostat') {
      const geo = requestUrl.searchParams.get('geo');
      if (!/^[A-Z]{2}$/.test(geo || '')) return new Response('Bad geo', { status: 400 });
      const response = await fetch(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sdg_13_40?geo=${geo}&lastTimePeriod=1&lang=EN`);
      return new Response(response.body, {
        status: response.status,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=3600'
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
