import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import SceneInfoCard, { CARD_CLOSE_MS } from '../src/components/SceneInfoCard';
import { type SceneInfo } from '../src/utils/sceneInfo';

// ROADMAP item 95: the glass card above the tapped point. Item 107: the field guide look.
const INFO: SceneInfo = {
  kicker: 'infoKind.water',
  icon: 'water',
  title: 'fish.perch',
  latin: 'Perca fluviatilis',
  lines: [
    { value: { key: 'info.dayFish' } },
    { label: 'info.rarity', value: { key: 'info.rarityValue', vars: { tier: { key: 'rarity.common' }, share: '14' } }, tier: 'common' },
  ],
  fact: { label: 'info.fieldNote', text: 'fishFact.perch' },
  tier: 'common',
};

describe('SceneInfoCard (ROADMAP item 95)', () => {
  const show = (x = 200, y = 400, info: SceneInfo = INFO) => {
    const onClose = vi.fn();
    render(<div><button type="button">elsewhere</button><SceneInfoCard info={info} x={x} y={y} onClose={onClose} /></div>);
    return onClose;
  };
  const card = () => screen.getByTestId('scene-info-card');

  afterEach(() => vi.useRealTimers());

  it('shows the title and the rows in the glass style with 18 px corners', () => {
    show();
    expect(screen.getByRole('dialog', { name: 'Perch' })).toBeInTheDocument();
    expect(card()).toHaveTextContent('Day fish');
    expect(card()).toHaveTextContent('Common · 14 %');
    expect(card().className).toContain('rounded-panel');
    expect(card().className).toContain('backdrop-blur-md');
    expect(card()).toHaveAttribute('data-share-hide');
  });

  it('is a field guide entry: kicker, Latin name, rows with leaders, the fact as a field note last (item 107)', () => {
    show();
    const kicker = screen.getByTestId('scene-info-kicker');
    expect(kicker).toHaveTextContent('Water life');
    expect(kicker.className).toContain('uppercase');
    expect(kicker.className).toContain('text-kind-water');
    expect(kicker.querySelector('svg')).not.toBeNull();
    const latin = screen.getByText('Perca fluviatilis');
    expect(latin.className).toContain('italic');
    expect(card().querySelector('hr')).not.toBeNull();
    expect(card().querySelector('.border-dotted')).not.toBeNull();
    expect(screen.getByTestId('rarity-meter').querySelectorAll('i')).toHaveLength(4);
    const note = screen.getByText('Field note');
    expect(note.nextElementSibling).toHaveTextContent('Its dark stripes hide the perch among water plants.');
    expect(card().lastElementChild).toContainElement(note);
  });

  it('uses the denser 58 % glass and a faint outline in the rarity tier colour (item 107)', () => {
    show();
    expect(card().className).toContain('hsl(var(--panel-background)/0.58)');
    expect(card().className).toContain('border-tier-common/50');
    expect(card().className).not.toContain('/0.45)');
  });

  it('keeps the neutral border without a tier, and no Latin line when it is the title (item 107)', () => {
    show(200, 400, {
      kicker: 'infoKind.cloud', icon: 'cloud', title: 'cloud.Cu', latin: 'Cumulus',
      lines: [{ label: 'info.layer', value: { key: 'info.layerLow' } }],
      fact: { label: 'info.cloudFact', text: 'cloudFact.Cu' }, tier: null,
    });
    expect(card().className).toContain('border-[hsl(var(--panel-border)/0.14)]');
    expect(card().className).not.toMatch(/border-tier-/);
    expect(screen.getAllByText('Cumulus')).toHaveLength(1); // the title only
    expect(screen.getByText('Cloud fact')).toBeInTheDocument();
    expect(screen.queryByTestId('rarity-meter')).toBeNull();
  });

  it('fades in from 96 % (item 107)', () => {
    show();
    expect(card().className).toContain('animate-card-in');
  });

  it('sits above the tapped point, and inside the screen near an edge', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
    try {
      show(300, 400);
      expect(card().style.left).toBe('200px'); // centred on x
      expect(card().style.top).toBe('286px'); // 14 px above y
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('stays inside the screen at the right edge and goes below the point at the top', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
    try {
      show(window.innerWidth - 5, 50);
      expect(card().style.left).toBe(`${window.innerWidth - 208}px`);
      expect(card().style.top).toBe('64px');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('closes on a tap outside, not on a tap on the card', () => {
    const onClose = show();
    fireEvent.pointerDown(card());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText('elsewhere'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = show();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes after 15 s', () => {
    vi.useFakeTimers();
    const onClose = show();
    act(() => { vi.advanceTimersByTime(CARD_CLOSE_MS - 1); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
