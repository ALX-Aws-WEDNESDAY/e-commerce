import type { AxiosInstance } from 'axios'
import { useAuthStore } from '@/store/auth.store'

// ── Module-level state (not exported) ────────────────────────────────────────
// These are intentionally module-scoped so all callers share the same
// in-flight refresh state across the lifetime of the application.
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Drain the queue, resolving every waiting promise with the new token. */
function drainQueue(newToken: string): void {
  refreshQueue.forEach(({ resolve }) => resolve(newToken))
  refreshQueue = []
}

/** Drain the queue, rejecting every waiting promise with the given error. */
function rejectQueue(error: unknown): void {
  refreshQueue.forEach(({ reject }) => reject(error))
  refreshQueue = []
}

/** Endpoints that must never trigger a token refresh attempt. */
const SKIP_REFRESH_URLS = ['/users/login/', '/users/refresh/']

function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) return false
  return SKIP_REFRESH_URLS.some((skip) => url.includes(skip))
}

/**
 * Returns true if a refresh token cookie is present in the current document.
 * The refresh token is an HTTP-only cookie named `refreshtoken` set by the
 * auth microservice. If it is absent, there is no point attempting a refresh.
 */
function hasRefreshTokenCookie(): boolean {
  return document.cookie.split(';').some((c) => c.trim().startsWith('refreshtoken='))
}

// ── Interceptor ───────────────────────────────────────────────────────────────

/**
 * Attaches a silent token-refresh interceptor to an Axios instance.
 *
 * Behaviour on 401:
 *  - Requests to `/users/login/` or `/users/refresh/` are propagated
 *    immediately without any refresh attempt.
 *  - If no `refreshtoken` cookie is present, clears the auth store and
 *    redirects to `/login` immediately (Requirement 2.5).
 *  - If no refresh is in flight: starts a refresh, queues concurrent
 *    requests, replays them all on success.
 *  - If a refresh is already in flight: queues the request and waits.
 *  - On refresh failure (401/403): clears the auth store, rejects all
 *    queued requests, and redirects to `/login`.
 *
 * The refresh token is an HTTP-only cookie sent automatically via
 * `withCredentials: true`. If the refresh request itself fails with
 * 401/403 it means no valid refresh token exists, so the user is
 * redirected to the login page.
 */
export function applyTokenRefreshInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    // Pass-through for successful responses
    (response) => response,

    async (error) => {
      const originalConfig = error.config

      // Only handle 401 errors
      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      // Skip refresh for auth endpoints to avoid infinite loops
      if (shouldSkipRefresh(originalConfig?.url)) {
        return Promise.reject(error)
      }

      // No refresh token cookie — session is truly expired; redirect immediately
      if (!hasRefreshTokenCookie()) {
        useAuthStore.getState().clearUser()
        rejectQueue(error)
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // If a refresh is already in flight, queue this request and wait
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((newToken) => {
          // Replay the original request with the new token
          originalConfig.headers['Authorization'] = `Bearer ${newToken}`
          return client(originalConfig)
        })
      }

      // Start a new refresh
      isRefreshing = true

      try {
        const response = await client.post<{ access: string }>('/users/refresh/')
        const newToken = response.data.access

        // Update the auth store with the new access token
        useAuthStore.getState().setTokens(newToken, '')

        // Resolve all queued requests with the new token
        drainQueue(newToken)

        // Replay the original request with the new token
        originalConfig.headers['Authorization'] = `Bearer ${newToken}`
        return client(originalConfig)
      } catch (refreshError) {
        // Refresh failed — clear auth state and redirect to login
        const refreshStatus = (refreshError as { response?: { status?: number } })
          .response?.status

        if (refreshStatus === 401 || refreshStatus === 403) {
          useAuthStore.getState().clearUser()
          rejectQueue(refreshError)
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }

        // For other refresh errors, still reject the queue and propagate
        rejectQueue(refreshError)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    },
  )
}
