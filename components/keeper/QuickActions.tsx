"use client";

import type { Board, GameEvent } from "@/lib/types";

interface Props {
  board: Board;
  onUndo: () => GameEvent | null;
  onTogglePossession: () => void;
  onTimeout: () => void;
  onNextPeriod: () => void;
  onEndGame: () => void;
  onToggleClock: () => void;
  onResetShotClock: () => void;
}

export function QuickActions({
  board,
  onUndo,
  onTogglePossession,
  onTimeout,
  onNextPeriod,
  onEndGame,
  onToggleClock,
  onResetShotClock,
}: Props) {
  const { state, settings } = board;

  const btnClass =
    "quick-action-btn flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-xs font-semibold";

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-2 safe-area-bottom">
      <div className="flex justify-around max-w-lg mx-auto">
        {/* Clock toggle */}
        <button
          onClick={onToggleClock}
          className={btnClass}
          style={{
            color: state.clock_running ? "var(--red)" : "var(--green)",
            backgroundColor: state.clock_running
              ? "rgba(255,92,92,0.12)"
              : "rgba(66,245,102,0.12)",
          }}
        >
          <span className="text-lg">{state.clock_running ? "||" : ">"}</span>
          <span>{state.clock_running ? "Stop" : "Start"}</span>
        </button>

        {/* Reset shot clock */}
        {settings.shot_clock_seconds && (
          <button
            onClick={onResetShotClock}
            className={`${btnClass} text-[var(--accent)] bg-[rgba(254,198,121,0.08)]`}
          >
            <span className="text-lg tabular-nums">{settings.shot_clock_seconds}</span>
            <span>Shot Clk</span>
          </button>
        )}

        {/* Possession */}
        <button
          onClick={onTogglePossession}
          className={`${btnClass} text-[var(--text-secondary)] bg-[var(--bg-surface)]`}
        >
          <span className="text-lg">&harr;</span>
          <span>Poss</span>
        </button>

        {/* Timeout */}
        <button
          onClick={onTimeout}
          className={`${btnClass} text-[var(--yellow)] bg-[rgba(255,159,67,0.08)]`}
        >
          <span className="text-lg">T</span>
          <span>Timeout</span>
        </button>

        {/* Undo */}
        <button
          onClick={onUndo}
          className={`${btnClass} text-[var(--text-muted)] bg-[var(--bg-surface)]`}
        >
          <span className="text-lg">&larr;</span>
          <span>Undo</span>
        </button>

        {/* Next period / End game */}
        <button
          onClick={
            state.period >= settings.periods &&
            state.game_clock === 0
              ? onEndGame
              : onNextPeriod
          }
          className={`${btnClass} text-[var(--text-secondary)] bg-[var(--bg-surface)]`}
        >
          <span className="text-lg">&raquo;</span>
          <span>
            {state.period >= settings.periods && state.game_clock === 0
              ? "Final"
              : "Next"}
          </span>
        </button>
      </div>
    </div>
  );
}
