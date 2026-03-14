import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgeApp from '@/components/forge/ForgeApp'
import type { ForgeResponse } from '@/types/api'

const mockForgeApi = vi.fn()
const mockFormatApiError = vi.fn(() => 'Test error message')

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/api', () => ({
  forgeApi: (...args: unknown[]) => mockForgeApi(...args),
  formatApiError: (...args: unknown[]) => mockFormatApiError(...args),
  ApiError: class ApiError extends Error {
    status: number
    detail: string
    constructor(status: number, detail: string) {
      super(`Error (${status}): ${detail}`)
      this.status = status
      this.detail = detail
    }
  },
}))

const MOCK_RESPONSE: ForgeResponse = {
  category: 'vibe_coding',
  crafted_prompt: 'You are a senior developer...',
  crafted_result: 'Here is the implementation with full code...',
  raw_result: 'Sure here is a basic idea...',
  call_timings: [
    { call_name: 'detect_category', latency_ms: 100 },
    { call_name: 'craft_prompt', latency_ms: 200 },
    { call_name: 'execute_crafted', latency_ms: 300 },
    { call_name: 'execute_raw', latency_ms: 300 },
  ],
  total_latency_ms: 900,
}

describe('ForgeApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders HeroInput in idle state with textarea and forge button', () => {
    render(<ForgeApp />)
    expect(screen.getByRole('textbox', { name: /prompt input/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /forge/i })).toBeTruthy()
  })

  it('shows loading state after submitting', async () => {
    // Make forgeApi hang forever so we stay in loading
    mockForgeApi.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<ForgeApp />)

    const textarea = screen.getByRole('textbox', { name: /prompt input/i })
    await user.type(textarea, 'build me a habit tracker')

    const forgeButton = screen.getByRole('button', { name: /forge/i })
    await user.click(forgeButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
    })
  })

  it('shows results after successful forge', async () => {
    mockForgeApi.mockResolvedValue(MOCK_RESPONSE)
    const user = userEvent.setup()
    render(<ForgeApp />)

    const textarea = screen.getByRole('textbox', { name: /prompt input/i })
    await user.type(textarea, 'build me a habit tracker')
    await user.click(screen.getByRole('button', { name: /forge/i }))

    await waitFor(() => {
      // ThreeColumnLayout renders — check for the "New Forge" button in top bar
      expect(screen.getByText(/new forge/i)).toBeTruthy()
    })
  })

  it('shows three preset buttons', () => {
    render(<ForgeApp />)
    expect(screen.getByRole('button', { name: /vibe code/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /brainstorm/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /research/i })).toBeTruthy()
  })

  it('calls forgeApi with the input text', async () => {
    mockForgeApi.mockResolvedValue(MOCK_RESPONSE)
    const user = userEvent.setup()
    render(<ForgeApp />)

    const textarea = screen.getByRole('textbox', { name: /prompt input/i })
    await user.type(textarea, 'test input')
    await user.click(screen.getByRole('button', { name: /forge/i }))

    await waitFor(() => {
      expect(mockForgeApi).toHaveBeenCalledWith('test input', expect.any(AbortSignal))
    })
  })
})
