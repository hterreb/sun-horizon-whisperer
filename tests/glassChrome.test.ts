import { GLASS_SURFACE, GLASS_ICON_BUTTON, GLASS_CARD_SURFACE } from '../src/utils/glassChrome';

describe('glassChrome (ROADMAP item 15, direction D)', () => {
  it('GLASS_SURFACE uses the panel-background/panel-border tokens with the D alpha values', () => {
    expect(GLASS_SURFACE).toContain('hsl(var(--panel-background)/0.45)');
    expect(GLASS_SURFACE).toContain('hsl(var(--panel-border)/0.14)');
    expect(GLASS_SURFACE).toContain('backdrop-blur-md');
  });

  it('GLASS_ICON_BUTTON builds on GLASS_SURFACE and is fully rounded with a focus ring', () => {
    expect(GLASS_ICON_BUTTON).toContain(GLASS_SURFACE);
    expect(GLASS_ICON_BUTTON).toContain('rounded-full');
    expect(GLASS_ICON_BUTTON).toContain('focus-visible:ring-2');
  });

  it('GLASS_ICON_BUTTON keeps the icon white on hover, as :hover stays after a tap (ROADMAP item 81)', () => {
    expect(GLASS_ICON_BUTTON).toContain('hover:text-white');
  });

  it('GLASS_CARD_SURFACE is the denser 58 % glass of the info card, with no border colour (ROADMAP item 107)', () => {
    expect(GLASS_CARD_SURFACE).toContain('hsl(var(--panel-background)/0.58)');
    expect(GLASS_CARD_SURFACE).toContain('backdrop-blur-md');
    expect(GLASS_CARD_SURFACE).not.toContain('--panel-border');
    expect(GLASS_SURFACE).toContain('/0.45)'); // the other panels keep 45 %
  });
});
