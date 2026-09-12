import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TimeProvider } from './context/TimeContext';
import { AppRouter } from './routes/AppRouter';

import './styles/index.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

export function App() {
  return (
    <BrowserRouter>
      <TimeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </TimeProvider>
    </BrowserRouter>
  );
}

export default App;
