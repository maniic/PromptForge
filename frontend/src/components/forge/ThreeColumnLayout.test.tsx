import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ThreeColumnLayout from '@/components/forge/ThreeColumnLayout'
import type { ForgeResponse } from '@/types/api'

const mockForgeResponse: ForgeResponse = {
  category: 'vibe_coding',
  crafted_prompt: 'Test prompt',
  crafted_result: 'Test crafted result',
  raw_result: 'Test raw result',
  call_timings: [],
  total_latency_ms: 1000,
}

describe('ThreeColumnLayout', () => {
  it('renders all three columns', () => {
    render(
      <ThreeColumnLayout
        input="Test input"
        response={mockForgeResponse}
      />
    )
    // Desktop + mobile both render these headings, so use getAllByText
    expect(screen.getAllByText(/your input/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/crafted prompt/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/results/i).length).toBeGreaterThan(0)
  })

  it('displays the user input text', () => {
    render(
      <ThreeColumnLayout
        input="My test forge input"
        response={mockForgeResponse}
      />
    )
    expect(screen.getAllByText(/my test forge input/i).length).toBeGreaterThan(0)
  })

  it('shows category badge', () => {
    render(
      <ThreeColumnLayout
        input="Test input"
        response={mockForgeResponse}
      />
    )
    // Category "vibe_coding" should render as "vibe coding" badge
    expect(screen.getAllByText(/vibe coding/i).length).toBeGreaterThan(0)
  })

  it('shows before/after result labels', () => {
    render(
      <ThreeColumnLayout
        input="Test input"
        response={mockForgeResponse}
      />
    )
    expect(screen.getAllByText(/without promptforge/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/with promptforge/i).length).toBeGreaterThan(0)
  })
})
