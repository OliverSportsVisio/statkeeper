"use client";

import type { Player } from "@/lib/types";

interface Props {
  teamName: string;
  teamColor: string;
  players: Player[];
  selectedId: string | null;
  onSelect: (team: "home" | "away", playerId: string | null) => void;
  side: "home" | "away";
  compact?: boolean;
  focusedSide?: "home" | "away";
}

export function RosterPanel({
  teamName,
  teamColor,
  players,
  selectedId,
  onSelect,
  side,
  compact,
  focusedSide,
}: Props) {
  const isFocused = !focusedSide || focusedSide === side;

  return (
    <div className={`min-w-0 ${!isFocused ? "opacity-60" : ""}`}>
      <h3
        className={`font-bold uppercase tracking-wider mb-1.5 truncate text-center ${
          compact ? "text-[10px]" : "text-xs mb-2"
        }`}
        style={{ color: teamColor }}
      >
        {teamName}
      </h3>
      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        {players.map((p, idx) => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(side, isSelected ? null : p.id)}
              className={`roster-row w-full flex items-center gap-1.5 rounded-lg text-left transition-all ${
                compact ? "px-2 py-1.5" : "px-2.5 py-2"
              }`}
              style={{
                backgroundColor: isSelected
                  ? `${teamColor}25`
                  : "var(--bg-surface)",
                borderLeft: isSelected
                  ? `3px solid ${teamColor}`
                  : "3px solid transparent",
              }}
            >
              {/* Keyboard shortcut hint */}
              {compact && (
                <span className="text-[8px] text-[var(--text-muted)] font-mono w-3 shrink-0 opacity-40">
                  {idx < 9 ? idx + 1 : idx === 9 ? "0" : ""}
                </span>
              )}
              <span
                className={`tabular-nums font-bold shrink-0 ${
                  compact ? "text-sm" : "text-base"
                }`}
                style={{ color: isSelected ? teamColor : "var(--text-primary)" }}
              >
                #{p.number}
              </span>
              {p.name && (
                <span
                  className={`truncate ${compact ? "text-[10px]" : "text-sm"}`}
                  style={{
                    color: isSelected
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  }}
                >
                  {p.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
