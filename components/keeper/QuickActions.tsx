"use client";

import { useState } from "react";
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
  const [confirmEnd, setConfirmEnd] = useState(false);

  const btnClass =
    "quick-action-btn flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-xs font-semibold";

  const isFinal = board.status === "final";

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-2 safe-area-bottom">
      {/* End game confirmation */}
      {confirmEnd && (
        <div className="flex items-center justify-center gap-3 mb-2 px-2">
          <span className="text-[var(--red)] text-sm font-medium">
            End this game?
          </span>
          <button
            onClick={() => setConfirmEnd(false)}
            className="quick-action-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={() => { onEndGame(); setConfirmEnd(false); }}
            className="quick-action-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--red)] text-white"
          >
            End Game
          </button>
        </div>
      )}

      <div className="flex justify-around max-w-lg mx-auto">
        {/* Clock toggle */}
        <button
          onClick={onToggleClock}
          disabled={isFinal}
          className={btnClass}
          style={{
            color: state.clock_running ? "var(--red)" : "var(--green)",
            backgroundColor: state.clock_running
              ? "rgba(255,92,92,0.12)"
              : "rgba(66,245,102,0.12)",
            opacity: isFinal ? 0.4 : 1,
          }}
        >
          <span className="text-lg">{state.clock_running ? "||" : ">"}</span>
          <span>{state.clock_running ? "Stop" : "Start"}</span>
        </button>

        {/* Reset shot clock */}
        {settings.shot_clock_seconds && (
          <button
            onClick={onResetShotClock}
            disabled={isFinal}
            className={`${btnClass} text-[var(--accent)] bg-[rgba(254,198,121,0.08)]`}
            style={{ opacity: isFinal ? 0.4 : 1 }}
          >
            <span className="text-lg tabular-nums">{settings.shot_clock_seconds}</span>
            <span>Shot Clk</span>
          </button>
        )}

        {/* Possession */}
        <button
          onClick={onTogglePossession}
          disabled={isFinal}
          className={`${btnClass} text-[var(--text-secondary)] bg-[var(--bg-surface)]`}
          style={{ opacity: isFinal ? 0.4 : 1 }}
        >
          <span className="text-lg">&harr;</span>
          <span>Poss</span>
        </button>

        {/* Timeout */}
        <button
          onClick={onTimeout}
          disabled={isFinal}
          className={`${btnClass} text-[var(--yellow)] bg-[rgba(255,159,67,0.08)]`}
          style={{ opacity: isFinal ? 0.4 : 1 }}
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

        {/* Next period */}
        <button
          onClick={onNextPeriod}
          disabled={isFinal}
          className={`${btnClass} text-[var(--text-secondary)] bg-[var(--bg-surface)]`}
          style={{ opacity: isFinal ? 0.4 : 1 }}
        >
          <span className="text-lg">&raquo;</span>
          <span>Next</span>
        </button>

        {/* End Game */}
        <button
          onClick={() => isFinal ? null : setConfirmEnd(true)}
          className={btnClass}
          style={{
            color: isFinal ? "var(--text-muted)" : "var(--red)",
            backgroundColor: isFinal
              ? "var(--bg-surface)"
              : "rgba(255,92,92,0.10)",
            opacity: isFinal ? 0.4 : 1,
          }}
        >
          <span className="text-lg">&#9632;</span>
          <span>{isFinal ? "Final" : "End"}</span>
        </button>
      </div>
    </div>
  );
}
