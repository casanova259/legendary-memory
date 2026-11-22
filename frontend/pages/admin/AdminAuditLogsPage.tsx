import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAdminAuditLogs, fetchAdminMatches } from '../../lib/api/admin';
import { AuditLogItem, Match } from '../../types';

export const AdminAuditLogsPage: React.FC = () => {
  const { getToken } = useAuthUser();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Log for detail modal
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const loadAuditData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const matchFilterParam = selectedMatchId !== 'all' ? selectedMatchId : undefined;

      const [logsRes, matchesRes] = await Promise.all([
        fetchAdminAuditLogs(getToken, matchFilterParam),
        fetchAdminMatches(getToken, { limit: 100 }),
      ]);

      setLogs(logsRes.data);
      setMatches(matchesRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit history');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, selectedMatchId]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        log.action.toLowerCase().includes(query) ||
        (log.reason && log.reason.toLowerCase().includes(query)) ||
        (log.matchId && String(log.matchId).includes(query)) ||
        (log.actorId && String(log.actorId).includes(query));

      const matchesAction =
        actionFilter === 'all' ||
        log.action.toLowerCase().includes(actionFilter.toLowerCase());

      return matchesQuery && matchesAction;
    });
  }, [logs, searchQuery, actionFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('correction')) {
      return <Badge variant="admin">CORRECTION</Badge>;
    }
    if (action.includes('override')) {
      return <Badge variant="paused">OVERRIDE</Badge>;
    }
    if (action.includes('assign')) {
      return <Badge variant="scorer">ASSIGNMENT</Badge>;
    }
    if (action.includes('start') || action.includes('resume')) {
      return <Badge variant="live">LIFECYCLE</Badge>;
    }
    return <Badge variant="default">{action.toUpperCase()}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Audit History</h1>
              <Badge variant="admin">COMPLIANCE</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Immutable ledger of administrative interventions, scoring corrections, status overrides, and assignments.
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={loadAuditData}>
            🔄 Refresh Audit Stream
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Search by action, reason, actor or #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select
              label=""
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              options={[
                { value: 'all', label: 'All Matches' },
                ...matches.map((m) => ({
                  value: String(m.id),
                  label: `Match #${m.id} (${m.homeTeam} vs ${m.awayTeam})`,
                })),
              ]}
            />

            <Select
              label=""
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Action Types' },
                { value: 'scoring_correction', label: 'Scoring Corrections' },
                { value: 'status', label: 'Status Overrides' },
                { value: 'assign', label: 'Assignments & Handover' },
                { value: 'match', label: 'Match Lifecycle (Start/Pause)' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 font-medium pt-1">
            <span>Showing {filteredLogs.length} of {logs.length} audit entries</span>
            {(searchQuery || selectedMatchId !== 'all' || actionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMatchId('all');
                  setActionFilter('all');
                }}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </Card>

        {/* Audit Log Table */}
        {isLoading && logs.length === 0 ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" label="Querying audit log ledger..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950 flex items-center justify-between">
            <span>Error: {error}</span>
            <Button variant="secondary" size="sm" onClick={loadAuditData}>
              Retry
            </Button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="Interventions, overrides, assignments, and corrections will be recorded automatically."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Action Type</TableHeaderCell>
                <TableHeaderCell>Match</TableHeaderCell>
                <TableHeaderCell>Actor</TableHeaderCell>
                <TableHeaderCell>Audit Reason / Notes</TableHeaderCell>
                <TableHeaderCell>Timestamp</TableHeaderCell>
                <TableHeaderCell className="text-right">Details</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{log.id}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getActionBadge(log.action)}
                      <span className="block font-mono text-[10px] text-gray-500">{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.matchId ? (
                      <Link
                        to={`/admin/matches/${log.matchId}`}
                        className="font-bold text-blue-600 hover:underline text-xs"
                      >
                        Match #{log.matchId} →
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Global</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {log.actorId ? `User #${log.actorId}` : 'System'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.reason ? (
                      <span className="font-bold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        "{log.reason}"
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectLog(log)}
                    >
                      🔍 Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Inspect Audit Log Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border-3 border-black rounded-2xl shadow-hard p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <h3 className="text-base font-black text-brand-dark">Audit Entry #{inspectLog.id}</h3>
              <button
                onClick={() => setInspectLog(null)}
                className="w-7 h-7 flex items-center justify-center border-2 border-black rounded-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-500 font-bold">Action:</span>
                <span className="font-mono font-bold ml-2">{inspectLog.action}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold">Actor:</span>
                <span className="font-mono ml-2">{inspectLog.actorId ? `User #${inspectLog.actorId}` : 'System'}</span>
              </div>
              {inspectLog.matchId && (
                <div>
                  <span className="text-gray-500 font-bold">Match ID:</span>
                  <span className="font-mono font-bold ml-2">#{inspectLog.matchId}</span>
                </div>
              )}
              {inspectLog.reason && (
                <div>
                  <span className="text-gray-500 font-bold">Reason:</span>
                  <span className="font-bold text-red-700 ml-2">{inspectLog.reason}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500 font-bold">Recorded At:</span>
                <span className="ml-2">{new Date(inspectLog.createdAt).toISOString()}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-700 block mb-1">Raw Payload Details:</span>
              <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto border-2 border-black">
                {JSON.stringify(inspectLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
