import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Router, Route, useLocation } from './lib/router';

// Pages
import { HomePage } from './pages/public/HomePage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { UnauthorizedPage } from './pages/public/UnauthorizedPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminMatchesPage } from './pages/admin/AdminMatchesPage';
import { AdminScorersPage } from './pages/admin/AdminScorersPage';
import { AdminAssignmentsPage } from './pages/admin/AdminAssignmentsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

// Scorer Pages
import { ScorerDashboardPage } from './pages/scorer/ScorerDashboardPage';
import { ScorerMatchesPage } from './pages/scorer/ScorerMatchesPage';
import { ScorerWorkspacePage } from './pages/scorer/ScorerWorkspacePage';

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();

  // Known valid route patterns
  const isKnownRoute =
    pathname === '/' ||
    pathname === '/admin' ||
    pathname === '/admin/matches' ||
    pathname === '/admin/scorers' ||
    pathname === '/admin/assignments' ||
    pathname === '/admin/audit-logs' ||
    pathname === '/scorer' ||
    pathname === '/scorer/matches' ||
    pathname.startsWith('/scorer/matches/') ||
    pathname === '/unauthorized';

  return (
    <>
      {/* Public Experience */}
      <Route path="/" exact>
        <HomePage />
      </Route>

      {/* Admin Experience */}
      <Route path="/admin" exact>
        <AdminDashboardPage />
      </Route>
      <Route path="/admin/matches" exact>
        <AdminMatchesPage />
      </Route>
      <Route path="/admin/scorers" exact>
        <AdminScorersPage />
      </Route>
      <Route path="/admin/assignments" exact>
        <AdminAssignmentsPage />
      </Route>
      <Route path="/admin/audit-logs" exact>
        <AdminAuditLogsPage />
      </Route>

      {/* Scorer Experience */}
      <Route path="/scorer" exact>
        <ScorerDashboardPage />
      </Route>
      <Route path="/scorer/matches" exact>
        <ScorerMatchesPage />
      </Route>
      <Route path="/scorer/matches/:id">
        <ScorerWorkspacePage />
      </Route>

      {/* Unauthorized Access */}
      <Route path="/unauthorized" exact>
        <UnauthorizedPage />
      </Route>

      {/* 404 Fallback */}
      {!isKnownRoute && <NotFoundPage />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
