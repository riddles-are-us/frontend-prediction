import { createRoot } from 'react-dom/client'
import { setProviderConfig } from 'zkwasm-minirollup-browser'
import App from './App'
import './index.css'

// Configure the provider before app initialization - must be called before DelphinusReactProvider
setProviderConfig({ type: 'rainbow' });

createRoot(document.getElementById("root")!).render(<App />);

