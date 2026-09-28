import React from 'react';
import { TERRAIN_ATTRIBUTION } from '../utils/terrainTiles';
import { type HorizonProfileStatus } from '../hooks/useHorizonProfile';
import { ROW, FOCUS_RING } from './InfoPanel';

// Line of sight details (ROADMAP item 30): the block that opens below the sun rows
// or the moon rows when their Mountain icon button is clicked. One instance per body
// (sun, moon), each with its own eye-height input and attribution line, so either can
// be opened on its own.

interface LineOfSightRow {
  label: string;
  // Pre-formatted by formatTerrainDelta in InfoPanel.tsx, e.g. "07:44 (+27 min)", or
  // a plain-language fallback such as "sun stays behind terrain".
  value: string;
}

interface LineOfSightDetailsProps {
  terrainStatus: HorizonProfileStatus;
  rows: LineOfSightRow[];
  eyeHeightMeters: number;
  onEyeHeightChange: (meters: number) => void;
  // Keeps the eye-height input's id unique when both the sun and moon details are
  // open at once (e.g. "sun-terrain", "moon-terrain").
  idPrefix: string;
}

const LineOfSightDetails: React.FC<LineOfSightDetailsProps> = ({
  terrainStatus,
  rows,
  eyeHeightMeters,
  onEyeHeightChange,
  idPrefix,
}) => (
  <div className="mt-1 mb-1 space-y-1">
    {terrainStatus === 'loading' && (
      <p className="text-caption opacity-70">Loading terrain…</p>
    )}
    {terrainStatus === 'error' && (
      <p role="alert" className="text-caption text-brand-coral">Terrain unavailable</p>
    )}
    {terrainStatus === 'ready' && (
      <>
        {/* "behind terrain" once as a note, so each row below can stay a short value
            (ROADMAP item 30), e.g. "07:44 (+27 min)". */}
        <p className="text-caption opacity-60">Behind terrain</p>
        {rows.map((row) => (
          <div key={row.label} className={ROW}>
            <span className="opacity-80 text-caption">{row.label}:</span>
            <span className="text-caption tabular-nums text-brand-peach">{row.value}</span>
          </div>
        ))}
      </>
    )}

    <div className="flex flex-col gap-1 mt-2 text-caption">
      <label htmlFor={`${idPrefix}-eye-height`} className="opacity-80">Eye height (m) — e.g. floor, tower</label>
      <input
        id={`${idPrefix}-eye-height`}
        type="number"
        min={0}
        max={1000}
        step="any"
        value={eyeHeightMeters}
        onChange={(e) => onEyeHeightChange(Number(e.target.value))}
        className={`bg-black bg-opacity-30 rounded px-2 py-1 text-white w-24 tabular-nums ${FOCUS_RING}`}
      />
    </div>

    <p className="text-caption opacity-50 mt-1">{TERRAIN_ATTRIBUTION}</p>
  </div>
);

export default LineOfSightDetails;
