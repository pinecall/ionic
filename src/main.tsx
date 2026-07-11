import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installWebRTCDebug } from './voice/webrtcDebug';

installWebRTCDebug(); // TEMP: ICE diagnostics for the simulator investigation

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);