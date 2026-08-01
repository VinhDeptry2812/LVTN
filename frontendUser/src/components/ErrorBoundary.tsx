import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component — catches runtime errors in child components
 * and displays a friendly fallback UI instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI matching Nordic Hearth design system
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-sp-md">
          <div className="max-w-md w-full text-center space-y-sp-md">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto rounded-full bg-error-container flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[44px] text-error"
                aria-hidden="true"
              >
                warning
              </span>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">
                Đã xảy ra lỗi
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang hoặc quay về trang chủ.
              </p>
            </div>

            {/* Error Details (development only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="bg-surface-container rounded-xl p-sp-md text-left">
                <summary className="font-label-md text-label-md text-error cursor-pointer">
                  Chi tiết lỗi (dev mode)
                </summary>
                <pre className="mt-sp-sm text-label-sm text-on-surface-variant overflow-x-auto whitespace-pre-wrap break-words">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-sp-sm pt-sp-md">
              <button
                onClick={() => {
                  this.handleReset();
                  window.location.reload();
                }}
                className="flex-1 bg-primary text-on-primary py-4 rounded-xl font-label-md text-label-md hover:shadow-lg active:scale-[0.98] transition-transform duration-300 cursor-pointer"
              >
                Tải lại trang
              </button>
              <Link
                to="/"
                onClick={this.handleReset}
                className="flex-1 text-center border-2 border-primary text-primary py-4 rounded-xl font-label-md text-label-md hover:bg-primary-fixed/30 transition-colors duration-300"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
