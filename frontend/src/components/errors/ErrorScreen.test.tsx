/**
 * Unit tests for src/components/errors/ErrorScreen.tsx
 *
 * Covers:
 *   - Each variant renders the correct heading and body text
 *   - role="alert" is present on the root element for every variant
 *   - correlationId is visible in the DOM when provided
 *   - console.error is called on mount when the error prop is provided
 *   - The primary action button/link is present for each variant
 *
 * Validates: Requirements 5.2–5.9, 7.4
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { ErrorScreen, type ErrorScreenVariant } from './ErrorScreen'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** All supported variants in one place so loops stay DRY. */
const ALL_VARIANTS: ErrorScreenVariant[] = [
  'not-found',
  'server-error',
  'network-error',
  'session-expired',
  'service-unavailable',
]

// ── Heading and body text ─────────────────────────────────────────────────────

describe('ErrorScreen — heading and body text per variant', () => {
  it('not-found: renders "Page not found" heading and correct body', () => {
    render(<ErrorScreen variant="not-found" />)

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(
      screen.getByText(/the page you're looking for doesn't exist\./i)
    ).toBeInTheDocument()
  })

  it('server-error: renders "Something went wrong" heading and correct body', () => {
    render(<ErrorScreen variant="server-error" />)

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText(/an unexpected error occurred\./i)).toBeInTheDocument()
  })

  it('network-error: renders "No internet connection" heading and correct body', () => {
    render(<ErrorScreen variant="network-error" />)

    expect(screen.getByRole('heading', { name: /no internet connection/i })).toBeInTheDocument()
    expect(screen.getByText(/check your connection and try again\./i)).toBeInTheDocument()
  })

  it('session-expired: renders "Session expired" heading and correct body', () => {
    render(<ErrorScreen variant="session-expired" />)

    expect(screen.getByRole('heading', { name: /session expired/i })).toBeInTheDocument()
    expect(screen.getByText(/please log in again to continue\./i)).toBeInTheDocument()
  })

  it('service-unavailable: renders "Service temporarily unavailable" heading and correct body', () => {
    render(<ErrorScreen variant="service-unavailable" />)

    expect(
      screen.getByRole('heading', { name: /service temporarily unavailable/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/this service is temporarily unavailable\./i)).toBeInTheDocument()
  })

  it('service-unavailable: body includes retry countdown when retryAfter is provided', () => {
    // 5000 ms → 5 s
    render(<ErrorScreen variant="service-unavailable" retryAfter={5000} />)

    expect(screen.getByText(/retry in 5s/i)).toBeInTheDocument()
  })
})

// ── role="alert" ──────────────────────────────────────────────────────────────

describe('ErrorScreen — role="alert" on root element', () => {
  it.each(ALL_VARIANTS)('%s: root element has role="alert"', (variant) => {
    render(<ErrorScreen variant={variant} />)

    // getByRole throws if the element is not found — this is the assertion
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

// ── correlationId visibility ──────────────────────────────────────────────────

describe('ErrorScreen — correlationId visibility', () => {
  it.each(ALL_VARIANTS)(
    '%s: correlationId is visible in the DOM when provided',
    (variant) => {
      const correlationId = 'abc-123-def-456'
      render(<ErrorScreen variant={variant} correlationId={correlationId} />)

      expect(screen.getByText(correlationId)).toBeInTheDocument()
    }
  )

  it.each(ALL_VARIANTS)(
    '%s: correlationId is NOT rendered when omitted',
    (variant) => {
      render(<ErrorScreen variant={variant} />)

      // The "Reference ID:" label should not appear when no correlationId is given
      expect(screen.queryByText(/reference id/i)).not.toBeInTheDocument()
    }
  )
})

// ── console.error on mount ────────────────────────────────────────────────────

describe('ErrorScreen — console.error on mount', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('calls console.error with message, stack, and correlationId when error prop is provided', () => {
    const error = new Error('test error')
    const correlationId = 'corr-id-001'

    render(<ErrorScreen variant="server-error" error={error} correlationId={correlationId} />)

    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledWith({
      message: error.message,
      stack: error.stack,
      correlationId,
    })
  })

  it('calls console.error with undefined correlationId when correlationId is omitted', () => {
    const error = new Error('another error')

    render(<ErrorScreen variant="network-error" error={error} />)

    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledWith({
      message: error.message,
      stack: error.stack,
      correlationId: undefined,
    })
  })

  it('does NOT call console.error when error prop is omitted', () => {
    render(<ErrorScreen variant="not-found" />)

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it.each(ALL_VARIANTS)(
    '%s: calls console.error on mount when error prop is provided',
    (variant) => {
      const error = new Error(`error for ${variant}`)

      render(<ErrorScreen variant={variant} error={error} />)

      expect(errorSpy).toHaveBeenCalledOnce()
    }
  )
})

// ── Primary action per variant ────────────────────────────────────────────────

describe('ErrorScreen — primary action per variant', () => {
  it('not-found: renders a "Go to home" link pointing to "/"', () => {
    render(<ErrorScreen variant="not-found" />)

    const link = screen.getByRole('link', { name: /go to home/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })

  it('server-error: renders a "Reload page" button', () => {
    render(<ErrorScreen variant="server-error" />)

    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  it('network-error: renders a "Retry" button', () => {
    render(<ErrorScreen variant="network-error" />)

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('session-expired: renders a "Log in again" link pointing to "/login"', () => {
    render(<ErrorScreen variant="session-expired" />)

    const link = screen.getByRole('link', { name: /log in again/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('service-unavailable: renders a "Try again" button', () => {
    render(<ErrorScreen variant="service-unavailable" />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('service-unavailable: "Try again" button is disabled while cooling down', () => {
    // retryAfter > 0 means the cooldown is still active
    render(<ErrorScreen variant="service-unavailable" retryAfter={10_000} />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeDisabled()
  })

  it('service-unavailable: "Try again" button is enabled when retryAfter is 0', () => {
    render(<ErrorScreen variant="service-unavailable" retryAfter={0} />)

    expect(screen.getByRole('button', { name: /try again/i })).not.toBeDisabled()
  })

  it('network-error: "Retry" button calls onRetry when clicked', async () => {
    const onRetry = vi.fn()
    const { getByRole } = render(<ErrorScreen variant="network-error" onRetry={onRetry} />)

    getByRole('button', { name: /retry/i }).click()

    expect(onRetry).toHaveBeenCalledOnce()
  })
})

// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('ErrorScreen — property-based tests', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Suppress console.error output during PBT runs
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  // Feature: frontend-microservice-readiness, Property 15: Error screens have ARIA alert role
  it('Property 15: role="alert" is present for every variant and any combination of props', () => {
    // **Validates: Requirements 5.9**
    // For any ErrorScreen variant rendered with any combination of props,
    // the root container element SHALL have role="alert".

    const variantArb = fc.constantFrom(...ALL_VARIANTS)
    const correlationIdArb = fc.option(fc.string({ minLength: 1 }), { nil: undefined })
    const retryAfterArb = fc.option(fc.nat({ max: 60_000 }), { nil: undefined })

    fc.assert(
      fc.property(variantArb, correlationIdArb, retryAfterArb, (variant, correlationId, retryAfter) => {
        const { unmount } = render(
          <ErrorScreen
            variant={variant}
            correlationId={correlationId}
            retryAfter={retryAfter}
          />
        )

        const alertEl = screen.getByRole('alert')
        const hasAlert = alertEl !== null && alertEl !== undefined

        unmount()
        return hasAlert
      }),
      { numRuns: 100 }
    )
  })

  // Feature: frontend-microservice-readiness, Property 2: Correlation ID is visible in every error screen
  it('Property 2: correlationId is visible in the DOM for any variant and any non-empty correlationId', () => {
    // **Validates: Requirements 7.4**
    // For any error screen variant rendered with a non-empty correlation ID string,
    // the rendered output SHALL contain that exact correlation ID string in the visible DOM.

    const variantArb = fc.constantFrom(...ALL_VARIANTS)
    // Use printable ASCII strings that won't be mangled by the DOM
    const correlationIdArb = fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/)

    fc.assert(
      fc.property(variantArb, correlationIdArb, (variant, correlationId) => {
        const { unmount } = render(
          <ErrorScreen variant={variant} correlationId={correlationId} />
        )

        const el = screen.queryByText(correlationId)
        const isVisible = el !== null

        unmount()
        return isVisible
      }),
      { numRuns: 100 }
    )
  })
})
