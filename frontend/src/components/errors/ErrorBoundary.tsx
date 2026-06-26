import React from 'react'
import { ErrorScreen } from './ErrorScreen'

export interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  correlationId: string | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      correlationId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }
      return (
        <ErrorScreen
          variant="server-error"
          error={this.state.error ?? undefined}
          correlationId={this.state.correlationId ?? undefined}
        />
      )
    }

    return this.props.children
  }
}
