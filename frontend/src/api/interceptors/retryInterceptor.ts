import type { AxiosInstance } from 'axios'

const RETRYABLE_METHODS = new Set(['get', 'head', 'options'])
const RETRYABLE_STATUSES = new Set([502, 503, 504])
const MAX_RETRIES = 3

/**
 * Returns the backoff delay in milliseconds for a given retry attempt.
 * Uses exponential backoff capped at 10 seconds.
 *
 * - attempt 0 → 200 ms
 * - attempt 1 → 400 ms
 * - attempt 2 → 800 ms
 * - attempt 10+ → 10 000 ms (capped)
 */
export function calculateBackoff(attempt: number): number {
  return Math.min(Math.pow(2, attempt) * 200, 10_000)
}

/**
 * Attaches a retry interceptor to an Axios instance.
 *
 * Retries are only performed when ALL of the following are true:
 *  - The HTTP method is GET, HEAD, or OPTIONS (idempotent/safe)
 *  - Either there is no response (network error) OR the response status
 *    is 502, 503, or 504 (transient server-side errors)
 *  - The request has been retried fewer than 3 times
 *
 * 4xx errors are never retried.
 */
export function applyRetryInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config

      // If there's no config we can't retry
      if (!config) {
        return Promise.reject(error)
      }

      const retryCount = config._retryCount ?? 0
      const method = (config.method ?? '').toLowerCase()
      const status: number | undefined = error.response?.status

      const shouldRetry =
        RETRYABLE_METHODS.has(method) &&
        (status === undefined || RETRYABLE_STATUSES.has(status)) &&
        retryCount < MAX_RETRIES

      if (!shouldRetry) {
        return Promise.reject(error)
      }

      config._retryCount = retryCount + 1
      config._isRetry = true

      await new Promise<void>((resolve) =>
        setTimeout(resolve, calculateBackoff(retryCount)),
      )

      return client(config)
    },
  )
}
