import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAdminDashboard } from '../../lib/api/admin';
import { AdminDashboardStats } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const { getToken } = useAuthUser();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchAdminDashboard(getToken);
        if (isMounted) setStats(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [getToken]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Title & Phase 1 Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Admin Overview</h1>
              <Badge variant="admin">Phase 1 Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Platform management dashboard for matches, scorer assignments, and audit logging.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/matches">
              <Button variant="primary" size="sm">
                + New Match
              </Button>
            </Link>
            <Link to="/admin/scorers">
              <Button variant="secondary" size="sm">
                Manage Scorers
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Metrics Grid */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" label="Loading admin metrics from backend..." />
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-500 text-red-950 p-4 rounded-xl text-xs font-bold">
            Notice: {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="white" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Total Matches
              </span>
              <p className="text-3xl font-black text-brand-dark">{stats?.totalMatches ?? 0}</p>
              <span className="text-[10px] text-gray-500">Across all sports</span>
            </Card>

            <Card variant="white" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Live Matches
              </span>
              <p className="text-3xl font-black text-emerald-600">{stats?.liveMatches ?? 0}</p>
              <span className="text-[10px] text-emerald-700 font-bold">Currently in progress</span>
            </Card>

            <Card variant="white" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Scorers
              </span>
              <p className="text-3xl font-black text-brand-dark">{stats?.totalScorers ?? 0}</p>
              <span className="text-[10px] text-gray-500">Registered scorers</span>
            </Card>

            <Card variant="white" className="p-4 space-y-1">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Active Assignments
              </span>
              <p className="text-3xl font-black text-blue-600">{stats?.activeAssignments ?? 0}</p>
              <span className="text-[10px] text-gray-500">Matches with active scorer</span>
            </Card>
          </div>
        )}

        {/* Quick Management Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <Link to="/admin/matches" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full">
              <h3 className="text-sm font-black text-brand-dark mb-1">🏏 Match Management</h3>
              <p className="text-xs text-gray-600">
                Create and manage cricket and multi-sport matches with live score monitoring.
              </p>
            </Card>
          </Link>

          <Link to="/admin/scorers" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full">
              <h3 className="text-sm font-black text-brand-dark mb-1">👥 Scorer Management</h3>
              <p className="text-xs text-gray-600">
                Invite official scorers, manage profiles, and toggle active account status.
              </p>
            </Card>
          </Link>

          <Link to="/admin/assignments" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full">
              <h3 className="text-sm font-black text-brand-dark mb-1">📋 Match Assignments</h3>
              <p className="text-xs text-gray-600">
                Assign and reassign scorers with strictly 1 active scorer per match.
              </p>
            </Card>
          </Link>

          <Link to="/admin/audit-logs" className="block">
            <Card className="hover:bg-yellow-50 transition-all cursor-pointer h-full">
              <h3 className="text-sm font-black text-brand-dark mb-1">📜 Audit Logs</h3>
              <p className="text-xs text-gray-600">
                Track full audit history of match interventions, status overrides, and corrections.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
};
