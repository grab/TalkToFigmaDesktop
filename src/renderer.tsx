import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

type RootErrorBoundaryState = {
  error: Error | null
}

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Renderer root crashed:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          style={{
            minHeight: '100vh',
            padding: '24px',
            background: '#111827',
            color: '#f9fafb',
            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          }}
        >
          <h1 style={{ margin: '0 0 12px', fontSize: '20px' }}>Renderer crashed</h1>
          <p style={{ margin: '0 0 16px', color: '#d1d5db' }}>
            The app hit an error before it could render the main UI.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              padding: '16px',
              borderRadius: '12px',
              background: '#1f2937',
              color: '#fca5a5',
            }}
          >
            {this.state.error.stack || this.state.error.message}
          </pre>
        </main>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}
