import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Router Path Matching & Param Extraction
import { matchPath } from '../lib/router/matcher.ts';

describe('Frontend Architecture: 1. Client-Side Router & Path Matching', () => {
  it('should match exact root path "/"', () => {
    const res = matchPath('/', '/', true);
    assert.equal(res.matches, true);
  });

  it('should match exact admin routes', () => {
    assert.equal(matchPath('/admin', '/admin', true).matches, true);
    assert.equal(matchPath('/admin/matches', '/admin/matches', true).matches, true);
    assert.equal(matchPath('/admin/scorers', '/admin/scorers', true).matches, true);
    assert.equal(matchPath('/admin/assignments', '/admin/assignments', true).matches, true);
    assert.equal(matchPath('/admin/audit-logs', '/admin/audit-logs', true).matches, true);
    assert.equal(matchPath('/admin/matches/:id', '/admin/matches/99', true).matches, true);
    assert.equal(matchPath('/admin/matches/:id', '/admin/matches/99', true).params.id, '99');
  });

  it('should reject mismatched paths on exact match', () => {
    assert.equal(matchPath('/admin', '/scorer', true).matches, false);
    assert.equal(matchPath('/admin', '/admin/matches', true).matches, false);
    assert.equal(matchPath('/scorer', '/admin', true).matches, false);
  });

  it('should extract dynamic route parameters (:id)', () => {
    const res = matchPath('/scorer/matches/:id', '/scorer/matches/142', true);
    assert.equal(res.matches, true);
    assert.equal(res.params.id, '142');
  });

  it('should match Phase 3 Scorer Workspace routes', () => {
    assert.equal(matchPath('/scorer', '/scorer', true).matches, true);
    assert.equal(matchPath('/scorer/matches', '/scorer/matches', true).matches, true);
    assert.equal(matchPath('/scorer/matches/:id', '/scorer/matches/142', true).matches, true);
    assert.equal(matchPath('/scorer/matches/:id/setup', '/scorer/matches/142/setup', true).matches, true);
    assert.equal(matchPath('/scorer/matches/:id/setup', '/scorer/matches/142/setup', true).params.id, '142');
    assert.equal(matchPath('/scorer/matches/:id/live', '/scorer/matches/142/live', true).matches, true);
    assert.equal(matchPath('/scorer/matches/:id/live', '/scorer/matches/142/live', true).params.id, '142');
    assert.equal(matchPath('/scorer/matches/:id/scorecard', '/scorer/matches/142/scorecard', true).matches, true);
    assert.equal(matchPath('/scorer/matches/:id/scorecard', '/scorer/matches/142/scorecard', true).params.id, '142');
  });

  it('should extract dynamic string ID parameters', () => {
    const res = matchPath('/scorer/matches/:id', '/scorer/matches/ind-vs-aus-2026', true);
    assert.equal(res.matches, true);
    assert.equal(res.params.id, 'ind-vs-aus-2026');
  });
});

// Test 2: Role-Based Access Control & Inactive State Logic
describe('Frontend Architecture: 2. Role-Based Access Control Matrix', () => {
  const evaluateAccess = (userRole, isActive, allowedRoles) => {
    if (!userRole) return { allowed: false, reason: 'unauthenticated' };
    if (!isActive) return { allowed: false, reason: 'inactive' };
    if (!allowedRoles.includes(userRole)) return { allowed: false, reason: 'unauthorized' };
    return { allowed: true };
  };

  it('unauthenticated users cannot access admin or scorer routes', () => {
    assert.deepEqual(evaluateAccess(null, true, ['admin']), { allowed: false, reason: 'unauthenticated' });
    assert.deepEqual(evaluateAccess(null, true, ['scorer', 'admin']), { allowed: false, reason: 'unauthenticated' });
  });

  it('inactive users cannot access protected routes regardless of role', () => {
    assert.deepEqual(evaluateAccess('admin', false, ['admin']), { allowed: false, reason: 'inactive' });
    assert.deepEqual(evaluateAccess('scorer', false, ['scorer']), { allowed: false, reason: 'inactive' });
  });

  it('viewers cannot access admin routes (403 / unauthorized)', () => {
    const res = evaluateAccess('viewer', true, ['admin']);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'unauthorized');
  });

  it('viewers cannot access scorer routes (403 / unauthorized)', () => {
    const res = evaluateAccess('viewer', true, ['scorer']);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'unauthorized');
  });

  it('scorers cannot access admin-only routes', () => {
    const res = evaluateAccess('scorer', true, ['admin']);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'unauthorized');
  });

  it('admins have access to admin routes', () => {
    const res = evaluateAccess('admin', true, ['admin']);
    assert.equal(res.allowed, true);
  });

  it('both scorers and admins have access to scorer workspace routes', () => {
    assert.equal(evaluateAccess('scorer', true, ['scorer', 'admin']).allowed, true);
    assert.equal(evaluateAccess('admin', true, ['scorer', 'admin']).allowed, true);
  });
});

// Test 3: API Client & Error Handling
import { ApiError } from '../lib/api/client.ts';

describe('Frontend Architecture: 3. API Client & Typed Errors', () => {
  it('ApiError preserves status, message and response payload', () => {
    const err = new ApiError('Forbidden access', 403, { code: 'ROLE_FORBIDDEN' });
    assert.equal(err.name, 'ApiError');
    assert.equal(err.status, 403);
    assert.equal(err.message, 'Forbidden access');
    assert.deepEqual(err.data, { code: 'ROLE_FORBIDDEN' });
  });
});

// Test 4: WebSocket Client Strategy & Protocol
import { WebSocketClient } from '../lib/websocket/client.ts';

describe('Frontend Architecture: 4. WebSocket Client Architecture', () => {
  it('instantiates in disconnected state', () => {
    const client = new WebSocketClient('ws://localhost:8000/ws');
    assert.equal(client.getStatus(), 'disconnected');
  });

  it('manages status listeners properly', () => {
    const client = new WebSocketClient('ws://localhost:8000/ws');
    const statuses = [];
    const unsub = client.addStatusListener((s) => statuses.push(s));
    assert.ok(statuses.includes('disconnected'));
    unsub();
  });
});

// Test 5: Cricket Calculations & Event Aggregations
import {
  formatOvers,
  calculateRunRate,
  calculateRequiredRunRate,
  deriveBatterStats,
  deriveBowlerStats,
  deriveFallOfWickets,
  deriveExtrasBreakdown,
  generateIdempotencyKey,
} from '../lib/cricket/calculations.ts';

describe('Frontend Architecture: 5. Cricket Calculations & Statistics', () => {
  it('formats legal balls into overs correctly', () => {
    assert.equal(formatOvers(0), '0.0');
    assert.equal(formatOvers(5), '0.5');
    assert.equal(formatOvers(6), '1.0');
    assert.equal(formatOvers(14), '2.2');
    assert.equal(formatOvers(120), '20.0');
  });

  it('calculates CRR and RRR correctly', () => {
    assert.equal(calculateRunRate(0, 0), '0.00');
    assert.equal(calculateRunRate(48, 36), '8.00'); // 48 runs in 6 overs = 8.00
    assert.equal(calculateRequiredRunRate(180, 120, 20, 90), '12.00'); // 60 runs in 5 overs (30 balls) = 12.00
  });

  it('generates unique, collision-resistant idempotency keys', () => {
    const k1 = generateIdempotencyKey(1, 10);
    const k2 = generateIdempotencyKey(1, 10);
    assert.notEqual(k1, k2);
    assert.ok(k1.startsWith('sc_1_m_10_'));
  });

  it('derives accurate batter and bowler statistics from scoring events', () => {
    const sampleEvents = [
      {
        id: 1,
        matchId: 10,
        inningsId: 1,
        eventSequence: 1,
        eventType: 'ball',
        runsOffBat: 4,
        extrasType: 'none',
        extrasRuns: 0,
        totalRuns: 4,
        isLegalDelivery: true,
        batter: 'Rohit',
        bowler: 'Starc',
        isReversed: false,
      },
      {
        id: 2,
        matchId: 10,
        inningsId: 1,
        eventSequence: 2,
        eventType: 'extra',
        runsOffBat: 0,
        extrasType: 'wide',
        extrasRuns: 1,
        totalRuns: 1,
        isLegalDelivery: false,
        batter: 'Rohit',
        bowler: 'Starc',
        isReversed: false,
      },
      {
        id: 3,
        matchId: 10,
        inningsId: 1,
        eventSequence: 3,
        eventType: 'wicket',
        runsOffBat: 0,
        extrasType: 'none',
        extrasRuns: 0,
        totalRuns: 0,
        isLegalDelivery: true,
        wicketType: 'bowled',
        dismissedPlayer: 'Rohit',
        batter: 'Rohit',
        bowler: 'Starc',
        isReversed: false,
      },
    ];

    const bStats = deriveBatterStats(sampleEvents);
    assert.equal(bStats['Rohit'].runs, 4);
    assert.equal(bStats['Rohit'].balls, 2); // 2 balls faced (wide excluded)
    assert.equal(bStats['Rohit'].fours, 1);
    assert.equal(bStats['Rohit'].isOut, true);
    assert.equal(bStats['Rohit'].strikeRate, '200.0');

    const bwStats = deriveBowlerStats(sampleEvents);
    assert.equal(bwStats['Starc'].legalBalls, 2);
    assert.equal(bwStats['Starc'].overs, '0.2');
    assert.equal(bwStats['Starc'].runsConceded, 5); // 4 off bat + 1 wide
    assert.equal(bwStats['Starc'].wickets, 1);

    const fow = deriveFallOfWickets(sampleEvents);
    assert.equal(fow.length, 1);
    assert.equal(fow[0].score, 5);
    assert.equal(fow[0].wicketNumber, 1);

    const extras = deriveExtrasBreakdown(sampleEvents);
    assert.equal(extras.wides, 1);
    assert.equal(extras.total, 1);
  });
});
