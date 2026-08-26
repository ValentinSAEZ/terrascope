import ember from './api/ember.js';
import gdelt from './api/gdelt.js';

/** Cloudflare Worker entry point for TerraScope. */
export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/gdelt') return gdelt.fetch(request, env, ctx);
    if (pathname === '/api/ember') return ember.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  }
};
