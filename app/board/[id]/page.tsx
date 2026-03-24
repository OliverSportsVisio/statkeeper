"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Board, GameEvent } from "@/lib/types";
import { Scoreboard } from "@/components/scoreboard/Scoreboard";
import { BoxScore } from "@/components/stats/BoxScore";
import { ShotChart } from "@/components/stats/ShotChart";
import { SharePanel } from "@/components/shared/SharePanel";
import {
  fetchBoard,
  subscribeToBoardChanges,
  unsubscribe,
} from "@/lib/supabaseSync";

type MobileTab = "scoreboard" | "boxscore" | "shots" | "share";

export default function PublicBoardPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("scoreboard");
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<ReturnType<typeof subscribeToBoardChanges> | null>(null);
  const eventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchBoard(id).then(({ board: b, events: ev }) => {
      if (!b) { setError("Board not found"); return; }
      setBoard(b);
      setEvents(ev);
      eventIdsRef.current = new Set(ev.map((e) => e.id));
    });
  }, [id]);

  const handleBoardUpdate = useCallback((partial: Partial<Board>) => {
    setBoard((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const handleEventInsert = useCallback((event: GameEvent) => {
    if (eventIdsRef.current.has(event.id)) return;
    eventIdsRef.current.add(event.id);
    setEvents((prev) => [...prev, event]);
  }, []);

  const handleEventDelete = useCallback((eventId: string) => {
    eventIdsRef.current.delete(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  useEffect(() => {
    if (!board) return;
    subRef.current = subscribeToBoardChanges(id, handleBoardUpdate, handleEventInsert, handleEventDelete);
    return () => { if (subRef.current) unsubscribe(subRef.current); };
  }, [id, !!board, handleBoardUpdate, handleEventInsert, handleEventDelete]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-lg">{error}</p>
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

  return (
    <main className="min-h-screen">
      {/* ── Mobile: tab navigation (hidden on lg+) ── */}
      <div className="lg:hidden flex justify-center gap-2 py-3 px-4 border-b border-[var(--border-subtle)] overflow-x-auto">
        {(
          [
            { key: "scoreboard", label: "Score" },
            { key: "boxscore", label: "Box Score" },
            { key: "shots", label: "Shots" },
            { key: "share", label: "Share" },
          ] as { key: MobileTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setMobileTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shrink-0 ${
              mobileTab === t.key
                ? "gradient-pill"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Mobile: tabbed content ── */}
      <div className="lg:hidden">
        {mobileTab === "scoreboard" && <Scoreboard board={board} events={events} />}
        {mobileTab === "boxscore" && <BoxScore board={board} events={events} />}
        {mobileTab === "shots" && <ShotChart board={board} events={events} />}
        {mobileTab === "share" && <SharePanel boardId={board.id} />}
      </div>

      {/* ── Desktop: full dashboard layout (lg+) ── */}
      <div className="hidden lg:block px-6 py-6 max-w-[1400px] mx-auto">
        {/* Top row: Scoreboard + Shot Chart */}
        <div className="grid grid-cols-[1fr_1fr] gap-6 mb-6">
          {/* Scoreboard card */}
          <div className="glass-card p-6">
            <Scoreboard board={board} events={events} />
          </div>

          {/* Shot chart card */}
          <div className="glass-card p-6">
            <h2 className="section-header text-[var(--text-primary)] font-semibold text-sm mb-4">
              Shot Chart
            </h2>
            <ShotChart board={board} events={events} compact />
          </div>
        </div>

        {/* Bottom row: Box scores side-by-side + share */}
        <div className="grid grid-cols-[1fr_280px] gap-6">
          <div className="glass-card p-6">
            <h2 className="section-header text-[var(--text-primary)] font-semibold text-sm mb-4">
              Box Score
            </h2>
            <BoxScore board={board} events={events} />
          </div>

          <div className="glass-card p-6">
            <SharePanel boardId={board.id} compact />
          </div>
        </div>
      </div>
    </main>
  );
}
