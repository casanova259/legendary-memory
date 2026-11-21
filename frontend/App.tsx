import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { useMatchData } from './hooks/useMatchData';
import { MatchCard } from './components/MatchCard';
import { LiveFeed } from './components/LiveFeed';
import { StatusIndicator } from './components/StatusIndicator';
import { AuthBar } from './components/AuthBar';
import { ScorerPanel } from './components/ScorerPanel';
import { AdminPanel } from './components/AdminPanel';
import { API_BASE_URL, WS_BASE_URL } from './constants';
import { AppUser, UserRole } from './types';
import { fetchCurrentUser } from './services/api';

const App: React.FC = () => {
  const { getToken, isSignedIn } = useAuth();
  const pageSize = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isScorerOpen, setIsScorerOpen] = useState(false);

  const {
    matches,
    isLoading,
    error,
    commentary,
    isCommentaryLoading,
    wsError,
    status,
    activeMatchId,
    newMatchesCount,
    dismissNewMatches,
    watchMatch,
    unwatchMatch,
    reloadMatches,
  } = useMatchData();

  const loadUserProfile = useCallback(async () => {
    if (!isSignedIn) {
      setAppUser(null);
      return;
    }

    try {
      setIsLoadingUser(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetchCurrentUser(token);
      setAppUser(res.data);
    } catch (err) {
      console.error('Failed to load user profile and role:', err);
    } finally {
      setIsLoadingUser(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const activeRole: UserRole | null = appUser ? appUser.role : (isSignedIn ? 'viewer' : null);

  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedMatches = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return matches.slice(startIndex, startIndex + pageSize);
  }, [matches, currentPage, pageSize]);

  const activeMatch = useMemo(() => {
    if (!activeMatchId) return null;
    return matches.find((m) => String(m.id) === String(activeMatchId)) || null;
  }, [matches, activeMatchId]);

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-yellow border-2 border-black rounded-2xl p-6 shadow-hard">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-brand-dark mb-1">
              LivSportz
            </h1>
            <p className="text-sm font-medium opacity-80">
              Live Sports with Clerk RBAC (Viewer, Scorer, Admin)
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <AuthBar
              appUser={appUser}
              isLoadingUser={isLoadingUser}
              activeRole={activeRole}
              onToggleAdmin={() => setIsAdminOpen((prev) => !prev)}
              onToggleScorer={() => setIsScorerOpen((prev) => !prev)}
              isAdminOpen={isAdminOpen}
              isScorerOpen={isScorerOpen}
            />

            <div className="flex flex-col items-end gap-1 pl-3 md:border-l-2 md:border-black">
              <StatusIndicator status={status} />
              {wsError && (
                <span className="text-[11px] font-mono bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                  WS: {wsError}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Optional Scorer Control Panel (For Scorers and Admins) */}
        {isScorerOpen && (activeRole === 'scorer' || activeRole === 'admin') && (
          <ScorerPanel
            activeMatch={activeMatch}
            getToken={getToken}
            onScoreUpdated={() => reloadMatches()}
            onCommentaryPosted={() => reloadMatches()}
          />
        )}

        {/* Optional Admin Console (For Admins or Bootstrap) */}
        {isAdminOpen && (
          <AdminPanel
            getToken={getToken}
            currentRole={activeRole}
            onMatchCreated={() => {
              reloadMatches();
              setIsAdminOpen(false);
            }}
            onRolePromoted={() => loadUserProfile()}
          />
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Match List */}
          <main className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold border-l-4 border-brand-blue pl-3">Live & Scheduled Matches</h2>
              <span className="text-xs font-mono bg-black text-white px-2 py-1 rounded">
                API: {isLoading ? '...' : matches.length}
              </span>
            </div>

            {newMatchesCount > 0 && (
              <div className="flex items-center justify-between gap-3 bg-brand-yellow border-2 border-black rounded-xl px-4 py-3 shadow-hard-sm">
                <span className="text-sm font-bold">
                  {newMatchesCount} new match{newMatchesCount > 1 ? 'es' : ''} added
                </span>
                <button
                  onClick={dismissNewMatches}
                  className="px-3 py-1 rounded-full text-xs font-bold border-2 border-black bg-white hover:bg-gray-50 transition-all"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoading && (
              <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-2xl">
                <div className="animate-spin w-8 h-8 border-4 border-brand-yellow border-t-black rounded-full mx-auto mb-4"></div>
                <p className="font-medium text-gray-500">Loading matches...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-500 text-red-900 p-6 rounded-xl text-center shadow-sm">
                <div className="flex justify-center mb-3 text-red-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-1">Connection Error</h3>
                <p className="font-mono text-sm bg-red-100 py-1 px-2 rounded inline-block mb-4 border border-red-200">{error}</p>
                <p className="text-sm opacity-80 mb-6 max-w-md mx-auto">
                  The application could not reach the API. Please ensure the backend is running.
                </p>
                <button
                  onClick={reloadMatches}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-md active:translate-y-0.5"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {!isLoading && !error && matches.length === 0 && (
              <div className="p-12 text-center border-2 border-black rounded-2xl bg-gray-50">
                <p className="font-bold text-lg">No matches found</p>
                {activeRole === 'admin' && (
                  <button
                    onClick={() => setIsAdminOpen(true)}
                    className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold border-2 border-black"
                  >
                    Create First Match
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pagedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  // eslint-disable-next-line eqeqeq
                  isActive={activeMatchId == match.id}
                  onWatch={watchMatch}
                  onUnwatch={unwatchMatch}
                />
              ))}
            </div>

            {!isLoading && !error && matches.length > pageSize && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs font-medium text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-black transition-all ${
                      currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-black transition-all ${
                      currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Right Column: Live Feed (Sticky on Desktop) */}
          <aside className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-8">
            <LiveFeed
              messages={commentary}
              isActive={!!activeMatchId}
              isLoading={isCommentaryLoading}
              matchId={activeMatchId}
            />
          </aside>

        </div>

        {/* Documentation / Verification Section */}
        <section className="mt-12 border-t-2 border-gray-200 pt-8">
          <div className="bg-white border-2 border-black rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="bg-black text-white w-6 h-6 flex items-center justify-center rounded-full text-xs">?</span>
              Clerk RBAC & Live Testing Guide
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-xs text-gray-600">
              <div>
                <h4 className="font-bold text-black mb-1.5">Roles & Capabilities</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Viewer:</strong> Public match & commentary feed, real-time WebSocket subscriptions.</li>
                  <li><strong>Scorer:</strong> Live score increment/decrement & commentary broadcasting.</li>
                  <li><strong>Admin:</strong> Match creation, user role administration, first-admin bootstrap.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-black mb-1.5">Endpoints & URLs</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>REST API: <code className="bg-gray-100 px-1 rounded">{API_BASE_URL}</code></li>
                  <li>WebSocket: <code className="bg-gray-100 px-1 rounded">{WS_BASE_URL}</code></li>
                  <li>Clerk Status: <code className="bg-gray-100 px-1 rounded">{isSignedIn ? 'Signed In' : 'Public Viewer'}</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-black mb-1.5">How to Bootstrap First Admin</h4>
                <p className="mb-1">
                  1. Click <strong>Sign Up</strong> / <strong>Sign In</strong> in the header to authenticate.
                </p>
                <p className="mb-1">
                  2. Open the <strong>Admin Panel</strong> tab <em>"Admin Bootstrap"</em>.
                </p>
                <p>
                  3. Enter your configured <code>ADMIN_BOOTSTRAP_SECRET</code> to promote yourself to <strong>Admin</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
