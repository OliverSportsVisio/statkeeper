"use client";

import { supabase, hasSupabase } from "./supabase";
import type { Board, GameEvent, GameState } from "./types";
import type { RealtimeChannel } from "@supabase/supabase-js";

/* ──────────────────────────────────────────────
   Supabase persistence & realtime sync.

   Falls back to localStorage when Supabase is
   not configured (no env vars).
   ────────────────────────────────────────────── */

// ───── Board CRUD ─────

export async function createBoardRemote(board: Board): Promise<void> {
  // Always save to localStorage as a backup
  localStorage.setItem("sk_board_" + board.id, JSON.stringify(board));
  localStorage.setItem("sk_events_" + board.id, JSON.stringify([]));

  // Save board index locally
  const indexRaw = localStorage.getItem("sk_boards");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  const entry = {
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
  localStorage.setItem("sk_boards", JSON.stringify([entry, ...index]));

  if (!hasSupabase || !supabase) return;

  await supabase.from("boards").insert({
    id: board.id,
    created_at: board.created_at,
    status: board.status,
    admin_token: board.admin_token,
    keeper_token: board.keeper_token,
    home_team: board.home_team,
    away_team: board.away_team,
    settings: board.settings,
    state: board.state,
  });
}

export async function fetchBoard(
  boardId: string
): Promise<{ board: Board | null; events: GameEvent[] }> {
  // Try Supabase first
  if (hasSupabase && supabase) {
    const { data: row } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single();

    if (row) {
      const board: Board = {
        id: row.id,
        created_at: row.created_at,
        status: row.status,
        admin_token: row.admin_token,
        keeper_token: row.keeper_token,
        home_team: row.home_team,
        away_team: row.away_team,
        settings: row.settings,
        state: row.state,
      };

      const { data: evRows } = await supabase
        .from("game_events")
        .select("*")
        .eq("board_id", boardId)
        .order("timestamp", { ascending: true });

      const events: GameEvent[] = (evRows ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        board_id: r.board_id as string,
        timestamp: r.timestamp as string,
        game_clock: r.game_clock as number,
        period: r.period as number,
        team: r.team as "home" | "away",
        player_id: r.player_id as string,
        stat_type: r.stat_type as GameEvent["stat_type"],
        points: r.points as number,
        shot_location: r.shot_location as GameEvent["shot_location"],
        play_type: r.play_type as GameEvent["play_type"],
        linked_event_id: r.linked_event_id as string | null,
      }));

      return { board, events };
    }
  }

  // Fallback to localStorage
  const raw = localStorage.getItem("sk_board_" + boardId);
  if (!raw) return { board: null, events: [] };
  const board: Board = JSON.parse(raw);
  const evRaw = localStorage.getItem("sk_events_" + boardId);
  const events: GameEvent[] = evRaw ? JSON.parse(evRaw) : [];
  return { board, events };
}

// ───── Delete board ─────

export async function deleteBoardRemote(boardId: string): Promise<void> {
  // Remove from localStorage
  localStorage.removeItem("sk_board_" + boardId);
  localStorage.removeItem("sk_events_" + boardId);
  const indexRaw = localStorage.getItem("sk_boards");
  if (indexRaw) {
    const index = JSON.parse(indexRaw);
    localStorage.setItem(
      "sk_boards",
      JSON.stringify(index.filter((b: { id: string }) => b.id !== boardId))
    );
  }

  if (!hasSupabase || !supabase) return;

  // game_events cascade-deletes via FK
  await supabase.from("boards").delete().eq("id", boardId);
}

// ───── State updates (keeper writes) ─────

export async function updateBoardState(
  boardId: string,
  state: GameState,
  status?: string
): Promise<void> {
  // localStorage backup
  const raw = localStorage.getItem("sk_board_" + boardId);
  if (raw) {
    const board = JSON.parse(raw);
    board.state = state;
    if (status) board.status = status;
    localStorage.setItem("sk_board_" + boardId, JSON.stringify(board));
  }

  if (!hasSupabase || !supabase) return;

  const update: Record<string, unknown> = { state };
  if (status) update.status = status;
  await supabase.from("boards").update(update).eq("id", boardId);
}

export async function insertEvent(event: GameEvent): Promise<void> {
  // localStorage backup
  const evRaw = localStorage.getItem("sk_events_" + event.board_id);
  const events: GameEvent[] = evRaw ? JSON.parse(evRaw) : [];
  events.push(event);
  localStorage.setItem("sk_events_" + event.board_id, JSON.stringify(events));

  if (!hasSupabase || !supabase) return;

  await supabase.from("game_events").insert({
    id: event.id,
    board_id: event.board_id,
    timestamp: event.timestamp,
    game_clock: event.game_clock,
    period: event.period,
    team: event.team,
    player_id: event.player_id,
    stat_type: event.stat_type,
    points: event.points,
    shot_location: event.shot_location,
    play_type: event.play_type,
    linked_event_id: event.linked_event_id,
  });
}

export async function deleteEvent(
  boardId: string,
  eventId: string
): Promise<void> {
  // localStorage backup
  const evRaw = localStorage.getItem("sk_events_" + boardId);
  if (evRaw) {
    const events: GameEvent[] = JSON.parse(evRaw);
    localStorage.setItem(
      "sk_events_" + boardId,
      JSON.stringify(events.filter((e) => e.id !== eventId))
    );
  }

  if (!hasSupabase || !supabase) return;

  await supabase.from("game_events").delete().eq("id", eventId);
}

// ───── Realtime subscriptions ─────

export function subscribeToBoardChanges(
  boardId: string,
  onBoardUpdate: (board: Partial<Board>) => void,
  onEventInsert: (event: GameEvent) => void,
  onEventDelete: (eventId: string) => void
): RealtimeChannel | (() => void) {
  if (!hasSupabase || !supabase) {
    // Fallback: poll localStorage
    const interval = setInterval(() => {
      const raw = localStorage.getItem("sk_board_" + boardId);
      if (raw) {
        const board = JSON.parse(raw);
        onBoardUpdate(board);
      }
      const evRaw = localStorage.getItem("sk_events_" + boardId);
      if (evRaw) {
        // For localStorage, we just reload all events on each poll
        // The caller handles deduplication
      }
    }, 1000);
    return () => clearInterval(interval);
  }

  const channel = supabase
    .channel(`board-${boardId}`)
    // Board state changes
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "boards",
        filter: `id=eq.${boardId}`,
      },
      (payload) => {
        const row = payload.new;
        onBoardUpdate({
          status: row.status,
          state: row.state,
        } as Partial<Board>);
      }
    )
    // New game events
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_events",
        filter: `board_id=eq.${boardId}`,
      },
      (payload) => {
        const r = payload.new;
        onEventInsert({
          id: r.id,
          board_id: r.board_id,
          timestamp: r.timestamp,
          game_clock: r.game_clock,
          period: r.period,
          team: r.team,
          player_id: r.player_id,
          stat_type: r.stat_type,
          points: r.points,
          shot_location: r.shot_location,
          play_type: r.play_type,
          linked_event_id: r.linked_event_id,
        } as GameEvent);
      }
    )
    // Deleted events (undo)
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "game_events",
        filter: `board_id=eq.${boardId}`,
      },
      (payload) => {
        onEventDelete(payload.old.id);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(
  channelOrCleanup: RealtimeChannel | (() => void)
): void {
  if (typeof channelOrCleanup === "function") {
    channelOrCleanup();
  } else if (supabase) {
    supabase.removeChannel(channelOrCleanup);
  }
}
