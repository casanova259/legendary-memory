import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { CLERK_PUBLISHABLE_KEY } from './constants';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (CLERK_PUBLISHABLE_KEY) {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App hasClerkKey={true} />
      </ClerkProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App hasClerkKey={false} />
    </React.StrictMode>
  );
}
