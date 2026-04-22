import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { applyCorrelationIdInterceptor } from '@/api/interceptors/correlationIdInterceptor'
import { applyTokenRefreshInterceptor } from '@/api/interceptors/tokenRefreshInterceptor'
import { applyRetryInterceptor } from '@/api/interceptors/retryInterceptor'

// Switch this one env var to point at real Django backend
if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '[apiClient] VITE_API_BASE_URL is not set — falling back to http://localhost:8000. ' +
      'Set this env var to point at the real backend.',
  )
}
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // required for Django session auth
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── CSRF Token handling ───────────────────────────────────────────────────────
// Django requires X-CSRFToken header on all mutating requests (POST/PUT/PATCH/DELETE)
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

// ── Interceptor registration ──────────────────────────────────────────────────
// Order matters. Request interceptors run in registration order (first → last).
// Response interceptors run in LIFO order (last registered → first to handle).
//
// Request interceptors (in order):
//   1. correlationIdInterceptor  — stamps X-Correlation-ID on every request
//   2. auth + CSRF inline        — attaches Bearer token and X-CSRFToken
//
// Response interceptors (LIFO — last registered runs first on errors):
//   3. tokenRefreshInterceptor   — registered first → outermost (runs last)
//   4. retryInterceptor          — registered second → inner (runs first)
//
// Circuit breaker: circuitBreakerManager.execute() is called at the domain
// API module call sites (e.g. products.api.ts, cart.api.ts), NOT here.

// 1. Correlation ID (request + response)
applyCorrelationIdInterceptor(apiClient)

// 2. Auth header + CSRF (request only)
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const method = config.method?.toLowerCase()
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCookie('csrftoken')
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken
    }
  }
  return config
})

// 3. Token refresh (outermost response interceptor — registered first)
applyTokenRefreshInterceptor(apiClient)

// 4. Retry (inner response interceptor — registered second, runs first on errors)
applyRetryInterceptor(apiClient)
