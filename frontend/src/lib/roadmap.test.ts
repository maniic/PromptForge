import { describe, it, expect } from 'vitest';
import { nodeStatus, roadmapCompletion, summaryCompletion } from '@/lib/roadmap';
import type { Roadmap, RoadmapNode, RoadmapSummary } from '@/types/learn';

const node = (id: string, extra: Partial<RoadmapNode> = {}): RoadmapNode => ({
  id,
  kind: extra.challenge_id ? 'challenge' : 'concept',
  title: id,
  summary: 's',
  points: [],
  weak_example: null,
  strong_example: null,
  challenge_id: null,
  optional: false,
  difficulty: null,
  technique: null,
  ...extra,
});

const ROADMAP: Roadmap = {
  id: 'r',
  title: 'R',
  tagline: '',
  description: '',
  category: 'core',
  level: 'beginner',
  sections: [
    { id: 's', title: 'S', description: '', nodes: [node('c1'), node('x1', { challenge_id: 'few-shot' }), node('opt', { optional: true })] },
  ],
};

describe('nodeStatus', () => {
  it('derives challenge nodes from challenge progress', () => {
    const n = node('x1', { challenge_id: 'few-shot' });
    expect(nodeStatus(n, {}, {})).toBe('pending');
    expect(nodeStatus(n, {}, { 'few-shot': { attempts: 2, bestScore: 40, stars: 0, passed: false, hintsUsed: 0 } })).toBe('in-progress');
    expect(nodeStatus(n, {}, { 'few-shot': { attempts: 3, bestScore: 95, stars: 2, passed: true, hintsUsed: 0 } })).toBe('done');
  });

  it('ignores a manual "done" on challenge nodes: only passing counts', () => {
    expect(nodeStatus(node('x1', { challenge_id: 'few-shot' }), { x1: 'done' }, {})).toBe('pending');
  });

  it('uses manual marks for concept nodes', () => {
    expect(nodeStatus(node('c1'), { c1: 'done' }, {})).toBe('done');
    expect(nodeStatus(node('c1'), undefined, {})).toBe('pending');
  });
});

describe('completion', () => {
  it('excludes optional nodes from the total', () => {
    const r = roadmapCompletion(ROADMAP, { r: { c1: 'done', opt: 'done' } }, {});
    expect(r).toEqual({ done: 1, total: 2 });
  });

  it('summary roll-up matches the full roadmap', () => {
    const summary: RoadmapSummary = {
      id: 'r', title: 'R', tagline: '', category: 'core', level: 'beginner',
      node_ids: ['c1', 'x1', 'opt'], optional_node_ids: ['opt'], challenge_nodes: { x1: 'few-shot' },
    };
    const progress = { 'few-shot': { attempts: 1, bestScore: 90, stars: 2, passed: true, hintsUsed: 0 } };
    const statuses = { r: { c1: 'done' as const } };
    expect(summaryCompletion(summary, statuses, progress)).toEqual(roadmapCompletion(ROADMAP, statuses, progress));
  });
});
