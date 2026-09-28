// Removes location data from Sentry events and breadcrumbs before they leave the
// device (ROADMAP item 21). The Open-Meteo forecast URL carries latitude/longitude
// and the geocoding URL carries the searched place name, so every string in the
// payload has those query values replaced.

const LOCATION_PARAM = /([?&](?:latitude|longitude|lat|lon|name)=)[^&#\s"']*/gi;
const MAX_DEPTH = 10; // ponytail: Sentry payloads are shallow; deeper values pass through unscrubbed

export const scrubLocationString = (value: string): string =>
  value.replace(LOCATION_PARAM, '$1[Filtered]');

// Returns a scrubbed deep copy; strings anywhere in objects/arrays are filtered.
export const scrubLocation = <T>(value: T, depth = 0): T => {
  if (typeof value === 'string') return scrubLocationString(value) as T;
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => scrubLocation(item, depth + 1)) as T;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    copy[key] = scrubLocation(item, depth + 1);
  }
  return copy as T;
};
