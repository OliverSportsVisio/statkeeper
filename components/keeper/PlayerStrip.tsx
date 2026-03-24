"use client";

import type { Player } from "@/lib/types";

interface Props {
  players: Player[];
  selectedId: string | null;
  teamColor: string;
  onSelect: (id: string | null) => void;
}

export function PlayerStrip({ players, selectedId, teamColor, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto">
      {players.map((p) => {
        const isSelected = selectedId === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(isSelected ? null : p.id)}
            className="player-chip shrink-0"
            style={{
              borderColor: isSelected ? teamColor : "transparent",
              backgroundColor: isSelected
                ? `${teamColor}20`
                : "var(--bg-surface)",
              color: isSelected ? teamColor : "var(--text-secondary)",
            }}
          >
            <span className="text-lg font-bold tabular-nums">#{p.number}</span>
            {p.name && (
              <span className="ml-1.5 text-sm opacity-70 truncate max-w-[6rem]">
                {p.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
