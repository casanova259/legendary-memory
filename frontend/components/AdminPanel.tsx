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

export const AdminPanel: React.FC<AdminPanelProps> = ({
  getToken,
  currentRole,
  onMatchCreated,
  onRolePromoted,
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'users' | 'bootstrap'>('match');

  // Match Creation Form State
  const [sport, setSport] = useState('Football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);

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

      await createMatch(token, {
        sport,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      setSuccessMsg(`Match "${homeTeam} vs ${awayTeam}" created successfully!`);
      setHomeTeam('');
      setAwayTeam('');
      setTimeout(() => setSuccessMsg(null), 4000);
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Bootstrap Secret</label>
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
