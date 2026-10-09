import { getEasterSunday } from '@/utils/easterDate';

// Item 118: the anonymous Gregorian algorithm against published Western Easter dates.
describe('getEasterSunday', () => {
  it.each([
    [2000, 3, 23], [2008, 2, 23], [2011, 3, 24], [2019, 3, 21], [2024, 2, 31], [2025, 3, 20],
    [2026, 3, 5], [2027, 2, 28], [2028, 3, 16], [2029, 3, 1], [2030, 3, 21], [2031, 3, 13],
    [2032, 2, 28], [2033, 3, 17], [2034, 3, 9], [2035, 2, 25], [2038, 3, 25], [2285, 2, 22],
  ])('Easter %i is on month %i day %i (0-based month)', (year, month, day) => {
    const easter = getEasterSunday(year);
    expect([easter.getFullYear(), easter.getMonth(), easter.getDate()]).toEqual([year, month, day]);
    expect(easter.getDay()).toBe(0); // a Sunday
  });
});
