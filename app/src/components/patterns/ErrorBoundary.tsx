import React from 'react'
import { ErrorState } from '@/components/patterns/ErrorState'

interface ErrorBoundaryState {
  message: string | null
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : '界面渲染失败' }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.info('[integration-harness:error-boundary]', {
      message: error instanceof Error ? error.message : String(error),
      componentStack: info.componentStack,
    })
  }

  render() {
    if (this.state.message) {
      return (
        <ErrorState
          message={this.state.message}
          onRetry={() => this.setState({ message: null })}
        />
      )
    }
    return this.props.children
  }
}
