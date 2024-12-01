import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      error: undefined,
      errorInfo: undefined
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true,
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to your preferred error tracking service
    console.error('Error caught by boundary:', {
      error,
      componentStack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false,
      error: undefined,
      errorInfo: undefined
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="bg-white/10 rounded-xl p-8 max-w-md w-full text-white text-center">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left text-sm bg-black/50 p-4 rounded-lg mb-4 overflow-auto max-h-48">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="block w-full text-white/60 hover:text-white"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
} 