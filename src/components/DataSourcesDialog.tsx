import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { type MessageKey } from '@/i18n';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { TERRAIN_SOURCE, TREE_COVER_SOURCE } from '@/utils/terrainTiles';
import { STREAMS } from '@/utils/radioStreams';

// Data sources (ROADMAP item 153): every data source with its credit and licence, and the
// privacy page. Hand-built modal like PremiumDialog (src/components/ui has no dialog). A portal
// to <body>: the panel's backdrop blur would hold a `fixed` overlay inside the panel.
// The provider names stay untranslated.
type Credit = { name: string; href?: string; licence?: { name: string; href: string } };

const CC_BY = { name: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' };
const ODBL = { name: 'ODbL', href: 'https://opendatacommons.org/licenses/odbl/' };
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
// With the slash: the page itself on Vercel, Cloudflare Pages (no redirect) and vite preview.
const PRIVACY_URL = '/privacy/';

const LINK = 'underline decoration-white/40 hover:decoration-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm';

interface DataSourcesDialogProps {
  onClose: () => void;
}

const DataSourcesDialog: React.FC<DataSourcesDialogProps> = ({ onClose }) => {
  const { t } = useLanguage();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const sources: { label: MessageKey; credits: Credit[] }[] = [
    { label: 'dataSources.weather', credits: [{ name: 'Open-Meteo', href: 'https://open-meteo.com/', licence: CC_BY }] },
    {
      label: 'dataSources.places',
      credits: [
        { name: 'BigDataCloud', href: 'https://www.bigdatacloud.com/' },
        { name: 'Photon', href: 'https://photon.komoot.io/' },
        { name: t('location.osmAttribution'), href: OSM_COPYRIGHT_URL, licence: ODBL },
      ],
    },
    {
      label: 'dataSources.search',
      credits: [
        { name: 'Open-Meteo', href: 'https://open-meteo.com/en/docs/geocoding-api' },
        { name: 'GeoNames', href: 'https://www.geonames.org/', licence: CC_BY },
      ],
    },
    { label: 'dataSources.planes', credits: [{ name: 'adsb.lol', href: 'https://adsb.lol/', licence: ODBL }] },
    { label: 'dataSources.satellites', credits: [{ name: 'CelesTrak', href: 'https://celestrak.org/' }] },
    {
      label: 'dataSources.terrain',
      // The attribution page lists the elevation sources the tiles are made from.
      credits: [{ name: TERRAIN_SOURCE, href: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md' }],
    },
    { label: 'dataSources.trees', credits: [{ name: TREE_COVER_SOURCE, href: 'https://esa-worldcover.org/', licence: CC_BY }] },
    { label: 'dataSources.radio', credits: STREAMS.map(({ name }) => ({ name })) },
  ];

  const link = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {text}
    </a>
  );

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-sources-title"
        className={`${GLASS_SURFACE} rounded-panel w-full max-w-sm max-h-full overflow-y-auto p-5 text-white space-y-3`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <h2 id="data-sources-title" className="text-title font-bold">{t('dataSources.title')}</h2>
          <button
            type="button"
            aria-label={t('collection.close')}
            className="ml-auto rounded-full p-2 -m-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            onClick={onClose}
            autoFocus
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <dl className="text-caption space-y-2">
          {sources.map(({ label, credits }) => (
            <div key={label}>
              <dt className="opacity-70">{t('common.labelColon', { label: t(label) })}</dt>
              <dd>
                {credits.map(({ name, href, licence }, index) => (
                  <React.Fragment key={name}>
                    {index > 0 && ' · '}
                    {href ? link(href, name) : name}
                    {licence && <> ({link(licence.href, licence.name)})</>}
                  </React.Fragment>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-caption border-t border-white/20 pt-3">{link(PRIVACY_URL, t('dataSources.privacy'))}</p>
      </div>
    </div>,
    document.body,
  );
};

export default DataSourcesDialog;
