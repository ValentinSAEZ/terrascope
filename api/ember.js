/**
 * Proxy Ember côté serveur.
 * La clé est lue depuis la variable secrète EMBER_API_KEY configurée dans Sites.
 * Elle ne doit jamais être transmise au navigateur.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    if (!country || !/^[A-Z]{3}$/.test(country)) {
      return Response.json({ error: 'Paramètre country invalide.' }, { status: 400 });
    }
    const upstream = new URL('https://api.ember-energy.org/v1/electricity-generation/yearly');
    upstream.searchParams.set('entity_code', country);
    upstream.searchParams.set('is_aggregate_series', 'false');
    upstream.searchParams.set('start_date', '1990');
    upstream.searchParams.set('api_key', env.EMBER_API_KEY);
    const response = await fetch(upstream);
    if (!response.ok) {
      return Response.json({ error: 'Données Ember indisponibles.' }, { status: response.status });
    }
    return new Response(response.body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=3600'
      }
    });
  }
};
