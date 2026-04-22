/**
 * api.js
 * Typed API helpers for the HP backend.
 */

const BASE = '/api';

async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

export const api = {
    init: (body) => post('/auth/init', body),
    challenge: (sessionId) => post('/auth/challenge', { session_id: sessionId }),
    verifyKey: (body) => post('/auth/verify-key', body),
    bioChallenge: (sessionId) => post('/auth/bio-challenge', { session_id: sessionId }),
    bioVerify: (body) => post('/auth/bio-verify', body),
    bioDemoVerify: (sessionId) => post('/auth/bio-demo', { session_id: sessionId }),
    complete: (sessionId) => post('/auth/complete', { session_id: sessionId }),
    status: () => fetch(`${BASE}/auth/status`).then(r => r.json()),
};
