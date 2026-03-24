"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Board, GameEvent, StatType, ShotLocation } from "@/lib/types";
import { useGameStore } from "@/lib/store";
import { isFieldGoal } from "@/lib/gameEngine";
import { getZone } from "@/lib/shotZones";
import {
  fetchBoard,
  updateBoardState,
  insertEvent,
  deleteEvent,
} from "@/lib/supabaseSync";
import { RosterPanel } from "@/components/keeper/RosterPanel";
import { StatGrid } from "@/components/keeper/StatGrid";
import { CourtDiagram } from "@/components/keeper/CourtDiagram";
import { QuickActions } from "@/components/keeper/QuickActions";

export default function KeeperPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    board,
    events,
    selectedTeam,
    selectedPlayerId,
    loadBoard,
    selectTeam,
    selectPlayer,
    recordStat,
    undoLastEvent,
    setClockRunning,
    setShotClock,
    tickClock,
    togglePossession,
    callTimeout,
    nextPeriod,
    endGame,
    setStatus,
  } = useGameStore();

  const [showCourt, setShowCourt] = useState(false);
  const [pendingStat, setPendingStat] = useState<StatType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBoardRef = useRef<string | null>(null);

  // Load board from Supabase (or localStorage fallback)
  useEffect(() => {
    fetchBoard(id).then(({ board: b, events: ev }) => {
      if (!b) {
        setError("Board not found");
        return;
      }
      if (token !== b.keeper_token && token !== b.admin_token) {
        setError("Invalid access token");
        return;
      }
      loadBoard(b, ev);
      // Mark existing events as already synced
      for (const e of ev) syncedEventIdsRef.current.add(e.id);
    });
  }, [id, token, loadBoard]);

  // Sync board state to Supabase whenever it changes
  useEffect(() => {
    if (!board) return;
    const stateStr = JSON.stringify(board.state) + board.status;
    if (prevBoardRef.current === stateStr) return;
    prevBoardRef.current = stateStr;
    updateBoardState(board.id, board.state, board.status);
  }, [board?.state, board?.status, board?.id]);

  // Sync new events to Supabase — track by Set of known IDs, not length
  const syncedEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!board) return;
    for (const ev of events) {
      if (!syncedEventIdsRef.current.has(ev.id)) {
        syncedEventIdsRef.current.add(ev.id);
        insertEvent(ev);
      }
    }
  }, [events, board?.id]);

  // Clock ticker
  useEffect(() => {
    if (board?.state.clock_running) {
      clockRef.current = setInterval(tickClock, 1000);
    } else if (clockRef.current) {
      clearInterval(clockRef.current);
      clockRef.current = null;
    }
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [board?.state.clock_running, tickClock]);

  // Select a player from either roster
  const handlePlayerSelect = useCallback(
    (team: "home" | "away", playerId: string | null) => {
      if (team !== selectedTeam) selectTeam(team);
      selectPlayer(playerId);
    },
    [selectedTeam, selectTeam, selectPlayer]
  );

  // Handle stat tap
  const handleStat = useCallback(
    (stat: StatType) => {
      if (!selectedPlayerId) return;
      if (isFieldGoal(stat)) {
        setPendingStat(stat);
        setShowCourt(true);
        return;
      }
      recordStat(stat);
      selectPlayer(null); // back to roster for fast entry
    },
    [selectedPlayerId, recordStat, selectPlayer]
  );

  // Handle shot location selected
  const handleShotLocation = useCallback(
    (x: number, y: number) => {
      if (!pendingStat) return;
      const zone = getZone(x, y);
      const loc: ShotLocation = { x, y, zone };
      recordStat(pendingStat, loc);
      setShowCourt(false);
      setPendingStat(null);
      selectPlayer(null); // back to roster
    },
    [pendingStat, recordStat, selectPlayer]
  );

  // Skip shot location
  const handleSkipLocation = useCallback(() => {
    if (pendingStat) {
      recordStat(pendingStat);
    }
    setShowCourt(false);
    setPendingStat(null);
    selectPlayer(null); // back to roster
  }, [pendingStat, recordStat, selectPlayer]);

  // Undo with Supabase delete
  const handleUndo = useCallback(() => {
    const removed = undoLastEvent();
    if (removed && board) {
      syncedEventIdsRef.current.delete(removed.id);
      deleteEvent(board.id, removed.id);
    }
    return removed;
  }, [undoLastEvent, board]);

  const handleStartGame = () => setStatus("live");

  // Deselect player (back to roster view)
  const handleBack = () => selectPlayer(null);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--red)] text-lg">{error}</p>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="skeleton w-48 h-6" />
      </main>
    );
  }

  const { state, home_team, away_team, settings } = board;

  // Find the selected player object for display
  const selectedPlayer = selectedPlayerId
    ? [
        ...home_team.players.map((p) => ({ ...p, team: "home" as const })),
        ...away_team.players.map((p) => ({ ...p, team: "away" as const })),
      ].find((p) => p.id === selectedPlayerId)
    : null;

  const playerLabel = selectedPlayer
    ? `#${selectedPlayer.number}${selectedPlayer.name ? ` ${selectedPlayer.name}` : ""}`
    : "";

  const formatClock = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Court overlay for shot location */}
      {showCourt && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <p className="text-center text-[var(--text-secondary)] text-sm mb-3">
              Tap where the shot was taken
            </p>
            <CourtDiagram onSelect={handleShotLocation} />
            <button
              onClick={handleSkipLocation}
              className="mt-3 w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-2"
            >
              Skip location
            </button>
          </div>
        </div>
      )}

      {/* Top bar — score + clock */}
      <div className="border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="text-center min-w-[5rem]">
            <div
              className="text-xs font-bold uppercase tracking-wider truncate"
              style={{ color: home_team.color }}
            >
              {home_team.name}
            </div>
            <div className="tabular-nums text-3xl font-bold text-[var(--text-primary)]">
              {state.home_score}
            </div>
          </div>

          <div className="text-center">
            <div className="text-[var(--text-muted)] text-xs font-semibold">
              {settings.periods === 4
                ? state.period <= 4
                  ? `Q${state.period}`
                  : `OT${state.period - 4}`
                : state.period <= 2
                ? `H${state.period}`
                : `OT${state.period - 2}`}
            </div>
            <button
              onClick={() => setClockRunning(!state.clock_running)}
              className="tap-respond tabular-nums text-3xl font-bold text-[var(--text-primary)] hover:text-[var(--accent)]"
            >
              {formatClock(state.game_clock)}
            </button>
            {state.shot_clock !== null && (
              <div className="tabular-nums text-lg text-[var(--accent)] font-bold">
                {state.shot_clock}
              </div>
            )}
          </div>

          <div className="text-center min-w-[5rem]">
            <div
              className="text-xs font-bold uppercase tracking-wider truncate"
              style={{ color: away_team.color }}
            >
              {away_team.name}
            </div>
            <div className="tabular-nums text-3xl font-bold text-[var(--text-primary)]">
              {state.away_score}
            </div>
          </div>
        </div>
      </div>

      {/* Setup state — start game button */}
      {board.status === "setup" && (
        <div className="text-center py-6">
          <button
            onClick={handleStartGame}
            className="gradient-pill px-8 py-3 rounded-full text-lg font-bold"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Main content area — either rosters or stat entry */}
      <div className="flex-1 overflow-y-auto">
        {!selectedPlayerId ? (
          /* ── ROSTER VIEW — both teams side by side ── */
          <div className="px-4 py-4 max-w-2xl mx-auto">
            <p className="text-center text-[var(--text-muted)] text-xs uppercase tracking-wider mb-4">
              Select a player to record a stat
            </p>
            <div className="flex gap-4">
              <RosterPanel
                teamName={home_team.name}
                teamColor={home_team.color}
                players={home_team.players}
                selectedId={selectedTeam === "home" ? selectedPlayerId : null}
                onSelect={handlePlayerSelect}
                side="home"
              />
              <div className="w-px bg-[var(--border-subtle)] shrink-0" />
              <RosterPanel
                teamName={away_team.name}
                teamColor={away_team.color}
                players={away_team.players}
                selectedId={selectedTeam === "away" ? selectedPlayerId : null}
                onSelect={handlePlayerSelect}
                side="away"
              />
            </div>
          </div>
        ) : (
          /* ── STAT ENTRY VIEW — shown after selecting a player ── */
          <div className="px-4 py-4 max-w-5xl mx-auto">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-3 transition-colors"
            >
              <span>&larr;</span>
              <span>Back to rosters</span>
            </button>

            <div className="flex gap-6">
              {/* Stat grid — left side */}
              <div className="flex-1 min-w-0 max-w-xl">
                <StatGrid onStat={handleStat} playerLabel={playerLabel} />
              </div>

              {/* Recent plays — right side */}
              <div className="hidden md:block w-72 shrink-0">
                <div className="glass-card p-4 sticky top-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    Recent Plays
                  </h3>
                  {events.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-xs">
                      No plays recorded yet
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                      {events
                        .slice()
                        .reverse()
                        .slice(0, 20)
                        .map((e) => {
                          const team =
                            e.team === "home" ? home_team : away_team;
                          const player = team.players.find(
                            (p) => p.id === e.player_id
                          );
                          const label = player
                            ? `#${player.number}${player.name ? ` ${player.name}` : ""}`
                            : "#??";
                          const statLabel = e.stat_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase());
                          return (
                            <div
                              key={e.id}
                              className="flex items-center gap-2 text-xs py-1 border-b border-[var(--border-subtle)] last:border-0"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: team.color }}
                              />
                              <span className="text-[var(--text-primary)] font-medium truncate">
                                {label}
                              </span>
                              <span className="text-[var(--text-muted)] truncate">
                                {statLabel}
                              </span>
                              {e.points > 0 && (
                                <span className="text-[var(--green)] font-bold ml-auto shrink-0">
                                  +{e.points}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions bar */}
      <QuickActions
        board={board}
        onUndo={handleUndo}
        onTogglePossession={togglePossession}
        onTimeout={() => callTimeout(selectedTeam)}
        onNextPeriod={nextPeriod}
        onEndGame={endGame}
        onToggleClock={() => setClockRunning(!state.clock_running)}
        onResetShotClock={() => setShotClock(settings.shot_clock_seconds)}
      />
    </main>
  );
}
