import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// ── Module augmentation ───────────────────────────────────────────────────────
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** UUID v4 generated (or echoed) per request */
    _correlationId?: string
    /** Current retry attempt, 0-based */
    _retryCount?: number
    /** True if this is a replayed/retried request */
    _isRetry?: boolean
  }
}

// ── Interceptor ───────────────────────────────────────────────────────────────
/**
 * Attaches correlation-ID tracking to an Axios instance.
 *
 * Request side  – generates a UUID v4, writes it to the `X-Correlation-ID`
 *                 request header and stores it on `config._correlationId`.
 * Response side – if the server echoes the ID back in the
 *                 `x-correlation-id` response header, the echoed value
 *                 overwrites `response.config._correlationId` so callers
 *                 always see the authoritative server-side ID.
 */
export function applyCorrelationIdInterceptor(client: AxiosInstance): void {
  // Request interceptor
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const correlationId = crypto.randomUUID()
    config.headers['X-Correlation-ID'] = correlationId
    config._correlationId = correlationId
    return config
  })

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      const serverCorrelationId = response.headers['x-correlation-id']
      if (serverCorrelationId) {
        response.config._correlationId = serverCorrelationId
      }
      return response
    },
    (error) => {
      if (error.response?.headers?.['x-correlation-id']) {
        error.response.config._correlationId =
          error.response.headers['x-correlation-id']
      }
      return Promise.reject(error)
    },
  )
}
