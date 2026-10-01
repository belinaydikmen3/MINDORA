import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center border-[var(--color-error-400)]">
            <div className="w-16 h-16 mx-auto bg-[var(--color-error-400)]/10 text-[var(--color-error-600)] rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-surface-900)] mb-3">Something went wrong</h2>
            <p className="text-[var(--color-surface-500)] mb-8">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Reload Page
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
