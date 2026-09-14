import { Component, type ErrorInfo, type ReactNode } from 'react';
import s from '../shell.module.css';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[preview crashed]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className={s.errorBox} role="alert">
          <strong>Preview crashed:</strong> {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack?.split('\n').slice(1, 6).join('\n')}
          {'\n\n'}
          <button className={s.btn} onClick={this.reset}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
