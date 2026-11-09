import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Junubify failed to render:', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#07110f', color: '#eef6f2', fontFamily: 'system-ui, sans-serif' }}>
          <h1>Junubify could not load</h1>
          <p>Reload the page. If this keeps happening, the current deployment may be using the wrong Vercel root directory or an outdated build.</p>
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

window.clearTimeout(window.__junubifyStartupTimer);
document.getElementById('startup-status')?.remove();
