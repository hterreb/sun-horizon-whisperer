// Cloudflare Pages Function: /api/planes?lat=..&lon=.. (ROADMAP items 16 and 96, the live radar).
// Pages serves each file in /functions as a route. The logic is in src/utils/planeFeed.ts, the
// same as the Vercel Edge function api/planes.ts. Relative import only: the Pages bundle has no `@/`.
import { handlePlanesRequest } from '../../src/utils/planeFeed';

// ponytail: inline context type, add @cloudflare/workers-types when a function needs env or KV.
export const onRequest = ({ request }: { request: Request }): Promise<Response> =>
  handlePlanesRequest(request);
