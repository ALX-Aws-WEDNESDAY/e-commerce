import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { applyRetryInterceptor, calculateBackoff } from './retryInterceptor'
import * as fc from 'fast-check'

function createRetryError(
  message: string,
  config: InternalAxiosRequestConfig,
  status?: number,
): AxiosError {
  const error = new Error(message) as AxiosError
  error.config = config

  if (status !== undefined) {
    error.response = {
      data: { error: message },
      status,
      statusText: 'Error',
      headers: {},
      config,
    }
  }

  return error
}

describe('retryInterceptor', () => {
  let client: AxiosInstance

  beforeEach(() => {
    // Create a fresh Axios instance for each test
    client = axios.create({
      baseURL: 'http://localhost:3000',
    })
    applyRetryInterceptor(client)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateBackoff', () => {
    it('should return 200ms for attempt 0', () => {
      expect(calculateBackoff(0)).toBe(200)
    })

    it('should return 400ms for attempt 1', () => {
      expect(calculateBackoff(1)).toBe(400)
    })

    it('should return 800ms for attempt 2', () => {
      expect(calculateBackoff(2)).toBe(800)
    })

    it('should return 10000ms (capped) for attempt 10', () => {
      expect(calculateBackoff(10)).toBe(10_000)
    })

    it('should never exceed 10000ms for any attempt number', () => {
      expect(calculateBackoff(15)).toBe(10_000)
      expect(calculateBackoff(20)).toBe(10_000)
      expect(calculateBackoff(100)).toBe(10_000)
    })
  })

  describe('Retry Logic - GET 503', () => {
    it('should retry a GET 503 up to 3 times', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should have made 4 attempts total (1 initial + 3 retries)
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }
      expect(attemptCount).toBe(4)
    })

    it('should succeed if retry succeeds before max retries', async () => {
      // Arrange: Fail twice, then succeed
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        if (attemptCount <= 2) {
          throw createRetryError('Service Unavailable', config, 503)
        }
        // Third attempt succeeds
        return {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through retry delays
      await vi.runAllTimersAsync()

      const response = await requestPromise

      // Assert: Should succeed on the third attempt
      expect(attemptCount).toBe(3)
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ success: true })
    })
  })

  describe('Retry Logic - POST 503', () => {
    it('should NOT retry a POST 503', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a POST request and catch the error
      try {
        await client.post('/test', { data: 'test' })
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })
  })

  describe('Retry Logic - GET 404', () => {
    it('should NOT retry a GET 404', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Not Found', config, 404)
      }

      // Act: Make a GET request and catch the error
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Not Found')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })
  })

  describe('Retry Logic - GET 401', () => {
    it('should NOT retry a GET 401', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Unauthorized', config, 401)
      }

      // Act: Make a GET request and catch the error
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Unauthorized')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })
  })

  describe('Retry Logic - Other Retryable Status Codes', () => {
    it('should retry a GET 502 (Bad Gateway)', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Bad Gateway', config, 502)
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should have made 4 attempts total (1 initial + 3 retries)
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Bad Gateway')
      }
      expect(attemptCount).toBe(4)
    })

    it('should retry a GET 504 (Gateway Timeout)', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Gateway Timeout', config, 504)
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should have made 4 attempts total (1 initial + 3 retries)
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Gateway Timeout')
      }
      expect(attemptCount).toBe(4)
    })
  })

  describe('Retry Logic - Network Errors', () => {
    it('should retry a GET request on network error (no response)', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Network Error', config)
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should have made 4 attempts total (1 initial + 3 retries)
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Network Error')
      }
      expect(attemptCount).toBe(4)
    })
  })

  describe('Retry Logic - Idempotent Methods', () => {
    it('should retry HEAD requests', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a HEAD request
      const requestPromise = client.head('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should have made 4 attempts total (1 initial + 3 retries)
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }
      expect(attemptCount).toBe(4)
    })

    it('should retry OPTIONS requests', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make an OPTIONS request
      const requestPromise = client.options('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should have made 4 attempts total (1 initial + 3 retries)
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }
      expect(attemptCount).toBe(4)
    })
  })

  describe('Retry Logic - Non-Idempotent Methods', () => {
    it('should NOT retry PUT requests', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a PUT request and catch the error
      try {
        await client.put('/test', { data: 'test' })
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })

    it('should NOT retry PATCH requests', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a PATCH request and catch the error
      try {
        await client.patch('/test', { data: 'test' })
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })

    it('should NOT retry DELETE requests', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a DELETE request and catch the error
      try {
        await client.delete('/test')
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })
  })

  describe('Retry Logic - Client Errors', () => {
    it('should NOT retry a GET 400 (Bad Request)', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Bad Request', config, 400)
      }

      // Act: Make a GET request and catch the error
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Bad Request')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })

    it('should NOT retry a GET 403 (Forbidden)', async () => {
      // Arrange: Track how many times the adapter is called
      let attemptCount = 0
      client.defaults.adapter = async (config) => {
        attemptCount++
        throw createRetryError('Forbidden', config, 403)
      }

      // Act: Make a GET request and catch the error
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Forbidden')
      }

      // Assert: Should have made only 1 attempt (no retries)
      expect(attemptCount).toBe(1)
    })
  })

  describe('Retry Metadata', () => {
    it('should track retry count on config._retryCount', async () => {
      // Arrange: Track retry counts
      const retryCounts: number[] = []
      client.defaults.adapter = async (config) => {
        retryCounts.push(config._retryCount ?? 0)
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: Should track retry counts correctly
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }
      expect(retryCounts).toEqual([0, 1, 2, 3])
    })

    it('should set config._isRetry to true on retry attempts', async () => {
      // Arrange: Track _isRetry flag
      const isRetryFlags: boolean[] = []
      client.defaults.adapter = async (config) => {
        isRetryFlags.push(config._isRetry ?? false)
        throw createRetryError('Service Unavailable', config, 503)
      }

      // Act: Make a GET request
      const requestPromise = client.get('/test')
      requestPromise.catch(() => {}) // prevent unhandled-rejection flag before await

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync()

      // Assert: First attempt should be false, subsequent should be true
      try {
        await requestPromise
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        expect((error as AxiosError).message).toBe('Service Unavailable')
      }
      expect(isRetryFlags).toEqual([false, true, true, true])
    })
  })

  // Feature: frontend-microservice-readiness, Property 4: Backoff delay is correctly bounded
  describe('Property-Based Tests', () => {
    it('Property 4: Backoff delay is correctly bounded', () => {
      // **Validates: Requirements 3.2**
      // For any attempt number n ≥ 0, calculateBackoff(n) SHALL equal
      // Math.min(Math.pow(2, n) * 200, 10_000) and SHALL never exceed 10,000 ms

      fc.assert(
        fc.property(fc.nat({ max: 30 }), (attemptNumber) => {
          const backoff = calculateBackoff(attemptNumber)
          const expected = Math.min(Math.pow(2, attemptNumber) * 200, 10_000)

          // Assert: backoff equals the expected formula
          expect(backoff).toBe(expected)

          // Assert: backoff never exceeds 10,000 ms
          expect(backoff).toBeLessThanOrEqual(10_000)
        }),
        { numRuns: 100 },
      )
    })

    // Feature: frontend-microservice-readiness, Property 5: Idempotent requests are retried on transient failures
    it('Property 5: Idempotent requests are retried on transient failures', async () => {
      // **Validates: Requirements 3.1, 3.5**
      // For any GET, HEAD, or OPTIONS request failing with network error or 502/503/504,
      // the interceptor SHALL attempt up to 3 retries

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('GET', 'HEAD', 'OPTIONS'),
          fc.constantFrom(502, 503, 504),
          async (method, statusCode) => {
            // Arrange: Create a fresh client for each property test iteration
            const testClient = axios.create({
              baseURL: 'http://localhost:3000',
            })
            applyRetryInterceptor(testClient)

            let attemptCount = 0
            testClient.defaults.adapter = async (config) => {
              attemptCount++
              throw createRetryError(`HTTP ${statusCode}`, config, statusCode)
            }

            // Act: Make a request with the generated method and catch the error
            let caughtError: unknown = null
            const requestPromise = testClient
              .request({
                method: method.toLowerCase(),
                url: '/test',
              })
              .catch((error) => {
                caughtError = error
              })

            // Fast-forward through all retry delays
            await vi.runAllTimersAsync()

            // Wait for the request to complete
            await requestPromise

            // Assert: Should have caught an error
            expect(caughtError).toBeTruthy()
            expect(
              (caughtError as AxiosError).message,
            ).toBe(`HTTP ${statusCode}`)

            // The interceptor SHALL attempt up to 3 retries (4 total attempts)
            expect(attemptCount).toBe(4)
          },
        ),
        { numRuns: 100 },
      )
    })

    // Feature: frontend-microservice-readiness, Property 6: Non-idempotent requests are never retried
    it('Property 6: Non-idempotent requests are never retried', async () => {
      // **Validates: Requirements 3.3**
      // For any POST, PUT, PATCH, or DELETE request failing for any reason,
      // the interceptor SHALL not retry

      await fc.assert(
        fc.asyncProperty(fc.constantFrom('POST', 'PUT', 'PATCH', 'DELETE'), async (method) => {
          // Arrange: Create a fresh client for each property test iteration
          const testClient = axios.create({
            baseURL: 'http://localhost:3000',
          })
          applyRetryInterceptor(testClient)

          let attemptCount = 0
          testClient.defaults.adapter = async (config) => {
            attemptCount++
            throw createRetryError('Request failed', config, 503)
          }

          // Act: Make a request with the generated method and catch the error
          let caughtError: unknown = null
          await testClient
            .request({
              method: method.toLowerCase(),
              url: '/test',
              data: { test: 'data' },
            })
            .catch((error) => {
              caughtError = error
            })

          // Assert: Should have caught an error
          expect(caughtError).toBeTruthy()
          expect(
            (caughtError as AxiosError).message,
          ).toBe('Request failed')

          // The interceptor SHALL NOT retry (only 1 attempt)
          expect(attemptCount).toBe(1)
        }),
        { numRuns: 100 },
      )
    })

    // Feature: frontend-microservice-readiness, Property 7: Client errors are never retried
    it('Property 7: Client errors are never retried', async () => {
      // **Validates: Requirements 3.4**
      // For any request (any method) failing with 400, 401, 403, or 404,
      // the interceptor SHALL not retry

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(400, 401, 403, 404),
          fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          async (statusCode, method) => {
            // Arrange: Create a fresh client for each property test iteration
            const testClient = axios.create({
              baseURL: 'http://localhost:3000',
            })
            applyRetryInterceptor(testClient)

            let attemptCount = 0
            testClient.defaults.adapter = async (config) => {
              attemptCount++
              throw createRetryError(`HTTP ${statusCode}`, config, statusCode)
            }

            // Act: Make a request with the generated method and status code
            let caughtError: unknown = null
            await testClient
              .request({
                method: method.toLowerCase(),
                url: '/test',
                data: method !== 'GET' ? { test: 'data' } : undefined,
              })
              .catch((error) => {
                caughtError = error
              })

            // Assert: Should have caught an error
            expect(caughtError).toBeTruthy()
            expect(
              (caughtError as AxiosError).message,
            ).toBe(`HTTP ${statusCode}`)

            // The interceptor SHALL NOT retry client errors (only 1 attempt)
            expect(attemptCount).toBe(1)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
