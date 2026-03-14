import { describe, it, expect } from 'vitest'
import { ApiError, formatApiError } from '@/lib/api'

describe('formatApiError', () => {
  it('returns correct message for 422 status', () => {
    const err = new ApiError(422, 'Validation error')
    expect(formatApiError(err)).toBe(
      'Invalid input (422). Your text may be empty or too short.'
    )
  })

  it('returns correct message for 502 status', () => {
    const err = new ApiError(502, 'Bad gateway')
    expect(formatApiError(err)).toBe(
      'Granite API error (502). The upstream service is unavailable. Retry in a few seconds.'
    )
  })

  it('handles generic Error with message', () => {
    const err = new Error('Network timeout')
    expect(formatApiError(err)).toBe('Network timeout')
  })

  it('handles unknown error type', () => {
    expect(formatApiError('something broke')).toBe(
      'An unexpected error occurred.'
    )
  })
})
