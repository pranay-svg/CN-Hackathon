/**
 * HPContext.jsx
 * Global state + HP protocol orchestration logic (7-step flow).
 * Includes demo mode: full auto-run without webcam.
 */
import { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import {
    generateKeyPair,
    exportPublicKeyPEM,
    signNonce,
    deviceFingerprint,
    getKeyPair,
} from '../lib/cryptoClient';

// ── State shape ────────────────────────────────────────────────────────
const initialState = {
    phase: 'login',       // 'login' | 'bio' | 'success' | 'error'
    step: 0,
    stepStatuses: {},     // { 1: 'active'|'done'|'failed' }
    statusText: 'Ready to authenticate',
    sessionId: null,
    bioChallenge: null,
    authResult: null,
    bioResult: null,
    isDemoMode: false,
    logs: [{
        id: 0, ts: new Date().toLocaleTimeString(),
        msg: 'HUMANITY-PROTOCOL v1.0 ready', type: 'info',
    }],
    _logId: 1,
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_PHASE': return { ...state, phase: action.payload };
        case 'SET_STEP': return { ...state, step: action.payload };
        case 'SET_STEP_STATUS': return {
            ...state,
            stepStatuses: { ...state.stepStatuses, [action.step]: action.status },
        };
        case 'SET_STATUS': return { ...state, statusText: action.payload };
        case 'SET_SESSION': return { ...state, sessionId: action.payload };
        case 'SET_BIO_CHALLENGE': return { ...state, bioChallenge: action.payload };
        case 'SET_AUTH_RESULT': return { ...state, authResult: action.payload };
        case 'SET_BIO_RESULT': return { ...state, bioResult: action.payload };
        case 'SET_DEMO_MODE': return { ...state, isDemoMode: action.payload };
        case 'ADD_LOG': {
            const entry = {
                id: state._logId,
                ts: new Date().toLocaleTimeString(),
                msg: action.msg,
                type: action.logType || 'info',
            };
            return {
                ...state,
                _logId: state._logId + 1,
                logs: [...state.logs.slice(-199), entry],
            };
        }
        case 'CLEAR_LOGS': return { ...state, logs: [] };
        case 'RESET': return {
            ...initialState,
            logs: [{
                id: 0, ts: new Date().toLocaleTimeString(),
                msg: '── Session reset ──', type: 'info',
            }],
            _logId: 1,
        };
        default: return state;
    }
}

// ── Helpers ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Context ────────────────────────────────────────────────────────────
const HPContext = createContext(null);

export function HPProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const faceMeshRef = useRef(null);

    const log = useCallback((msg, type = 'info') => {
        dispatch({ type: 'ADD_LOG', msg, logType: type });
    }, []);

    const setStepStatus = useCallback((step, status) => {
        dispatch({ type: 'SET_STEP_STATUS', step, status });
    }, []);

    // ── STEP 1–3: Cryptographic verification ───────────────────────────
    const runCryptoLayers = useCallback(async (userId) => {
        log('═══ HUMANITY-PROTOCOL initiated ═══', 'info');

        setStepStatus(1, 'active');
        dispatch({ type: 'SET_STATUS', payload: 'Generating RSA-2048 key pair…' });
        log('Generating RSA-2048 key pair in browser (Web Crypto API)…', 'crypto');

        await generateKeyPair();
        const kp = getKeyPair();
        const pubPEM = await exportPublicKeyPEM(kp.publicKey);
        const fp = await deviceFingerprint();
        log(`Device fingerprint: ${fp.slice(0, 16)}…`, 'crypto');

        dispatch({ type: 'SET_STATUS', payload: 'Connecting to server…' });
        log('→ STEP 1: Sending authentication request', 'info');
        const r1 = await api.init({ user_id: userId, device_fingerprint: fp, public_key_pem: pubPEM });
        dispatch({ type: 'SET_SESSION', payload: r1.session_id });
        log(`✓ Session: ${r1.session_id.slice(0, 14)}…`, 'success');
        setStepStatus(1, 'done');

        setStepStatus(2, 'active');
        log('→ STEP 2: Requesting cryptographic challenge', 'info');
        dispatch({ type: 'SET_STATUS', payload: 'Receiving encrypted challenge…' });
        const r2 = await api.challenge(r1.session_id);
        log(`← Challenge hash: ${r2.challenge_hash.slice(0, 16)}…`, 'crypto');
        setStepStatus(2, 'done');

        setStepStatus(3, 'active');
        log('→ STEP 3: Signing nonce with RSA-PSS private key', 'info');
        dispatch({ type: 'SET_STATUS', payload: 'Signing cryptographic nonce…' });
        const signed = await signNonce(r2.challenge_hash);
        log('RSA-PSS signature generated. Submitting to server…', 'crypto');
        await api.verifyKey({
            session_id: r1.session_id,
            signed_nonce: signed,
            client_ts: Math.floor(Date.now() / 1000),
        });
        log('✓ Cryptographic verification passed', 'success');
        setStepStatus(3, 'done');

        return r1.session_id;
    }, [log, setStepStatus]);

    // ── STEP 4: Get biometric challenge ──────────────────────────────
    const requestBioChallenge = useCallback(async (sessionId) => {
        setStepStatus(4, 'active');
        log('→ STEP 4: Requesting biometric challenge', 'info');
        dispatch({ type: 'SET_STATUS', payload: 'Loading biometric challenge…' });
        const r4 = await api.bioChallenge(sessionId);
        dispatch({ type: 'SET_BIO_CHALLENGE', payload: r4.challenge });
        log(`← Bio challenge: [${r4.challenge.type}] "${r4.challenge.instruction}"`, 'warn');
        return r4.challenge;
    }, [log, setStepStatus]);

    // ── STEP 5-6: Submit biometric proof (live webcam) ─────────────────
    const submitBioResponse = useCallback(async (sessionId, landmarks, frames) => {
        log(`→ STEP 5: Submitting ${landmarks.length} landmark frames`, 'info');
        dispatch({ type: 'SET_STATUS', payload: 'Analysing biometric response…' });

        const r5 = await api.bioVerify({
            session_id: sessionId,
            landmarks,
            frames: frames.slice(0, 20),
        });
        dispatch({ type: 'SET_BIO_RESULT', payload: r5 });
        log(
            `✓ Bio verified | Score: ${(r5.score * 100).toFixed(1)}% | ` +
            `Liveness: ${(r5.liveness * 100).toFixed(1)}% | ` +
            `Deepfake Risk: ${(r5.deepfake_risk * 100).toFixed(1)}%`,
            'success'
        );
        setStepStatus(4, 'done');

        setStepStatus(5, 'active');
        log('→ STEP 7: Completing protocol — issuing session token', 'info');
        const r7 = await api.complete(sessionId);
        dispatch({ type: 'SET_AUTH_RESULT', payload: r7 });
        log(`✓ TOKEN ISSUED — user: ${r7.user_id}`, 'success');
        log(`  Token SHA-256: ${r7.token_hash.slice(0, 24)}…`, 'crypto');
        log('═══ HUMANITY-PROTOCOL: AUTHENTICATION SUCCESSFUL ═══', 'success');
        setStepStatus(5, 'done');

        return r7;
    }, [log, setStepStatus]);

    // ── DEMO: Full auto-run (no webcam) ────────────────────────────────
    const runDemoFlow = useCallback(async () => {
        dispatch({ type: 'SET_DEMO_MODE', payload: true });
        const demoUser = 'demo@humanity.io';

        try {
            // Steps 1-3: real crypto (no shortcuts)
            const sessionId = await runCryptoLayers(demoUser);

            // Step 4: get bio challenge
            await requestBioChallenge(sessionId);
            dispatch({ type: 'SET_PHASE', payload: 'bio' });

            // Brief pause so the bio panel renders + user sees the challenge
            await sleep(800);
            log('🤖 Demo mode: generating synthetic biometric data…', 'warn');
            await sleep(600);
            log('→ STEP 5: Submitting server-side synthetic landmarks', 'info');

            // Steps 5-6: demo bio endpoint (server generates synthetic data)
            dispatch({ type: 'SET_STATUS', payload: 'Running synthetic biometric analysis…' });
            const r5 = await api.bioDemoVerify(sessionId);
            dispatch({ type: 'SET_BIO_RESULT', payload: r5 });
            log(
                `✓ Demo bio verified | Score: ${(r5.score * 100).toFixed(1)}% | ` +
                `Liveness: ${(r5.liveness * 100).toFixed(1)}% | ` +
                `Deepfake Risk: ${(r5.deepfake_risk * 100).toFixed(1)}%`,
                'success'
            );
            setStepStatus(4, 'done');

            // Step 7: token
            setStepStatus(5, 'active');
            log('→ STEP 7: Completing protocol — issuing session token', 'info');
            await sleep(400);
            const r7 = await api.complete(sessionId);
            dispatch({ type: 'SET_AUTH_RESULT', payload: r7 });
            log(`✓ TOKEN ISSUED — user: ${r7.user_id}`, 'success');
            log(`  Token SHA-256: ${r7.token_hash.slice(0, 24)}…`, 'crypto');
            log('═══ HUMANITY-PROTOCOL: DEMO AUTHENTICATION SUCCESSFUL ═══', 'success');
            setStepStatus(5, 'done');

            dispatch({ type: 'SET_PHASE', payload: 'success' });
        } catch (err) {
            log(`✗ Demo failed: ${err.message}`, 'error');
            dispatch({ type: 'SET_DEMO_MODE', payload: false });
        }
    }, [runCryptoLayers, requestBioChallenge, log, setStepStatus]);

    const reset = useCallback(() => {
        faceMeshRef.current?.stop?.().catch(() => { });
        dispatch({ type: 'RESET' });
    }, []);

    const clearLogs = useCallback(() => dispatch({ type: 'CLEAR_LOGS' }), []);

    const value = {
        state,
        dispatch,
        log,
        faceMeshRef,
        runCryptoLayers,
        requestBioChallenge,
        submitBioResponse,
        runDemoFlow,
        reset,
        clearLogs,
    };

    return <HPContext.Provider value={value}>{children}</HPContext.Provider>;
}

export function useHP() {
    const ctx = useContext(HPContext);
    if (!ctx) throw new Error('useHP must be used inside HPProvider');
    return ctx;
}
