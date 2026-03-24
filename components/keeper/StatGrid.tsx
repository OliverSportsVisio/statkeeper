"use client";

import type { StatType } from "@/lib/types";

interface Props {
  onStat: (stat: StatType) => void;
  playerLabel: string; // e.g. "#55 Smith"
}

interface StatButton {
  label: string;
  stat: StatType;
  color: string;
  bg: string;
}

const SCORING: StatButton[] = [
  { label: "+1 FT", stat: "ft_made", color: "#0A0A0F", bg: "var(--green)" },
  { label: "+2 FG", stat: "2pt_made", color: "#0A0A0F", bg: "var(--green)" },
  { label: "+3 PT", stat: "3pt_made", color: "#0A0A0F", bg: "var(--accent)" },
];

const MISSES: StatButton[] = [
  { label: "FT Miss", stat: "ft_miss", color: "var(--red)", bg: "rgba(255,92,92,0.15)" },
  { label: "2PT Miss", stat: "2pt_miss", color: "var(--red)", bg: "rgba(255,92,92,0.15)" },
  { label: "3PT Miss", stat: "3pt_miss", color: "var(--red)", bg: "rgba(255,92,92,0.15)" },
];

const REBOUNDS: StatButton[] = [
  { label: "OFF REB", stat: "offensive_rebound", color: "var(--accent)", bg: "rgba(254,198,121,0.12)" },
  { label: "DEF REB", stat: "defensive_rebound", color: "var(--accent)", bg: "rgba(254,198,121,0.12)" },
];

const PLAYMAKING: StatButton[] = [
  { label: "ASSIST", stat: "assist", color: "var(--green)", bg: "rgba(66,245,102,0.12)" },
  { label: "STEAL", stat: "steal", color: "var(--green)", bg: "rgba(66,245,102,0.12)" },
  { label: "BLOCK", stat: "block", color: "var(--green)", bg: "rgba(66,245,102,0.12)" },
  { label: "TURNOVER", stat: "turnover", color: "var(--red)", bg: "rgba(255,92,92,0.12)" },
];

const FOULS: StatButton[] = [
  { label: "FOUL", stat: "personal_foul", color: "var(--yellow)", bg: "rgba(255,159,67,0.12)" },
  { label: "TECH", stat: "technical_foul", color: "var(--red)", bg: "rgba(255,92,92,0.12)" },
  { label: "FLAGRANT", stat: "flagrant_foul", color: "var(--red)", bg: "rgba(255,92,92,0.12)" },
];

function ButtonRow({ buttons, onStat }: { buttons: StatButton[]; onStat: (s: StatType) => void }) {
  return (
    <div className="flex gap-2">
      {buttons.map(({ label, stat, color, bg }) => (
        <button
          key={stat}
          onClick={() => onStat(stat)}
          className="stat-btn flex-1 py-3 text-sm font-bold"
          style={{ backgroundColor: bg, color }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function StatGrid({ onStat, playerLabel }: Props) {
  return (
    <div className="space-y-3">
      {/* Selected player indicator */}
      <div className="text-center">
        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">
          Recording for
        </span>
        <span className="ml-2 text-[var(--accent)] font-bold text-sm">
          {playerLabel}
        </span>
      </div>

      {/* Scoring — big buttons */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-semibold">
          Made Shots
        </div>
        <div className="flex gap-2">
          {SCORING.map(({ label, stat, color, bg }) => (
            <button
              key={stat}
              onClick={() => onStat(stat)}
              className="score-btn flex-1"
              style={{ backgroundColor: bg, color }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Misses */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-semibold">
          Missed Shots
        </div>
        <ButtonRow buttons={MISSES} onStat={onStat} />
      </div>

      {/* Rebounds */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-semibold">
          Rebounds
        </div>
        <ButtonRow buttons={REBOUNDS} onStat={onStat} />
      </div>

      {/* Playmaking */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-semibold">
          Playmaking
        </div>
        <ButtonRow buttons={PLAYMAKING} onStat={onStat} />
      </div>

      {/* Fouls */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-semibold">
          Fouls
        </div>
        <ButtonRow buttons={FOULS} onStat={onStat} />
      </div>
    </div>
  );
}
