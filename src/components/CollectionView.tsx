import React, { useEffect } from 'react';
import {
  Cat, Eclipse, Flame, Glasses, Moon, MoonStar, Mountain, PartyPopper, Rainbow, Satellite,
  Snowflake, Sparkles, Star, Sun, SunMoon, Sunset, X, type LucideIcon,
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import SceneFish from '@/components/SceneFish';
import { VisitorShape } from '@/components/SceneVisitor';
import SceneBird from '@/components/SceneBird';
import SceneBoat from '@/components/SceneBoat';
import ScenePlane from '@/components/ScenePlane';
import { UfoShape } from '@/components/Ufo';
import { SantaShape } from '@/components/Santa';
import { Bat } from '@/components/sceneIcons';
import { useLanguage } from '@/hooks/useLanguage';
import { type MessageKey } from '@/i18n';
import { BADGES, countCollected, type Badge, type BadgeGroup, type Collection, type EggKind } from '@/utils/collection';
import { CLOUD_SHAPES, type CloudType } from '@/utils/cloudShapes';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { type BirdKind, type BoatKind, type FishKind } from '@/utils/weatherEffectsUtils';

// Collection view (ROADMAP item 112): every badge in a grid, by group. A found badge
// shows its art in colour, its name, rarity tier and first-seen date. A missing scene
// badge shows only a grey outline of its shape, a missing egg only "?": names stay hidden.
// Hand-built modal like PremiumDialog (src/components/ui has no dialog).

interface CollectionViewProps {
  open: boolean;
  onClose(): void;
  collection: Collection;
}

const GROUP_TITLES: Record<BadgeGroup, MessageKey> = {
  fish: 'collection.fish',
  flyer: 'collection.flyers',
  boat: 'collection.boats',
  sky: 'collection.sky',
  cloud: 'collection.clouds',
  egg: 'collection.eggs',
};
const GROUPS = Object.keys(GROUP_TITLES) as BadgeGroup[];

const OUTLINE_FILTER_ID = 'badge-outline';

const EGG_ICONS: Record<Exclude<EggKind, 'ufo' | 'santa'>, [LucideIcon, string]> = {
  sunglasses: [Glasses, 'text-white'],
  disco: [Sparkles, 'text-brand-cyan'],
  newYear: [PartyPopper, 'text-brand-gold-light'],
  friday13: [Cat, 'text-white'],
  lunarNewYear: [Flame, 'text-brand-coral'],
  solstice: [SunMoon, 'text-brand-gold-light'],
  equinox: [Sunset, 'text-brand-peach'],
  halloweenPumpkin: [MoonStar, 'text-brand-sunset'],
  halloweenBats: [Bat, 'text-white'],
  christmas: [Snowflake, 'text-white'],
  solarEclipse: [Eclipse, 'text-brand-gold'],
  lunarEclipse: [Moon, 'text-brand-coral'],
  greenFlash: [Sunset, 'text-green-400'],
  supermoon: [Moon, 'text-white'],
  blueMoon: [Moon, 'text-brand-sky'],
  meteorShower: [Star, 'text-brand-gold-light'],
  aurora: [Rainbow, 'text-brand-cyan'],
};

const SKY_ICONS: Record<'sun' | 'moon' | 'terrain' | 'satellite', [LucideIcon, string]> = {
  sun: [Sun, 'text-brand-gold'],
  moon: [Moon, 'text-white'],
  terrain: [Mountain, 'text-white'],
  satellite: [Satellite, 'text-white'],
};

const BadgeArt = ({ badge }: { badge: Badge }) => {
  const [prefix, kind] = badge.id.split(':') as [string, string | undefined];
  switch (prefix) {
    case 'fish':
      return kind === 'shark' || kind === 'dolphins'
        ? <VisitorShape kind={kind} width={52} />
        : <SceneFish kind={kind as Exclude<FishKind, 'shark' | 'dolphins'>} size={40} />;
    case 'flyer':
      return kind === 'bat'
        ? <Bat size={32} className="text-white" />
        : <SceneBird kind={kind as BirdKind} width={48} className="text-white" />;
    case 'boat':
      // The clip hides the boat's reflection below the waterline.
      return <div className="overflow-hidden"><SceneBoat kind={kind as BoatKind} tone="day" lit={false} wake={false} /></div>;
    case 'plane':
      return <span className="text-white"><ScenePlane width={48} /></span>;
    case 'cloud':
      return (
        <svg width={64} height={32} viewBox="0 0 120 60" aria-hidden="true">
          <path d={CLOUD_SHAPES[kind as CloudType][0].d} className="fill-white/85" />
        </svg>
      );
    case 'egg': {
      if (kind === 'ufo') return <UfoShape width={52} />;
      if (kind === 'santa') return <SantaShape width={64} />;
      const [Icon, colour] = EGG_ICONS[kind as Exclude<EggKind, 'ufo' | 'santa'>];
      return <Icon size={32} className={colour} aria-hidden="true" />;
    }
    default: {
      const [Icon, colour] = SKY_ICONS[prefix as keyof typeof SKY_ICONS];
      return <Icon size={32} className={colour} aria-hidden="true" />;
    }
  }
};

const formatFoundDate = (iso: string, language: string): string | null => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
};

const CollectionView: React.FC<CollectionViewProps> = ({ open, onClose, collection }) => {
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const found = countCollected(collection);

  const renderBadge = (badge: Badge) => {
    const firstSeen = collection[badge.id];
    const cell = 'flex h-32 flex-col items-center justify-start gap-0.5 rounded-lg border p-1.5 text-center';
    const artBox = 'flex h-12 w-full items-center justify-center overflow-hidden';
    if (firstSeen === undefined) {
      return (
        <li key={badge.id} data-missing="" aria-label={t('collection.missing')} className={`${cell} border-white/5 bg-white/5`}>
          {badge.group === 'egg' ? (
            <div className={`${artBox} text-title font-bold text-white/50`} aria-hidden="true">?</div>
          ) : (
            <div className={artBox} style={{ filter: `url(#${OUTLINE_FILTER_ID})` }} aria-hidden="true">
              <BadgeArt badge={badge} />
            </div>
          )}
        </li>
      );
    }
    const date = formatFoundDate(firstSeen, language);
    return (
      <li key={badge.id} className={`${cell} border-white/15 bg-white/10`}>
        <div className={artBox} aria-hidden="true"><BadgeArt badge={badge} /></div>
        <span className="text-caption font-semibold leading-tight line-clamp-2 w-full">{t(badge.name)}</span>
        {badge.rarity && <span className="text-caption opacity-75">{t(badge.rarity)}</span>}
        {date && <span className="text-caption leading-tight opacity-60">{t('collection.firstSeen', { date })}</span>}
      </li>
    );
  };

  return (
    // Full screen on phones, a card on wider screens.
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 max-sm:p-0" onClick={onClose}>
      {/* Grey outline of a shape (missing badges): the shape's alpha grown by 1 px, minus the shape. */}
      <svg width={0} height={0} className="absolute" aria-hidden="true">
        <filter id={OUTLINE_FILTER_ID}>
          <feMorphology in="SourceAlpha" operator="dilate" radius={1} result="grown" />
          <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
          <feFlood style={{ floodColor: 'rgb(255 255 255 / 0.4)' }} />
          <feComposite in2="ring" operator="in" />
        </filter>
      </svg>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-title"
        className={`${GLASS_SURFACE} rounded-panel w-full max-w-md text-white flex flex-col max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:pt-[env(safe-area-inset-top)] max-sm:pb-[env(safe-area-inset-bottom)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 pb-2">
          <h2 id="collection-title" className="text-title font-bold">{t('collection.title')}</h2>
          <span className="text-body opacity-75">{t('collection.count', { found, total: BADGES.length })}</span>
          <button
            type="button"
            aria-label={t('collection.close')}
            className="ml-auto rounded-full p-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            onClick={onClose}
            autoFocus
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ScrollArea className="h-[min(70dvh,560px)] max-sm:h-auto max-sm:flex-1 max-sm:min-h-0">
          <div className="px-4 pb-4 space-y-4">
            {GROUPS.map((group) => (
              <section key={group} aria-labelledby={`collection-${group}`}>
                <h3 id={`collection-${group}`} className="text-body font-semibold opacity-90 mb-2">{t(GROUP_TITLES[group])}</h3>
                <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {BADGES.filter((badge) => badge.group === group).map(renderBadge)}
                </ul>
              </section>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default CollectionView;
