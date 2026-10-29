import { getCountdownCardData } from '@/utils/countdownCard';
import { getNextTurningPoint } from '@/utils/turningPoints';
import { loadDictionary } from '@/i18n';

// ROADMAP item 186 (C4): the texts of the countdown share card.
describe('getCountdownCardData', () => {
  const next = getNextTurningPoint(new Date('2026-10-28T11:00:00Z'), 47.78, 'Europe/Berlin');

  it('has the days, the turning point, the place and its moment', () => {
    expect(getCountdownCardData(next, 'Ravensburg', 'en', 'Europe/Berlin')).toEqual({
      big: '54',
      line: 'days until midwinter',
      placeLine: 'Ravensburg · Monday, December 21, 21:53',
      fileName: 'sun-chaser-midwinter-2026-12-21.png',
    });
  });

  it('says "1 day", names the day itself, and has no place without a name', () => {
    expect(getCountdownCardData({ ...next, days: 1 }, null, 'en', 'Europe/Berlin').line).toBe('day until midwinter');
    expect(getCountdownCardData({ ...next, days: 0 }, ' ', 'en', 'Europe/Berlin')).toMatchObject({
      big: 'Midwinter', line: 'is today', placeLine: 'Monday, December 21, 21:53',
    });
  });

  it('keeps the article with the name in German', async () => {
    await loadDictionary('de');
    expect(getCountdownCardData(next, 'Ravensburg', 'de', 'Europe/Berlin').line).toBe('Tage bis zur Wintersonnenwende');
  });
});
