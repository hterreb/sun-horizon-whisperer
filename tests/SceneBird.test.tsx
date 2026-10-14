import { render } from '@testing-library/react';
import SceneBird from '../src/components/SceneBird';

describe('SceneBird: the gull (ROADMAP item 149, G1)', () => {
  it('draws the soft "m" with a small body and head on the 48 x 24 grid', () => {
    const { container } = render(<SceneBird kind="gull" width={34} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 48 24');
    expect(svg.getAttribute('width')).toBe('34');
    expect(svg.getAttribute('height')).toBe('17');
    const paths = [...svg.querySelectorAll('path')].map(path => path.getAttribute('d'));
    expect(paths).toEqual([
      'M24 13.4C20.4 7.6 14.6 5 9.8 6C6.2 6.8 3.2 10 0.8 14.4C4 11.4 6.8 9.6 9.9 9.3C14.2 8.9 18.6 11.6 22.4 16.2Z',
      'M24 13.4C27.6 7.6 33.4 5 38.2 6C41.8 6.8 44.8 10 47.2 14.4C44 11.4 41.2 9.6 38.1 9.3C33.8 8.9 29.4 11.6 25.6 16.2Z',
      'M21.6 15.6a2.4 3.4 0 1 0 4.8 0a2.4 3.4 0 1 0 -4.8 0Z', // the body
      'M22.1 12.4a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0Z', // the head
    ]);
  });

  it('keeps the starling\'s four-pointed sparkle (B0)', () => {
    const { container } = render(<SceneBird kind="starlings" width={4} />);
    expect(container.querySelector('path')!.getAttribute('d')).toBe('M24 7 26.2 13.4 36 15 26.2 16.6 24 23 21.8 16.6 12 15 21.8 13.4Z');
  });
});
