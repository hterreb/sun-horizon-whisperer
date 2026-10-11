// Cloudflare Worker for sun.chaser.page (ROADMAP item 16). `wrangler.jsonc` serves `dist` as
// static assets and runs this Worker first only for /api/*. /api/planes is the live radar's
// proxy (item 96): the logic is in src/utils/planeFeed.ts, the same as the Vercel Edge function
// api/planes.ts. Relative import only: the Worker bundle has no `@/`.
import { handlePlanesRequest } from '../src/utils/planeFeed';

// ponytail: inline Env type, add @cloudflare/workers-types when the Worker needs more bindings.
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === '/api/planes') return handlePlanesRequest(request);
    return env.ASSETS.fetch(request);
  },
};
