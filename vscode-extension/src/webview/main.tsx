import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';

// Create root and render app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
  
  // Mark body as loaded to prevent FOUC
  document.body.classList.add('loaded');
}