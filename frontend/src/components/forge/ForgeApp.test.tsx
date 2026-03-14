import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ForgeApp from '@/components/forge/ForgeApp'

// Mock the API module to avoid real HTTP calls
vi.mock('@/lib/api', () => ({
  forgeApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    detail: string
    constructor(status: number, detail: string) {
      super(`Error (${status}): ${detail}`)
      this.status = status
      this.detail = detail
    }
  },
  formatApiError: vi.fn(() => 'Mocked error'),
}))

describe('ForgeApp', () => {
  it('renders without crashing', () => {
    render(<ForgeApp />)
    expect(document.body).toBeTruthy()
  })

  it('shows hero input in idle state', () => {
    render(<ForgeApp />)
    // Expect either a textarea for input or a Forge button
    const textarea = screen.queryByRole('textbox')
    const forgeButton = screen.queryByText(/forge/i)
    expect(textarea !== null || forgeButton !== null).toBe(true)
  })
})
