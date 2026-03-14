import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingStatus from '@/components/shared/LoadingStatus'

describe('LoadingStatus', () => {
  it('renders nothing when not loading', () => {
    render(<LoadingStatus isLoading={false} />)
    const statusText = screen.queryByText(/detecting category/i)
    expect(statusText).toBeNull()
  })

  it('shows first stage when loading', () => {
    render(<LoadingStatus isLoading={true} />)
    expect(screen.getByText(/detecting category/i)).toBeTruthy()
  })
})
