import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error Boundary catch:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl m-4">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2 leading-relaxed">
              {THAI_TRANSLATIONS.common.errorTitle}
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-normal">
              {this.state.error?.message || THAI_TRANSLATIONS.common.errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {THAI_TRANSLATIONS.common.retry}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
