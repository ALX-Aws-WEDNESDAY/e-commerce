import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { applyTokenRefreshInterceptor } from './tokenRefreshInterceptor'
import { useAuthStore } from '@/store/auth.store'

// Mock the auth store
vi.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}))

describe('tokenRefreshInterceptor', () => {
  let client: AxiosInstance
  let mockClearUser: ReturnType<typeof vi.fn>
  let mockSetTokens: ReturnType<typeof vi.fn>
  let originalLocation: Location
  let mockLocation: { href: string }

  beforeEach(() => {
    // Create a fresh Axios instance for each test
    client = axios.create({
      baseURL: 'http://localhost:3000',
      withCredentials: true,
    })
    applyTokenRefreshInterceptor(client)

    // Mock auth store methods
    mockClearUser = vi.fn()
    mockSetTokens = vi.fn()
    vi.mocked(useAuthStore.getState).mockReturnValue({
      clearUser: mockClearUser,
      setTokens: mockSetTokens,
    } as any)

    // Mock window.location
    originalLocation = window.location
    mockLocation = { href: '' }
    delete (window as any).location
    window.location = mockLocation as any

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'refreshtoken=mock-refresh-token',
    })
  })

  afterEach(() => {
    window.location = originalLocation
    vi.clearAllMocks()
  })

  describe('401 on normal endpoint triggers refresh', () => {
    it('should call the refresh endpoint when a normal endpoint returns 401', async () => {
      // Arrange: Track adapter calls
      let callCount = 0
      const calls: string[] = []

      client.defaults.adapter = async (config) => {
        callCount++
        calls.push(config.url || '')

        // First call: GET /products returns 401
        if (callCount === 1 && config.url === '/products') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        // Second call: POST /users/refresh/ succeeds
        if (callCount === 2 && config.url === '/users/refresh/') {
          return {
            data: { access: 'new-access-token' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        // Third call: Replay GET /products succeeds
        if (callCount === 3 && config.url === '/products') {
          return {
            data: { products: [] },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a GET request to /products
      const response = await client.get('/products')

      // Assert: Should have called refresh endpoint
      expect(calls).toEqual(['/products', '/users/refresh/', '/products'])
      expect(callCount).toBe(3)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ products: [] })
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', '')
    })
  })

  describe('401 on /users/login/ does NOT trigger refresh', () => {
    it('should NOT call refresh endpoint when /users/login/ returns 401', async () => {
      // Arrange: Track adapter calls
      let callCount = 0
      const calls: string[] = []

      client.defaults.adapter = async (config) => {
        callCount++
        calls.push(config.url || '')

        // POST /users/login/ returns 401
        if (config.url === '/users/login/') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Invalid credentials' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a POST request to /users/login/ and catch the error
      let caughtError: any = null
      await client.post('/users/login/', { username: 'test', password: 'test' }).catch((error) => {
        caughtError = error
      })

      // Assert: Should NOT have called refresh endpoint
      expect(calls).toEqual(['/users/login/'])
      expect(callCount).toBe(1)
      expect(caughtError).toBeTruthy()
      expect(caughtError.response.status).toBe(401)
      expect(mockSetTokens).not.toHaveBeenCalled()
      expect(mockClearUser).not.toHaveBeenCalled()
    })
  })

  describe('401 on /users/refresh/ does NOT trigger refresh', () => {
    it('should NOT call refresh endpoint when /users/refresh/ returns 401', async () => {
      // Arrange: Track adapter calls
      let callCount = 0
      const calls: string[] = []

      client.defaults.adapter = async (config) => {
        callCount++
        calls.push(config.url || '')

        // POST /users/refresh/ returns 401
        if (config.url === '/users/refresh/') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Refresh token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a POST request to /users/refresh/ and catch the error
      let caughtError: any = null
      await client.post('/users/refresh/').catch((error) => {
        caughtError = error
      })

      // Assert: Should NOT have called refresh endpoint again
      expect(calls).toEqual(['/users/refresh/'])
      expect(callCount).toBe(1)
      expect(caughtError).toBeTruthy()
      expect(caughtError.response.status).toBe(401)
      expect(mockSetTokens).not.toHaveBeenCalled()
      expect(mockClearUser).not.toHaveBeenCalled()
    })
  })

  describe('Original request is replayed after successful refresh', () => {
    it('should replay the original request with the new access token', async () => {
      // Arrange: Track adapter calls and headers
      let callCount = 0
      const calls: Array<{ url: string; headers: any }> = []

      client.defaults.adapter = async (config) => {
        callCount++
        calls.push({ url: config.url || '', headers: config.headers })

        // First call: GET /cart returns 401
        if (callCount === 1 && config.url === '/cart') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        // Second call: POST /users/refresh/ succeeds
        if (callCount === 2 && config.url === '/users/refresh/') {
          return {
            data: { access: 'new-access-token' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        // Third call: Replay GET /cart with new token
        if (callCount === 3 && config.url === '/cart') {
          return {
            data: { items: [] },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a GET request to /cart
      const response = await client.get('/cart')

      // Assert: Should have replayed the original request with new token
      expect(callCount).toBe(3)
      expect(calls[0].url).toBe('/cart')
      expect(calls[1].url).toBe('/users/refresh/')
      expect(calls[2].url).toBe('/cart')
      expect(calls[2].headers['Authorization']).toBe('Bearer new-access-token')
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ items: [] })
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', '')
    })
  })

  describe('clearUser and redirect when refresh fails', () => {
    it('should clear user and redirect to /login when refresh returns 401', async () => {
      // Arrange: Track adapter calls
      let callCount = 0

      client.defaults.adapter = async (config) => {
        callCount++

        // First call: GET /orders returns 401
        if (callCount === 1 && config.url === '/orders') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        // Second call: POST /users/refresh/ returns 401 (refresh token expired)
        if (callCount === 2 && config.url === '/users/refresh/') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Refresh token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a GET request to /orders and catch the error
      let caughtError: any = null
      await client.get('/orders').catch((error) => {
        caughtError = error
      })

      // Assert: Should have cleared user and redirected to /login
      expect(callCount).toBe(2)
      expect(caughtError).toBeTruthy()
      expect(mockClearUser).toHaveBeenCalledOnce()
      expect(mockLocation.href).toBe('/login')
    })

    it('should clear user and redirect to /login when refresh returns 403', async () => {
      // Arrange: Track adapter calls
      let callCount = 0

      client.defaults.adapter = async (config) => {
        callCount++

        // First call: GET /orders returns 401
        if (callCount === 1 && config.url === '/orders') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        // Second call: POST /users/refresh/ returns 403 (forbidden)
        if (callCount === 2 && config.url === '/users/refresh/') {
          const error: any = new Error('Forbidden')
          error.response = {
            data: { error: 'Refresh token invalid' },
            status: 403,
            statusText: 'Forbidden',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a GET request to /orders and catch the error
      let caughtError: any = null
      await client.get('/orders').catch((error) => {
        caughtError = error
      })

      // Assert: Should have cleared user and redirected to /login
      expect(callCount).toBe(2)
      expect(caughtError).toBeTruthy()
      expect(mockClearUser).toHaveBeenCalledOnce()
      expect(mockLocation.href).toBe('/login')
    })
  })

  describe('No refresh token cookie', () => {
    it('should clear user and redirect immediately when no refresh token cookie is present', async () => {
      // Arrange: Remove refresh token cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      })

      let callCount = 0

      client.defaults.adapter = async (config) => {
        callCount++

        // GET /products returns 401
        if (config.url === '/products') {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make a GET request to /products and catch the error
      let caughtError: any = null
      await client.get('/products').catch((error) => {
        caughtError = error
      })

      // Assert: Should have cleared user and redirected without calling refresh
      expect(callCount).toBe(1)
      expect(caughtError).toBeTruthy()
      expect(mockClearUser).toHaveBeenCalledOnce()
      expect(mockLocation.href).toBe('/login')
    })
  })

  describe('Concurrent 401 requests', () => {
    it('should queue concurrent requests and replay them all after refresh', async () => {
      // Arrange: Track adapter calls
      let callCount = 0
      const calls: string[] = []

      client.defaults.adapter = async (config) => {
        callCount++
        calls.push(config.url || '')

        // First two calls: GET /products and GET /cart both return 401
        if ((callCount === 1 || callCount === 2) && (config.url === '/products' || config.url === '/cart')) {
          const error: any = new Error('Unauthorized')
          error.response = {
            data: { error: 'Token expired' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
          error.config = config
          throw error
        }

        // Third call: POST /users/refresh/ succeeds
        if (callCount === 3 && config.url === '/users/refresh/') {
          return {
            data: { access: 'new-access-token' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        // Fourth and fifth calls: Replay GET /products and GET /cart
        if ((callCount === 4 || callCount === 5) && (config.url === '/products' || config.url === '/cart')) {
          return {
            data: { success: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        throw new Error(`Unexpected call: ${config.url}`)
      }

      // Act: Make two concurrent requests
      const [response1, response2] = await Promise.all([
        client.get('/products'),
        client.get('/cart'),
      ])

      // Assert: Should have called refresh once and replayed both requests
      expect(callCount).toBe(5)
      expect(calls.filter((url) => url === '/users/refresh/')).toHaveLength(1)
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', '')
    })
  })
})

// ── Property-Based Tests ─────────────────────────────────────────────────────

import * as fc from 'fast-check'

describe('tokenRefreshInterceptor - Property-Based Tests', () => {
  let client: AxiosInstance
  let mockClearUser: ReturnType<typeof vi.fn>
  let mockSetTokens: ReturnType<typeof vi.fn>
  let originalLocation: Location
  let mockLocation: { href: string }

  beforeEach(() => {
    // Create a fresh Axios instance for each test
    client = axios.create({
      baseURL: 'http://localhost:3000',
      withCredentials: true,
    })
    applyTokenRefreshInterceptor(client)

    // Mock auth store methods
    mockClearUser = vi.fn()
    mockSetTokens = vi.fn()
    vi.mocked(useAuthStore.getState).mockReturnValue({
      clearUser: mockClearUser,
      setTokens: mockSetTokens,
    } as any)

    // Mock window.location
    originalLocation = window.location
    mockLocation = { href: '' }
    delete (window as any).location
    window.location = mockLocation as any

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'refreshtoken=mock-refresh-token',
    })
  })

  afterEach(() => {
    window.location = originalLocation
    vi.clearAllMocks()
  })

  // Feature: frontend-microservice-readiness, Property 13: Token refresh queues concurrent 401s
  describe('Property 13: Token refresh queues concurrent 401s', () => {
    it('should call refresh exactly once for N concurrent 401s and replay all N requests', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 10 }), async (N) => {
          // Reset mocks for each property test iteration
          mockSetTokens.mockClear()
          mockClearUser.mockClear()

          // Arrange: Track adapter calls
          let callCount = 0
          const calls: string[] = []
          const requestUrls = Array.from({ length: N }, (_, i) => `/endpoint-${i}`)

          client.defaults.adapter = async (config) => {
            callCount++
            calls.push(config.url || '')

            // First N calls: All endpoints return 401
            if (callCount <= N && requestUrls.includes(config.url || '')) {
              const error: any = new Error('Unauthorized')
              error.response = {
                data: { error: 'Token expired' },
                status: 401,
                statusText: 'Unauthorized',
                headers: {},
                config,
              }
              error.config = config
              throw error
            }

            // Next call: POST /users/refresh/ succeeds
            if (config.url === '/users/refresh/') {
              return {
                data: { access: 'new-access-token' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
              }
            }

            // Remaining N calls: Replay all original requests
            if (requestUrls.includes(config.url || '')) {
              return {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
              }
            }

            throw new Error(`Unexpected call: ${config.url}`)
          }

          // Act: Make N concurrent requests
          const promises = requestUrls.map((url) => client.get(url))
          const responses = await Promise.all(promises)

          // Assert: Should have called refresh exactly once
          const refreshCalls = calls.filter((url) => url === '/users/refresh/')
          expect(refreshCalls).toHaveLength(1)

          // Assert: All N requests should have succeeded
          expect(responses).toHaveLength(N)
          responses.forEach((response) => {
            expect(response.status).toBe(200)
            expect(response.data).toEqual({ success: true })
          })

          // Assert: Total calls should be N (initial 401s) + 1 (refresh) + N (replays)
          expect(callCount).toBe(N + 1 + N)

          // Assert: setTokens should have been called once with the new token
          expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', '')
          expect(mockSetTokens).toHaveBeenCalledTimes(1)
        }),
        { numRuns: 100 },
      )
    })
  })

  // Feature: frontend-microservice-readiness, Property 14: Refresh interceptor skips auth endpoints
  describe('Property 14: Refresh interceptor skips auth endpoints', () => {
    /**
     * Validates: Requirements 2.6
     *
     * For any request to `/users/login/` or `/users/refresh/` receiving a 401,
     * the interceptor SHALL NOT attempt a token refresh.
     */
    it('should NOT attempt a token refresh when an auth endpoint returns 401', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/users/login/', '/users/refresh/'),
          async (authUrl) => {
            // Reset mocks for each property test iteration
            mockSetTokens.mockClear()
            mockClearUser.mockClear()

            // Arrange: Track adapter calls
            const calls: string[] = []

            client.defaults.adapter = async (config) => {
              calls.push(config.url || '')

              // Auth endpoint always returns 401
              if (config.url === authUrl) {
                const error: any = new Error('Unauthorized')
                error.response = {
                  data: { error: 'Unauthorized' },
                  status: 401,
                  statusText: 'Unauthorized',
                  headers: {},
                  config,
                }
                error.config = config
                throw error
              }

              // Any other call is unexpected — the interceptor must not call refresh
              throw new Error(`Unexpected call to: ${config.url}`)
            }

            // Act: Make a request to the auth endpoint and capture the error
            let caughtError: any = null
            await client.post(authUrl).catch((err) => {
              caughtError = err
            })

            // Assert: The error should have been propagated as-is
            expect(caughtError).toBeTruthy()
            expect(caughtError.response?.status).toBe(401)

            // Assert: Only the original auth endpoint was called — no refresh attempt
            expect(calls).toEqual([authUrl])

            // Assert: Auth store must not have been touched
            expect(mockSetTokens).not.toHaveBeenCalled()
            expect(mockClearUser).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
