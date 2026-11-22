import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { fetchMatches } from '../../lib/api/matches';
import { Match } from '../../types';

export const AdminMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMatches = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchMatches(50);
        if (isMounted) setMatches(res.data);
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to fetch matches');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadMatches();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">Match Management</h1>
              <Badge variant="admin">Route Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              View and manage matches, scheduled times, scores, and status.
            </p>
          </div>
          <Button variant="primary" size="sm">
            + Create Match
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" label="Loading match records..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950">
            {error}
          </div>
        ) : matches.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-sm font-bold text-gray-700">No matches found.</p>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Sport</TableHeaderCell>
                <TableHeaderCell>Teams</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Start Time</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{m.id}</TableCell>
                  <TableCell className="font-bold">{m.sport}</TableCell>
                  <TableCell>
                    <span className="font-bold">{m.homeTeam}</span>
                    <span className="text-gray-400 mx-1.5">vs</span>
                    <span className="font-bold">{m.awayTeam}</span>
                  </TableCell>
                  <TableCell className="font-mono font-bold">
                    {m.homeScore} - {m.awayScore}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'live' ? 'live' : m.status === 'paused' ? 'paused' : 'default'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {new Date(m.startTime).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
};
