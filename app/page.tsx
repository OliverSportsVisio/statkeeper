"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CreateBoardForm } from "@/components/CreateBoardForm";
import { supabase, hasSupabase } from "@/lib/supabase";
import { deleteBoardRemote } from "@/lib/supabaseSync";
import type { Board } from "@/lib/types";

interface SavedBoard {
  id: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: string;
  created: string;
  adminToken: string;
  keeperToken: string;
}

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sk_boards");
    if (saved) {
      try { setBoards(JSON.parse(saved)); } catch { /* ignore */ }
    }

    if (hasSupabase && supabase) {
      supabase
        .from("boards")
        .select("id, created_at, status, admin_token, keeper_token, home_team, away_team, state")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          const remote: SavedBoard[] = data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            home: (r.home_team as Board["home_team"]).name,
            away: (r.away_team as Board["away_team"]).name,
            homeScore: (r.state as Board["state"]).home_score,
            awayScore: (r.state as Board["state"]).away_score,
            status: r.status as string,
            created: r.created_at as string,
            adminToken: r.admin_token as string,
            keeperToken: r.keeper_token as string,
          }));
          const remoteIds = new Set(remote.map((b) => b.id));
          const localRaw = localStorage.getItem("sk_boards");
          const local: SavedBoard[] = localRaw ? JSON.parse(localRaw) : [];
          const localOnly = local.filter((b) => !remoteIds.has(b.id));
          const merged = [...remote, ...localOnly];
          setBoards(merged);
          localStorage.setItem("sk_boards", JSON.stringify(merged));
        });
    }
  }, []);

  const handleDelete = async (boardId: string) => {
    await deleteBoardRemote(boardId);
    const updated = boards.filter((b) => b.id !== boardId);
    setBoards(updated);
    localStorage.setItem("sk_boards", JSON.stringify(updated));
    setConfirmDelete(null);
  };

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="gradient-text text-4xl sm:text-5xl font-bold tracking-tight mb-2">
          StatKeeper
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Live basketball scoreboard & stat tracking
        </p>
        {!hasSupabase && (
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Running in offline mode (no Supabase configured)
          </p>
        )}
      </div>

      {/* New Board CTA */}
      {!showForm ? (
        <div className="text-center mb-10">
          <button
            onClick={() => setShowForm(true)}
            className="gradient-pill px-8 py-3 rounded-full text-lg font-bold"
          >
            New Board
          </button>
        </div>
      ) : (
        <CreateBoardForm
          onCancel={() => setShowForm(false)}
          onCreated={(board) => {
            const entry: SavedBoard = {
              id: board.id,
              home: board.home_team.name,
              away: board.away_team.name,
              homeScore: 0,
              awayScore: 0,
              status: board.status,
              created: board.created_at,
              adminToken: board.admin_token,
              keeperToken: board.keeper_token,
            };
            const updated = [entry, ...boards];
            setBoards(updated);
            localStorage.setItem("sk_boards", JSON.stringify(updated));
            setShowForm(false);
          }}
        />
      )}

      {/* Recent boards */}
      {boards.length > 0 && (
        <section>
          <h2 className="section-header text-[var(--text-primary)] font-semibold text-lg mb-4">
            Your Boards
          </h2>
          <div className="space-y-3">
            {boards.map((b) => (
              <div
                key={b.id}
                className="glass-card hover-lift p-4"
              >
                {/* Delete confirmation overlay */}
                {confirmDelete === b.id ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[var(--red)] text-sm font-medium">
                      Delete {b.home} vs {b.away}? This cannot be undone.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--red)] text-white transition-colors hover:opacity-90"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[var(--text-primary)] font-semibold truncate">
                          {b.home} vs {b.away}
                        </p>
                        {b.homeScore + b.awayScore > 0 && (
                          <span className="tabular-nums text-sm text-[var(--text-muted)]">
                            {b.homeScore}-{b.awayScore}
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--text-muted)] text-sm">
                        {new Date(b.created).toLocaleDateString()} &middot;{" "}
                        <span
                          className={
                            b.status === "live"
                              ? "text-[var(--green)]"
                              : b.status === "final"
                              ? "text-[var(--text-muted)]"
                              : "text-[var(--yellow)]"
                          }
                        >
                          {b.status.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/board/${b.id}`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/board/${b.id}/keeper?token=${b.keeperToken}`}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                      >
                        Keep
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(b.id)}
                        className="px-2 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[rgba(255,92,92,0.08)] transition-colors"
                        title="Delete board"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
