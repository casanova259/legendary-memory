import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { useParams, Link } from '../../lib/router';
import { useAuthUser } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import {
  fetchAdminMatchMonitoring,
  fetchAssignmentHistory,
  fetchAdminAuditLogs,
  overrideMatchStatus,
  correctScoringEvent,
  assignScorer,
  reassignScorer,
  revokeAssignment,
  fetchAdminScorers,
} from '../../lib/api/admin';
import { fetchMatchCommentary } from '../../lib/api/matches';
import {
  Match,
  MatchAssignment,
  Innings,
  ScoringEvent,
  Commentary,
  AuditLogItem,
  ScorerItem,
  WSMessage,
} from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

export const AdminMatchDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuthUser();
  const { addToast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<MatchAssignment | null>(null);
  const [innings, setInnings] = useState<Innings[]>([]);
  const [recentEvents, setRecentEvents] = useState<ScoringEvent[]>([]);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<MatchAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [scorers, setScorers] = useState<ScorerItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'events' | 'assignments' | 'audit'>('monitoring');

  // Modals
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('live');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Correction Modal
  const [correctingEvent, setCorrectingEvent] = useState<ScoringEvent | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedScorerId, setSelectedScorerId] = useState<number | ''>('');
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadMatchData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);

      const [monitorRes, commentaryRes, historyRes, auditRes, scorersRes] = await Promise.all([
        fetchAdminMatchMonitoring(getToken, id),
        fetchMatchCommentary(id, 50),
        fetchAssignmentHistory(getToken, id),
        fetchAdminAuditLogs(getToken, id),
        fetchAdminScorers(getToken),
      ]);

      setMatch(monitorRes.data.match);
      setActiveAssignment(monitorRes.data.assignment || null);
      setInnings(monitorRes.data.innings || []);
      setRecentEvents(monitorRes.data.recentEvents || []);
      setCommentary(commentaryRes.data || []);
      setAssignmentHistory(historyRes.data || []);
      setAuditLogs(auditRes.data || []);
      setScorers(scorersRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load match details');
    } finally {
      setIsLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    loadMatchData();
  }, [loadMatchData]);

  // Real-time WebSocket connection
  const handleWsMessage = useCallback(
    (msg: WSMessage) => {
      if (!id) return;
      const msgMatchId = (msg as any).matchId || (msg as any).data?.matchId || (msg as any).data?.id;

      if (String(msgMatchId) === String(id)) {
        if (msg.type === 'score_update') {
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  homeScore: msg.data.homeScore,
                  awayScore: msg.data.awayScore,
                }
              : null
          );
          if ((msg.data as any).innings) {
            setInnings((prev) => {
              const updated = [...prev];
              const curIdx = updated.findIndex((i) => i.id === (msg.data as any).inningsId);
              if (curIdx >= 0) {
                updated[curIdx] = { ...updated[curIdx], ...(msg.data as any).innings };
              }
              return updated;
            });
          }
        } else if (msg.type === 'commentary') {
          setCommentary((prev) => [msg.data, ...prev.filter((c) => c.id !== msg.data.id)]);
        } else if (msg.type === 'score_corrected' || msg.type === 'wicket_fallen' || msg.type === 'match_started' || msg.type === 'match_paused' || msg.type === 'match_resumed' || msg.type === 'match_completed') {
          loadMatchData();
        }
      }
    },
    [id, loadMatchData]
  );

  const { subscribeMatch, unsubscribeMatch } = useWebSocket(handleWsMessage);

  useEffect(() => {
    if (id) {
      subscribeMatch(id);
      return () => {
        unsubscribeMatch(id);
      };
    }
  }, [id, subscribeMatch, unsubscribeMatch]);

  const activeInnings = useMemo(() => {
    if (innings.length === 0) return null;
    return innings.find((i) => i.status === 'live') || innings[innings.length - 1];
  }, [innings]);

  // Status Override Handler
  const handleStatusOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!overrideReason.trim() || overrideReason.trim().length < 3) {
      setOverrideError('Mandatory audit reason must be at least 3 characters');
      return;
    }

    try {
      setIsSubmittingOverride(true);
      setOverrideError(null);
      await overrideMatchStatus(getToken, id, targetStatus, overrideReason.trim());
      addToast(`Match status successfully overridden to ${targetStatus}`, 'success');
      setIsOverrideOpen(false);
      setOverrideReason('');
      loadMatchData();
    } catch (err: unknown) {
      setOverrideError(err instanceof Error ? err.message : 'Status override failed');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Scoring Correction Handler
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !correctingEvent) return;
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setCorrectionError('Mandatory correction reason must be at least 3 characters');
      return;
    }

    try {
      setIsSubmittingCorrection(true);
      setCorrectionError(null);
      await correctScoringEvent(getToken, id, correctingEvent.id, correctionReason.trim());
      addToast(`Event #${correctingEvent.id} reversed and match score reconciled`, 'success');
      setCorrectingEvent(null);
      setCorrectionReason('');
      loadMatchData();
    } catch (err: unknown) {
      setCorrectionError(err instanceof Error ? err.message : 'Correction failed');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Assignment Handler (Assign or Reassign)
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedScorerId) return;

    try {
      setIsSubmittingAssign(true);
      setAssignError(null);

      if (activeAssignment) {
        // Reassignment requires reason
        await reassignScorer(getToken, id, Number(selectedScorerId), reassignReason.trim() || 'Admin reassignment');
        addToast(`Scorer reassigned successfully`, 'success');
      } else {
        // First assignment
        await assignScorer(getToken, id, Number(selectedScorerId));
        addToast(`Scorer assigned to match`, 'success');
      }

      setIsAssignModalOpen(false);
      setSelectedScorerId('');
      setReassignReason('');
      loadMatchData();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Assignment operation failed');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRevoke = async () => {
    if (!id) return;
    const confirmReason = window.prompt('Enter reason for revoking scorer assignment:');
    if (confirmReason === null) return; // User cancelled

    try {
      await revokeAssignment(getToken, id, confirmReason || undefined);
      addToast('Scorer assignment revoked', 'info');
      loadMatchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Revocation failed');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back Link & Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/admin/matches" className="text-xs font-bold text-gray-500 hover:text-black">
              ← Matches
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs font-bold text-brand-dark">Match #{id}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTargetStatus(match?.status === 'live' ? 'paused' : 'live');
                setOverrideReason('');
                setOverrideError(null);
                setIsOverrideOpen(true);
              }}
            >
              ⚙️ Status Intervention
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedScorerId('');
                setReassignReason('');
                setAssignError(null);
                setIsAssignModalOpen(true);
              }}
            >
              {activeAssignment ? '🔄 Reassign Scorer' : '+ Assign Scorer'}
            </Button>
          </div>
        </div>

        {isLoading && !match ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" label={`Loading operational match #${id}...`} />
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-500 p-6 text-center space-y-3">
            <h3 className="text-base font-black text-red-950">Match Load Error</h3>
            <p className="text-xs text-red-800">{error}</p>
            <Link to="/admin/matches">
              <Button variant="secondary" size="sm">
                Return to Matches
              </Button>
            </Link>
          </Card>
        ) : match ? (
          <>
            {/* Top Match Scorecard & Overview Card */}
            <Card className="p-6 space-y-4 bg-white border-2 border-black shadow-hard">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{match.sport}</Badge>
                  <span className="text-xs font-mono font-bold text-gray-500">Match #{match.id}</span>
                  <Badge
                    variant={
                      match.status === 'live'
                        ? 'live'
                        : match.status === 'paused'
                        ? 'paused'
                        : match.status === 'scheduled'
                        ? 'scheduled'
                        : 'finished'
                    }
                  >
                    {match.status}
                  </Badge>
                </div>

                <div className="text-xs text-gray-500 font-medium">
                  Scheduled: {new Date(match.startTime).toLocaleString()}
                </div>
              </div>

              {/* Main Score & Teams Display */}
              <div className="py-4 border-y-2 border-black flex items-center justify-between gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-black text-brand-dark">{match.homeTeam}</h2>
                  <div className="text-3xl sm:text-4xl font-black font-mono mt-1 text-brand-dark">
                    {match.homeScore}
                  </div>
                </div>

                <div className="text-center px-4">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-1">
                    VS
                  </span>
                  {activeInnings && (
                    <div className="bg-brand-yellow/30 border border-black px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                      Innings {activeInnings.inningsNumber}: {activeInnings.totalRuns}/{activeInnings.wickets} ({activeInnings.overs || '0.0'} ov)
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-right">
                  <h2 className="text-xl sm:text-2xl font-black text-brand-dark">{match.awayTeam}</h2>
                  <div className="text-3xl sm:text-4xl font-black font-mono mt-1 text-brand-dark">
                    {match.awayScore}
                  </div>
                </div>
              </div>

              {/* Assigned Scorer Information Pill */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-600">Assigned Scorer:</span>
                  {activeAssignment ? (
                    <span className="font-black text-emerald-800 bg-emerald-100 border border-emerald-400 px-2 py-0.5 rounded">
                      {activeAssignment.scorer?.displayName || `User #${activeAssignment.scorerId}`} ({activeAssignment.scorer?.email})
                    </span>
                  ) : (
                    <span className="font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded">
                      No Scorer Assigned (Match cannot be scored)
                    </span>
                  )}
                </div>

                {activeAssignment && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRevoke}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Revoke Assignment
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b-2 border-black pb-2">
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                  activeTab === 'monitoring'
                    ? 'bg-brand-yellow text-brand-dark shadow-hard-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                📡 Live Monitoring & Commentary ({commentary.length})
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                  activeTab === 'events'
                    ? 'bg-brand-yellow text-brand-dark shadow-hard-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏏 Scoring Events & Corrections ({recentEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                  activeTab === 'assignments'
                    ? 'bg-brand-yellow text-brand-dark shadow-hard-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 Scorer Assignment History ({assignmentHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-brand-yellow text-brand-dark shadow-hard-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                📜 Match Audit Logs ({auditLogs.length})
              </button>
            </div>

            {/* Tab 1: Live Monitoring & Commentary */}
            {activeTab === 'monitoring' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Innings Card */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-black text-brand-dark">Cricket Innings Breakdown</h3>
                  {innings.length === 0 ? (
                    <Card className="p-4 text-center text-xs text-gray-500">
                      Innings not initialized yet. The assigned scorer starts Innings 1 upon match commencement.
                    </Card>
                  ) : (
                    innings.map((inn) => (
                      <Card key={inn.id} className="p-4 space-y-2 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-brand-dark">
                            Innings {inn.inningsNumber}: {inn.battingTeam}
                          </span>
                          <Badge variant={inn.status === 'live' ? 'live' : 'default'}>
                            {inn.status}
                          </Badge>
                        </div>
                        <div className="text-2xl font-black font-mono">
                          {inn.totalRuns} / {inn.wickets}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          Overs: <span className="font-bold">{inn.overs || '0.0'}</span> • Extras:{' '}
                          <span className="font-bold">{inn.extras}</span>
                          {inn.target && ` • Target: ${inn.target}`}
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                {/* Commentary Stream */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="text-sm font-black text-brand-dark flex items-center justify-between">
                    <span>Live Commentary Feed</span>
                    <span className="text-[11px] font-mono text-gray-500">WebSocket Connected</span>
                  </h3>

                  <Card className="p-4 bg-white max-h-[500px] overflow-y-auto space-y-2.5">
                    {commentary.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-8">
                        No commentary entries posted yet for this match.
                      </p>
                    ) : (
                      commentary.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-xs space-y-1">
                          <div className="flex items-center justify-between text-gray-500 font-mono text-[10px]">
                            <span>
                              {c.minute !== undefined && c.minute !== null ? `${c.minute}' • ` : ''}
                              {c.eventType ? c.eventType.toUpperCase() : 'COMMENTARY'}
                            </span>
                            <span>{c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ''}</span>
                          </div>
                          <p className="font-bold text-gray-900">{c.message}</p>
                        </div>
                      ))
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* Tab 2: Scoring Events & Corrections */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-brand-dark">Ball-by-Ball Scoring History</h3>
                    <p className="text-xs text-gray-500">
                      Admins can review historical events and perform formal scoring corrections with mandatory audit reasons.
                    </p>
                  </div>
                </div>

                {recentEvents.length === 0 ? (
                  <EmptyState title="No scoring events recorded yet" description="Scoring events appear here once recorded by the assigned scorer." />
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Seq</TableHeaderCell>
                        <TableHeaderCell>Event Type</TableHeaderCell>
                        <TableHeaderCell>Runs Off Bat</TableHeaderCell>
                        <TableHeaderCell>Extras</TableHeaderCell>
                        <TableHeaderCell>Total Runs</TableHeaderCell>
                        <TableHeaderCell>Wicket</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell className="text-right">Action</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentEvents.map((evt) => (
                        <TableRow key={evt.id} className={evt.isReversed ? 'bg-red-50/50 opacity-60' : ''}>
                          <TableCell className="font-mono font-bold">#{evt.eventSequence}</TableCell>
                          <TableCell className="font-bold uppercase text-[11px]">{evt.eventType}</TableCell>
                          <TableCell className="font-mono font-bold">{evt.runsOffBat}</TableCell>
                          <TableCell>
                            {evt.extrasType !== 'none' ? (
                              <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                                {evt.extrasType} (+{evt.extrasRuns})
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-black">{evt.totalRuns}</TableCell>
                          <TableCell>
                            {evt.wicketType && evt.wicketType !== 'none' ? (
                              <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                                {evt.wicketType} ({evt.dismissedPlayer || 'batter'})
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {evt.isReversed ? (
                              <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]" title={evt.reversalReason}>
                                REVERSED
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 text-[10px]">ACTIVE</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!evt.isReversed && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setCorrectingEvent(evt);
                                  setCorrectionReason('');
                                  setCorrectionError(null);
                                }}
                              >
                                Correct / Reverse
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Tab 3: Scorer Assignment History */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-brand-dark">Scorer Assignment Audit Trail</h3>
                {assignmentHistory.length === 0 ? (
                  <EmptyState title="No assignment records found" description="This match has not been assigned to any scorer." />
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Assignment ID</TableHeaderCell>
                        <TableHeaderCell>Scorer ID</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Assigned At</TableHeaderCell>
                        <TableHeaderCell>Revoked At</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignmentHistory.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-bold">#{a.id}</TableCell>
                          <TableCell className="font-bold">
                            User #{a.scorerId} {a.scorer ? `(${a.scorer.displayName || a.scorer.email})` : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.status === 'active' ? 'scorer' : 'default'}>
                              {a.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {new Date(a.assignedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {a.revokedAt ? new Date(a.revokedAt).toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Tab 4: Match Audit Logs */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-brand-dark">Audit History for Match #{id}</h3>
                {auditLogs.length === 0 ? (
                  <EmptyState title="No audit events logged" description="All interventions, status changes and corrections will be logged here." />
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>ID</TableHeaderCell>
                        <TableHeaderCell>Action</TableHeaderCell>
                        <TableHeaderCell>Actor</TableHeaderCell>
                        <TableHeaderCell>Timestamp</TableHeaderCell>
                        <TableHeaderCell>Reason / Details</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono font-bold">#{log.id}</TableCell>
                          <TableCell>
                            <span className="font-bold text-xs uppercase bg-brand-yellow/50 border border-black px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {log.actorId ? `User #${log.actorId}` : 'System'}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.reason && <p className="font-bold text-red-700">Reason: {log.reason}</p>}
                            {log.details && (
                              <pre className="font-mono text-[10px] text-gray-600 max-w-xs truncate">
                                {JSON.stringify(log.details)}
                              </pre>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Modal: Status Intervention */}
      <Modal
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        title={`Status Intervention: Match #${id}`}
      >
        <form onSubmit={handleStatusOverride} className="space-y-4">
          {overrideError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {overrideError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
            <strong>Notice:</strong> Changing status to <code>paused</code> or <code>completed</code> halts regular scorer updates.
          </div>

          <Select
            label="Target Match Status"
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            options={[
              { value: 'live', label: 'live (Active Match)' },
              { value: 'paused', label: 'paused (Rain / Technical Delay)' },
              { value: 'scheduled', label: 'scheduled (Upcoming)' },
              { value: 'completed', label: 'completed (Finished Match)' },
              { value: 'abandoned', label: 'abandoned (Match Cancelled)' },
            ]}
          />

          <Input
            label="Mandatory Audit Reason (min 3 chars)"
            placeholder="e.g. Inclement weather delay"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsOverrideOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isSubmittingOverride}>
              Confirm Override
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Scoring Correction */}
      <Modal
        isOpen={!!correctingEvent}
        onClose={() => setCorrectingEvent(null)}
        title={`Administrative Scoring Correction: Event #${correctingEvent?.eventSequence}`}
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          {correctionError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {correctionError}
            </div>
          )}

          <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl text-xs text-red-950 space-y-1">
            <p className="font-black">⚠️ Official Score Correction Warning</p>
            <p>
              Reversing this scoring delivery will deterministically recalculate the total runs, legal deliveries, wickets, and overs for this innings, reconcile commentary, and write an immutable audit log entry.
            </p>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-gray-800">Event Details:</p>
            <p>Type: <span className="font-mono font-bold">{correctingEvent?.eventType}</span></p>
            <p>Runs Off Bat: <span className="font-mono font-bold">{correctingEvent?.runsOffBat}</span></p>
            {correctingEvent?.extrasType !== 'none' && (
              <p>Extras: <span className="font-mono font-bold">{correctingEvent?.extrasType} (+{correctingEvent?.extrasRuns})</span></p>
            )}
            {correctingEvent?.wicketType && correctingEvent.wicketType !== 'none' && (
              <p className="text-red-700 font-bold">Wicket: {correctingEvent?.wicketType} ({correctingEvent?.dismissedPlayer})</p>
            )}
          </div>

          <Input
            label="Mandatory Correction Reason (min 3 chars)"
            placeholder="e.g. Third umpire overturned boundary to dot ball"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCorrectingEvent(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={isSubmittingCorrection}>
              Confirm & Reverse Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign / Reassign Scorer */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={activeAssignment ? `Reassign Scorer: Match #${id}` : `Assign Scorer: Match #${id}`}
      >
        <form onSubmit={handleAssignmentSubmit} className="space-y-4">
          {assignError && (
            <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-bold text-red-900">
              {assignError}
            </div>
          )}

          <p className="text-xs text-gray-600">
            {activeAssignment
              ? `Currently assigned to ${activeAssignment.scorer?.displayName || `User #${activeAssignment.scorerId}`}. Select a replacement scorer.`
              : 'Select an active official scorer to operate this match.'}
          </p>

          <Select
            label="Select Active Scorer"
            value={selectedScorerId}
            onChange={(e) => setSelectedScorerId(Number(e.target.value) || '')}
            options={[
              { value: '', label: '-- Select Scorer --' },
              ...scorers
                .filter((s) => s.isActive)
                .map((s) => ({
                  value: s.id,
                  label: `${s.displayName || s.email} (${s.activeAssignmentsCount ?? 0} active assignments)`,
                })),
            ]}
            required
          />

          {activeAssignment && (
            <Input
              label="Reassignment Reason / Shift Handover Notes"
              placeholder="e.g. Scorer emergency shift handover"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
            />
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedScorerId}
              isLoading={isSubmittingAssign}
            >
              {activeAssignment ? 'Confirm Reassignment' : 'Assign Scorer'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};
