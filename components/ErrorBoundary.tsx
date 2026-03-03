import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (in production, you'd send to error tracking service)
    logger.error('[ErrorBoundary] Caught error:', error);
    logger.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Send error to Sentry if configured
    if (import.meta.env.VITE_SENTRY_DSN) {
      try {
        // Dynamic import to avoid errors if Sentry not configured
        import('@sentry/react').then((Sentry) => {
          Sentry.captureException(error, {
            contexts: {
              react: {
                componentStack: errorInfo.componentStack,
              },
            },
          });
        }).catch((importErr) => {
          logger.error('[ErrorBoundary] Failed to load Sentry module:', importErr);
        });
      } catch (err) {
        logger.error('[ErrorBoundary] Failed to send error to Sentry:', err);
      }
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = (): void => {
    this.handleReset();
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Something went wrong
              </h1>

              {/* Description */}
              <p className="text-slate-600 mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page
                or return to the home page.
              </p>

              {/* Error details (development only) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="w-full mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono overflow-auto max-h-40">
                    <div className="text-red-600 font-bold mb-2">
                      {this.state.error.toString()}
                    </div>
                    {this.state.errorInfo && (
                      <pre className="text-slate-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Home size={18} />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 * Wraps children with ErrorBoundary
 */
export const withErrorBoundary = (Component: React.ComponentType<Record<string, unknown>>, fallback?: ReactNode) => {
  return (props: Record<string, unknown>) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

