// Removes location data from Sentry events and breadcrumbs before they leave the
// device (ROADMAP item 21). The Open-Meteo forecast URL carries latitude/longitude
// and the geocoding URL carries the searched place name, so every string in the
// payload has those query values replaced.

// Matches the key after any non-word character or at the string start (ROADMAP item
// 28), not only after `?`/`&` - a real request URL always has one of those, but a
// value logged inside a plain message (e.g. "... (latitude=47.65...") did not match
// before and leaked. Filtering too much is acceptable; filtering too little is not.
const LOCATION_PARAM = /\b((?:latitude|longitude|lat|lon|name)=)[^&#\s"']*/gi;
// Terrain tile URLs (line of sight, ROADMAP item 13) carry the location in the path:
// the z/x/y of a zoom-10/12 tile gives the user's area to a few km (AUDIT S-15).
const TERRAIN_TILE = /(\/terrarium\/)\d+\/\d+\/\d+/g;
const MAX_DEPTH = 10; // ponytail: Sentry payloads are shallow; deeper values pass through unscrubbed

export const scrubLocationString = (value: string): string =>
  value.replace(LOCATION_PARAM, '$1[Filtered]').replace(TERRAIN_TILE, '$1[Filtered]');

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
