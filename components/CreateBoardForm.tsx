"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import type { Board, TeamSetup, GameSettings } from "@/lib/types";
import { createInitialState } from "@/lib/gameEngine";
import { createBoardRemote } from "@/lib/supabaseSync";

interface Props {
  onCancel: () => void;
  onCreated: (board: Board) => void;
}

interface PlayerEntry {
  id: string;
  number: string;
  name: string;
}

export function CreateBoardForm({ onCancel, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Teams
  const [homeName, setHomeName] = useState("");
  const [awayName, setAwayName] = useState("");
  const [homeColor, setHomeColor] = useState("#FEC679");
  const [awayColor, setAwayColor] = useState("#FF5C5C");

  // Step 2: Players
  const [homePlayers, setHomePlayers] = useState<PlayerEntry[]>([
    { id: nanoid(6), number: "", name: "" },
  ]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerEntry[]>([
    { id: nanoid(6), number: "", name: "" },
  ]);

  // Step 3: Settings
  const [periods, setPeriods] = useState(4);
  const [periodLength, setPeriodLength] = useState(10);
  const [shotClock, setShotClock] = useState<number | null>(24);
  const [timeouts, setTimeouts] = useState(4);

  const addPlayer = (
    team: "home" | "away",
    setPlayers: React.Dispatch<React.SetStateAction<PlayerEntry[]>>
  ) => {
    setPlayers((prev) => [...prev, { id: nanoid(6), number: "", name: "" }]);
  };

  const updatePlayer = (
    setPlayers: React.Dispatch<React.SetStateAction<PlayerEntry[]>>,
    id: string,
    field: "number" | "name",
    value: string
  ) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removePlayer = (
    setPlayers: React.Dispatch<React.SetStateAction<PlayerEntry[]>>,
    id: string
  ) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreate = () => {
    const homeTeam: TeamSetup = {
      name: homeName || "Home",
      color: homeColor,
      players: homePlayers
        .filter((p) => p.number.trim())
        .map((p) => ({ id: p.id, number: p.number.trim(), name: p.name.trim() })),
    };
    const awayTeam: TeamSetup = {
      name: awayName || "Away",
      color: awayColor,
      players: awayPlayers
        .filter((p) => p.number.trim())
        .map((p) => ({ id: p.id, number: p.number.trim(), name: p.name.trim() })),
    };
    const settings: GameSettings = {
      periods,
      period_length_minutes: periodLength,
      shot_clock_seconds: shotClock,
      timeouts_per_half: timeouts,
    };

    const board: Board = {
      id: nanoid(8),
      created_at: new Date().toISOString(),
      status: "setup",
      admin_token: nanoid(16),
      keeper_token: nanoid(16),
      home_team: homeTeam,
      away_team: awayTeam,
      settings,
      state: createInitialState({ settings } as Board),
    };

    // Persist to Supabase (+ localStorage fallback)
    createBoardRemote(board);

    onCreated(board);
    router.push(`/board/${board.id}/keeper?token=${board.keeper_token}`);
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors";

  const labelClass = "block text-sm font-medium text-[var(--text-secondary)] mb-1";

  return (
    <div className="glass-card p-6 mb-8 animate-reveal">
      <div className="flex items-center justify-between mb-6">
        <h2 className="gradient-text text-xl font-bold">New Board</h2>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className={step >= 1 ? "text-[var(--accent)]" : ""}>Teams</span>
          <span>&rarr;</span>
          <span className={step >= 2 ? "text-[var(--accent)]" : ""}>Players</span>
          <span>&rarr;</span>
          <span className={step >= 3 ? "text-[var(--accent)]" : ""}>Settings</span>
        </div>
      </div>

      {/* Step 1: Teams */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Home Team</label>
              <input
                className={inputClass}
                placeholder="Team name"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                autoFocus
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">Color</label>
                <input
                  type="color"
                  value={homeColor}
                  onChange={(e) => setHomeColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Away Team</label>
              <input
                className={inputClass}
                placeholder="Team name"
                value={awayName}
                onChange={(e) => setAwayName(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-[var(--text-muted)]">Color</label>
                <input
                  type="color"
                  value={awayColor}
                  onChange={(e) => setAwayColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              className="gradient-pill px-6 py-2 rounded-lg font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Players */}
      {step === 2 && (
        <div className="space-y-6">
          {[
            { label: homeName || "Home", players: homePlayers, setPlayers: setHomePlayers, team: "home" as const },
            { label: awayName || "Away", players: awayPlayers, setPlayers: setAwayPlayers, team: "away" as const },
          ].map(({ label, players, setPlayers, team }) => (
            <div key={team}>
              <h3 className="text-[var(--text-primary)] font-semibold mb-2">
                {label} Roster
              </h3>
              {/* Column headers */}
              <div className="flex gap-2 items-center mb-1 px-1">
                <span className="w-16 shrink-0 text-xs font-semibold text-[var(--text-muted)] uppercase text-center">#</span>
                <span className="flex-1 text-xs font-semibold text-[var(--text-muted)] uppercase">Player Name</span>
                <span className="w-8" />
              </div>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.id} className="flex gap-2 items-center">
                    <input
                      className="w-16 shrink-0 px-2 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors text-center tabular-nums"
                      placeholder={`${i + 1}`}
                      value={p.number}
                      onChange={(e) =>
                        updatePlayer(setPlayers, p.id, "number", e.target.value)
                      }
                    />
                    <input
                      className={`${inputClass} flex-1 min-w-0`}
                      placeholder="e.g. John Smith"
                      value={p.name}
                      onChange={(e) =>
                        updatePlayer(setPlayers, p.id, "name", e.target.value)
                      }
                    />
                    {players.length > 1 && (
                      <button
                        onClick={() => removePlayer(setPlayers, p.id)}
                        className="text-[var(--red)] text-lg w-8 text-center hover:opacity-70"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => addPlayer(team, setPlayers)}
                className="mt-2 text-sm text-[var(--accent)] hover:underline"
              >
                + Add Player
              </button>
            </div>
          ))}
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="gradient-pill px-6 py-2 rounded-lg font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Periods</label>
              <select
                className={inputClass}
                value={periods}
                onChange={(e) => setPeriods(Number(e.target.value))}
              >
                <option value={4}>4 Quarters</option>
                <option value={2}>2 Halves</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Period Length (min)</label>
              <input
                type="number"
                className={inputClass}
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div>
              <label className={labelClass}>Shot Clock</label>
              <select
                className={inputClass}
                value={shotClock ?? "off"}
                onChange={(e) =>
                  setShotClock(e.target.value === "off" ? null : Number(e.target.value))
                }
              >
                <option value={24}>24 seconds</option>
                <option value={30}>30 seconds</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Timeouts per Half</label>
              <input
                type="number"
                className={inputClass}
                value={timeouts}
                onChange={(e) => setTimeouts(Number(e.target.value))}
                min={0}
                max={10}
              />
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              className="gradient-pill px-6 py-2 rounded-lg font-semibold"
            >
              Create Board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
