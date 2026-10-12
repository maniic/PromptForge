import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Roadmap } from '@/types/learn';

const { getRoadmap } = vi.hoisted(() => ({ getRoadmap: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/roadmaps/agentic-development' }));
vi.mock('@/lib/learn-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/learn-api')>()),
  getRoadmap,
}));

import RoadmapView from '@/components/academy/RoadmapView';

const ROADMAP: Roadmap = {
  id: 'agentic-development',
  title: 'Agentic Software Development',
  tagline: 't',
  description: 'From vibe coding to agents.',
  category: 'core',
  level: 'intermediate',
  sections: [
    {
      id: 'beyond',
      title: 'Beyond vibe coding',
      description: 'Why wishes fail.',
      nodes: [
        {
          id: 'ad-vibe', kind: 'concept', title: 'What vibe coding gets wrong', summary: 'Vibes are not specs.',
          points: ['No spec means the agent decides what done means.'], weak_example: 'build me an app',
          strong_example: 'Goal: ...', challenge_id: null, optional: false, difficulty: null, technique: null,
        },
        {
          id: 'vibe-to-spec', kind: 'challenge', title: 'From vibe to spec', summary: 'Spec first.', points: [],
          weak_example: null, strong_example: null, challenge_id: 'vibe-to-spec', optional: false,
          difficulty: 'beginner', technique: 'Specification prompts',
        },
      ],
    },
  ],
};

describe('RoadmapView', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getRoadmap.mockResolvedValue(ROADMAP);
  });

  it('renders sections and nodes with progress', async () => {
    render(<RoadmapView roadmapId="agentic-development" />);
    expect(await screen.findByRole('heading', { name: 'Agentic Software Development' })).toBeInTheDocument();
    expect(screen.getByText('Beyond vibe coding')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === '0 of 2 done')).toBeInTheDocument();
  });

  it('opens a concept, marks it done, and updates progress', async () => {
    const user = userEvent.setup();
    render(<RoadmapView roadmapId="agentic-development" />);
    await user.click(await screen.findByRole('button', { name: /^concept\s*what vibe coding gets wrong$/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('No spec means the agent decides what done means.');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(JSON.parse(window.localStorage.getItem('promptforge.roadmaps.v1') ?? '{}')['agentic-development']['ad-vibe']).toBe('done');
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === '1 of 2 done')).toBeInTheDocument();
  });

  it('links challenge nodes into the workspace with roadmap context', async () => {
    const user = userEvent.setup();
    render(<RoadmapView roadmapId="agentic-development" />);
    await user.click(await screen.findByRole('button', { name: /^challenge\s*from vibe to spec$/i }));
    expect(screen.getByRole('link', { name: /solve this challenge/i })).toHaveAttribute(
      'href',
      '/challenge/vibe-to-spec?roadmap=agentic-development'
    );
  });
});
