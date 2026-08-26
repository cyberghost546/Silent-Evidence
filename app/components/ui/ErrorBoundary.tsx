'use client';
// app/components/ui/ErrorBoundary.tsx
// React Error Boundary — catches JavaScript errors anywhere in the component tree
// and shows a fallback UI instead of a blank/broken page.
//
// React error boundaries MUST be class components — hooks can't catch render errors.
// Wrapping the layout with this prevents one broken widget from taking down the whole page.

import React from 'react';

interface Props {
  children: React.ReactNode;
  // Optional custom fallback — if not provided, uses the default spooky fallback
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  // Called when a descendant component throws during render, in a lifecycle method,
  // or in a constructor. Updates state so the next render shows the fallback UI.
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Unknown error',
    };
  }

  // Called after an error has been thrown — good place to log it to an error service
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; in production you'd send this to Sentry/LogRocket/etc.
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  // Lets the user try again by resetting the error state
  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) return this.props.fallback;

      // Default fallback UI
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          {/* Spooky ghost icon */}

          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>

          <p className="text-gray-400 text-sm mb-6 max-w-sm">
            A ghost got into the machine. This part of the page couldn&apos;t load.
          </p>

          {/* Show error message in dev so developers can debug */}
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-xs text-gray-600 bg-gray-800 rounded p-3 mb-4 max-w-sm text-left overflow-auto">
              {this.state.errorMessage}
            </pre>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      );
    }

    // No error — render children normally
    return this.props.children;
  }
}
