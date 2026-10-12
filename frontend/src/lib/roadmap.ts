import type { ManualStatus, ProgressMap, RoadmapStatusMap } from '@/lib/progress';
import type { Roadmap, RoadmapNode, RoadmapSummary } from '@/types/learn';

export type NodeStatus = 'done' | 'in-progress' | 'skipped' | 'pending';

/** Challenge nodes follow real challenge progress; concept nodes follow the learner's marks. */
export function nodeStatus(
  node: Pick<RoadmapNode, 'id' | 'challenge_id'>,
  manual: Record<string, ManualStatus> | undefined,
  progress: ProgressMap
): NodeStatus {
  if (node.challenge_id) {
    const p = progress[node.challenge_id];
    if (p?.passed) return 'done';
    if (manual?.[node.id] === 'skipped') return 'skipped';
    if (p && p.attempts > 0) return 'in-progress';
    return 'pending';
  }
  return manual?.[node.id] ?? 'pending';
}

export function flatNodes(roadmap: Roadmap): RoadmapNode[] {
  return roadmap.sections.flatMap((s) => s.nodes);
}

/** Done / total over required (non-optional) nodes. */
export function roadmapCompletion(
  roadmap: Roadmap,
  statuses: RoadmapStatusMap,
  progress: ProgressMap
): { done: number; total: number } {
  const required = flatNodes(roadmap).filter((n) => !n.optional);
  const done = required.filter((n) => nodeStatus(n, statuses[roadmap.id], progress) === 'done').length;
  return { done, total: required.length };
}

/** Same roll-up from a summary (used on the roadmap picker, which doesn't load full roadmaps). */
export function summaryCompletion(
  summary: RoadmapSummary,
  statuses: RoadmapStatusMap,
  progress: ProgressMap
): { done: number; total: number } {
  const required = summary.node_ids.filter((id) => !summary.optional_node_ids.includes(id));
  const done = required.filter(
    (id) => nodeStatus({ id, challenge_id: summary.challenge_nodes[id] ?? null }, statuses[summary.id], progress) === 'done'
  ).length;
  return { done, total: required.length };
}

export const CATEGORY_LABEL = {
  start: 'Start here',
  core: 'Core skill',
  field: 'By field',
} as const;

export const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;
