/**
 * Property-based tests for src/router.tsx
 *
 * Property 17: Catch-all route renders 404 for any unmatched path
 *
 * For any URL path that does not match a defined route, the router SHALL
 * render NotFoundPage (which displays "Page not found").
 *
 * Validates: Requirements 5.7
 */

// Feature: frontend-microservice-readiness, Property 17: Catch-all route renders 404 for any unmatched path

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom'
import * as fc from 'fast-check'
import { NotFoundPage } from '@/pages/NotFoundPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Mock all page components and the Layout so the test only exercises routing,
// not the full component trees (which have complex store/API dependencies).

vi.mock('@/components/layout/Layout', () => ({
  Layout: () => (
    <div data-testid="layout">
      <Outlet />
    </div>
  ),
}))

vi.mock('@/pages/HomePage', () => ({ HomePage: () => <div>Home</div> }))
vi.mock('@/pages/ProductsPage', () => ({ ProductsPage: () => <div>Products</div> }))
vi.mock('@/pages/ProductDetailPage', () => ({ ProductDetailPage: () => <div>Product Detail</div> }))
vi.mock('@/pages/CategoriesPage', () => ({ CategoriesPage: () => <div>Categories</div> }))
vi.mock('@/pages/AboutPage', () => ({ AboutPage: () => <div>About</div> }))
vi.mock('@/pages/CartPage', () => ({ CartPage: () => <div>Cart</div> }))
vi.mock('@/pages/CheckoutPage', () => ({ CheckoutPage: () => <div>Checkout</div> }))
vi.mock('@/pages/OrderSuccessPage', () => ({ OrderSuccessPage: () => <div>Order Success</div> }))
vi.mock('@/pages/AccountPage', () => ({ AccountPage: () => <div>Account</div> }))
vi.mock('@/pages/OrdersPage', () => ({ OrdersPage: () => <div>Orders</div> }))
vi.mock('@/pages/LoginPage', () => ({ LoginPage: () => <div>Login</div> }))
vi.mock('@/pages/RegisterPage', () => ({ RegisterPage: () => <div>Register</div> }))

// Static imports of mocked modules (vi.mock is hoisted, so these resolve to mocks)
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { ProductsPage } from '@/pages/ProductsPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { AboutPage } from '@/pages/AboutPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { OrderSuccessPage } from '@/pages/OrderSuccessPage'
import { AccountPage } from '@/pages/AccountPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

// ── Route definitions (mirrors router.tsx) ────────────────────────────────────

/**
 * The route config that mirrors the production router.
 * Using the mocked page components so no real API/store calls are made.
 */
const TEST_ROUTES = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order-success', element: <OrderSuccessPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrdersPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '*', element: <NotFoundPage /> },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * The set of known route path prefixes that the router handles.
 * Any path matching these should NOT be tested as an unmatched path.
 */
const KNOWN_ROUTE_PREFIXES = [
  '/',
  '/products',
  '/categories',
  '/about',
  '/cart',
  '/checkout',
  '/order-success',
  '/account',
  '/orders',
  '/login',
  '/register',
]

/**
 * Returns true if the given path matches one of the defined routes.
 * We check exact matches and prefix matches for parameterised routes.
 * Also normalises double-slashes since react-router collapses them.
 */
function isKnownRoute(path: string): boolean {
  // Normalise: ensure leading slash and collapse consecutive slashes
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  // Collapse multiple consecutive slashes (e.g. // → /)
  const normalised = withLeadingSlash.replace(/\/+/g, '/')

  for (const known of KNOWN_ROUTE_PREFIXES) {
    if (known === '/') {
      // Only the exact root matches the index route
      if (normalised === '/') return true
    } else {
      // Exact match or sub-path (e.g. /products/123 matches /products)
      if (normalised === known || normalised.startsWith(`${known}/`)) {
        return true
      }
    }
  }
  return false
}

/**
 * Build a `createMemoryRouter` instance that mirrors the production router
 * structure but uses the lightweight mocked page components.
 */
function buildTestRouter(initialPath: string) {
  return createMemoryRouter(TEST_ROUTES, { initialEntries: [initialPath] })
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // Suppress console.error from ErrorScreen's useEffect when error prop is absent
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('router — catch-all route', () => {
  it('renders NotFoundPage for a clearly unmatched path like /does-not-exist', () => {
    const router = buildTestRouter('/does-not-exist')
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('renders NotFoundPage for a deeply nested unmatched path', () => {
    const router = buildTestRouter('/a/b/c/d/e')
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('renders NotFoundPage for a path with special characters', () => {
    const router = buildTestRouter('/unknown-page-xyz')
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('renders the home page for the root path /', () => {
    const router = buildTestRouter('/')
    render(<RouterProvider router={router} />)

    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('renders the login page for /login', () => {
    const router = buildTestRouter('/login')
    render(<RouterProvider router={router} />)

    expect(screen.getByText('Login')).toBeInTheDocument()
  })
})

// ── Property-Based Test ───────────────────────────────────────────────────────

// Feature: frontend-microservice-readiness, Property 17: Catch-all route renders 404 for any unmatched path
describe('router — Property 17: Catch-all route renders 404 for any unmatched path', () => {
  /**
   * **Validates: Requirements 5.7**
   *
   * For any URL path that does not match a defined route, the router SHALL
   * render NotFoundPage (which displays a "Page not found" heading).
   */
  it('renders NotFoundPage for any unmatched path (property test)', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary web paths and filter out known routes
        fc.webPath().filter((path) => !isKnownRoute(path)),
        (unmatchedPath) => {
          const router = buildTestRouter(unmatchedPath)
          const { unmount } = render(<RouterProvider router={router} />)

          const heading = screen.queryByRole('heading', { name: /page not found/i })
          const found = heading !== null

          unmount()
          return found
        }
      ),
      { numRuns: 100 }
    )
  })
})
