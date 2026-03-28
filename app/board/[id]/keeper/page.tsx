"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { StatType, ShotLocation } from "@/lib/types";
import { useGameStore } from "@/lib/store";
import { isFieldGoal, getBonusStatus } from "@/lib/gameEngine";
import { getZone } from "@/lib/shotZones";
import {
  fetchBoard,
  updateBoardState,
  insertEvent,
  deleteEvent,
} from "@/lib/supabaseSync";
import { RosterPanel } from "@/components/keeper/RosterPanel";
import { StatGrid, KEYBOARD_STAT_MAP } from "@/components/keeper/StatGrid";
import { CourtDiagram } from "@/components/keeper/CourtDiagram";
import { QuickActions } from "@/components/keeper/QuickActions";
import { ChainPrompt } from "@/components/keeper/ChainPrompt";

export default function KeeperPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    board,
    events,
    selectedTeam,
    selectedPlayerId,
    activeChain,
    loadBoard,
    selectTeam,
    selectPlayer,
    recordStat,
    undoLastEvent,
    setChain,
    skipChain,
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

  // Sync new events to Supabase
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

  // ── Player selection ──
  const handlePlayerSelect = useCallback(
    (team: "home" | "away", playerId: string | null) => {
      if (activeChain) return; // don't change player during a chain
      if (team !== selectedTeam) selectTeam(team);
      selectPlayer(playerId);
    },
    [selectedTeam, selectTeam, selectPlayer, activeChain]
  );

  // ── Handle stat tap ──
  const handleStat = useCallback(
    (stat: StatType) => {
      if (!selectedPlayerId || activeChain) return;
      if (isFieldGoal(stat)) {
        setPendingStat(stat);
        setShowCourt(true);
        return;
      }
      // Offensive foul also auto-records a turnover
      if (stat === "offensive_foul") {
        recordStat(stat);
        // The chain engine returns null for offensive_foul, possession auto-flips in gameEngine
        return;
      }
      recordStat(stat);
    },
    [selectedPlayerId, activeChain, recordStat]
  );

  // ── Handle shot location ──
  const handleShotLocation = useCallback(
    (x: number, y: number) => {
      if (!pendingStat) return;
      const zone = getZone(x, y);
      const loc: ShotLocation = { x, y, zone };
      recordStat(pendingStat, loc);
      setShowCourt(false);
      setPendingStat(null);
    },
    [pendingStat, recordStat]
  );

  const handleSkipLocation = useCallback(() => {
    if (pendingStat) {
      recordStat(pendingStat);
    }
    setShowCourt(false);
    setPendingStat(null);
  }, [pendingStat, recordStat]);

  // ── Undo ──
  const handleUndo = useCallback(() => {
    const removed = undoLastEvent();
    if (removed && board) {
      syncedEventIdsRef.current.delete(removed.id);
      deleteEvent(board.id, removed.id);
    }
    return removed;
  }, [undoLastEvent, board]);

  const handleStartGame = () => setStatus("live");

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!board || board.status === "final") return;
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Space → toggle clock
      if (key === " ") {
        e.preventDefault();
        setClockRunning(!board.state.clock_running);
        return;
      }

      // Backspace → undo
      if (key === "backspace") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Escape / N → skip chain
      if ((key === "escape" || key === "n") && activeChain) {
        e.preventDefault();
        skipChain();
        return;
      }

      // Tab → switch team focus
      if (key === "tab") {
        e.preventDefault();
        selectTeam(selectedTeam === "home" ? "away" : "home");
        return;
      }

      // Number keys 1-9, 0 → select player by roster position
      if (/^[0-9]$/.test(key) && !activeChain) {
        e.preventDefault();
        const players =
          selectedTeam === "home"
            ? board.home_team.players
            : board.away_team.players;
        const idx = key === "0" ? 9 : parseInt(key) - 1;
        if (idx < players.length) {
          const p = players[idx];
          selectPlayer(selectedPlayerId === p.id ? null : p.id);
        }
        return;
      }

      // Stat shortcuts
      if (!activeChain && selectedPlayerId && KEYBOARD_STAT_MAP[key]) {
        e.preventDefault();
        handleStat(KEYBOARD_STAT_MAP[key]);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    board,
    activeChain,
    selectedTeam,
    selectedPlayerId,
    handleStat,
    handleUndo,
    skipChain,
    selectTeam,
    selectPlayer,
    setClockRunning,
  ]);

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

  // Selected player label
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

  const homeBonusStatus = getBonusStatus(state.home_fouls);
  const awayBonusStatus = getBonusStatus(state.away_fouls);

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

      {/* ── Top bar — score + clock + fouls ── */}
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 shrink-0">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Home */}
          <div className="text-center min-w-[5rem]">
            <div
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: home_team.color }}
            >
              {home_team.name}
            </div>
            <div className="tabular-nums text-2xl font-bold text-[var(--text-primary)]">
              {state.home_score}
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px]">
              <span className="text-[var(--text-muted)]">F:{state.home_fouls}</span>
              {homeBonusStatus !== "none" && (
                <span className="text-[var(--yellow)] font-bold">
                  {homeBonusStatus === "double_bonus" ? "2×BNS" : "BNS"}
                </span>
              )}
            </div>
          </div>

          {/* Clock + period + possession */}
          <div className="text-center">
            <div className="text-[var(--text-muted)] text-[10px] font-semibold">
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
              className="tap-respond tabular-nums text-2xl font-bold text-[var(--text-primary)] hover:text-[var(--accent)]"
            >
              {formatClock(state.game_clock)}
            </button>
            {state.shot_clock !== null && (
              <div className="tabular-nums text-base text-[var(--accent)] font-bold">
                {state.shot_clock}
              </div>
            )}
            {/* Possession indicator */}
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    state.possession === "home" ? home_team.color : "transparent",
                  border: `1px solid ${home_team.color}40`,
                }}
              />
              <span className="text-[9px] text-[var(--text-muted)]">POSS</span>
              <span
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    state.possession === "away" ? away_team.color : "transparent",
                  border: `1px solid ${away_team.color}40`,
                }}
              />
            </div>
          </div>

          {/* Away */}
          <div className="text-center min-w-[5rem]">
            <div
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: away_team.color }}
            >
              {away_team.name}
            </div>
            <div className="tabular-nums text-2xl font-bold text-[var(--text-primary)]">
              {state.away_score}
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px]">
              <span className="text-[var(--text-muted)]">F:{state.away_fouls}</span>
              {awayBonusStatus !== "none" && (
                <span className="text-[var(--yellow)] font-bold">
                  {awayBonusStatus === "double_bonus" ? "2×BNS" : "BNS"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chain prompt (appears inline when active) ── */}
      {activeChain && (
        <ChainPrompt
          chain={activeChain}
          homePlayers={home_team.players}
          awayPlayers={away_team.players}
          homeColor={home_team.color}
          awayColor={away_team.color}
          homeName={home_team.name}
          awayName={away_team.name}
        />
      )}

      {/* Setup state — start game button */}
      {board.status === "setup" && (
        <div className="text-center py-4 shrink-0">
          <button
            onClick={handleStartGame}
            className="gradient-pill px-8 py-3 rounded-full text-lg font-bold"
          >
            Start Game
          </button>
        </div>
      )}

      {/* ── Main area — THREE COLUMNS: Home Roster | Stats | Away Roster ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="keeper-layout flex gap-2 px-2 py-2 max-w-5xl mx-auto h-full">
          {/* Home roster */}
          <div className="keeper-roster w-[140px] shrink-0 overflow-y-auto">
            <RosterPanel
              teamName={home_team.name}
              teamColor={home_team.color}
              players={home_team.players}
              selectedId={selectedTeam === "home" ? selectedPlayerId : null}
              onSelect={handlePlayerSelect}
              side="home"
              compact
              focusedSide={selectedTeam}
            />
          </div>

          {/* Center: Stat grid + recent plays */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <StatGrid
              onStat={handleStat}
              playerLabel={playerLabel}
              disabled={!selectedPlayerId}
              activeChain={activeChain}
            />

            {/* Recent plays (compact) */}
            <div className="glass-card p-2 flex-1 min-h-0 overflow-y-auto">
              <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Recent Plays
              </h3>
              {events.length === 0 ? (
                <p className="text-[var(--text-muted)] text-[10px]">
                  No plays recorded yet
                </p>
              ) : (
                <div className="space-y-0.5">
                  {events
                    .slice()
                    .reverse()
                    .slice(0, 15)
                    .map((e) => {
                      const team =
                        e.team === "home" ? home_team : away_team;
                      const player = team.players.find(
                        (p) => p.id === e.player_id
                      );
                      const label = player
                        ? `#${player.number}`
                        : "#??";
                      const statLabel = e.stat_type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                      return (
                        <div
                          key={e.id}
                          className="flex items-center gap-1.5 text-[10px] py-0.5"
                        >
                          <span
                            className="w-1 h-1 rounded-full shrink-0"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="text-[var(--text-primary)] font-medium">
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

          {/* Away roster */}
          <div className="keeper-roster w-[140px] shrink-0 overflow-y-auto">
            <RosterPanel
              teamName={away_team.name}
              teamColor={away_team.color}
              players={away_team.players}
              selectedId={selectedTeam === "away" ? selectedPlayerId : null}
              onSelect={handlePlayerSelect}
              side="away"
              compact
              focusedSide={selectedTeam}
            />
          </div>
        </div>
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
