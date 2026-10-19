import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces, formatGeocodeResultLabel, type GeocodeResult } from '../utils/geocodeUtils';
import { FOCUS_RING } from './InfoPanel';
import { useLanguage } from '@/hooks/useLanguage';

interface PlaceSearchProps {
  onSelect: (latitude: number, longitude: number, name: string, countryCode?: string, timeZone?: string) => void;
  autoFocus?: boolean;
}

// Place-name search (ROADMAP item 12), shared by InfoPanel's "Change location" form
// and the loading screen's "Choose a place" (ROADMAP item 39). Each opening mounts a
// fresh instance, so the query and results start empty every time.
const PlaceSearch: React.FC<PlaceSearchProps> = ({ onSelect, autoFocus }) => {
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  // The query the shown results belong to: Enter picks a result only for the text in the field.
  const [resultsFor, setResultsFor] = useState('');
  const placeAbortRef = useRef<AbortController | null>(null);
  // Enter before the results of the typed text came: the first result is picked when they come.
  const enterPendingRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const { t, language } = useLanguage();

  // Debounced search: waits 300ms after typing stops, ignores queries under 2
  // characters, and aborts a request superseded by a newer one so a slow response
  // can never clobber the results of a later query.
  useEffect(() => {
    const trimmed = placeQuery.trim();
    if (trimmed.length < 2) {
      placeAbortRef.current?.abort();
      const timeoutId = setTimeout(() => {
        setPlaceResults([]);
        setPlaceSearchStatus('idle');
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      placeAbortRef.current?.abort();
      const controller = new AbortController();
      placeAbortRef.current = controller;
      setPlaceSearchStatus('loading');

      searchPlaces(trimmed, controller.signal, language)
        .then((results) => {
          if (controller.signal.aborted) return;
          setPlaceResults(results);
          setResultsFor(trimmed);
          setPlaceSearchStatus('done');
          const first = results[0];
          if (enterPendingRef.current && first) {
            enterPendingRef.current = false;
            onSelectRef.current(first.latitude, first.longitude, formatGeocodeResultLabel(first), first.countryCode, first.timeZone);
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error('Error searching places:', error);
          setPlaceResults([]);
          setPlaceSearchStatus('error');
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [placeQuery, language]);

  // Abort any in-flight search on unmount.
  useEffect(() => {
    return () => {
      placeAbortRef.current?.abort();
    };
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="manual-location-search" className="opacity-80">{t('search.label')}</label>
      <input
        id="manual-location-search"
        type="text"
        value={placeQuery}
        onChange={(e) => {
          enterPendingRef.current = false;
          setPlaceQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          // Item 165: Enter picks the first result of the typed text, now or when the results
          // come. It never submits the surrounding form, which would set the coordinate fields
          // and drop the search.
          e.preventDefault();
          const first = resultsFor === placeQuery.trim() ? placeResults[0] : undefined;
          if (first) onSelect(first.latitude, first.longitude, formatGeocodeResultLabel(first), first.countryCode, first.timeZone);
          else enterPendingRef.current = placeQuery.trim().length >= 2;
        }}
        placeholder={t('search.placeholder')}
        className={`bg-black/30 rounded px-2 py-1 text-white ${FOCUS_RING}`}
        role="combobox"
        aria-expanded={placeResults.length > 0}
        aria-controls="manual-location-search-results"
        aria-autocomplete="list"
        autoFocus={autoFocus}
      />
      {placeSearchStatus === 'loading' && (
        <p className="opacity-70">{t('search.searching')}</p>
      )}
      {placeSearchStatus === 'error' && (
        // Item 176: offline, say so instead of "Could not search for places."
        <p role="alert" className="text-brand-coral">{t(navigator.onLine ? 'search.error' : 'search.offline')}</p>
      )}
      {placeSearchStatus === 'done' && placeResults.length === 0 && (
        <p className="opacity-70">{t('search.noResults')}</p>
      )}
      {placeResults.length > 0 && (
        <ul
          id="manual-location-search-results"
          role="listbox"
          aria-label={t('search.results')}
          className="space-y-1"
        >
          {placeResults.map((result, index) => (
            <li key={`${result.latitude}-${result.longitude}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onSelect(result.latitude, result.longitude, formatGeocodeResultLabel(result), result.countryCode, result.timeZone)}
                className={`w-full text-left px-2 py-1 rounded bg-white/5 hover:bg-white/20 transition-colors ${FOCUS_RING}`}
              >
                {formatGeocodeResultLabel(result)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceSearch;
