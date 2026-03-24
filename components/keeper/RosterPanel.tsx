"use client";

import type { Player } from "@/lib/types";

interface Props {
  teamName: string;
  teamColor: string;
  players: Player[];
  selectedId: string | null;
  onSelect: (team: "home" | "away", playerId: string | null) => void;
  side: "home" | "away";
}

export function RosterPanel({
  teamName,
  teamColor,
  players,
  selectedId,
  onSelect,
  side,
}: Props) {
  return (
    <div className="flex-1 min-w-0">
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-2 truncate text-center"
        style={{ color: teamColor }}
      >
        {teamName}
      </h3>
      <div className="space-y-1">
        {players.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(side, isSelected ? null : p.id)}
              className="roster-row w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left"
              style={{
                backgroundColor: isSelected
                  ? `${teamColor}20`
                  : "var(--bg-surface)",
                borderLeft: isSelected
                  ? `3px solid ${teamColor}`
                  : "3px solid transparent",
              }}
            >
              <span
                className="tabular-nums font-bold text-base shrink-0"
                style={{ color: isSelected ? teamColor : "var(--text-primary)" }}
              >
                #{p.number}
              </span>
              {p.name && (
                <span
                  className="text-sm truncate"
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
