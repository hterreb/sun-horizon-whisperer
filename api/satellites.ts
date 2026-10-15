// Vercel Edge function: GET /api/satellites (ROADMAP item 160, the night catalogue). The logic
// is in src/utils/satelliteFeed.ts, so another host can wrap it the same way.
import { handleSatellitesRequest } from '../src/utils/satelliteFeed';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleSatellitesRequest(request);
}
