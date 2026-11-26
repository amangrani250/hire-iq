import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render and lazy-chunk failures so a single broken route never leaves
 * the app on an empty canvas.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('HireIQ UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <p className="eyebrow eyebrow-dot">Something went wrong</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
            This screen could not load.
          </h1>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {this.state.error.message || 'An unexpected error interrupted the page.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              Reload the page
            </button>
            <a href="/" className="btn btn-secondary">
              Back to home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
