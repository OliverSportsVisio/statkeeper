"use client";

import type { Board, GameEvent, PlayerBoxScore } from "@/lib/types";
import { calcTeamBoxScore } from "@/lib/statsCalculator";

interface Props {
  board: Board;
  events: GameEvent[];
}

function TeamTable({
  teamName,
  teamColor,
  stats,
}: {
  teamName: string;
  teamColor: string;
  stats: PlayerBoxScore[];
}) {
  // Totals
  const totals = stats.reduce(
    (acc, p) => ({
      points: acc.points + p.points,
      fgm: acc.fgm + p.fgm,
      fga: acc.fga + p.fga,
      three_pm: acc.three_pm + p.three_pm,
      three_pa: acc.three_pa + p.three_pa,
      ftm: acc.ftm + p.ftm,
      fta: acc.fta + p.fta,
      oreb: acc.oreb + p.oreb,
      dreb: acc.dreb + p.dreb,
      reb: acc.reb + p.reb,
      ast: acc.ast + p.ast,
      stl: acc.stl + p.stl,
      blk: acc.blk + p.blk,
      to: acc.to + p.to,
      pf: acc.pf + p.pf,
    }),
    { points: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 }
  );

  const pct = (m: number, a: number) =>
    a === 0 ? "-" : `${Math.round((m / a) * 100)}%`;

  return (
    <div className="mb-6">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-2"
        style={{ color: teamColor }}
      >
        {teamName}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-muted)] text-xs uppercase">
              <th className="text-left py-2 px-2 font-semibold">#</th>
              <th className="text-left py-2 px-2 font-semibold">Player</th>
              <th className="text-right py-2 px-1 font-semibold">PTS</th>
              <th className="text-right py-2 px-1 font-semibold">FG</th>
              <th className="text-right py-2 px-1 font-semibold">3PT</th>
              <th className="text-right py-2 px-1 font-semibold">FT</th>
              <th className="text-right py-2 px-1 font-semibold">REB</th>
              <th className="text-right py-2 px-1 font-semibold">AST</th>
              <th className="text-right py-2 px-1 font-semibold">STL</th>
              <th className="text-right py-2 px-1 font-semibold">BLK</th>
              <th className="text-right py-2 px-1 font-semibold">TO</th>
              <th className="text-right py-2 px-1 font-semibold">PF</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((p) => (
              <tr
                key={p.player.id}
                className="border-t border-[var(--border-subtle)] table-row-hover"
              >
                <td className="py-2 px-2 tabular-nums text-[var(--text-primary)] font-semibold">
                  {p.player.number}
                </td>
                <td className="py-2 px-2 text-[var(--text-secondary)] truncate max-w-[8rem]">
                  {p.player.name || `Player #${p.player.number}`}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-primary)] font-bold">
                  {p.points}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.fgm}-{p.fga}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.three_pm}-{p.three_pa}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.ftm}-{p.fta}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.reb}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.ast}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.stl}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.blk}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.to}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">
                  {p.pf}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-[var(--border-medium)]">
              <td className="py-2 px-2" />
              <td className="py-2 px-2 text-[var(--text-muted)] font-semibold text-xs uppercase">
                Totals
              </td>
              <td className="py-2 px-1 text-right tabular-nums text-[var(--text-primary)] font-bold">
                {totals.points}
              </td>
              <td className="py-2 px-1 text-right tabular-nums text-[var(--text-muted)] text-xs">
                {totals.fgm}-{totals.fga} ({pct(totals.fgm, totals.fga)})
              </td>
              <td className="py-2 px-1 text-right tabular-nums text-[var(--text-muted)] text-xs">
                {totals.three_pm}-{totals.three_pa} ({pct(totals.three_pm, totals.three_pa)})
              </td>
              <td className="py-2 px-1 text-right tabular-nums text-[var(--text-muted)] text-xs">
                {totals.ftm}-{totals.fta} ({pct(totals.ftm, totals.fta)})
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-semibold text-[var(--text-secondary)]">
                {totals.reb}
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-semibold text-[var(--text-secondary)]">
                {totals.ast}
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-semibold text-[var(--text-secondary)]">
                {totals.stl}
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-semibold text-[var(--text-secondary)]">
                {totals.blk}
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-semibold text-[var(--text-secondary)]">
                {totals.to}
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-semibold text-[var(--text-secondary)]">
                {totals.pf}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BoxScore({ board, events }: Props) {
  const homeStats = calcTeamBoxScore(
    board.home_team.players,
    "home",
    events
  );
  const awayStats = calcTeamBoxScore(
    board.away_team.players,
    "away",
    events
  );

  return (
    <div className="max-w-none mx-auto px-4 py-6 lg:px-0 lg:py-0">
      <TeamTable
        teamName={board.home_team.name}
        teamColor={board.home_team.color}
        stats={homeStats}
      />
      <TeamTable
        teamName={board.away_team.name}
        teamColor={board.away_team.color}
        stats={awayStats}
      />
    </div>
  );
}
