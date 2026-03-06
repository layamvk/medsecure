import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Error Boundary for graceful error display
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2em', fontFamily: 'monospace', color: '#ff6666', background: '#0f0f1a', minHeight: '100vh' }}>
          <h1>⚠ Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ffaaaa' }}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1em', padding: '0.5em 1.5em', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
