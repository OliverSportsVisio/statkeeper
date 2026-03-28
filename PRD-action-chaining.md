# PRD: NBA-Style Action Chaining for Manual Stat-Keeping App

**Date**: 2026-03-28
**Status**: Implementation Ready
**Priority**: P0 — Core UX overhaul

---

## 1. Executive Summary

Our manual stat-keeping app currently uses a **flat, disconnected stat entry model** where every action is independent. The NBA's official stat system (operated by Stats Perform) and FIBA's LiveStats (by Genius Sports) both use **action chaining** — a state-machine-driven workflow where recording one play automatically prompts the logically required follow-up. This eliminates 50%+ of taps and prevents invalid stat combinations.

This PRD defines every problem with the current app, the complete action chain ruleset derived from NBA/FIBA standards, and the implementation plan.

---

## 2. Research Sources

| System | Operator | Key Insight |
|---|---|---|
| **Stats Perform** (NBA official) | 3-4 courtside operators per game | Three-analyst model: home analyst, away analyst, QC checker. Bespoke software with hotkeys + mouse. Produces 1,600–2,000 data points per game. Uses SportVU optical tracking (6 cameras, 25fps) alongside manual entry. |
| **Genius Sports LiveStats V7** (FIBA/NCAA) | 1,000+ leagues worldwide | **Predictive Workflows**: made shot → assist prompt; missed shot → block/rebound prompt; foul → free throw prompt. Court graphic is primary input surface. "Cursor follows the ball" spatial metaphor. |
| **GameChanger** (consumer) | Youth/HS basketball | Same chain model. Used CogTool (CMU cognitive modeling) to optimize tap count. Stat labels double as buttons. Basketball still "too fast for some users." |
| **iScore Basketball** (consumer) | Amateur leagues | Novice-friendly chain model. Offensive foul auto-records turnover. |

---

## 3. Problems with Current App

### P1: No Action Chaining (Critical)
**Current**: Every stat is an isolated tap. Recording a missed shot + block + rebound = 3 separate player selections across 3 screen transitions (6+ taps).
**Target**: Missed shot → inline "Block?" prompt → "Rebound?" prompt = 3 taps total, no screen transitions.

### P2: Screen Transition on Player Select (Critical)
**Current**: Selecting a player navigates away from rosters to a dedicated stat entry view. Operator loses sight of both rosters.
**Target**: Both rosters always visible. Stat actions appear inline when a player is selected. No navigation.

### P3: No Automatic Possession Tracking (High)
**Current**: Possession must be manually toggled via QuickActions bar. Operators forget, leading to incorrect possession state.
**Target**: Possession auto-flips on: made baskets, defensive rebounds, steals, turnovers. Manual override still available.

### P4: No Free Throw Sequencing (High)
**Current**: Free throws are independent taps. No connection between a foul and the resulting FTs. Operator must manually select the fouled player, then separately record each FT.
**Target**: Foul → system auto-queues correct number of FTs (1 for tech, 2 for shooting/bonus, 3 for 3pt shooting foul) for the fouled player. Each FT is made/missed with one tap.

### P5: No Linked Events (Medium)
**Current**: Assists, blocks, steals are standalone events with no connection to the triggering play.
**Target**: Assist is linked to the made shot event. Block is linked to the missed shot. Steal is linked to the turnover. `linked_event_id` field (already in schema) is populated.

### P6: No Keyboard Shortcuts (Medium)
**Current**: Touch/click only. On laptops (the primary device for courtside), no way to use keyboard for speed.
**Target**: Number keys select players, letter keys trigger stats.

### P7: Stats Not Contextually Constrained (Medium)
**Current**: All stat buttons shown all the time. Operator can record an assist without a preceding made shot, a rebound without a missed shot, etc.
**Target**: Context-aware stat grid. After a made shot, only valid follow-ups (assist, no assist) are shown. Invalid combinations are prevented.

---

## 4. NBA/FIBA Action Chain Rules

### 4.1 Complete Chain Matrix

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│ Trigger Event       │ Chain Prompt(s)                                      │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Made 2PT/3PT FG     │ → "Assist?" [same-team players + Skip]              │
│                     │   Possession auto-flips to other team               │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Missed 2PT/3PT FG   │ → "Block?" [opposing-team players + Skip]           │
│                     │ → "Rebound?" [all players + Team Rebound]           │
│                     │   Possession set by rebound type (OFF=same, DEF=flip)│
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Made FT (not last)  │ → Auto-queue next FT for same player               │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Made FT (last)      │ → Possession flips (normal) or stays (technical)    │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Missed FT (last)    │ → "Rebound?" [all players + Team Rebound]           │
│                     │   Possession set by rebound type                    │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Missed FT (not last)│ → Auto-queue next FT for same player               │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Turnover            │ → "Steal?" [opposing-team players + Skip]           │
│                     │   Possession flips                                  │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Personal Foul       │ → "Shooting foul?" [Yes / No]                      │
│ (non-shooting,      │   If yes → select fouled player → FT sequence       │
│  check bonus)       │   If bonus → select fouled player → FT sequence     │
│                     │   Otherwise → chain ends                            │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Offensive Foul      │ → Auto-records turnover on fouling player           │
│                     │   Possession flips                                  │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Technical Foul      │ → Select FT shooter (any player on other team)      │
│                     │ → 1 FT (made/missed)                               │
│                     │   Possession does NOT change after tech FTs         │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Flagrant Foul       │ → Select fouled player → 2 FTs                     │
│                     │   Possession goes to fouled team after FTs          │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Sub In              │ → Must select Sub Out from same team                │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

### 4.2 Possession Auto-Flip Rules

| Event | Possession Result |
|---|---|
| Made field goal | Flips to other team |
| Defensive rebound | Flips to rebounding team |
| Offensive rebound | Stays with rebounding team |
| Steal | Flips to stealing team |
| Turnover (no steal) | Flips to other team |
| Made FT (last, non-tech) | Flips to other team |
| Missed FT (last) + DEF REB | Flips to rebounding team |
| Technical FT (any) | NO change — shooting team retains |
| Offensive foul | Flips to other team |
| Flagrant foul FTs done | Fouled team gets possession |

### 4.3 Free Throw Count Rules

| Foul Scenario | FT Count |
|---|---|
| Shooting foul on 2PT attempt | 2 FTs |
| Shooting foul on 3PT attempt | 3 FTs |
| And-one (made shot + shooting foul) | 1 FT |
| Team in bonus (5+ team fouls) | 2 FTs |
| Technical foul | 1 FT |
| Flagrant foul | 2 FTs |

---

## 5. UI/UX Design Spec

### 5.1 Layout: Single-Screen Keeper (No Navigation)

```
┌──────────────────────────────────────────────────────┐
│  HOME 45          Q2  7:32          38 AWAY          │  ← Scoreboard bar
│  Fouls: 3  BONUS         Fouls: 2                    │
├────────────┬─────────────────────┬───────────────────┤
│            │                     │                    │
│  HOME      │   STAT ACTIONS      │   AWAY            │
│  ROSTER    │   (context-aware)   │   ROSTER          │
│            │                     │                    │
│  [#4 ]     │  +2 FG   +3 PT     │   [#10]           │
│  [#7 ]     │  2PT Miss  3PT Miss│   [#12]           │
│  [#11] ◄── │  OFF REB  DEF REB  │   [#15]           │
│  [#23]     │  AST  STL  BLK  TO │   [#20]           │
│  [#33]     │  FOUL  TECH  FLAG  │   [#24]           │
│            │                     │   [#30]           │
├────────────┴─────────────────────┴───────────────────┤
│  ▶ Start  │ 24 Shot │ ↔ Poss │ T Out │ ← Undo │ ≫  │  ← Quick actions
└──────────────────────────────────────────────────────┘
```

### 5.2 Chain Prompt Overlay

When a chain is active, an **inline prompt bar** appears BETWEEN the scoreboard and the main area. It does NOT navigate away or open a modal.

```
┌──────────────────────────────────────────────────────┐
│  ⛓ Assist?  [#4] [#7] [#23] [#33]  [No Assist]     │  ← Chain prompt
├──────────────────────────────────────────────────────┤
│  (rest of UI continues below, dimmed)                │
```

For free throw sequences:
```
┌──────────────────────────────────────────────────────┐
│  🏀 FT 1/2 — #23         [MADE ✓]    [MISSED ✗]    │
├──────────────────────────────────────────────────────┤
```

### 5.3 Keyboard Shortcuts

| Key | Action |
|---|---|
| `1`–`9`, `0` | Select player by position in roster (1=first, 0=10th) |
| `Tab` | Switch team focus |
| `Q` | +2 FG Made |
| `W` | +3 PT Made |
| `E` | +1 FT Made |
| `A` | 2PT Miss |
| `S` | 3PT Miss |
| `D` | FT Miss |
| `R` | Offensive Rebound |
| `F` | Defensive Rebound |
| `T` | Assist |
| `G` | Steal |
| `Z` | Block |
| `X` | Turnover |
| `C` | Personal Foul |
| `V` | Technical Foul |
| `Space` | Toggle clock |
| `Backspace` | Undo last |
| `Escape` | Skip/dismiss chain prompt |
| `N` | Skip (No assist / No block / No steal) |

---

## 6. Technical Architecture

### 6.1 Chain State Machine (new: `lib/chainEngine.ts`)

```typescript
type ChainStep =
  | { type: "assist_prompt"; shooterTeam: "home"|"away"; triggerEventId: string }
  | { type: "block_prompt"; shooterTeam: "home"|"away"; triggerEventId: string }
  | { type: "rebound_prompt"; triggerEventId: string }
  | { type: "steal_prompt"; turnoverTeam: "home"|"away"; triggerEventId: string }
  | { type: "foul_detail"; foulingTeam: "home"|"away"; triggerEventId: string }
  | { type: "ft_shooter_select"; shootingTeam: "home"|"away"; ftCount: number }
  | { type: "ft_attempt"; shooterId: string; shooterTeam: "home"|"away"; attemptNum: number; totalAttempts: number; isTechnical: boolean }
  | null;  // no active chain

function getNextChain(event: GameEvent, gameState: GameState): ChainStep
```

### 6.2 Store Changes

- Add `activeChain: ChainStep` to store
- Add `advanceChain(response)` action
- Add `skipChain()` action
- Modify `recordStat` to auto-trigger chain via `getNextChain()`

### 6.3 Files Changed

| File | Change |
|---|---|
| `lib/chainEngine.ts` | **NEW** — chain state machine |
| `lib/types.ts` | Add ChainStep type, add `offensive_foul` to StatType |
| `lib/store.ts` | Add chain state + actions, auto-possession |
| `lib/gameEngine.ts` | Add possession logic to applyEvent |
| `components/keeper/ChainPrompt.tsx` | **NEW** — inline chain overlay |
| `components/keeper/StatGrid.tsx` | Context-aware: dim invalid stats during chains |
| `app/board/[id]/keeper/page.tsx` | Single-screen layout, keyboard shortcuts, chain integration |
| `components/keeper/RosterPanel.tsx` | Compact mode, highlight selected player |

---

## 7. Success Metrics

| Metric | Current | Target |
|---|---|---|
| Taps per made FG + assist | 6 (3 selections × 2 taps) | 3 (player + made + assist player) |
| Taps per missed FG + rebound | 6 | 3-4 (player + miss + [block skip] + rebounder) |
| Taps per foul + FTs | 8+ | 4-5 (fouler + foul + shooter + made/missed × N) |
| Screen transitions per play | 1-2 | 0 |
| Invalid stat combinations possible | All | None (constrained by chain) |
| Possession accuracy | Manual (error-prone) | Automatic (rule-based) |
