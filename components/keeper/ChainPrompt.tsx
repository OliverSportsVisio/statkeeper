"use client";

import { useCallback } from "react";
import type { Player, ChainStep, StatType } from "@/lib/types";
import { useGameStore } from "@/lib/store";
import { pointsForStat, applyEvent as applyGameEvent } from "@/lib/gameEngine";
import {
  afterBlockPrompt,
  afterFtAttempt,
  startFtSequence,
  getFtCountForShootingFoul,
} from "@/lib/chainEngine";
import { nanoid } from "nanoid";
import { insertEvent } from "@/lib/supabaseSync";

interface Props {
  chain: NonNullable<ChainStep>;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeColor: string;
  awayColor: string;
  homeName: string;
  awayName: string;
}

export function ChainPrompt({
  chain,
  homePlayers,
  awayPlayers,
  homeColor,
  awayColor,
  homeName,
  awayName,
}: Props) {
  const { board, events, setChain, skipChain } = useGameStore();

  // Record a chain event (assist, block, rebound, steal, FT) without going through normal recordStat
  const recordChainEvent = useCallback(
    (
      stat: StatType,
      playerId: string,
      team: "home" | "away",
      linkedEventId?: string
    ) => {
      if (!board) return null;

      const event = {
        id: nanoid(12),
        board_id: board.id,
        timestamp: new Date().toISOString(),
        game_clock: board.state.game_clock,
        period: board.state.period,
        team,
        player_id: playerId,
        stat_type: stat,
        points: pointsForStat(stat),
        shot_location: null,
        play_type: null,
        linked_event_id: linkedEventId ?? null,
      };

      // Apply to store manually to avoid triggering another chain
      const newState = applyGameEvent(board.state, event);

      useGameStore.setState({
        board: { ...board, state: newState },
        events: [...events, event],
      });

      // Sync to Supabase
      insertEvent(event);

      return event;
    },
    [board, events]
  );

  const getPlayers = (team: "home" | "away") =>
    team === "home" ? homePlayers : awayPlayers;
  const getColor = (team: "home" | "away") =>
    team === "home" ? homeColor : awayColor;
  const getName = (team: "home" | "away") =>
    team === "home" ? homeName : awayName;

  // ── ASSIST PROMPT ──
  if (chain.type === "assist_prompt") {
    const players = getPlayers(chain.shooterTeam);
    const color = getColor(chain.shooterTeam);
    return (
      <ChainBar label="Assist?" color={color} onSkip={skipChain} skipLabel="No Assist">
        {players.map((p) => (
          <PlayerChip
            key={p.id}
            player={p}
            color={color}
            onClick={() => {
              recordChainEvent("assist", p.id, chain.shooterTeam, chain.triggerEventId);
              skipChain();
            }}
          />
        ))}
      </ChainBar>
    );
  }

  // ── BLOCK PROMPT ──
  if (chain.type === "block_prompt") {
    const opposingTeam = chain.shooterTeam === "home" ? "away" : "home";
    const players = getPlayers(opposingTeam);
    const color = getColor(opposingTeam);
    return (
      <ChainBar label="Block?" color={color} onSkip={() => setChain(afterBlockPrompt(chain.triggerEventId))} skipLabel="No Block">
        {players.map((p) => (
          <PlayerChip
            key={p.id}
            player={p}
            color={color}
            onClick={() => {
              recordChainEvent("block", p.id, opposingTeam, chain.triggerEventId);
              setChain(afterBlockPrompt(chain.triggerEventId));
            }}
          />
        ))}
      </ChainBar>
    );
  }

  // ── REBOUND PROMPT ──
  if (chain.type === "rebound_prompt") {
    return (
      <div className="chain-bar px-3 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              Rebound?
            </span>
            <button
              onClick={skipChain}
              className="chain-player-chip text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]"
            >
              Skip
            </button>
          </div>
          <div className="flex gap-6 justify-center">
            {/* Home team rebounds */}
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: homeColor }}>
                {homeName}
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                {homePlayers.map((p) => (
                  <PlayerChip
                    key={p.id}
                    player={p}
                    color={homeColor}
                    small
                    onClick={() => {
                      const lastMiss = [...events].reverse().find(
                        (e) => e.stat_type.endsWith("_miss")
                      );
                      const rebType: StatType =
                        lastMiss && lastMiss.team === "home"
                          ? "offensive_rebound"
                          : "defensive_rebound";
                      recordChainEvent(rebType, p.id, "home", chain.triggerEventId);
                      skipChain();
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Away team rebounds */}
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: awayColor }}>
                {awayName}
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                {awayPlayers.map((p) => (
                  <PlayerChip
                    key={p.id}
                    player={p}
                    color={awayColor}
                    small
                    onClick={() => {
                      const lastMiss = [...events].reverse().find(
                        (e) => e.stat_type.endsWith("_miss")
                      );
                      const rebType: StatType =
                        lastMiss && lastMiss.team === "away"
                          ? "offensive_rebound"
                          : "defensive_rebound";
                      recordChainEvent(rebType, p.id, "away", chain.triggerEventId);
                      skipChain();
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEAL PROMPT ──
  if (chain.type === "steal_prompt") {
    const opposingTeam = chain.turnoverTeam === "home" ? "away" : "home";
    const players = getPlayers(opposingTeam);
    const color = getColor(opposingTeam);
    return (
      <ChainBar label="Steal?" color={color} onSkip={skipChain} skipLabel="No Steal">
        {players.map((p) => (
          <PlayerChip
            key={p.id}
            player={p}
            color={color}
            onClick={() => {
              recordChainEvent("steal", p.id, opposingTeam, chain.triggerEventId);
              skipChain();
            }}
          />
        ))}
      </ChainBar>
    );
  }

  // ── SHOOTING FOUL PROMPT ──
  if (chain.type === "shooting_foul_prompt") {
    const shootingTeam = chain.foulingTeam === "home" ? "away" : "home";

    // Look at last shot event to determine FT count
    const lastShot = [...events].reverse().find(
      (e) =>
        e.stat_type === "2pt_made" ||
        e.stat_type === "2pt_miss" ||
        e.stat_type === "3pt_made" ||
        e.stat_type === "3pt_miss"
    );
    const ftCountIfShooting = getFtCountForShootingFoul(lastShot?.stat_type ?? null);

    return (
      <div className="chain-bar px-3 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--yellow)]">
            Shooting Foul?
          </span>
          <div className="flex gap-2 w-full max-w-sm">
            <button
              onClick={() => {
                setChain({
                  type: "ft_shooter_select",
                  shootingTeam,
                  ftCount: ftCountIfShooting,
                  isTechnical: false,
                  isFlagrant: false,
                });
              }}
              className="chain-player-chip flex-1 py-3 rounded-lg text-sm font-bold bg-[rgba(66,245,102,0.15)] text-[var(--green)]"
            >
              Yes — {ftCountIfShooting} FT{ftCountIfShooting > 1 ? "s" : ""}
            </button>
            <button
              onClick={skipChain}
              className="chain-player-chip flex-1 py-3 rounded-lg text-sm font-bold bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
            >
              No — Non-Shooting
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FT SHOOTER SELECT ──
  if (chain.type === "ft_shooter_select") {
    const players = getPlayers(chain.shootingTeam);
    const color = getColor(chain.shootingTeam);
    return (
      <ChainBar
        label={`Select FT Shooter (${chain.ftCount} FT${chain.ftCount > 1 ? "s" : ""})`}
        color={color}
        onSkip={skipChain}
        skipLabel="Skip FTs"
      >
        {players.map((p) => (
          <PlayerChip
            key={p.id}
            player={p}
            color={color}
            onClick={() => {
              setChain(
                startFtSequence(
                  p.id,
                  chain.shootingTeam,
                  chain.ftCount,
                  chain.isTechnical,
                  chain.isFlagrant,
                )
              );
            }}
          />
        ))}
      </ChainBar>
    );
  }

  // ── FT ATTEMPT ──
  if (chain.type === "ft_attempt") {
    const color = getColor(chain.shooterTeam);
    const players = getPlayers(chain.shooterTeam);
    const shooter = players.find((p) => p.id === chain.shooterId);
    const shooterLabel = shooter ? `#${shooter.number}${shooter.name ? ` ${shooter.name}` : ""}` : `#??`;

    return (
      <div className="chain-bar px-3 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
              FT {chain.attemptNum}/{chain.totalAttempts}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {shooterLabel}
            </span>
            {chain.isTechnical && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,92,92,0.15)] text-[var(--red)] font-semibold">
                TECH
              </span>
            )}
          </div>
          <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => {
              recordChainEvent("ft_made", chain.shooterId, chain.shooterTeam);
              const next = afterFtAttempt(chain, true);
              if (next) {
                setChain(next);
              } else {
                // FT sequence complete — handle possession
                if (chain.isTechnical) {
                  // Technical: possession does NOT change
                } else {
                  // Normal FTs: possession flips after last made
                  const other = chain.shooterTeam === "home" ? "away" : "home";
                  if (board) {
                    useGameStore.setState({
                      board: {
                        ...board,
                        state: { ...board.state, possession: other },
                      },
                    });
                  }
                }
                skipChain();
              }
            }}
            className="flex-1 py-4 rounded-lg text-lg font-black bg-[rgba(66,245,102,0.2)] text-[var(--green)] active:scale-95 transition-transform"
          >
            MADE
          </button>
          <button
            onClick={() => {
              recordChainEvent("ft_miss", chain.shooterId, chain.shooterTeam);
              const next = afterFtAttempt(chain, false);
              if (next) {
                setChain(next);
              } else {
                // Missed last FT → rebound prompt (unless technical)
                if (chain.isTechnical) {
                  skipChain(); // techs: no rebound, possession unchanged
                } else {
                  setChain(next); // null = rebound prompt handled by afterFtAttempt
                }
              }
            }}
            className="flex-1 py-4 rounded-lg text-lg font-black bg-[rgba(255,92,92,0.2)] text-[var(--red)] active:scale-95 transition-transform"
          >
            MISSED
          </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ── Shared sub-components ── */

function ChainBar({
  label,
  color,
  onSkip,
  skipLabel,
  children,
}: {
  label: string;
  color: string;
  onSkip: () => void;
  skipLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chain-bar px-3 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex flex-col items-center gap-2">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {children}
          <button
            onClick={onSkip}
            className="chain-player-chip rounded-lg text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)]"
          >
            {skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerChip({
  player,
  color,
  onClick,
  small,
}: {
  player: Player;
  color: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`chain-player-chip rounded-lg font-bold tabular-nums active:scale-95 transition-transform ${
        small ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
      }`}
      style={{
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      #{player.number}
      {player.name && !small && (
        <span className="ml-1 opacity-70 text-xs">{player.name}</span>
      )}
    </button>
  );
}
