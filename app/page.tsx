"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CreateBoardForm } from "@/components/CreateBoardForm";
import { supabase, hasSupabase } from "@/lib/supabase";
import { deleteBoardRemote } from "@/lib/supabaseSync";
import type { Board } from "@/lib/types";

const ADMIN_PASSWORD = "SportsVisio";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Restore admin session
  useEffect(() => {
    if (sessionStorage.getItem("sk_admin") === "true") setIsAdmin(true);
  }, []);

  // Fetch boards
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

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword("");
      setLoginError(false);
      sessionStorage.setItem("sk_admin", "true");
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("sk_admin");
  };

  const handleDelete = async (boardId: string) => {
    await deleteBoardRemote(boardId);
    const updated = boards.filter((b) => b.id !== boardId);
    setBoards(updated);
    localStorage.setItem("sk_boards", JSON.stringify(updated));
    setConfirmDelete(null);
  };

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* Top bar — admin login */}
      <div className="flex justify-end mb-4">
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--green)] font-semibold uppercase tracking-wider">
              Admin
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLogin(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)]"
          >
            Admin Login
          </button>
        )}
      </div>

      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-sm animate-reveal">
            <h2 className="text-[var(--text-primary)] font-semibold text-lg mb-4">
              Admin Login
            </h2>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors mb-3"
            />
            {loginError && (
              <p className="text-[var(--red)] text-xs mb-3">Incorrect password</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowLogin(false); setPassword(""); setLoginError(false); }}
                className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogin}
                className="gradient-pill px-5 py-2 rounded-lg font-semibold text-sm"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="gradient-text text-4xl sm:text-5xl font-bold tracking-tight mb-2">
          StatKeeper
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Live basketball scoreboard & stat tracking
        </p>
      </div>

      {/* New Board CTA — admin only */}
      {isAdmin && (
        <>
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
        </>
      )}

      {/* Boards list */}
      {boards.length > 0 && (
        <section>
          <h2 className="section-header text-[var(--text-primary)] font-semibold text-lg mb-4">
            {isAdmin ? "Your Boards" : "Games"}
          </h2>
          <div className="space-y-3">
            {boards.map((b) => (
              <div key={b.id} className="glass-card hover-lift p-4">
                {/* Delete confirmation — admin only */}
                {isAdmin && confirmDelete === b.id ? (
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
                      {isAdmin && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {boards.length === 0 && (
        <p className="text-center text-[var(--text-muted)] text-sm">
          No games yet
        </p>
      )}
    </main>
  );
}
