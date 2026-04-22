/**
 * Preservation Property Tests — Token Storage Security
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests observe and encode the baseline behaviors that MUST be preserved
 * after the fix is applied. They run on UNFIXED code and are EXPECTED TO PASS.
 *
 * Observed behaviors on unfixed code:
 *   1. After setUser(), localStorage['auth-store'] contains user + isAuthenticated: true
 *   2. When accessToken is in localStorage, interceptor attaches Authorization: Bearer <token>
 *   3. clearUser() zeroes all four fields in the store
 *   4. POST/PUT/PATCH/DELETE requests receive X-CSRFToken from the CSRF cookie
 *   5. A 401 response triggers window.location.href = '/login'
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/types'

// ── Representative input sets ─────────────────────────────────────────────────

const USERS: User[] = [
  { id: 1, email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith', date_joined: '2024-01-01T00:00:00Z' },
  { id: 2, email: 'bob@example.com', first_name: 'Bob', last_name: 'Jones', date_joined: '2024-06-15T12:00:00Z' },
  { id: 99, email: 'charlie@example.com', first_name: 'Charlie', last_name: 'Brown', date_joined: '2023-12-31T23:59:59Z' },
]

const TOKENS: string[] = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.short',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'simple-token-value',
  'token-with-special-chars-!@#',
  'a'.repeat(200), // long token
]

const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'] as const

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  document.cookie = ''
  vi.resetModules()
})

// ── Property 3.1: user + isAuthenticated are persisted to localStorage ────────

describe('Property 3.1 — user and isAuthenticated are persisted after setUser()', () => {
  it('for all valid user objects: localStorage["auth-store"].state.user equals the user and isAuthenticated is true', async () => {
    for (const user of USERS) {
      localStorage.clear()
      vi.resetModules()

      const { useAuthStore } = await import('@/store/auth.store')
      useAuthStore.getState().setUser(user)

      // Wait for persist middleware to flush
      await new Promise((resolve) => setTimeout(resolve, 0))

      const raw = localStorage.getItem('auth-store')
      expect(raw, `localStorage['auth-store'] should be set for user ${user.email}`).not.toBeNull()

      const parsed = JSON.parse(raw!)
      expect(parsed.state.user).toEqual(user)
      expect(parsed.state.isAuthenticated).toBe(true)
    }
  })

  it('setUser(null) persists isAuthenticated: false', async () => {
    const { useAuthStore } = await import('@/store/auth.store')

    // First set a user, then clear
    useAuthStore.getState().setUser(USERS[0])
    await new Promise((resolve) => setTimeout(resolve, 0))

    useAuthStore.getState().setUser(null)
    await new Promise((resolve) => setTimeout(resolve, 0))

    const raw = localStorage.getItem('auth-store')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.isAuthenticated).toBe(false)
    expect(parsed.state.user).toBeNull()
  })
})

// ── Property 3.2: Authorization header is attached when token is present ──────

describe('Property 3.2 — Authorization: Bearer <token> header is attached by request interceptor', () => {
  it('for all non-null token strings: interceptor produces Authorization: Bearer <token>', async () => {
    for (const token of TOKENS) {
      localStorage.clear()
      vi.resetModules()

      // After fix the interceptor reads from useAuthStore.getState().accessToken
      const { useAuthStore } = await import('@/store/auth.store')
      useAuthStore.getState().setTokens(token, '')

      const { apiClient } = await import('@/api/client')

      // Grab the request interceptor handler by running it against a mock config
      const config = {
        headers: { set: vi.fn(), Authorization: undefined as string | undefined } as unknown as import('axios').AxiosRequestHeaders,
        method: 'get',
      } as unknown as import('axios').InternalAxiosRequestConfig

      // Access the interceptor directly via the manager
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interceptorManager = (apiClient.interceptors.request as any)
      let handlerFn: ((c: typeof config) => typeof config) | null = null

      // Iterate registered handlers to find ours
      interceptorManager.forEach((h: { fulfilled?: (c: typeof config) => typeof config }) => {
        if (h.fulfilled) handlerFn = h.fulfilled
      })

      expect(handlerFn, 'request interceptor should be registered').not.toBeNull()

      const result = handlerFn!(config)
      expect((result.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`)
    }
  })

  it('no Authorization header when no token is present', async () => {
    // Ensure nothing in localStorage or store
    localStorage.removeItem('access_token')
    vi.resetModules()

    const { useAuthStore } = await import('@/store/auth.store')
    useAuthStore.getState().clearUser()

    const { apiClient } = await import('@/api/client')

    const config = {
      headers: {} as Record<string, string>,
      method: 'get',
    } as unknown as import('axios').InternalAxiosRequestConfig

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptorManager = (apiClient.interceptors.request as any)
    let handlerFn: ((c: typeof config) => typeof config) | null = null
    interceptorManager.forEach((h: { fulfilled?: (c: typeof config) => typeof config }) => {
      if (h.fulfilled) handlerFn = h.fulfilled
    })

    const result = handlerFn!(config)
    expect((result.headers as Record<string, string>).Authorization).toBeUndefined()
  })
})

// ── Property 3.3: clearUser() zeroes all four fields ─────────────────────────

describe('Property 3.3 — clearUser() always results in all four fields being null/false', () => {
  it('for all auth states: clearUser() resets user, isAuthenticated, accessToken, refreshToken', async () => {
    const states = [
      // user set, tokens set
      { user: USERS[0], accessToken: TOKENS[0], refreshToken: TOKENS[1] },
      // only user set
      { user: USERS[1], accessToken: null, refreshToken: null },
      // only tokens set
      { user: null, accessToken: TOKENS[2], refreshToken: TOKENS[3] },
      // all null (already cleared)
      { user: null, accessToken: null, refreshToken: null },
    ]

    for (const state of states) {
      localStorage.clear()
      vi.resetModules()

      const { useAuthStore } = await import('@/store/auth.store')

      // Set up initial state
      if (state.user) useAuthStore.getState().setUser(state.user)
      if (state.accessToken && state.refreshToken) {
        useAuthStore.getState().setTokens(state.accessToken, state.refreshToken)
      }

      // Now clear
      useAuthStore.getState().clearUser()

      const s = useAuthStore.getState()
      expect(s.user).toBeNull()
      expect(s.isAuthenticated).toBe(false)
      expect(s.accessToken).toBeNull()
      expect(s.refreshToken).toBeNull()
    }
  })
})

// ── Property 3.4: X-CSRFToken header on mutating requests ────────────────────

describe('Property 3.4 — X-CSRFToken header is attached on POST/PUT/PATCH/DELETE', () => {
  it('for all mutating methods: X-CSRFToken is set from the csrftoken cookie', async () => {
    const csrfValue = 'test-csrf-token-abc123'
    document.cookie = `csrftoken=${csrfValue}`

    const { apiClient } = await import('@/api/client')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptorManager = (apiClient.interceptors.request as any)
    let handlerFn: ((c: import('axios').InternalAxiosRequestConfig) => import('axios').InternalAxiosRequestConfig) | null = null
    interceptorManager.forEach((h: { fulfilled?: (c: import('axios').InternalAxiosRequestConfig) => import('axios').InternalAxiosRequestConfig }) => {
      if (h.fulfilled) handlerFn = h.fulfilled
    })

    expect(handlerFn).not.toBeNull()

    for (const method of MUTATING_METHODS) {
      const config = {
        headers: {} as Record<string, string>,
        method,
      } as unknown as import('axios').InternalAxiosRequestConfig

      const result = handlerFn!(config)
      expect(
        (result.headers as Record<string, string>)['X-CSRFToken'],
        `X-CSRFToken should be set for ${method}`
      ).toBe(csrfValue)
    }
  })

  it('X-CSRFToken is NOT attached on GET requests', async () => {
    document.cookie = 'csrftoken=some-csrf-value'

    const { apiClient } = await import('@/api/client')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptorManager = (apiClient.interceptors.request as any)
    let handlerFn: ((c: import('axios').InternalAxiosRequestConfig) => import('axios').InternalAxiosRequestConfig) | null = null
    interceptorManager.forEach((h: { fulfilled?: (c: import('axios').InternalAxiosRequestConfig) => import('axios').InternalAxiosRequestConfig }) => {
      if (h.fulfilled) handlerFn = h.fulfilled
    })

    const config = {
      headers: {} as Record<string, string>,
      method: 'get',
    } as unknown as import('axios').InternalAxiosRequestConfig

    const result = handlerFn!(config)
    expect((result.headers as Record<string, string>)['X-CSRFToken']).toBeUndefined()
  })
})

// ── Property 3.5: 401 response redirects to /login ───────────────────────────

describe('Property 3.5 — 401 response triggers redirect to /login', () => {
  it('a 401 error response sets window.location.href to /login', async () => {
    // Stub window.location
    const locationMock = { href: '' }
    vi.stubGlobal('location', locationMock)

    const { apiClient } = await import('@/api/client')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorManager = (apiClient.interceptors.response as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rejectedFns: Array<(e: any) => any> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseInterceptorManager.forEach((h: { rejected?: (e: any) => any }) => {
      if (h.rejected) rejectedFns.push(h.rejected)
    })

    expect(rejectedFns.length, 'response error interceptors should be registered').toBeGreaterThan(0)

    const error401 = { response: { status: 401 } }

    // Try each rejected handler — the token refresh interceptor should redirect on 401
    // (other interceptors may reject without redirecting)
    for (const fn of rejectedFns) {
      locationMock.href = ''
      await fn(error401).catch(() => {})
      if (locationMock.href === '/login') break
    }

    expect(locationMock.href).toBe('/login')

    vi.unstubAllGlobals()
  })

  it('non-401 errors do NOT redirect', async () => {
    const locationMock = { href: '' }
    vi.stubGlobal('location', locationMock)

    const { apiClient } = await import('@/api/client')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorManager = (apiClient.interceptors.response as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rejectedFns: Array<(e: any) => any> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseInterceptorManager.forEach((h: { rejected?: (e: any) => any }) => {
      if (h.rejected) rejectedFns.push(h.rejected)
    })

    for (const status of [400, 403, 404, 500]) {
      locationMock.href = ''
      const error = { response: { status } }
      // Run all interceptors — none should redirect for non-401 errors
      for (const fn of rejectedFns) {
        await fn(error).catch(() => {
          // Intentionally empty - we're testing that no redirect happens
        })
      }
      expect(locationMock.href, `status ${status} should not redirect`).toBe('')
    }

    vi.unstubAllGlobals()
  })
})
