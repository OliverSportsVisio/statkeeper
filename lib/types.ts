/* ──────────────────────────────────────────────
   Core types for the Manual Stat Keeping App
   ────────────────────────────────────────────── */

export type BoardStatus = "setup" | "live" | "final";

export interface Board {
  id: string;
  created_at: string;
  status: BoardStatus;
  admin_token: string;
  keeper_token: string;
  home_team: TeamSetup;
  away_team: TeamSetup;
  settings: GameSettings;
  state: GameState;
}

export interface TeamSetup {
  name: string;
  color: string; // hex
  players: Player[];
}

export interface Player {
  id: string;
  number: string; // jersey number
  name: string; // optional display name
}

export interface GameSettings {
  periods: number; // 4 (quarters) or 2 (halves)
  period_length_minutes: number; // e.g. 10, 12
  shot_clock_seconds: number | null; // 24, 30, or null (off)
  timeouts_per_half: number;
}

/* ── Live game state ── */

export interface GameState {
  home_score: number;
  away_score: number;
  period: number;
  game_clock: number; // seconds remaining
  shot_clock: number | null; // seconds remaining or null
  clock_running: boolean;
  possession: "home" | "away" | null;
  home_fouls: number;
  away_fouls: number;
  home_timeouts: number;
  away_timeouts: number;
}

/* ── Game events (action log) ── */

export type StatType =
  | "2pt_made"
  | "2pt_miss"
  | "3pt_made"
  | "3pt_miss"
  | "ft_made"
  | "ft_miss"
  | "offensive_rebound"
  | "defensive_rebound"
  | "assist"
  | "turnover"
  | "steal"
  | "block"
  | "personal_foul"
  | "offensive_foul"
  | "technical_foul"
  | "flagrant_foul"
  | "sub_in"
  | "sub_out";

/* ── Action Chain State Machine ── */

export type ChainStep =
  | { type: "assist_prompt"; shooterTeam: "home" | "away"; triggerEventId: string }
  | { type: "block_prompt"; shooterTeam: "home" | "away"; triggerEventId: string }
  | { type: "rebound_prompt"; triggerEventId: string }
  | { type: "steal_prompt"; turnoverTeam: "home" | "away"; triggerEventId: string }
  | { type: "shooting_foul_prompt"; foulingTeam: "home" | "away"; triggerEventId: string }
  | { type: "ft_shooter_select"; shootingTeam: "home" | "away"; ftCount: number; isTechnical: boolean; isFlagrant: boolean }
  | { type: "ft_attempt"; shooterId: string; shooterTeam: "home" | "away"; attemptNum: number; totalAttempts: number; isTechnical: boolean; isFlagrant: boolean }
  | null;

export type PlayType =
  | "transition"
  | "pick_and_roll_ball"
  | "pick_and_roll_roll"
  | "isolation"
  | "post_up"
  | "spot_up"
  | "off_screen"
  | "putback";

export interface ShotLocation {
  x: number; // 0-100 (percentage of court width)
  y: number; // 0-100 (percentage of court height)
  zone: string; // e.g. "paint", "mid_left", "3pt_corner_right"
}

export interface GameEvent {
  id: string;
  board_id: string;
  timestamp: string; // ISO
  game_clock: number;
  period: number;
  team: "home" | "away";
  player_id: string;
  stat_type: StatType;
  points: number; // 0, 1, 2, or 3
  shot_location: ShotLocation | null;
  play_type: PlayType | null;
  linked_event_id: string | null; // e.g. assist → linked to the made shot
}

/* ── Derived player stats (computed from events) ── */

export interface PlayerBoxScore {
  player: Player;
  team: "home" | "away";
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  fg_pct: number;
  three_pm: number;
  three_pa: number;
  three_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  plus_minus: number;
}

/* ── Shot chart data ── */

export interface ShotData {
  player_id: string;
  player_number: string;
  team: "home" | "away";
  made: boolean;
  location: ShotLocation;
  period: number;
  shot_type: "2pt" | "3pt";
  play_type: PlayType | null;
}

/* ── Court zones for zone view ── */

export interface ZoneStats {
  zone: string;
  label: string;
  made: number;
  attempted: number;
  fg_pct: number;
}
