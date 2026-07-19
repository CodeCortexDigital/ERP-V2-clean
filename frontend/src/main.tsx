import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Only mount the Google provider when a real Client ID is configured.
// The placeholder ID causes the lib to fetch accounts.google.com on every
// page load and spam DNS errors when offline / unconfigured.
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (GOOGLE_CLIENT_ID) {
  root.render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
