import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export type ErrorScreenVariant =
  | 'not-found'
  | 'server-error'
  | 'network-error'
  | 'session-expired'
  | 'service-unavailable'

export interface ErrorScreenProps {
  variant: ErrorScreenVariant
  correlationId?: string
  /** Cooldown duration in milliseconds before retry is allowed */
  retryAfter?: number
  onRetry?: () => void
  error?: Error
}

const variantConfig: Record<
  ErrorScreenVariant,
  { heading: string; body: (retryAfterSeconds?: number) => string }
> = {
  'not-found': {
    heading: 'Page not found',
    body: () => "The page you're looking for doesn't exist.",
  },
  'server-error': {
    heading: 'Something went wrong',
    body: () => 'An unexpected error occurred.',
  },
  'network-error': {
    heading: 'No internet connection',
    body: () => 'Check your connection and try again.',
  },
  'session-expired': {
    heading: 'Session expired',
    body: () => 'Please log in again to continue.',
  },
  'service-unavailable': {
    heading: 'Service temporarily unavailable',
    body: (retryAfterSeconds) =>
      retryAfterSeconds !== undefined && retryAfterSeconds > 0
        ? `This service is unavailable. Retry in ${retryAfterSeconds}s.`
        : 'This service is temporarily unavailable.',
  },
}

export function ErrorScreen({
  variant,
  correlationId,
  retryAfter,
  onRetry,
  error,
}: ErrorScreenProps) {
  useEffect(() => {
    if (error) {
      console.error({
        message: error.message,
        stack: error.stack,
        correlationId,
      })
    }
  }, [error, correlationId])

  const config = variantConfig[variant]
  const retryAfterSeconds = retryAfter !== undefined ? Math.ceil(retryAfter / 1000) : undefined
  const bodyText = config.body(retryAfterSeconds)
  const isCoolingDown = variant === 'service-unavailable' && retryAfter !== undefined && retryAfter > 0

  const renderAction = () => {
    switch (variant) {
      case 'not-found':
        return (
          <a
            href="/"
            className={cn(
              'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
              'h-10 px-4 text-sm',
              'bg-brand-600 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
            )}
          >
            Go to home
          </a>
        )
      case 'server-error':
        return (
          <Button onClick={() => window.location.reload()}>
            Reload page
          </Button>
        )
      case 'network-error':
        return (
          <Button onClick={onRetry}>
            Retry
          </Button>
        )
      case 'session-expired':
        return (
          <a
            href="/login"
            className={cn(
              'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
              'h-10 px-4 text-sm',
              'bg-brand-600 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
            )}
          >
            Log in again
          </a>
        )
      case 'service-unavailable':
        return (
          <Button onClick={onRetry} disabled={isCoolingDown}>
            Try again
          </Button>
        )
    }
  }

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">{config.heading}</h1>
        <p className="text-gray-600">{bodyText}</p>
        {correlationId && (
          <p className="text-sm text-gray-500">
            Reference ID: <code className="font-mono text-xs">{correlationId}</code>
          </p>
        )}
        <div className="pt-2">{renderAction()}</div>
      </div>
    </div>
  )
}
