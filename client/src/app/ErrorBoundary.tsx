import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error({
      action: 'error_boundary',
      message: error.message,
      meta: { componentStack: info.componentStack ?? undefined },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="grid min-h-[100dvh] place-items-center text-text-muted">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">Something went wrong.</p>
            <p className="text-sm">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
