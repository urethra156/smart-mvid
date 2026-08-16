import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('videoScript');
    } catch (e) {
      // ignore
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-300 mb-4">
              {this.state.error?.message || "An unexpected error occurred in the application."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Recover Session
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

