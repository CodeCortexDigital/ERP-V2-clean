import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold text-red-500">
              {this.props.title || 'Widget'} failed to load
            </p>
            <button
              onClick={this.handleRetry}
              className="text-[10px] text-blue-600 hover:underline font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
