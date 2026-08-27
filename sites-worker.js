import ember from './api/ember.js';
import gdelt from './api/gdelt.js';

/** Entry point used by the OpenAI Sites deployment runtime. */
export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/briefing') return gdelt.fetch(request, env, ctx);
    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  }
};
