import type {
  GameEvent,
  Player,
  PlayerBoxScore,
  ShotData,
  ZoneStats,
} from "./types";

/* ──────────────────────────────────────────────
   Stats Calculator — derive box scores, shot
   charts, and zone stats from game events.
   ────────────────────────────────────────────── */

function pct(made: number, att: number): number {
  return att === 0 ? 0 : Math.round((made / att) * 1000) / 10;
}

export function calcPlayerBoxScore(
  player: Player,
  team: "home" | "away",
  events: GameEvent[]
): PlayerBoxScore {
  const pEvents = events.filter((e) => e.player_id === player.id);

  let fgm = 0, fga = 0;
  let three_pm = 0, three_pa = 0;
  let ftm = 0, fta = 0;
  let oreb = 0, dreb = 0;
  let ast = 0, stl = 0, blk = 0, to = 0, pf = 0;
  let points = 0;

  for (const e of pEvents) {
    switch (e.stat_type) {
      case "2pt_made":
        fgm++; fga++; points += 2; break;
      case "2pt_miss":
        fga++; break;
      case "3pt_made":
        fgm++; fga++; three_pm++; three_pa++; points += 3; break;
      case "3pt_miss":
        fga++; three_pa++; break;
      case "ft_made":
        ftm++; fta++; points += 1; break;
      case "ft_miss":
        fta++; break;
      case "offensive_rebound":
        oreb++; break;
      case "defensive_rebound":
        dreb++; break;
      case "assist":
        ast++; break;
      case "steal":
        stl++; break;
      case "block":
        blk++; break;
      case "turnover":
        to++; break;
      case "personal_foul":
      case "offensive_foul":
      case "technical_foul":
      case "flagrant_foul":
        pf++; break;
    }
  }

  return {
    player,
    team,
    minutes: 0, // calculated from sub_in/sub_out separately
    points,
    fgm, fga, fg_pct: pct(fgm, fga),
    three_pm, three_pa, three_pct: pct(three_pm, three_pa),
    ftm, fta, ft_pct: pct(ftm, fta),
    oreb, dreb, reb: oreb + dreb,
    ast, stl, blk, to, pf,
    plus_minus: 0,
  };
}

export function calcTeamBoxScore(
  players: Player[],
  team: "home" | "away",
  events: GameEvent[]
): PlayerBoxScore[] {
  return players.map((p) => calcPlayerBoxScore(p, team, events));
}

/** Extract shot chart data from events */
export function extractShots(events: GameEvent[]): ShotData[] {
  return events
    .filter(
      (e) =>
        e.shot_location !== null &&
        ["2pt_made", "2pt_miss", "3pt_made", "3pt_miss"].includes(e.stat_type)
    )
    .map((e) => ({
      player_id: e.player_id,
      player_number: "", // filled in by caller
      team: e.team,
      made: e.stat_type.endsWith("_made"),
      location: e.shot_location!,
      period: e.period,
      shot_type: e.stat_type.startsWith("3pt") ? "3pt" : "2pt",
      play_type: e.play_type,
    }));
}

/** Aggregate shots into zone stats */
export function calcZoneStats(shots: ShotData[]): ZoneStats[] {
  const zones: Record<string, { made: number; attempted: number; label: string }> = {
    paint: { made: 0, attempted: 0, label: "Paint" },
    mid_left: { made: 0, attempted: 0, label: "Mid Left" },
    mid_right: { made: 0, attempted: 0, label: "Mid Right" },
    mid_top: { made: 0, attempted: 0, label: "Mid Top" },
    three_corner_left: { made: 0, attempted: 0, label: "Corner 3 L" },
    three_corner_right: { made: 0, attempted: 0, label: "Corner 3 R" },
    three_wing_left: { made: 0, attempted: 0, label: "Wing 3 L" },
    three_wing_right: { made: 0, attempted: 0, label: "Wing 3 R" },
    three_top: { made: 0, attempted: 0, label: "Top 3" },
  };

  for (const shot of shots) {
    const zone = shot.location.zone;
    if (zones[zone]) {
      zones[zone].attempted++;
      if (shot.made) zones[zone].made++;
    }
  }

  return Object.entries(zones).map(([zone, data]) => ({
    zone,
    label: data.label,
    made: data.made,
    attempted: data.attempted,
    fg_pct: pct(data.made, data.attempted),
  }));
}
