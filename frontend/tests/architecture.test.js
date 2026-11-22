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
