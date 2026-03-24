"use client";

import { useState } from "react";
import type { Board, GameEvent, ShotData } from "@/lib/types";
import { extractShots } from "@/lib/statsCalculator";
import { CourtDiagram } from "@/components/keeper/CourtDiagram";

interface Props {
  board: Board;
  events: GameEvent[];
  compact?: boolean;
}

export function ShotChart({ board, events, compact }: Props) {
  const [teamFilter, setTeamFilter] = useState<"all" | "home" | "away">("all");
  const [playerFilter, setPlayerFilter] = useState<string | null>(null);

  const allShots = extractShots(events);

  const enrichedShots: ShotData[] = allShots.map((shot) => {
    const team = shot.team === "home" ? board.home_team : board.away_team;
    const player = team.players.find((p) => p.id === shot.player_id);
    return { ...shot, player_number: player?.number ?? "?" };
  });

  const filtered = enrichedShots.filter((s) => {
    if (teamFilter !== "all" && s.team !== teamFilter) return false;
    if (playerFilter && s.player_id !== playerFilter) return false;
    return true;
  });

  const courtShots = filtered.map((s) => ({
    x: s.location.x,
    y: s.location.y,
    made: s.made,
    number: s.player_number,
  }));

  const made = filtered.filter((s) => s.made).length;
  const total = filtered.length;
  const fgPct = total === 0 ? 0 : Math.round((made / total) * 100);

  const allPlayers = [
    ...board.home_team.players.map((p) => ({ ...p, team: "home" as const })),
    ...board.away_team.players.map((p) => ({ ...p, team: "away" as const })),
  ];

  return (
    <div className={compact ? "" : "max-w-lg mx-auto px-4 py-6"}>
      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {(["all", "home", "away"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTeamFilter(t); setPlayerFilter(null); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              teamFilter === t
                ? "gradient-pill"
                : "text-[var(--text-muted)] bg-[var(--bg-surface)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t === "all" ? "All" : t === "home" ? board.home_team.name : board.away_team.name}
          </button>
        ))}
        <select
          value={playerFilter ?? ""}
          onChange={(e) => setPlayerFilter(e.target.value || null)}
          className="ml-auto px-2 py-1 rounded-lg text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
        >
          <option value="">All Players</option>
          {allPlayers
            .filter((p) => teamFilter === "all" || p.team === teamFilter)
            .map((p) => (
              <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
            ))}
        </select>
      </div>

      {/* Summary */}
      <div className="flex justify-center gap-6 mb-3 text-center">
        <div>
          <div className={`font-bold text-[var(--text-primary)] tabular-nums ${compact ? "text-lg" : "text-2xl"}`}>
            {made}/{total}
          </div>
          <div className="text-xs text-[var(--text-muted)]">FG</div>
        </div>
        <div>
          <div className={`font-bold text-[var(--accent)] tabular-nums ${compact ? "text-lg" : "text-2xl"}`}>
            {fgPct}%
          </div>
          <div className="text-xs text-[var(--text-muted)]">FG%</div>
        </div>
      </div>

      <CourtDiagram onSelect={() => {}} shots={courtShots} />

      {total === 0 && (
        <p className="text-center text-[var(--text-muted)] text-sm mt-3">
          No shots recorded with location data yet
        </p>
      )}
    </div>
  );
}
