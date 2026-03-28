"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Board,
  BoardStatus,
  GameState,
  GameEvent,
  Player,
  StatType,
  ShotLocation,
  PlayType,
  TeamSetup,
  GameSettings,
  ChainStep,
} from "./types";
import {
  createInitialState,
  applyEvent,
  revertEvent,
  advancePeriod,
  pointsForStat,
} from "./gameEngine";
import { getNextChain } from "./chainEngine";

/* ──────────────────────────────────────────────
   Zustand Store — single source of truth for
   the current board / game session.
   ────────────────────────────────────────────── */

interface GameStore {
  // Board
  board: Board | null;
  events: GameEvent[];
  selectedTeam: "home" | "away";
  selectedPlayerId: string | null;

  // Action chain
  activeChain: ChainStep;

  // Actions — board
  createBoard: (
    homeTeam: TeamSetup,
    awayTeam: TeamSetup,
    settings: GameSettings
  ) => Board;
  loadBoard: (board: Board, events: GameEvent[]) => void;
  setStatus: (status: BoardStatus) => void;

  // Actions — team / player selection
  selectTeam: (team: "home" | "away") => void;
  selectPlayer: (playerId: string | null) => void;

  // Actions — scoring & stats
  recordStat: (
    stat: StatType,
    shotLocation?: ShotLocation | null,
    playType?: PlayType | null,
    linkedEventId?: string | null
  ) => GameEvent | null;
  undoLastEvent: () => GameEvent | null;

  // Actions — chain
  setChain: (chain: ChainStep) => void;
  skipChain: () => void;

  // Actions — clock
  setClockRunning: (running: boolean) => void;
  setGameClock: (seconds: number) => void;
  setShotClock: (seconds: number | null) => void;
  tickClock: () => void;

  // Actions — game controls
  togglePossession: () => void;
  callTimeout: (team: "home" | "away") => void;
  nextPeriod: () => void;
  endGame: () => void;

  // Actions — direct state update (for real-time sync)
  syncState: (state: GameState) => void;
  syncEvents: (events: GameEvent[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  board: null,
  events: [],
  selectedTeam: "home",
  selectedPlayerId: null,
  activeChain: null,

  createBoard: (homeTeam, awayTeam, settings) => {
    const board: Board = {
      id: nanoid(8),
      created_at: new Date().toISOString(),
      status: "setup",
      admin_token: nanoid(16),
      keeper_token: nanoid(16),
      home_team: homeTeam,
      away_team: awayTeam,
      settings,
      state: createInitialState({
        settings,
      } as Board),
    };
    set({ board, events: [], activeChain: null });
    return board;
  },

  loadBoard: (board, events) => {
    set({ board, events, activeChain: null });
  },

  setStatus: (status) => {
    set((s) => ({
      board: s.board ? { ...s.board, status } : null,
    }));
  },

  selectTeam: (team) => set({ selectedTeam: team, selectedPlayerId: null }),
  selectPlayer: (playerId) => set({ selectedPlayerId: playerId }),

  recordStat: (stat, shotLocation = null, playType = null, linkedEventId = null) => {
    const { board, events, selectedTeam, selectedPlayerId } = get();
    if (!board || !selectedPlayerId) return null;

    const event: GameEvent = {
      id: nanoid(12),
      board_id: board.id,
      timestamp: new Date().toISOString(),
      game_clock: board.state.game_clock,
      period: board.state.period,
      team: selectedTeam,
      player_id: selectedPlayerId,
      stat_type: stat,
      points: pointsForStat(stat),
      shot_location: shotLocation ?? null,
      play_type: playType ?? null,
      linked_event_id: linkedEventId ?? null,
    };

    const newState = applyEvent(board.state, event);

    // Determine if this event triggers an action chain
    const nextChain = getNextChain(event, newState);

    set({
      board: { ...board, state: newState },
      events: [...events, event],
      activeChain: nextChain,
    });

    return event;
  },

  undoLastEvent: () => {
    const { board, events } = get();
    if (!board || events.length === 0) return null;

    const lastEvent = events[events.length - 1];
    const newState = revertEvent(board.state, lastEvent);

    set({
      board: { ...board, state: newState },
      events: events.slice(0, -1),
      activeChain: null, // clear any active chain on undo
    });

    return lastEvent;
  },

  setChain: (chain) => {
    set({ activeChain: chain });
  },

  skipChain: () => {
    set({ activeChain: null });
  },

  setClockRunning: (running) => {
    set((s) => ({
      board: s.board
        ? { ...s.board, state: { ...s.board.state, clock_running: running } }
        : null,
    }));
  },

  setGameClock: (seconds) => {
    set((s) => ({
      board: s.board
        ? { ...s.board, state: { ...s.board.state, game_clock: Math.max(0, seconds) } }
        : null,
    }));
  },

  setShotClock: (seconds) => {
    set((s) => ({
      board: s.board
        ? { ...s.board, state: { ...s.board.state, shot_clock: seconds } }
        : null,
    }));
  },

  tickClock: () => {
    set((s) => {
      if (!s.board || !s.board.state.clock_running) return s;
      const state = s.board.state;
      const newGameClock = Math.max(0, state.game_clock - 1);
      const newShotClock =
        state.shot_clock !== null ? Math.max(0, state.shot_clock - 1) : null;

      return {
        board: {
          ...s.board,
          state: {
            ...state,
            game_clock: newGameClock,
            shot_clock: newShotClock,
            clock_running: newGameClock > 0,
          },
        },
      };
    });
  },

  togglePossession: () => {
    set((s) => {
      if (!s.board) return s;
      const current = s.board.state.possession;
      const next = current === "home" ? "away" : current === "away" ? "home" : "home";
      return {
        board: {
          ...s.board,
          state: { ...s.board.state, possession: next },
        },
      };
    });
  },

  callTimeout: (team) => {
    set((s) => {
      if (!s.board) return s;
      const key = team === "home" ? "home_timeouts" : "away_timeouts";
      const current = s.board.state[key];
      if (current <= 0) return s;
      return {
        board: {
          ...s.board,
          state: {
            ...s.board.state,
            [key]: current - 1,
            clock_running: false,
          },
        },
      };
    });
  },

  nextPeriod: () => {
    set((s) => {
      if (!s.board) return s;
      return {
        board: {
          ...s.board,
          state: advancePeriod(
            s.board.state,
            s.board.settings.period_length_minutes
          ),
        },
      };
    });
  },

  endGame: () => {
    set((s) => ({
      board: s.board
        ? {
            ...s.board,
            status: "final" as BoardStatus,
            state: { ...s.board.state, clock_running: false },
          }
        : null,
    }));
  },

  syncState: (state) => {
    set((s) => ({
      board: s.board ? { ...s.board, state } : null,
    }));
  },

  syncEvents: (events) => {
    set({ events });
  },
}));
