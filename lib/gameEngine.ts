import type { GameState, GameEvent, StatType, Board } from "./types";

/* ──────────────────────────────────────────────
   Game Engine — pure functions that compute
   the next GameState from an action.
   ────────────────────────────────────────────── */

export function createInitialState(board: Board): GameState {
  return {
    home_score: 0,
    away_score: 0,
    period: 1,
    game_clock: board.settings.period_length_minutes * 60,
    shot_clock: board.settings.shot_clock_seconds,
    clock_running: false,
    possession: null,
    home_fouls: 0,
    away_fouls: 0,
    home_timeouts: board.settings.timeouts_per_half,
    away_timeouts: board.settings.timeouts_per_half,
  };
}

/** Points awarded for a given stat type */
export function pointsForStat(stat: StatType): number {
  switch (stat) {
    case "2pt_made":
      return 2;
    case "3pt_made":
      return 3;
    case "ft_made":
      return 1;
    default:
      return 0;
  }
}

/** Is this stat type a shot attempt? */
export function isShotAttempt(stat: StatType): boolean {
  return [
    "2pt_made",
    "2pt_miss",
    "3pt_made",
    "3pt_miss",
    "ft_made",
    "ft_miss",
  ].includes(stat);
}

/** Is this stat a made shot? */
export function isMadeShot(stat: StatType): boolean {
  return ["2pt_made", "3pt_made", "ft_made"].includes(stat);
}

/** Is this stat a field goal attempt (not free throw)? */
export function isFieldGoal(stat: StatType): boolean {
  return ["2pt_made", "2pt_miss", "3pt_made", "3pt_miss"].includes(stat);
}

/** Apply a game event to produce the next state */
export function applyEvent(
  state: GameState,
  event: GameEvent
): GameState {
  const next = { ...state };
  const team = event.team;

  // Scoring
  if (event.points > 0) {
    if (team === "home") next.home_score += event.points;
    else next.away_score += event.points;
  }

  // Fouls
  if (
    event.stat_type === "personal_foul" ||
    event.stat_type === "technical_foul" ||
    event.stat_type === "flagrant_foul"
  ) {
    if (team === "home") next.home_fouls += 1;
    else next.away_fouls += 1;
  }

  return next;
}

/** Revert a game event (undo) */
export function revertEvent(
  state: GameState,
  event: GameEvent
): GameState {
  const next = { ...state };
  const team = event.team;

  if (event.points > 0) {
    if (team === "home") next.home_score = Math.max(0, next.home_score - event.points);
    else next.away_score = Math.max(0, next.away_score - event.points);
  }

  if (
    event.stat_type === "personal_foul" ||
    event.stat_type === "technical_foul" ||
    event.stat_type === "flagrant_foul"
  ) {
    if (team === "home") next.home_fouls = Math.max(0, next.home_fouls - 1);
    else next.away_fouls = Math.max(0, next.away_fouls - 1);
  }

  return next;
}

/** Advance to next period */
export function advancePeriod(
  state: GameState,
  periodLengthMinutes: number
): GameState {
  return {
    ...state,
    period: state.period + 1,
    game_clock: periodLengthMinutes * 60,
    clock_running: false,
    home_fouls: 0,
    away_fouls: 0,
  };
}

/** Check bonus status */
export function getBonusStatus(
  fouls: number
): "none" | "bonus" | "double_bonus" {
  if (fouls >= 10) return "double_bonus";
  if (fouls >= 5) return "bonus";
  return "none";
}
