/**
 * Unit tests for src/components/errors/ErrorBoundary.tsx
 *
 * Covers:
 *   - A child component that throws during render is caught by the boundary
 *   - The fallback UI is rendered when an error is caught and a fallback is provided
 *   - ErrorScreen with variant="server-error" is rendered when no fallback is provided
 *
 * Validates: Requirements 5.1, 5.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { ErrorBoundary } from './ErrorBoundary'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A component that unconditionally throws during render. */
function ThrowingComponent({ message = 'Test render error' }: { message?: string }) {
  throw new Error(message)
}

/** A component that renders normally. */
function NormalComponent() {
  return <div>Normal content</div>
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // Suppress React's error boundary console output and our own componentDidCatch log
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

// ── Catching render errors ────────────────────────────────────────────────────

describe('ErrorBoundary — catching render errors', () => {
  it('catches a child component that throws during render', () => {
    // If the error were NOT caught the render call itself would throw and the
    // test would fail with an unhandled error.
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )
    }).not.toThrow()
  })

  it('does not interfere with children that render normally', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })
})

// ── Fallback UI ───────────────────────────────────────────────────────────────

describe('ErrorBoundary — fallback UI', () => {
  it('renders the provided fallback when a child throws', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument()
  })

  it('does not render the throwing child after an error is caught', () => {
    render(
      <ErrorBoundary fallback={<div>Fallback shown</div>}>
        <ThrowingComponent message="boom" />
      </ErrorBoundary>
    )

    // The fallback is visible; the child's output is not
    expect(screen.getByText('Fallback shown')).toBeInTheDocument()
    expect(screen.queryByText('boom')).not.toBeInTheDocument()
  })
})

// ── Default ErrorScreen fallback ──────────────────────────────────────────────

describe('ErrorBoundary — default ErrorScreen fallback', () => {
  it('renders ErrorScreen with variant="server-error" when no fallback is provided', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    // ErrorScreen with variant="server-error" renders this heading
    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument()
  })

  it('renders the "Reload page" button from the server-error variant', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  it('renders an element with role="alert" from the default ErrorScreen', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

// ── Property-Based Tests ──────────────────────────────────────────────────────

// Feature: frontend-microservice-readiness, Property 16: Error boundary catches any render error
describe('ErrorBoundary — Property 16: Error boundary catches any render error', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * For any React component tree wrapped in `ErrorBoundary` that throws any
   * `Error` during rendering, the `ErrorBoundary` SHALL catch the error and
   * render the fallback.
   */
  it('catches any render error and renders the fallback (property test)', () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        // Create a component that throws the arbitrary error message during render
        function ThrowingChild() {
          throw new Error(message)
        }

        const { unmount } = render(
          <ErrorBoundary fallback={<div>fallback</div>}>
            <ThrowingChild />
          </ErrorBoundary>
        )

        // The fallback must be rendered, not the error
        expect(screen.getByText('fallback')).toBeInTheDocument()

        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
