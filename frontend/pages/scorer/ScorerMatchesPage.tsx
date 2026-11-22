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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMatches = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchAssignedMatches(getToken);
        if (isMounted) setMatches(res.data);
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to fetch assigned matches');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadMatches();
    return () => {
      isMounted = false;
    };
  }, [getToken]);

  return (
    <ScorerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-brand-dark">My Assigned Matches</h1>
              <Badge variant="scorer">Route Foundation</Badge>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Matches assigned exclusively to your scorer account.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" label="Loading assigned matches..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-950">
            {error}
          </div>
        ) : matches.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-sm font-bold text-gray-700">No matches currently assigned.</p>
          </Card>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Teams</TableHeaderCell>
                <TableHeaderCell>Sport</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-bold text-gray-500">#{m.id}</TableCell>
                  <TableCell className="font-bold">
                    {m.homeTeam} vs {m.awayTeam}
                  </TableCell>
                  <TableCell>{m.sport}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'live' ? 'live' : 'default'}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold">
                    {m.homeScore} - {m.awayScore}
                  </TableCell>
                  <TableCell>
                    <Link to={`/scorer/matches/${m.id}`}>
                      <Button variant="success" size="sm">
                        Score Match →
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </ScorerLayout>
  );
};
