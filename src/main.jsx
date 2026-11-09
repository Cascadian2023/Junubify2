import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './mobile.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Junubify failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error instanceof Error
        ? `${this.state.error.name}: ${this.state.error.message}`
        : String(this.state.error);
      return (
        <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#07110f', color: '#eef6f2', fontFamily: 'system-ui, sans-serif' }}>
          <h1>Junubify encountered an app error</h1>
          <p>The page loaded, but the app failed while rendering. The diagnostic below can identify the issue:</p>
          <pre style={{ maxWidth: 720, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, borderRadius: 10, background: '#102019', color: '#a8efc7' }}>{message}</pre>
          <p>Check that Vercel is deploying the latest commit from <code>Prototype20204/Junubify2</code> with the repository root as its Root Directory.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 18px', borderRadius: 10, border: 0, background: '#5dde9f', color: '#062218', fontWeight: 700 }}>Reload Junubify</button>
        </main>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Junubify root element #root is missing from index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>
);

document.getElementById('startup-status')?.remove();
