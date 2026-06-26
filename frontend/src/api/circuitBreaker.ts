// ── Circuit Breaker ───────────────────────────────────────────────────────────
// Implements the circuit breaker pattern to prevent cascading failures when
// downstream microservices are unavailable.
//
// State machine:
//   CLOSED    → OPEN      : failureCount >= failureThreshold within windowMs
//   OPEN      → HALF_OPEN : cooldownMs elapsed since openedAt (in allowRequest)
//   HALF_OPEN → CLOSED    : probe request succeeds (in recordSuccess)
//   HALF_OPEN → OPEN      : probe request fails (in recordFailure, resets openedAt)

// ── Types ─────────────────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  /** Number of failures within windowMs before opening the circuit. Default: 5 */
  failureThreshold: number
  /** Rolling window in ms for counting failures. Default: 30_000 */
  windowMs: number
  /** Time in ms to wait in OPEN state before transitioning to HALF_OPEN. Default: 30_000 */
  cooldownMs: number
}

export interface CircuitBreakerSnapshot {
  domain: string
  state: CircuitState
  failureCount: number
  lastFailureAt: number | null
  openedAt: number | null
}

// ── ServiceUnavailableError ───────────────────────────────────────────────────

export class ServiceUnavailableError extends Error {
  readonly domain: string
  readonly retryAfterMs: number

  constructor(domain: string, retryAfterMs: number) {
    super(`Service '${domain}' is unavailable. Retry after ${retryAfterMs}ms.`)
    this.name = 'ServiceUnavailableError'
    this.domain = domain
    this.retryAfterMs = retryAfterMs
  }
}

// ── CircuitBreaker ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  windowMs: 30_000,
  cooldownMs: 30_000,
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private lastFailureAt: number | null = null
  private openedAt: number | null = null
  private readonly config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  getState(): CircuitState {
    return this.state
  }

  /**
   * Returns the number of ms remaining until the circuit transitions to HALF_OPEN,
   * or null if the circuit is not OPEN.
   */
  getRetryAfter(): number | null {
    if (this.state !== 'OPEN' || this.openedAt === null) {
      return null
    }
    const elapsed = Date.now() - this.openedAt
    return Math.max(0, this.config.cooldownMs - elapsed)
  }

  /**
   * Determines whether a request should be allowed through.
   * - CLOSED: always allow
   * - OPEN: allow only if cooldown has elapsed (and transition to HALF_OPEN)
   * - HALF_OPEN: allow (the probe request)
   */
  allowRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true
    }

    if (this.state === 'OPEN') {
      if (this.openedAt !== null && Date.now() - this.openedAt >= this.config.cooldownMs) {
        // Cooldown elapsed — transition to HALF_OPEN and allow the probe
        this.state = 'HALF_OPEN'
        return true
      }
      return false
    }

    // HALF_OPEN: allow the probe
    return true
  }

  /**
   * Records a successful request.
   * - HALF_OPEN → CLOSED (reset failure count)
   * - CLOSED: reset failure count
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
    }
    this.failureCount = 0
    this.lastFailureAt = null
    this.openedAt = null
  }

  /**
   * Records a failed request.
   * - CLOSED: increment count; open circuit when threshold reached
   * - HALF_OPEN → OPEN (reset openedAt to restart cooldown)
   */
  recordFailure(): void {
    const now = Date.now()

    if (this.state === 'HALF_OPEN') {
      // Probe failed — go back to OPEN and restart cooldown
      this.state = 'OPEN'
      this.openedAt = now
      this.lastFailureAt = now
      return
    }

    if (this.state === 'CLOSED') {
      // Reset count if outside the rolling window
      if (this.lastFailureAt !== null && now - this.lastFailureAt > this.config.windowMs) {
        this.failureCount = 0
      }

      this.failureCount++
      this.lastFailureAt = now

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'OPEN'
        this.openedAt = now
      }
    }
  }

  /** Returns a snapshot of the current circuit breaker state. */
  snapshot(domain: string): CircuitBreakerSnapshot {
    return {
      domain,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureAt: this.lastFailureAt,
      openedAt: this.openedAt,
    }
  }
}

// ── CircuitBreakerManager ─────────────────────────────────────────────────────

export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map()

  /** Returns (or lazily creates) the CircuitBreaker for the given domain. */
  getBreaker(domain: string): CircuitBreaker {
    let breaker = this.breakers.get(domain)
    if (!breaker) {
      breaker = new CircuitBreaker()
      this.breakers.set(domain, breaker)
    }
    return breaker
  }

  /**
   * Executes a request function through the circuit breaker for the given domain.
   * Throws ServiceUnavailableError if the circuit is OPEN.
   */
  async execute<T>(domain: string, requestFn: () => Promise<T>): Promise<T> {
    const breaker = this.getBreaker(domain)

    if (!breaker.allowRequest()) {
      throw new ServiceUnavailableError(domain, breaker.getRetryAfter() ?? 0)
    }

    try {
      const result = await requestFn()
      breaker.recordSuccess()
      return result
    } catch (error) {
      breaker.recordFailure()
      throw error
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const circuitBreakerManager = new CircuitBreakerManager()

// ── Domain mapping helper ─────────────────────────────────────────────────────

/**
 * Maps a URL path to a logical service domain name.
 *
 * Used by `client.ts` to route requests through the correct circuit breaker.
 *
 * Mapping:
 *   /api/products/* | /api/categories/* → 'products'
 *   /api/cart/*     | /api/orders/*     → 'cart'
 *   /api/users/*                        → 'users'
 *   (anything else)                     → 'unknown'
 */
export function getDomainFromUrl(url: string): string {
  if (/^\/api\/(products|categories)(\/|$)/.test(url)) {
    return 'products'
  }
  if (/^\/api\/(cart|orders)(\/|$)/.test(url)) {
    return 'cart'
  }
  if (/^\/api\/users(\/|$)/.test(url)) {
    return 'users'
  }
  return 'unknown'
}
