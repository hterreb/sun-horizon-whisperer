// Shot list for the international Play Store cut. Each shot runs in its city's own time zone
// on 2026-10-05 (today's real weather and forecast), unless noted.
// Phone shots: 390x844 @2 (780x1688). FULL shots: 432x768 @2.5 (1080x1920), app UI hidden.
const CITY = {
  santorini: [[36.46, 25.38, 'Santorini'], 'Europe/Athens', '+03:00'],
  hongkong: [[22.28, 114.16, 'Hong Kong'], 'Asia/Hong_Kong', '+08:00'],
  london: [[51.51, -0.13, 'London'], 'Europe/London', '+01:00'],
  miami: [[25.76, -80.19, 'Miami'], 'America/New_York', '-04:00'],
  newyork: [[40.71, -74.01, 'New York'], 'America/New_York', '-04:00'],
  sanfrancisco: [[37.77, -122.42, 'San Francisco'], 'America/Los_Angeles', '-07:00'],
  paris: [[48.86, 2.35, 'Paris'], 'Europe/Paris', '+02:00'],
  honolulu: [[21.31, -157.86, 'Honolulu'], 'Pacific/Honolulu', '-10:00'],
  tromso: [[69.65, 18.96, 'Tromsø'], 'Europe/Oslo', '+02:00'],
  tokyo: [[35.68, 139.69, 'Tokyo'], 'Asia/Tokyo', '+09:00'],
  losangeles: [[34.05, -118.24, 'Los Angeles'], 'America/Los_Angeles', '-07:00'],
  roswell: [[33.39, -104.52, 'Roswell'], 'America/Denver', '-06:00'],
  ibiza: [[38.91, 1.43, 'Ibiza'], 'Europe/Madrid', '+02:00'],
};
// at('paris', '18:50') → { loc, tz, time } in that city's local time today.
const at = (city, hhmm, day = '2026-10-05') => {
  const [loc, tz, off] = CITY[city];
  return { loc, tz, time: `${day}T${hhmm}:00${off}` };
};
const FULL = { w: 432, h: 768, dpr: 2.5, hideUi: true };
const openPanel = (p) => p.getByLabel('Expand info panel').click();
const closePanel = (p) => p.getByLabel('Collapse info panel').click();
const setWeather = async (p, kind) => {
  await p.getByRole('button', { name: 'Manual' }).click();
  await p.getByRole('button', { name: kind, exact: true }).click();
};
const weather = (kind) => async (p) => { await openPanel(p); await setWeather(p, kind); await closePanel(p); };
const playForward = async (p) => { await openPanel(p); await p.getByLabel('Play time forward').click(); await closePanel(p); };
// Fill the scene with spawns (boats, birds, fish) before the first frame.
const FILL = { preroll: 60, prerollDt: 1000 };
const egg = (city, hhmm, q, extra = {}) => ({ ...FULL, ...at(city, hhmm), query: `?egg=${q}`, frames: 24, ...extra });
const konami = async (p) => {
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await p.keyboard.press(k);
};

export const SHOTS = {
  hook: { ...FULL, ...FILL, ...at('santorini', '18:33'), frames: 80 },
  phonein: { ...at('santorini', '18:33'), ...FILL, frames: 126, atFrame: { 28: openPanel } },
  // App time of frame i = 18:20 + 600 × (i + 4) × 110 ms (ad.html's clock relies on this).
  timelapse: { ...at('santorini', '18:20'), ...FILL, frames: 142, dt: 110, setup: playForward, preroll: 3, prerollDt: 110 },
  terrain: { ...at('hongkong', '16:36'), ...FILL, frames: 100, setup: async (p) => { await weather('Clear')(p); await playForward(p); }, preroll: 3, prerollDt: 33 },
  rain: { ...at('london', '16:30'), frames: 30, setup: weather('Rain'), preroll: 40, prerollDt: 200 },
  storm: { ...at('miami', '18:15'), frames: 30, setup: weather('Storm'), preroll: 40, prerollDt: 200 },
  snow: { ...at('newyork', '12:30'), frames: 30, setup: weather('Snow'), preroll: 40, prerollDt: 200 },
  fog: { ...at('sanfrancisco', '08:30'), frames: 30, setup: weather('Fog'), preroll: 40, prerollDt: 200 },
  golden: {
    ...at('paris', '18:50'), frames: 80,
    setup: async (p) => {
      await openPanel(p);
      await p.getByLabel('Expand golden & blue hour').click();
      await p.getByLabel('Collapse golden & blue hour').evaluate((el) => {
        let s = el.parentElement;
        while (s && s.scrollHeight <= s.clientHeight + 1) s = s.parentElement;
        s?.scrollBy(0, el.getBoundingClientRect().top - 300);
      });
    },
  },
  calm: { ...FULL, ...at('honolulu', '16:40'), preroll: 90, prerollDt: 1000, frames: 54 },
  aurora: egg('tromso', '22:30', 'aurora', { setup: weather('Clear'), preroll: 40, prerollDt: 200 }),
  // Sydney New Year: the show starts at local midnight; the preroll lands 2 s into it.
  fireworks: { ...FULL, loc: [-33.86, 151.21, 'Sydney'], tz: 'Australia/Sydney', time: '2026-12-31T23:59:58+11:00', frames: 24, preroll: 120 },
  eclipse: egg('tokyo', '12:30', 'solarEclipse'),
  sunglasses: egg('losangeles', '14:00', 'sunglasses'),
  // The UFO starts at page load and flies off: freeze the clock at once.
  ufo: egg('roswell', '23:00', 'ufo', { pauseNow: true, preroll: 10, frames: 60 }),
  disco: { ...FULL, ...at('ibiza', '23:00'), frames: 24, setup: konami, preroll: 40 },
};
