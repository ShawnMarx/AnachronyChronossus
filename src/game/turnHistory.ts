// The per-turn History change-list, from the pre→post bot state.
//
// Pure (no React) so it can be unit-tested: `BoardExplorer` and `ChronossusGame` both
// build every committed turn's sublines from it, and `summarizeChronossusExtras` appends
// the module-only deltas afterwards.

import type { ChronobotState, Instruction } from '../engine';

const BUILDING_LABEL: Record<string, string> = {
  factory: 'Factory',
  lab: 'Lab',
  powerplant: 'Power Plant',
  support: 'Life Support',
};


/**
 * Summarize the concrete board/virtual changes of a turn from the pre→post
 * Chronobot state (using instruction ids only to spot the +5 VP set bonuses).
 * These are the things the player physically applies: mech placed, tile taken for
 * X VP, cubes gained/discarded, Warp tile removed, etc.
 */
export function summarizeTurn(
  pre: ChronobotState,
  post: ChronobotState,
  instructions: Instruction[],
): string[] {
  const out: string[] = [];
  const hasId = (part: string) => instructions.some((i) => i.id.includes(part));

  // A Failed Action costs the Chronossus an active Exosuit — it is discarded, not placed,
  // so the same "one fewer Exosuit" delta has to read differently.
  if (post.exosuitsAvailable < pre.exosuitsAvailable) {
    out.push(hasId('fail') ? 'Discarded an active Exosuit' : 'Exosuit placed');
  }
  // The VP granted for a Failed Action is normally +1, but the Chronossus's
  // "Failed Actions score VP" difficulty replaces that with +2 — read the actual
  // delta rather than hardcoding +1, so this line never contradicts the turn's
  // own VP total.
  if (hasId('fail')) out.push(`Failed action (+${post.vp - pre.vp} VP)`);

  (['factory', 'lab', 'powerplant', 'support'] as const).forEach((t) => {
    if (post.buildings[t] > pre.buildings[t]) {
      const vp = post.buildingVps[t][post.buildingVps[t].length - 1];
      out.push(`${BUILDING_LABEL[t]} taken (${vp} VP)`);
    }
  });
  if (post.superprojects > pre.superprojects) {
    const vp = post.superprojectVps[post.superprojectVps.length - 1];
    out.push(`Superproject taken (${vp} VP) · Breakthrough discarded`);
  }

  (['circle', 'triangle', 'square'] as const).forEach((s) => {
    if (post.breakthroughs[s] > pre.breakthroughs[s]) {
      out.push(`Breakthrough taken (${s})`);
    }
  });

  // The +5 VP set discards one of each type, which cancels out the very thing the turn
  // just gained (recruit a scientist, complete the set, net zero scientists). Diff against
  // the state BEFORE the discard so the Recruit / Mine line still reads, then add the set
  // as its own line under it — the Chronobot ids it `recruit-set`/`mine-set`, the
  // Chronossus `rec-set`/`mine-set`.
  const workerSet = hasId('recruit-set') || hasId('rec-set');
  (['genius', 'administrator', 'engineer', 'scientist'] as const).forEach((w) => {
    const postW = post.workers[w] + (workerSet ? 1 : 0);
    if (postW > pre.workers[w]) out.push(`Recruited ${w}`);
  });
  if (workerSet) out.push('Worker set completed — discard one of each (+5 VP)');

  const resTypes = ['neutronium', 'uranium', 'gold', 'titanium'] as const;
  const resourceSet = hasId('mine-set');
  resTypes.forEach((r) => {
    const d = post.resources[r] + (resourceSet ? 1 : 0) - pre.resources[r];
    if (d > 0) out.push(`Gained ${d > 1 ? d + ' ' : ''}${r}`);
  });
  resTypes.forEach((r) => {
    const d = pre.resources[r] - (post.resources[r] + (resourceSet ? 1 : 0));
    if (d > 0) out.push(`Discarded ${d > 1 ? d + ' ' : ''}${r}`);
  });
  if (resourceSet) out.push('Resource set completed — discard one of each (+5 VP)');

  if (post.anomalies < pre.anomalies) out.push('Removed 1 Anomaly');
  if (
    post.warpTilesOnTimeline < pre.warpTilesOnTimeline ||
    post.timeTravelTrack > pre.timeTravelTrack
  ) {
    out.push('Warp tile removed — Time Travel advances');
  }
  return out;
}

