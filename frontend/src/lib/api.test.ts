import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError, formatApiError, forgeApi, getLibrary, upvotePrompt, saveToLibrary } from '@/lib/api'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

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

describe('forgeApi', () => {
  it('returns ForgeResponse on success', async () => {
    const mockResponse = {
      category: 'vibe_coding',
      crafted_prompt: 'You are...',
      crafted_result: 'Code here...',
      raw_result: 'Basic idea...',
      call_timings: [],
      total_latency_ms: 1000,
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await forgeApi('test input')
    expect(result.category).toBe('vibe_coding')
    expect(result.crafted_prompt).toBe('You are...')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/forge'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ detail: 'Granite down' }),
    })

    await expect(forgeApi('test')).rejects.toThrow(ApiError)
  })
})

describe('getLibrary', () => {
  it('fetches without category filter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await getLibrary()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/library')
    )
    // Should not have category param
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).not.toContain('category=')
  })

  it('includes category query param when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await getLibrary('vibe_coding')
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('category=vibe_coding')
  })
})

describe('upvotePrompt', () => {
  it('sends POST to correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'upvoted', upvotes: 5 }),
    })

    const result = await upvotePrompt('test-id-123')
    expect(result.status).toBe('upvoted')
    expect(result.upvotes).toBe(5)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/library/test-id-123/upvote'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('saveToLibrary', () => {
  it('sends POST with all required fields', async () => {
    const payload = {
      title: 'Test Prompt',
      author_name: 'Tester',
      original_input: 'rough input',
      category: 'qa',
      crafted_prompt: 'expert prompt',
      crafted_result: 'great result',
      raw_result: 'basic result',
      total_latency_ms: 5000,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-id', ...payload }),
    })

    const result = await saveToLibrary(payload)
    expect(result.id).toBe('new-id')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.title).toBe('Test Prompt')
    expect(body.author_name).toBe('Tester')
    expect(body.category).toBe('qa')
    expect(body.crafted_prompt).toBe('expert prompt')
  })
})
