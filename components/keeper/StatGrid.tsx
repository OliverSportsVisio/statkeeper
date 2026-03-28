"use client";

import type { StatType, ChainStep } from "@/lib/types";

interface Props {
  onStat: (stat: StatType) => void;
  playerLabel: string; // e.g. "#55 Smith"
  disabled?: boolean; // true when a chain is active
  activeChain: ChainStep;
}

interface StatButton {
  label: string;
  shortcut: string;
  stat: StatType;
  color: string;
  bg: string;
}

const SCORING: StatButton[] = [
  { label: "+2 FG", shortcut: "Q", stat: "2pt_made", color: "#0A0A0F", bg: "var(--green)" },
  { label: "+3 PT", shortcut: "W", stat: "3pt_made", color: "#0A0A0F", bg: "var(--accent)" },
  { label: "+1 FT", shortcut: "E", stat: "ft_made", color: "#0A0A0F", bg: "var(--green)" },
];

const MISSES: StatButton[] = [
  { label: "2PT Miss", shortcut: "A", stat: "2pt_miss", color: "var(--red)", bg: "rgba(255,92,92,0.15)" },
  { label: "3PT Miss", shortcut: "S", stat: "3pt_miss", color: "var(--red)", bg: "rgba(255,92,92,0.15)" },
  { label: "FT Miss", shortcut: "D", stat: "ft_miss", color: "var(--red)", bg: "rgba(255,92,92,0.15)" },
];

const REBOUNDS: StatButton[] = [
  { label: "OFF REB", shortcut: "R", stat: "offensive_rebound", color: "var(--accent)", bg: "rgba(254,198,121,0.12)" },
  { label: "DEF REB", shortcut: "F", stat: "defensive_rebound", color: "var(--accent)", bg: "rgba(254,198,121,0.12)" },
];

const PLAYMAKING: StatButton[] = [
  { label: "ASSIST", shortcut: "T", stat: "assist", color: "var(--green)", bg: "rgba(66,245,102,0.12)" },
  { label: "STEAL", shortcut: "G", stat: "steal", color: "var(--green)", bg: "rgba(66,245,102,0.12)" },
  { label: "BLOCK", shortcut: "Z", stat: "block", color: "var(--green)", bg: "rgba(66,245,102,0.12)" },
  { label: "TURNOVER", shortcut: "X", stat: "turnover", color: "var(--red)", bg: "rgba(255,92,92,0.12)" },
];

const FOULS: StatButton[] = [
  { label: "FOUL", shortcut: "C", stat: "personal_foul", color: "var(--yellow)", bg: "rgba(255,159,67,0.12)" },
  { label: "OFF FOUL", shortcut: "", stat: "offensive_foul", color: "var(--yellow)", bg: "rgba(255,159,67,0.12)" },
  { label: "TECH", shortcut: "V", stat: "technical_foul", color: "var(--red)", bg: "rgba(255,92,92,0.12)" },
  { label: "FLAGRANT", shortcut: "", stat: "flagrant_foul", color: "var(--red)", bg: "rgba(255,92,92,0.12)" },
];

function ButtonRow({
  buttons,
  onStat,
  disabled,
}: {
  buttons: StatButton[];
  onStat: (s: StatType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {buttons.map(({ label, shortcut, stat, color, bg }) => (
        <button
          key={stat}
          onClick={() => onStat(stat)}
          disabled={disabled}
          className="stat-btn flex-1 py-2.5 text-xs font-bold relative"
          style={{
            backgroundColor: bg,
            color,
            opacity: disabled ? 0.3 : 1,
            pointerEvents: disabled ? "none" : "auto",
          }}
        >
          {label}
          {shortcut && (
            <span className="absolute top-0.5 right-1 text-[9px] opacity-40 font-mono">
              {shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function StatGrid({ onStat, playerLabel, disabled, activeChain }: Props) {
  const isChainActive = !!activeChain;
  const isDisabled = disabled || isChainActive;

  return (
    <div className="space-y-2">
      {/* Selected player indicator */}
      {playerLabel && (
        <div className="text-center pb-1">
          <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
            Recording for
          </span>
          <span className="ml-1.5 text-[var(--accent)] font-bold text-xs">
            {playerLabel}
          </span>
        </div>
      )}

      {/* Scoring — big buttons */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5 font-semibold">
          Made Shots
        </div>
        <div className="flex gap-1.5">
          {SCORING.map(({ label, shortcut, stat, color, bg }) => (
            <button
              key={stat}
              onClick={() => onStat(stat)}
              disabled={isDisabled}
              className="score-btn flex-1 relative"
              style={{
                backgroundColor: bg,
                color,
                opacity: isDisabled ? 0.3 : 1,
                pointerEvents: isDisabled ? "none" : "auto",
              }}
            >
              {label}
              {shortcut && (
                <span className="absolute top-0.5 right-1 text-[9px] opacity-40 font-mono">
                  {shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Misses */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5 font-semibold">
          Missed Shots
        </div>
        <ButtonRow buttons={MISSES} onStat={onStat} disabled={isDisabled} />
      </div>

      {/* Rebounds */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5 font-semibold">
          Rebounds
        </div>
        <ButtonRow buttons={REBOUNDS} onStat={onStat} disabled={isDisabled} />
      </div>

      {/* Playmaking */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5 font-semibold">
          Playmaking
        </div>
        <ButtonRow buttons={PLAYMAKING} onStat={onStat} disabled={isDisabled} />
      </div>

      {/* Fouls */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5 font-semibold">
          Fouls
        </div>
        <ButtonRow buttons={FOULS} onStat={onStat} disabled={isDisabled} />
      </div>

      {!playerLabel && !isChainActive && (
        <p className="text-center text-[var(--text-muted)] text-xs pt-2">
          Select a player to record stats
        </p>
      )}
    </div>
  );
}

/** Keyboard shortcut map — used by keeper page */
export const KEYBOARD_STAT_MAP: Record<string, StatType> = {
  q: "2pt_made",
  w: "3pt_made",
  e: "ft_made",
  a: "2pt_miss",
  s: "3pt_miss",
  d: "ft_miss",
  r: "offensive_rebound",
  f: "defensive_rebound",
  t: "assist",
  g: "steal",
  z: "block",
  x: "turnover",
  c: "personal_foul",
  v: "technical_foul",
};
