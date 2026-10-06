// Vercel Edge function: GET /api/planes?lat=..&lon=.. (ROADMAP item 96, the live radar).
// Vercel deploys each file in /api as a function, also in a Vite project. The logic is in
// src/utils/planeFeed.ts, so another host can wrap it the same way.
import { handlePlanesRequest } from '../src/utils/planeFeed';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handlePlanesRequest(request);
}
