import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class BlobErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Blob Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return null; // Return null instead of error UI to keep game running
    }

    return this.props.children;
  }
} 