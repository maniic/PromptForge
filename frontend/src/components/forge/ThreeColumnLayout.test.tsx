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
    // Expect the three main column sections to be present
    expect(screen.getByText(/your input/i)).toBeTruthy()
    expect(screen.getByText(/crafted prompt/i)).toBeTruthy()
    // Before/after results section
    expect(
      screen.getByText(/test crafted result/i) !== null ||
      screen.getByText(/test raw result/i) !== null
    ).toBe(true)
  })
})
