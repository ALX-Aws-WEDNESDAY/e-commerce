/**
 * Bug Condition Exploration Test — Token Storage Security
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists. DO NOT fix the code to make these pass here.
 * They encode the expected (correct) behavior and will pass once the fix is applied.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── isBugCondition helper ─────────────────────────────────────────────────────
// Returns true if tokens are found in localStorage (i.e., the bug is present)
function isBugCondition(storage: Storage): boolean {
  const authStoreRaw = storage.getItem('auth-store')
  const accessDirect = storage.getItem('access_token')
  if (authStoreRaw) {
    const parsed = JSON.parse(authStoreRaw)
    if (parsed.state?.accessToken != null) return true
    if (parsed.state?.refreshToken != null) return true
  }
  if (accessDirect != null) return true
  return false
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

// ── Test Case 1: Zustand persist middleware writes tokens to localStorage ─────
describe('Property 1 — Bug Condition: tokens written to localStorage via persist middleware', () => {
  it('setTokens should NOT cause accessToken or refreshToken to appear in localStorage', async () => {
    // Dynamically import so each test gets a fresh module (resetModules above)
    const { useAuthStore } = await import('@/store/auth.store')

    useAuthStore.getState().setTokens('eyJtest', 'eyJrefresh')

    // Wait for Zustand persist middleware to flush to localStorage
    await new Promise((resolve) => setTimeout(resolve, 0))

    // EXPECTED (correct behavior): isBugCondition returns false
    // ACTUAL on unfixed code: isBugCondition returns true — BUG CONFIRMED
    expect(isBugCondition(localStorage)).toBe(false)
  })
})

// ── Test Case 2: auth.api.ts login writes access_token directly to localStorage
describe('Property 1 — Bug Condition: login writes access_token directly to localStorage', () => {
  it('authApi.login should NOT write access_token to localStorage', async () => {
    // Mock apiClient.post to simulate a successful login response
    vi.doMock('@/api/client', () => ({
      apiClient: {
        post: vi.fn().mockResolvedValue({
          data: { access: 'eyJtest_access_token', user: { id: 1, email: 'test@test.com' } },
        }),
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      },
    }))

    const { authApi } = await import('@/api/auth.api')
    await authApi.login({ email: 'test@test.com', password: 'password' })

    // EXPECTED (correct behavior): null — token should NOT be in localStorage
    // ACTUAL on unfixed code: 'eyJtest_access_token' — BUG CONFIRMED
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})

// ── Test Case 3: Rehydration loads tokens from localStorage into store ─────────
describe('Property 1 — Bug Condition: store rehydration exposes tokens from localStorage', () => {
  it('after rehydration from seeded localStorage, accessToken in store should be null', async () => {
    // Seed localStorage with a persisted auth-store snapshot that contains a token
    const seededState = {
      state: {
        user: { id: 1, email: 'test@test.com' },
        isAuthenticated: true,
        accessToken: 'eyJseeded_access_token',
        refreshToken: 'eyJseeded_refresh_token',
      },
      version: 0,
    }
    localStorage.setItem('auth-store', JSON.stringify(seededState))

    // Import store fresh so it rehydrates from the seeded localStorage
    const { useAuthStore } = await import('@/store/auth.store')

    // Wait for rehydration to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    // EXPECTED (correct behavior): null — tokens should NOT be rehydrated
    // ACTUAL on unfixed code: 'eyJseeded_access_token' — BUG CONFIRMED
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
