import type { GameEvent, GameState, ChainStep, StatType } from "./types";
import { getBonusStatus } from "./gameEngine";

/* ──────────────────────────────────────────────
   Chain Engine — determines what follow-up prompt
   should appear after a stat is recorded.

   Based on NBA/FIBA action chaining rules:
   - Made FG → Assist?
   - Missed FG → Block? → Rebound?
   - Missed FT (last) → Rebound?
   - Turnover → Steal?
   - Personal Foul → Shooting foul? → FTs
   - Offensive Foul → auto-turnover
   - Technical Foul → 1 FT (other team picks shooter)
   - Flagrant Foul → 2 FTs for fouled player
   ────────────────────────────────────────────── */

/** Determine the next chain step after an event is recorded. */
export function getNextChain(
  event: GameEvent,
  gameState: GameState
): ChainStep {
  const { stat_type, team, id } = event;

  switch (stat_type) {
    // ── Made field goal → prompt for assist ──
    case "2pt_made":
    case "3pt_made":
      return { type: "assist_prompt", shooterTeam: team, triggerEventId: id };

    // ── Missed field goal → prompt for block, then rebound ──
    case "2pt_miss":
    case "3pt_miss":
      return { type: "block_prompt", shooterTeam: team, triggerEventId: id };

    // ── Turnover → prompt for steal ──
    case "turnover":
      return { type: "steal_prompt", turnoverTeam: team, triggerEventId: id };

    // ── Personal foul → check if shooting foul / bonus ──
    case "personal_foul": {
      const opposingFouls = team === "home" ? gameState.home_fouls : gameState.away_fouls;
      const bonus = getBonusStatus(opposingFouls);
      if (bonus !== "none") {
        // Team is in the bonus — auto FTs (2)
        const shootingTeam = team === "home" ? "away" : "home";
        return {
          type: "ft_shooter_select",
          shootingTeam,
          ftCount: 2,
          isTechnical: false,
          isFlagrant: false,
        };
      }
      // Not in bonus — ask if it's a shooting foul
      return { type: "shooting_foul_prompt", foulingTeam: team, triggerEventId: id };
    }

    // ── Offensive foul → no chain (turnover auto-recorded by caller) ──
    case "offensive_foul":
      return null;

    // ── Technical foul → 1 FT for other team ──
    case "technical_foul": {
      const shootingTeam = team === "home" ? "away" : "home";
      return {
        type: "ft_shooter_select",
        shootingTeam,
        ftCount: 1,
        isTechnical: true,
        isFlagrant: false,
      };
    }

    // ── Flagrant foul → 2 FTs for other team ──
    case "flagrant_foul": {
      const shootingTeam = team === "home" ? "away" : "home";
      return {
        type: "ft_shooter_select",
        shootingTeam,
        ftCount: 2,
        isTechnical: false,
        isFlagrant: true,
      };
    }

    default:
      return null;
  }
}

/** After a block prompt response, determine next step (always rebound). */
export function afterBlockPrompt(triggerEventId: string): ChainStep {
  return { type: "rebound_prompt", triggerEventId };
}

/** After FT shooter selected, start the FT sequence. */
export function startFtSequence(
  shooterId: string,
  shooterTeam: "home" | "away",
  ftCount: number,
  isTechnical: boolean,
  isFlagrant: boolean,
): ChainStep {
  return {
    type: "ft_attempt",
    shooterId,
    shooterTeam,
    attemptNum: 1,
    totalAttempts: ftCount,
    isTechnical,
    isFlagrant,
  };
}

/** After an FT attempt, determine next step. */
export function afterFtAttempt(
  currentStep: Extract<ChainStep, { type: "ft_attempt" }>,
  made: boolean
): ChainStep {
  const { attemptNum, totalAttempts, shooterId, shooterTeam, isTechnical, isFlagrant } = currentStep;
  const isLast = attemptNum >= totalAttempts;

  if (!isLast) {
    // More FTs to go
    return {
      type: "ft_attempt",
      shooterId,
      shooterTeam,
      attemptNum: attemptNum + 1,
      totalAttempts,
      isTechnical,
      isFlagrant,
    };
  }

  // Last FT
  if (!made) {
    // Missed last FT → rebound prompt
    return { type: "rebound_prompt", triggerEventId: "" };
  }

  // Made last FT → chain complete
  return null;
}

/** Get the FT count for a shooting foul based on the shot type. */
export function getFtCountForShootingFoul(
  shotStatType: StatType | null
): number {
  if (!shotStatType) return 2; // default
  // And-one: made shot + foul = 1 FT
  if (shotStatType === "2pt_made" || shotStatType === "3pt_made") return 1;
  // Missed 3pt attempt = 3 FTs
  if (shotStatType === "3pt_miss") return 3;
  // Missed 2pt attempt = 2 FTs
  return 2;
}

/** Determine which stat types are valid given the current chain state. */
export function getValidStats(chain: ChainStep): StatType[] | null {
  if (!chain) return null; // all stats valid when no chain active

  switch (chain.type) {
    case "ft_attempt":
      return ["ft_made", "ft_miss"];
    default:
      return null; // chain prompts handle their own UI
  }
}
