"use client";

import type { Board, GameEvent } from "@/lib/types";
import { getBonusStatus } from "@/lib/gameEngine";

interface Props {
  board: Board;
  events: GameEvent[];
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PeriodLabel({ period, totalPeriods }: { period: number; totalPeriods: number }) {
  if (totalPeriods === 4) {
    if (period <= 4) return <span>Q{period}</span>;
    return <span>OT{period - 4}</span>;
  }
  if (period <= 2) return <span>H{period}</span>;
  return <span>OT{period - 2}</span>;
}

function BonusBadge({ fouls }: { fouls: number }) {
  const status = getBonusStatus(fouls);
  if (status === "none") return null;
  return (
    <span
      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
        status === "double_bonus"
          ? "bg-[var(--red)] text-white"
          : "bg-[var(--yellow)] text-[var(--bg-base)]"
      }`}
    >
      {status === "double_bonus" ? "2X BONUS" : "BONUS"}
    </span>
  );
}

function TimeoutDots({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < remaining ? "bg-[var(--accent)]" : "bg-[var(--border-subtle)]"
          }`}
        />
      ))}
    </div>
  );
}

export function Scoreboard({ board, events }: Props) {
  const { state, home_team, away_team, settings } = board;

  // Last 5 events for play feed
  const recentEvents = events.slice(-5).reverse();

  const getPlayerLabel = (event: GameEvent) => {
    const team = event.team === "home" ? home_team : away_team;
    const player = team.players.find((p) => p.id === event.player_id);
    if (!player) return "#??";
    return player.name ? `${player.name} #${player.number}` : `#${player.number}`;
  };

  const formatStatType = (stat: string) => {
    return stat
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto px-4 py-6">
      {/* Period + Clock */}
      <div className="text-center mb-6">
        <div className="text-[var(--text-muted)] text-sm font-semibold uppercase tracking-wider mb-1">
          <PeriodLabel period={state.period} totalPeriods={settings.periods} />
        </div>
        <div className="tabular-nums text-6xl sm:text-7xl font-bold text-[var(--text-primary)] font-[var(--font-display)]">
          {formatClock(state.game_clock)}
        </div>
        {state.shot_clock !== null && (
          <div className="tabular-nums text-2xl text-[var(--accent)] font-bold mt-1">
            {state.shot_clock}
          </div>
        )}
        {state.clock_running && (
          <div className="mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          </div>
        )}
      </div>

      {/* Score panel */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
        {/* Home */}
        <div className="text-center">
          <div
            className="text-sm font-bold uppercase tracking-wider mb-1 truncate"
            style={{ color: home_team.color }}
          >
            {home_team.name}
          </div>
          <div className="tabular-nums text-5xl sm:text-6xl font-bold text-[var(--text-primary)]">
            {state.home_score}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-[var(--text-muted)]">
              Fouls: {state.home_fouls}
            </span>
            <BonusBadge fouls={state.home_fouls} />
          </div>
          <div className="flex justify-center mt-1">
            <TimeoutDots
              remaining={state.home_timeouts}
              total={settings.timeouts_per_half}
            />
          </div>
        </div>

        {/* Possession + VS */}
        <div className="flex flex-col items-center gap-1">
          {state.possession === "home" && (
            <span className="text-[var(--accent)] text-lg">&larr;</span>
          )}
          <span className="text-[var(--text-muted)] text-sm font-semibold">VS</span>
          {state.possession === "away" && (
            <span className="text-[var(--accent)] text-lg">&rarr;</span>
          )}
        </div>

        {/* Away */}
        <div className="text-center">
          <div
            className="text-sm font-bold uppercase tracking-wider mb-1 truncate"
            style={{ color: away_team.color }}
          >
            {away_team.name}
          </div>
          <div className="tabular-nums text-5xl sm:text-6xl font-bold text-[var(--text-primary)]">
            {state.away_score}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-[var(--text-muted)]">
              Fouls: {state.away_fouls}
            </span>
            <BonusBadge fouls={state.away_fouls} />
          </div>
          <div className="flex justify-center mt-1">
            <TimeoutDots
              remaining={state.away_timeouts}
              total={settings.timeouts_per_half}
            />
          </div>
        </div>
      </div>

      {/* Live status badge */}
      {board.status === "live" && (
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--red)]/15 text-[var(--red)] text-xs font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse" />
            Live
          </span>
        </div>
      )}
      {board.status === "final" && (
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs font-bold uppercase">
            Final
          </span>
        </div>
      )}

      {/* Play feed */}
      {recentEvents.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Recent Plays
          </h3>
          <div className="space-y-2">
            {recentEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      e.team === "home" ? home_team.color : away_team.color,
                  }}
                />
                <span className="text-[var(--text-primary)] font-medium">
                  {getPlayerLabel(e)}
                </span>
                <span className="text-[var(--text-muted)]">
                  {formatStatType(e.stat_type)}
                </span>
                {e.points > 0 && (
                  <span className="text-[var(--green)] font-bold ml-auto">
                    +{e.points}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
