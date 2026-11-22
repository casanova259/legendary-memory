import React, { useEffect, useState } from 'react';
import { ScorerLayout } from '../../components/layouts/ScorerLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { fetchAssignedMatches } from '../../lib/api/scorer';
import { Match } from '../../types';

export const ScorerMatchesPage: React.FC = () => {
  const { getToken } = useAuthUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchAssignedMatches(getToken);
      setMatches(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assigned matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [getToken]);

  const filteredMatches = matches.filter((m) => {
    const matchesSearch =
      m.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(m.id).includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'live') return m.status === 'live' || m.status === 'paused';
    if (statusFilter === 'scheduled') return m.status === 'scheduled';
    if (statusFilter === 'completed') return m.status === 'completed' || m.status === 'finished';
    return m.status === statusFilter;
  });

  return (
    <ScorerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">My Assigned Matches</h1>
              <Badge variant="scorer">Scorer Console</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              All fixtures assigned to you by administrators for official scoring.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadMatches}>
            ↻ Refresh
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by team name or match ID..."
            className="flex-1 px-4 py-2 rounded-xl border-2 border-black text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border-2 border-black text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
          >
            <option value="all">All Statuses</option>
            <option value="live">Live / In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Matches Table */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Spinner size="md" label="Loading assigned fixtures..." />
          </div>
        ) : error ? (
          <Card className="p-6 bg-red-50 border-red-500 text-center space-y-3">
            <h3 className="text-base font-black text-red-950">Notice</h3>
            <p className="text-xs text-red-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadMatches}>
              Try Again
            </Button>
          </Card>
        ) : filteredMatches.length === 0 ? (
          <Card className="text-center py-12 space-y-2 border-2 border-black">
            <p className="text-sm font-bold text-gray-700">No matches found matching criteria.</p>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Teams</TableHeaderCell>
                <TableHeaderCell>Sport</TableHeaderCell>
                <TableHeaderCell>Scheduled Time</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Current Score</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((m) => {
                const isLive = m.status === 'live' || m.status === 'paused';
                const isScheduled = m.status === 'scheduled';
                const isCompleted = m.status === 'completed' || m.status === 'finished';

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-bold text-gray-500">#{m.id}</TableCell>
                    <TableCell className="font-black text-brand-dark">
                      {m.homeTeam} vs {m.awayTeam}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gray-600">{m.sport}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {m.startTime ? new Date(m.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'live' ? 'live' : 'default'} className="uppercase">
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-black text-sm">
                      {m.homeScore} - {m.awayScore}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Link to={`/scorer/matches/${m.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Overview
                          </Button>
                        </Link>
                        {isLive ? (
                          <Link to={`/scorer/matches/${m.id}/live`}>
                            <Button variant="success" size="sm" className="text-xs font-black shadow-hard-xs">
                              Score Console ⚡
                            </Button>
                          </Link>
                        ) : isScheduled ? (
                          <Link to={`/scorer/matches/${m.id}/setup`}>
                            <Button variant="primary" size="sm" className="text-xs font-black">
                              Setup ▶
                            </Button>
                          </Link>
                        ) : isCompleted ? (
                          <Link to={`/scorer/matches/${m.id}/scorecard`}>
                            <Button variant="secondary" size="sm" className="text-xs font-bold">
                              Scorecard 📋
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </ScorerLayout>
  );
};
