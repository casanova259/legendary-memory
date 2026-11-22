import React, { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import {
  bootstrapAdmin,
  createMatch,
  fetchUsers,
  updateUserRole,
} from '../services/api';

interface AdminPanelProps {
  getToken: () => Promise<string | null>;
  currentRole: UserRole | null;
  onMatchCreated: () => void;
  onRolePromoted?: () => void;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  getToken,
  currentRole,
  onMatchCreated,
  onRolePromoted,
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'users' | 'bootstrap'>(
    currentRole === 'admin' ? 'match' : 'bootstrap'
  );

  useEffect(() => {
    if (currentRole === 'admin' && activeTab === 'bootstrap') {
      setActiveTab('users');
    } else if (currentRole !== 'admin' && activeTab !== 'bootstrap') {
      setActiveTab('bootstrap');
    }
  }, [currentRole]);

  // Match Creation Form State
  const [sport, setSport] = useState('Football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  // Default to 5 minutes ago and +2 hours so match starts as LIVE
  const [startTime, setStartTime] = useState(() =>
    toLocalDatetimeString(new Date(Date.now() - 5 * 60 * 1000))
  );
  const [endTime, setEndTime] = useState(() =>
    toLocalDatetimeString(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);

  const applyTimePreset = (type: 'live' | 'scheduled' | 'finished') => {
    if (type === 'live') {
      setStartTime(toLocalDatetimeString(new Date(Date.now() - 5 * 60 * 1000)));
      setEndTime(toLocalDatetimeString(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    } else if (type === 'scheduled') {
      setStartTime(toLocalDatetimeString(new Date(Date.now() + 60 * 60 * 1000)));
      setEndTime(toLocalDatetimeString(new Date(Date.now() + 3 * 60 * 60 * 1000)));
    } else if (type === 'finished') {
      setStartTime(toLocalDatetimeString(new Date(Date.now() - 3 * 60 * 60 * 1000)));
      setEndTime(toLocalDatetimeString(new Date(Date.now() - 60 * 60 * 1000)));
    }
  };

  const computedStatus = (() => {
    try {
      const now = new Date();
      const s = new Date(startTime);
      const e = new Date(endTime);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
      if (now < s) return 'scheduled';
      if (now >= e) return 'finished';
      return 'live';
    } catch {
      return null;
    }
  })();

  // Users State
  const [userList, setUserList] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Bootstrap State
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setErrorMsg(null);
      const token = await getToken();
      if (!token) return;
      const res = await fetchUsers(token);
      setUserList(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load user list');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && currentRole === 'admin') {
      loadUsers();
    }
  }, [activeTab, currentRole]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setErrorMsg('Please specify both home and away teams');
      return;
    }

    try {
      setIsSubmittingMatch(true);
      setErrorMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await createMatch(token, {
        sport,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      const createdStatus = res.data?.status || computedStatus || 'live';
      const statusIcon = createdStatus === 'live' ? '🔴 LIVE' : createdStatus === 'scheduled' ? '📅 SCHEDULED' : '🏁 FINISHED';
      setSuccessMsg(`Match "${homeTeam} vs ${awayTeam}" created successfully! Status: ${statusIcon}`);
      setHomeTeam('');
      setAwayTeam('');
      applyTimePreset('live');
      setTimeout(() => setSuccessMsg(null), 5000);
      onMatchCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create match');
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  const handleRoleChange = async (userId: number, nextRole: UserRole) => {
    try {
      setErrorMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await updateUserRole(token, userId, nextRole);
      setSuccessMsg(`User updated to role: ${res.data.role}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role');
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrapSecret.trim()) return;

    try {
      setIsBootstrapping(true);
      setErrorMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await bootstrapAdmin(token, bootstrapSecret.trim());
      setSuccessMsg(`Administrator access granted! Welcome, ${res.data.displayName || 'Admin'}.`);
      setBootstrapSecret('');
      if (onRolePromoted) onRolePromoted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bootstrap failed');
    } finally {
      setIsBootstrapping(false);
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-brand-blue rounded-2xl p-6 shadow-hard mb-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b-2 border-blue-200 pb-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase bg-brand-blue text-white px-2 py-0.5 rounded">
            Privileged Management
          </span>
          <h3 className="text-xl font-black text-brand-dark mt-1">LivSportz Admin Console</h3>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          {currentRole === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('match')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-black transition-all ${
                  activeTab === 'match' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                }`}
              >
                Create Match
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-black transition-all ${
                  activeTab === 'users' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                }`}
              >
                Manage Roles
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('bootstrap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-black transition-all ${
              activeTab === 'bootstrap' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            Admin Bootstrap
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold px-3 py-2 rounded-xl">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-900 text-xs font-bold px-3 py-2 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Tab 1: Create Match */}
      {activeTab === 'match' && currentRole === 'admin' && (
        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full text-xs p-2.5 border-2 border-black rounded-lg bg-white"
              >
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Cricket">Cricket</option>
                <option value="Tennis">Tennis</option>
                <option value="Baseball">Baseball</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Home Team</label>
              <input
                type="text"
                required
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="e.g. Real Madrid"
                className="w-full text-xs p-2.5 border-2 border-black rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Away Team</label>
              <input
                type="text"
                required
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="e.g. Barcelona"
                className="w-full text-xs p-2.5 border-2 border-black rounded-lg"
              />
            </div>
          </div>

          {/* Time Presets & Live Status Preview */}
          <div className="bg-white/80 border-2 border-black rounded-xl p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-700">Quick Match Status Presets:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyTimePreset('live')}
                  className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 border border-red-500 rounded-lg hover:bg-red-200 transition-all cursor-pointer"
                >
                  🔴 Start as LIVE Now
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('scheduled')}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 border border-blue-500 rounded-lg hover:bg-blue-200 transition-all cursor-pointer"
                >
                  📅 Scheduled (in 1hr)
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('finished')}
                  className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-800 border border-gray-400 rounded-lg hover:bg-gray-200 transition-all cursor-pointer"
                >
                  🏁 Finished
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs pt-1 border-t border-gray-200">
              <span className="font-bold text-gray-600">Calculated Match Status:</span>
              {computedStatus === 'live' && (
                <span className="bg-red-500 text-white font-black px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  LIVE NOW 🔴
                </span>
              )}
              {computedStatus === 'scheduled' && (
                <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded-full text-[11px]">
                  SCHEDULED 📅
                </span>
              )}
              {computedStatus === 'finished' && (
                <span className="bg-gray-600 text-white font-black px-2 py-0.5 rounded-full text-[11px]">
                  FINISHED 🏁 (Past match)
                </span>
              )}
              {computedStatus === 'finished' && (
                <span className="text-[11px] text-amber-700 font-medium">
                  ⚠️ End time is in the past; select &quot;Start as LIVE Now&quot; if this match is currently playing!
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs p-2.5 border-2 border-black rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs p-2.5 border-2 border-black rounded-lg bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingMatch}
            className="px-6 py-2.5 bg-brand-blue text-white rounded-lg text-xs font-bold border-2 border-black hover:bg-blue-600 disabled:opacity-50 shadow-hard-sm"
          >
            {isSubmittingMatch ? 'Creating Match...' : 'Publish New Match'}
          </button>
        </form>
      )}

      {/* Tab 2: User Roles */}
      {activeTab === 'users' && currentRole === 'admin' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase text-gray-700">Application Users & Role Permissions</h4>
            <button
              onClick={loadUsers}
              disabled={isLoadingUsers}
              className="text-xs font-bold text-brand-blue hover:underline"
            >
              {isLoadingUsers ? 'Refreshing...' : '↻ Refresh List'}
            </button>
          </div>

          <div className="overflow-x-auto bg-white border-2 border-black rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 border-b-2 border-black">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3">Assign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold">{user.displayName || 'Unnamed User'}</td>
                    <td className="p-3 font-mono text-gray-600">{user.email || 'No email'}</td>
                    <td className="p-3">
                      <span className="font-mono font-bold uppercase px-2 py-0.5 rounded text-[11px] bg-gray-100 border">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className="text-xs p-1 border rounded bg-white"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="scorer">Scorer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {userList.length === 0 && !isLoadingUsers && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Admin Bootstrap */}
      {activeTab === 'bootstrap' && (
        <div className="bg-white border-2 border-black rounded-xl p-5 space-y-4">
          <div>
            <h4 className="text-sm font-black text-gray-900 mb-1">First-Administrator Bootstrap</h4>
            <p className="text-xs text-gray-600">
              If no administrator has been configured yet, enter the server-side{' '}
              <code>ADMIN_BOOTSTRAP_SECRET</code> to promote your authenticated Clerk account to <strong>Admin</strong>.
            </p>
          </div>

          <form onSubmit={handleBootstrap} className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">Bootstrap Secret</label>
                <button
                  type="button"
                  onClick={() => setBootstrapSecret('super-secret-admin-bootstrap-livsportz-2026')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Paste Default Secret
                </button>
              </div>
              <input
                type="password"
                required
                value={bootstrapSecret}
                onChange={(e) => setBootstrapSecret(e.target.value)}
                placeholder="Enter ADMIN_BOOTSTRAP_SECRET"
                className="w-full text-xs p-2.5 border-2 border-black rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={isBootstrapping || !bootstrapSecret.trim()}
              className="px-5 py-2.5 bg-black text-white rounded-lg text-xs font-bold border-2 border-black hover:bg-gray-800 disabled:opacity-50 shadow-hard-sm"
            >
              {isBootstrapping ? 'Verifying Secret...' : 'Claim Administrator Role'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
