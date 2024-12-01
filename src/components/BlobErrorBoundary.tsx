import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Container, Sprite } from '@pixi/react';

interface Props {
  children: ReactNode;
  id?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  recoveryAttempts: number;
}

const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_DELAY = 1000;

export class BlobErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
    recoveryAttempts: 0
  };

  private recoveryTimeout: NodeJS.Timeout | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true,
      error 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log error with context
    console.error(
      `Blob Error${this.props.id ? ` (ID: ${this.props.id})` : ''}:`,
      {
        error,
        componentStack: errorInfo.componentStack,
        recoveryAttempts: this.state.recoveryAttempts
      }
    );

    // Attempt recovery if under max attempts
    if (this.state.recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
      this.scheduleRecovery();
    }
  }

  private scheduleRecovery = () => {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }

    this.recoveryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        recoveryAttempts: prevState.recoveryAttempts + 1
      }));
    }, RECOVERY_DELAY);
  };

  public componentWillUnmount() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
        return <Container />;
      }

      return (
        <Container>
          <Sprite
            alpha={0.5}
            width={32}
            height={32}
            image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          />
        </Container>
      );
    }

    return this.props.children;
  }
} 