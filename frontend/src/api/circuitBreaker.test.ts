import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  CircuitBreaker,
  CircuitBreakerManager,
  ServiceUnavailableError,
} from './circuitBreaker'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── CLOSED → OPEN transition ────────────────────────────────────────────────

  describe('CLOSED → OPEN transition', () => {
    it('should remain CLOSED after fewer than 5 failures', () => {
      const breaker = new CircuitBreaker()

      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }

      expect(breaker.getState()).toBe('CLOSED')
    })

    it('should transition to OPEN after exactly 5 consecutive failures', () => {
      const breaker = new CircuitBreaker()

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      expect(breaker.getState()).toBe('OPEN')
    })

    it('should transition to OPEN after more than 5 failures', () => {
      const breaker = new CircuitBreaker()

      for (let i = 0; i < 7; i++) {
        breaker.recordFailure()
      }

      expect(breaker.getState()).toBe('OPEN')
    })

    it('should reset failure count on success and require 5 new failures to open', () => {
      const breaker = new CircuitBreaker()

      // Record 4 failures, then a success
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }
      breaker.recordSuccess()
      expect(breaker.getState()).toBe('CLOSED')

      // Now 4 more failures should not open the circuit
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('CLOSED')

      // The 5th failure should open it
      breaker.recordFailure()
      expect(breaker.getState()).toBe('OPEN')
    })

    it('should respect a custom failureThreshold', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 })

      breaker.recordFailure()
      breaker.recordFailure()
      expect(breaker.getState()).toBe('CLOSED')

      breaker.recordFailure()
      expect(breaker.getState()).toBe('OPEN')
    })

    it('should not open if failures are outside the rolling window', () => {
      const breaker = new CircuitBreaker({ windowMs: 5_000 })

      // Record 4 failures
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }

      // Advance time past the window
      vi.advanceTimersByTime(6_000)

      // This failure should reset the count (outside window), so count = 1
      breaker.recordFailure()
      expect(breaker.getState()).toBe('CLOSED')
    })
  })

  // ── OPEN state rejects requests ─────────────────────────────────────────────

  describe('OPEN state', () => {
    it('should not allow requests when OPEN', () => {
      const breaker = new CircuitBreaker()

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      expect(breaker.getState()).toBe('OPEN')
      expect(breaker.allowRequest()).toBe(false)
    })

    it('should return a positive retryAfter when OPEN', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      const retryAfter = breaker.getRetryAfter()
      expect(retryAfter).not.toBeNull()
      expect(retryAfter!).toBeGreaterThan(0)
      expect(retryAfter!).toBeLessThanOrEqual(30_000)
    })

    it('should return null for getRetryAfter when CLOSED', () => {
      const breaker = new CircuitBreaker()
      expect(breaker.getRetryAfter()).toBeNull()
    })
  })

  // ── OPEN → HALF_OPEN transition ─────────────────────────────────────────────

  describe('OPEN → HALF_OPEN transition', () => {
    it('should transition to HALF_OPEN after cooldown elapses', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('OPEN')

      // Advance time past the cooldown
      vi.advanceTimersByTime(30_000)

      // allowRequest triggers the OPEN → HALF_OPEN transition
      const allowed = breaker.allowRequest()
      expect(allowed).toBe(true)
      expect(breaker.getState()).toBe('HALF_OPEN')
    })

    it('should NOT transition to HALF_OPEN before cooldown elapses', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      // Advance time to just before the cooldown
      vi.advanceTimersByTime(29_999)

      expect(breaker.allowRequest()).toBe(false)
      expect(breaker.getState()).toBe('OPEN')
    })

    it('should return 0 for getRetryAfter once cooldown has elapsed', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      vi.advanceTimersByTime(30_000)

      expect(breaker.getRetryAfter()).toBe(0)
    })
  })

  // ── HALF_OPEN → CLOSED on probe success ─────────────────────────────────────

  describe('HALF_OPEN → CLOSED on probe success', () => {
    it('should transition to CLOSED when probe succeeds', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      // Wait for cooldown and allow probe
      vi.advanceTimersByTime(30_000)
      breaker.allowRequest()
      expect(breaker.getState()).toBe('HALF_OPEN')

      // Probe succeeds
      breaker.recordSuccess()
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('should allow requests normally after closing from HALF_OPEN', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      vi.advanceTimersByTime(30_000)
      breaker.allowRequest() // transitions to HALF_OPEN
      breaker.recordSuccess() // transitions to CLOSED

      expect(breaker.allowRequest()).toBe(true)
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('should reset failure count after closing from HALF_OPEN', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      vi.advanceTimersByTime(30_000)
      breaker.allowRequest()
      breaker.recordSuccess()

      // After closing, getRetryAfter should be null
      expect(breaker.getRetryAfter()).toBeNull()
    })
  })

  // ── HALF_OPEN → OPEN on probe failure ───────────────────────────────────────

  describe('HALF_OPEN → OPEN on probe failure', () => {
    it('should transition back to OPEN when probe fails', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      vi.advanceTimersByTime(30_000)
      breaker.allowRequest() // transitions to HALF_OPEN
      expect(breaker.getState()).toBe('HALF_OPEN')

      // Probe fails
      breaker.recordFailure()
      expect(breaker.getState()).toBe('OPEN')
    })

    it('should reset the cooldown timer when probe fails', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      // First cooldown elapses
      vi.advanceTimersByTime(30_000)
      breaker.allowRequest() // → HALF_OPEN
      breaker.recordFailure() // → OPEN (cooldown reset)

      // Advance only 29s — should still be OPEN (cooldown not elapsed yet)
      vi.advanceTimersByTime(29_000)
      expect(breaker.allowRequest()).toBe(false)
      expect(breaker.getState()).toBe('OPEN')

      // Advance the remaining 1s to complete the new cooldown
      vi.advanceTimersByTime(1_000)
      expect(breaker.allowRequest()).toBe(true)
      expect(breaker.getState()).toBe('HALF_OPEN')
    })

    it('should not allow requests immediately after probe failure', () => {
      const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      vi.advanceTimersByTime(30_000)
      breaker.allowRequest() // → HALF_OPEN
      breaker.recordFailure() // → OPEN

      // No time has passed — should be blocked
      expect(breaker.allowRequest()).toBe(false)
    })
  })
})

// ── CircuitBreakerManager ─────────────────────────────────────────────────────

describe('CircuitBreakerManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('domain isolation', () => {
    it('should track failures independently per domain', () => {
      const manager = new CircuitBreakerManager()

      // Record 5 failures for domain A
      const breakerA = manager.getBreaker('products')
      for (let i = 0; i < 5; i++) {
        breakerA.recordFailure()
      }

      // Domain A should be OPEN
      expect(manager.getBreaker('products').getState()).toBe('OPEN')

      // Domain B should still be CLOSED
      expect(manager.getBreaker('cart').getState()).toBe('CLOSED')
    })

    it('should allow requests to domain B when domain A is OPEN', async () => {
      const manager = new CircuitBreakerManager()

      // Open domain A
      const breakerA = manager.getBreaker('products')
      for (let i = 0; i < 5; i++) {
        breakerA.recordFailure()
      }
      expect(breakerA.getState()).toBe('OPEN')

      // Domain B should still execute successfully
      const result = await manager.execute('cart', async () => 'cart-response')
      expect(result).toBe('cart-response')
    })

    it('should maintain separate breakers for each domain', () => {
      const manager = new CircuitBreakerManager()

      const breakerProducts = manager.getBreaker('products')
      const breakerCart = manager.getBreaker('cart')
      const breakerUsers = manager.getBreaker('users')

      // All should be independent instances
      expect(breakerProducts).not.toBe(breakerCart)
      expect(breakerCart).not.toBe(breakerUsers)
      expect(breakerProducts).not.toBe(breakerUsers)
    })

    it('should return the same breaker instance for the same domain', () => {
      const manager = new CircuitBreakerManager()

      const breaker1 = manager.getBreaker('products')
      const breaker2 = manager.getBreaker('products')

      expect(breaker1).toBe(breaker2)
    })
  })

  describe('execute — OPEN state throws ServiceUnavailableError', () => {
    it('should throw ServiceUnavailableError when circuit is OPEN', async () => {
      const manager = new CircuitBreakerManager()

      // Open the circuit by recording failures directly
      const breaker = manager.getBreaker('products')
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      // execute should throw without calling the request function
      let requestFnCalled = false
      await expect(
        manager.execute('products', async () => {
          requestFnCalled = true
          return 'response'
        })
      ).rejects.toThrow(ServiceUnavailableError)

      expect(requestFnCalled).toBe(false)
    })

    it('should include domain in ServiceUnavailableError', async () => {
      const manager = new CircuitBreakerManager()

      const breaker = manager.getBreaker('products')
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      await expect(
        manager.execute('products', async () => 'response')
      ).rejects.toMatchObject({
        domain: 'products',
      })
    })

    it('should include retryAfterMs in ServiceUnavailableError', async () => {
      const manager = new CircuitBreakerManager()

      const breaker = manager.getBreaker('products')
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      let thrownError: ServiceUnavailableError | null = null
      try {
        await manager.execute('products', async () => 'response')
      } catch (err) {
        thrownError = err as ServiceUnavailableError
      }

      expect(thrownError).toBeInstanceOf(ServiceUnavailableError)
      expect(thrownError!.retryAfterMs).toBeGreaterThanOrEqual(0)
    })

    it('should NOT make a network call when circuit is OPEN', async () => {
      const manager = new CircuitBreakerManager()

      const breaker = manager.getBreaker('users')
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      const mockFn = vi.fn().mockResolvedValue('data')

      await expect(manager.execute('users', mockFn)).rejects.toThrow(ServiceUnavailableError)
      expect(mockFn).not.toHaveBeenCalled()
    })
  })

  describe('execute — success and failure recording', () => {
    it('should record success when request function resolves', async () => {
      const manager = new CircuitBreakerManager()

      // Record 4 failures (not yet open)
      const breaker = manager.getBreaker('products')
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }

      // Successful execute should reset failure count
      await manager.execute('products', async () => 'ok')

      // After success, 4 more failures should not open the circuit
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('should record failure when request function rejects', async () => {
      const manager = new CircuitBreakerManager()

      // Execute 5 failing requests to open the circuit
      for (let i = 0; i < 5; i++) {
        await expect(
          manager.execute('products', async () => {
            throw new Error('request failed')
          })
        ).rejects.toThrow('request failed')
      }

      expect(manager.getBreaker('products').getState()).toBe('OPEN')
    })

    it('should re-throw the original error from the request function', async () => {
      const manager = new CircuitBreakerManager()
      const originalError = new Error('original error')

      await expect(
        manager.execute('products', async () => {
          throw originalError
        })
      ).rejects.toBe(originalError)
    })
  })

  describe('execute — full lifecycle', () => {
    it('should open after 5 failures, block requests, then allow probe after cooldown', async () => {
      const manager = new CircuitBreakerManager()
      const domain = 'products'

      // Step 1: 5 failures open the circuit
      for (let i = 0; i < 5; i++) {
        await expect(
          manager.execute(domain, async () => {
            throw new Error('service down')
          })
        ).rejects.toThrow('service down')
      }
      expect(manager.getBreaker(domain).getState()).toBe('OPEN')

      // Step 2: Requests are blocked
      await expect(
        manager.execute(domain, async () => 'response')
      ).rejects.toThrow(ServiceUnavailableError)

      // Step 3: After cooldown, probe is allowed
      vi.advanceTimersByTime(30_000)
      const result = await manager.execute(domain, async () => 'probe-success')
      expect(result).toBe('probe-success')
      expect(manager.getBreaker(domain).getState()).toBe('CLOSED')
    })

    it('should re-open after failed probe and require another cooldown', async () => {
      const manager = new CircuitBreakerManager()
      const domain = 'cart'

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await expect(
          manager.execute(domain, async () => {
            throw new Error('service down')
          })
        ).rejects.toThrow('service down')
      }

      // Wait for cooldown
      vi.advanceTimersByTime(30_000)

      // Probe fails — circuit re-opens
      await expect(
        manager.execute(domain, async () => {
          throw new Error('still down')
        })
      ).rejects.toThrow('still down')
      expect(manager.getBreaker(domain).getState()).toBe('OPEN')

      // Requests are blocked again
      await expect(
        manager.execute(domain, async () => 'response')
      ).rejects.toThrow(ServiceUnavailableError)

      // After another cooldown, probe is allowed again
      vi.advanceTimersByTime(30_000)
      const result = await manager.execute(domain, async () => 'recovered')
      expect(result).toBe('recovered')
      expect(manager.getBreaker(domain).getState()).toBe('CLOSED')
    })
  })
})

// ── ServiceUnavailableError ───────────────────────────────────────────────────

describe('ServiceUnavailableError', () => {
  it('should have the correct name', () => {
    const error = new ServiceUnavailableError('products', 30_000)
    expect(error.name).toBe('ServiceUnavailableError')
  })

  it('should expose domain and retryAfterMs properties', () => {
    const error = new ServiceUnavailableError('cart', 15_000)
    expect(error.domain).toBe('cart')
    expect(error.retryAfterMs).toBe(15_000)
  })

  it('should be an instance of Error', () => {
    const error = new ServiceUnavailableError('users', 0)
    expect(error).toBeInstanceOf(Error)
  })

  it('should include domain and retryAfterMs in the message', () => {
    const error = new ServiceUnavailableError('products', 30_000)
    expect(error.message).toContain('products')
    expect(error.message).toContain('30000')
  })
})

// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('CircuitBreaker — property-based tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Feature: frontend-microservice-readiness, Property 8: Circuit breaker opens after threshold failures
  it('Property 8: Circuit breaker opens after threshold failures', () => {
    // Validates: Requirements 4.2
    fc.assert(
      fc.property(fc.string(), (domain) => {
        const failureThreshold = 5
        const windowMs = 30_000

        // Create a fresh CircuitBreakerManager for each domain
        const manager = new CircuitBreakerManager()
        const breaker = manager.getBreaker(domain)

        // Record exactly failureThreshold consecutive failures within windowMs
        for (let i = 0; i < failureThreshold; i++) {
          breaker.recordFailure()
        }

        // After exactly failureThreshold failures within the window, state SHALL be OPEN
        return breaker.getState() === 'OPEN'
      }),
      { numRuns: 100 }
    )
  })

  // Feature: frontend-microservice-readiness, Property 9: Open circuit rejects requests without network calls
  it('Property 9: Open circuit rejects requests without network calls', async () => {
    // Validates: Requirements 4.3
    await fc.assert(
      fc.asyncProperty(fc.string(), async (domain) => {
        const failureThreshold = 5

        // Create a fresh CircuitBreakerManager and open the circuit for the domain
        const manager = new CircuitBreakerManager()
        const breaker = manager.getBreaker(domain)

        for (let i = 0; i < failureThreshold; i++) {
          breaker.recordFailure()
        }

        // Circuit must be OPEN before testing
        if (breaker.getState() !== 'OPEN') {
          return false
        }

        // Track whether the request function was invoked
        let requestFnCalled = false
        const requestFn = async () => {
          requestFnCalled = true
          return 'response'
        }

        // execute() SHALL throw ServiceUnavailableError
        let threwServiceUnavailable = false
        try {
          await manager.execute(domain, requestFn)
        } catch (err) {
          threwServiceUnavailable = err instanceof ServiceUnavailableError
        }

        // The request function SHALL NOT have been called
        return threwServiceUnavailable && !requestFnCalled
      }),
      { numRuns: 100 }
    )
  })

  // Feature: frontend-microservice-readiness, Property 10: Successful probe closes the circuit
  it('Property 10: Successful probe closes the circuit', () => {
    // Validates: Requirements 4.5
    fc.assert(
      fc.property(fc.string(), (domain) => {
        const failureThreshold = 5

        // Create a fresh CircuitBreaker and open the circuit
        const breaker = new CircuitBreaker()

        for (let i = 0; i < failureThreshold; i++) {
          breaker.recordFailure()
        }

        // Circuit must be OPEN before proceeding
        if (breaker.getState() !== 'OPEN') {
          return false
        }

        // Advance time past the cooldown to transition OPEN → HALF_OPEN
        vi.advanceTimersByTime(30_000)

        // allowRequest() triggers the OPEN → HALF_OPEN transition
        const allowed = breaker.allowRequest()
        if (!allowed || breaker.getState() !== 'HALF_OPEN') {
          return false
        }

        // Probe succeeds — state SHALL transition to CLOSED
        breaker.recordSuccess()
        return breaker.getState() === 'CLOSED'
      }),
      { numRuns: 100 }
    )
  })

  // Feature: frontend-microservice-readiness, Property 11: Failed probe re-opens the circuit
  it('Property 11: Failed probe re-opens the circuit', () => {
    // Validates: Requirements 4.6
    fc.assert(
      fc.property(fc.string(), (domain) => {
        const failureThreshold = 5

        // Create a fresh CircuitBreaker and open the circuit
        const breaker = new CircuitBreaker({ cooldownMs: 30_000 })

        for (let i = 0; i < failureThreshold; i++) {
          breaker.recordFailure()
        }

        // Circuit must be OPEN before proceeding
        if (breaker.getState() !== 'OPEN') {
          return false
        }

        // Advance time past the cooldown to transition OPEN → HALF_OPEN
        vi.advanceTimersByTime(30_000)

        // allowRequest() triggers the OPEN → HALF_OPEN transition
        const allowed = breaker.allowRequest()
        if (!allowed || breaker.getState() !== 'HALF_OPEN') {
          return false
        }

        // Probe fails — state SHALL transition back to OPEN
        breaker.recordFailure()
        if (breaker.getState() !== 'OPEN') {
          return false
        }

        // Cooldown was reset: allowRequest() SHALL return false immediately after the probe failure
        if (breaker.allowRequest() !== false) {
          return false
        }

        // After another full cooldown elapses, allowRequest() SHALL return true (OPEN → HALF_OPEN)
        vi.advanceTimersByTime(30_000)
        const allowedAfterReset = breaker.allowRequest()
        return allowedAfterReset === true && breaker.getState() === 'HALF_OPEN'
      }),
      { numRuns: 100 }
    )
  })

  // Feature: frontend-microservice-readiness, Property 12: Circuit breaker failure counts are domain-isolated
  it('Property 12: Circuit breaker failure counts are domain-isolated', () => {
    // Validates: Requirements 4.1
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('products', 'cart', 'users'), { minLength: 2, maxLength: 20 }),
        (failureSequence) => {
          const manager = new CircuitBreakerManager()

          // Count expected failures per domain from the sequence
          const expectedCounts: Record<string, number> = { products: 0, cart: 0, users: 0 }
          for (const domain of failureSequence) {
            expectedCounts[domain]++
          }

          // Record failures on the corresponding domain breakers
          for (const domain of failureSequence) {
            const breaker = manager.getBreaker(domain)
            // Only record if the circuit is still CLOSED (not yet tripped)
            if (breaker.getState() === 'CLOSED') {
              breaker.recordFailure()
            }
          }

          // Verify each domain's failure count matches the number of failures in the sequence
          // for that domain (capped at the failure threshold, since the circuit opens at 5)
          const failureThreshold = 5
          for (const domain of ['products', 'cart', 'users'] as const) {
            const breaker = manager.getBreaker(domain)
            const domainFailures = expectedCounts[domain]

            if (domainFailures >= failureThreshold) {
              // Domain should be OPEN — circuit tripped independently
              if (breaker.getState() !== 'OPEN') {
                return false
              }
            } else {
              // Domain should still be CLOSED — not enough failures to trip
              if (breaker.getState() !== 'CLOSED') {
                return false
              }
            }
          }

          return true
        }
      ),
      { numRuns: 200 }
    )
  })
})
