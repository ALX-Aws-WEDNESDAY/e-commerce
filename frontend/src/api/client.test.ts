/**
 * Unit tests for src/api/client.ts
 *
 * client.ts is a module with side effects at import time:
 *   - reads import.meta.env.VITE_API_BASE_URL and warns if absent
 *   - registers interceptors on the Axios instance
 *
 * Strategy:
 *   - Use vi.mock() to stub the interceptor modules and auth store.
 *     The interceptor mocks actually call client.interceptors.*.use() so
 *     that the handler-count assertions reflect real registration behaviour.
 *   - Use vi.stubEnv() + vi.resetModules() + dynamic import() to re-execute
 *     the module under different environment variable conditions.
 *   - Capture mock references before resetModules() so call counts are
 *     tracked on the same function object that client.ts invokes.
 *
 * Validates: Requirements 1.1, 1.2, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosInstance } from 'axios'
import * as fc from 'fast-check'

// ── Mock all dependencies that client.ts imports ──────────────────────────────

vi.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ accessToken: null })),
  },
}))

// The interceptor mocks register interceptors on the client so that the
// handler-count assertions work correctly.
vi.mock('@/api/interceptors/correlationIdInterceptor', () => ({
  applyCorrelationIdInterceptor: vi.fn((client: AxiosInstance) => {
    // Mirrors the real implementation: one request + one response interceptor
    client.interceptors.request.use((config) => config)
    client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    )
  }),
}))

vi.mock('@/api/interceptors/tokenRefreshInterceptor', () => ({
  applyTokenRefreshInterceptor: vi.fn((client: AxiosInstance) => {
    // Mirrors the real implementation: one response interceptor
    client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    )
  }),
}))

vi.mock('@/api/interceptors/retryInterceptor', () => ({
  applyRetryInterceptor: vi.fn((client: AxiosInstance) => {
    // Mirrors the real implementation: one response interceptor
    client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    )
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Re-imports client.ts after resetting the module registry so the module-level
 * side effects (env check, interceptor registration) run fresh each time.
 *
 * Returns both the client module and the mock functions that were active
 * during that import (captured before resetModules clears the cache).
 */
async function importFreshClient() {
  // Capture mock references BEFORE resetting modules — these are the same
  // function objects that the freshly-imported client.ts will call.
  const { applyCorrelationIdInterceptor } = await import(
    '@/api/interceptors/correlationIdInterceptor'
  )
  const { applyTokenRefreshInterceptor } = await import(
    '@/api/interceptors/tokenRefreshInterceptor'
  )
  const { applyRetryInterceptor } = await import('@/api/interceptors/retryInterceptor')

  // Clear accumulated call counts from previous test runs
  vi.mocked(applyCorrelationIdInterceptor).mockClear()
  vi.mocked(applyTokenRefreshInterceptor).mockClear()
  vi.mocked(applyRetryInterceptor).mockClear()

  // Reset module cache so client.ts re-executes its side effects
  vi.resetModules()

  const clientMod = await import('@/api/client')

  return {
    apiClient: clientMod.apiClient,
    mocks: {
      applyCorrelationIdInterceptor: vi.mocked(applyCorrelationIdInterceptor),
      applyTokenRefreshInterceptor: vi.mocked(applyTokenRefreshInterceptor),
      applyRetryInterceptor: vi.mocked(applyRetryInterceptor),
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('client.ts — environment variable handling', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('emits a console.warn when VITE_API_BASE_URL is empty string', async () => {
    // Requirement 1.2: when VITE_API_BASE_URL is not set, warn and fall back
    vi.stubEnv('VITE_API_BASE_URL', '')

    await importFreshClient()

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('VITE_API_BASE_URL is not set'),
    )
  })

  it('does NOT emit a console.warn when VITE_API_BASE_URL is set', async () => {
    // Requirement 1.1: when the env var is present, no warning
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    await importFreshClient()

    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('uses http://localhost:8000 as the base URL when VITE_API_BASE_URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    const { apiClient } = await importFreshClient()

    // The Axios instance baseURL should fall back to the default
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000/api')
  })

  it('uses the provided VITE_API_BASE_URL when set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://gateway.example.com')

    const { apiClient } = await importFreshClient()

    expect(apiClient.defaults.baseURL).toBe('https://gateway.example.com/api')
  })
})

describe('client.ts — interceptor registration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('registers exactly 2 request interceptors', async () => {
    // Requirement 1.1 / 1.2:
    //   - correlationIdInterceptor registers 1 request interceptor
    //   - the inline auth + CSRF handler registers 1 request interceptor
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    const { apiClient } = await importFreshClient()

    // Axios stores registered interceptors in interceptors.request.handlers.
    // Ejected interceptors become null; filter them out.
    const handlers = (apiClient.interceptors.request as any).handlers as unknown[]
    const activeHandlers = handlers.filter(Boolean)

    expect(activeHandlers).toHaveLength(2)
  })

  it('registers exactly 3 response interceptors', async () => {
    // Requirement 1.1 / 1.2:
    //   - correlationIdInterceptor registers 1 response interceptor
    //   - tokenRefreshInterceptor registers 1 response interceptor
    //   - retryInterceptor registers 1 response interceptor
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    const { apiClient } = await importFreshClient()

    const handlers = (apiClient.interceptors.response as any).handlers as unknown[]
    const activeHandlers = handlers.filter(Boolean)

    expect(activeHandlers).toHaveLength(3)
  })

  it('calls applyCorrelationIdInterceptor with the apiClient', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    const { mocks } = await importFreshClient()

    expect(mocks.applyCorrelationIdInterceptor).toHaveBeenCalledOnce()
  })

  it('calls applyTokenRefreshInterceptor with the apiClient', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    const { mocks } = await importFreshClient()

    expect(mocks.applyTokenRefreshInterceptor).toHaveBeenCalledOnce()
  })

  it('calls applyRetryInterceptor with the apiClient', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    const { mocks } = await importFreshClient()

    expect(mocks.applyRetryInterceptor).toHaveBeenCalledOnce()
  })
})

// Feature: frontend-microservice-readiness, Property 18: All requests target /api/ prefix
describe('client.ts — Property-Based Tests', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('Property 18: All requests target /api/ prefix', async () => {
    // **Validates: Requirements 1.5**
    // For any endpoint path passed to a domain API module, the resulting HTTP
    // request URL SHALL contain `/api/` as a path prefix, ensuring API Gateway
    // path-based routing rules apply consistently.

    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const { apiClient } = await importFreshClient()

    await fc.assert(
      fc.asyncProperty(
        // Domain API modules always pass a non-empty path starting with '/'.
        // Filter fc.webPath() to paths that start with '/' so the constructed
        // URL is baseURL + '/...' = '...example.com/api/...' which always
        // contains '/api/' as a path prefix.
        fc.webPath().filter((p) => p.startsWith('/')),
        async (endpointPath) => {
          // Arrange: capture the request config via a mock adapter
          let capturedBaseURL: string | undefined
          let capturedUrl: string | undefined

          const originalAdapter = apiClient.defaults.adapter
          apiClient.defaults.adapter = async (config) => {
            capturedBaseURL = config.baseURL
            capturedUrl = config.url
            return {
              data: {},
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            }
          }

          try {
            // Act: make a request with the arbitrary path
            await apiClient.get(endpointPath)
          } finally {
            // Restore the original adapter after each iteration
            apiClient.defaults.adapter = originalAdapter
          }

          // Assert: the full URL (baseURL + path) contains /api/ as a prefix
          const fullUrl = `${capturedBaseURL ?? ''}${capturedUrl ?? ''}`
          expect(fullUrl).toContain('/api/')
        }
      ),
      { numRuns: 100 }
    )
  })
})
