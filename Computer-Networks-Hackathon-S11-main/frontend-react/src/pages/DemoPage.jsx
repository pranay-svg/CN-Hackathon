/**
 * DemoPage.jsx
 * Dedicated demo page that runs the REAL authentication flow
 * using the actual webcam — pre-filled with demo@humanity.io.
 *
 * Flow:
 *  1. User clicks "Start Demo with Webcam"
 *  2. Runs crypto layers (steps 1-3) automatically
 *  3. Transitions to BiometricPanel (real webcam, real liveness)
 *  4. On success → SuccessPanel
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, ArrowLeft, Cpu, Terminal, Trash2, RotateCcw,
    Camera, Lock, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { HPProvider, useHP } from '../context/HPContext';
import { BiometricPanel } from '../components/BiometricPanel';
import { SuccessPanel } from '../components/SuccessPanel';
import { ProtocolStepRow } from '../components/ProtocolStepRow';
import { ProtocolLog } from '../components/ProtocolLog';
import styles from './DemoPage.module.css';

const STEP_DEFS = [
    { n: 1, label: 'Device Handshake', desc: 'RSA-2048 public-key registration' },
    { n: 2, label: 'Crypto Challenge', desc: 'Server-encrypted random nonce' },
    { n: 3, label: 'Key Verification', desc: 'RSA-PSS signature validation' },
    { n: 4, label: 'Biometric Challenge', desc: 'Live webcam liveness detection' },
    { n: 5, label: 'Session Token', desc: 'Cryptographic access token issued' },
];

const DEMO_USER = 'demo@humanity.io';

/* ── Inner component (must sit inside HPProvider) ── */
function DemoInner() {
    const navigate = useNavigate();
    const { state, dispatch, log, reset, runCryptoLayers, requestBioChallenge } = useHP();

    const [phase, setPhase] = useState('idle');   // idle | running | bio | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [backendDown, setBackendDown] = useState(false);

    const isSuccess = state.phase === 'success';
    const isBio = state.phase === 'bio';

    /* Reflect HP global phase into local phase for bio/success */
    if (state.phase === 'bio' && phase !== 'bio') setPhase('bio');
    if (state.phase === 'success' && phase !== 'success') setPhase('success');

    async function startDemo() {
        if (phase === 'running' || phase === 'bio') return;
        setPhase('running');
        setErrorMsg('');
        setBackendDown(false);

        try {
            log('═══ DEMO MODE — using real webcam ═══', 'info');
            log(`Demo user: ${DEMO_USER}`, 'info');

            /* Steps 1-3: real crypto */
            const sessionId = await runCryptoLayers(DEMO_USER);
            dispatch({ type: 'SET_SESSION', payload: sessionId });

            /* Step 4: bio challenge */
            await requestBioChallenge(sessionId);
            dispatch({ type: 'SET_PHASE', payload: 'bio' });
            setPhase('bio');
        } catch (err) {
            const msg = err.message || 'Unknown error';
            const isNetworkErr =
                msg.includes('Failed to fetch') ||
                msg.includes('JSON') ||
                msg.includes('502') ||
                msg.includes('503') ||
                msg.includes('NetworkError');

            setBackendDown(isNetworkErr);
            setErrorMsg(msg);
            setPhase('error');
            log(`✗ Demo error: ${msg}`, 'error');

            [1, 2, 3, 4].forEach(n =>
                dispatch({ type: 'SET_STEP_STATUS', step: n, status: 'failed' })
            );
        }
    }

    function handleReset() {
        reset();
        setPhase('idle');
        setErrorMsg('');
        setBackendDown(false);
    }

    return (
        <div className={styles.page}>

            {/* ── Top bar ── */}
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/')}>
                    <ArrowLeft size={15} />
                    <span>Back</span>
                </button>
                <div className={styles.headerBrand}>
                    <div className={styles.headerLogo}>
                        <Shield size={16} strokeWidth={2.5} />
                    </div>
                    <span className={styles.headerName}>Humanity Protocol</span>
                    <span className={styles.headerBadge}>DEMO MODE</span>
                </div>
                <button className={styles.resetBtn} onClick={handleReset} title="Reset session">
                    <RotateCcw size={13} />
                    <span>Reset</span>
                </button>
            </header>

            {/* ── Body ── */}
            <div className={styles.body}>

                {/* ── Left panel ── */}
                <main className={styles.main}>
                    {/* SUCCESS state */}
                    {isSuccess && <SuccessPanel />}

                    {/* BIO state — real webcam */}
                    {isBio && !isSuccess && <BiometricPanel />}

                    {/* IDLE / RUNNING / ERROR state */}
                    {!isBio && !isSuccess && (
                        <div className={styles.demoCard}>
                            {/* Card top bar */}
                            <div className={styles.cardTop}>
                                <div className={styles.cardTopLeft}>
                                    <div className={`${styles.statusDot}
                                        ${phase === 'running' ? styles.dotRunning : ''}
                                        ${phase === 'error' ? styles.dotError : ''}
                                        ${phase === 'idle' ? styles.dotIdle : ''}
                                    `} />
                                    <span className={styles.cardTopText}>
                                        {phase === 'running' ? 'Connecting to server…'
                                            : phase === 'error' ? 'Authentication Error'
                                                : 'Ready — Webcam Demo'}
                                    </span>
                                </div>
                                <div className={styles.cardTopRight}>
                                    <Camera size={13} />
                                    <span>Live Biometrics</span>
                                </div>
                            </div>

                            {/* Card body */}
                            <div className={styles.cardBody}>

                                {/* Hero */}
                                <div className={styles.demoHero}>
                                    <div className={`${styles.demoOrb} ${phase === 'running' ? styles.orbActive : ''}`}>
                                        {phase === 'running'
                                            ? <div className={styles.orbSpinner} />
                                            : <Camera size={26} />
                                        }
                                    </div>
                                    <div className={styles.demoHeroText}>
                                        <h1 className={styles.demoTitle}>
                                            {phase === 'running' ? 'Verifying crypto layers…' : 'Live Demo Authentication'}
                                        </h1>
                                        <p className={styles.demoSub}>
                                            {phase === 'running'
                                                ? state.statusText || 'Running RSA handshake…'
                                                : 'Runs the full 7-step protocol with your real webcam. Uses demo@humanity.io as the test account.'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Protocol steps */}
                                <div className={styles.stepsSection}>
                                    <p className={styles.stepsLabel}>Authentication Protocol</p>
                                    <div className={styles.stepList}>
                                        {STEP_DEFS.map(s => (
                                            <ProtocolStepRow
                                                key={s.n}
                                                number={s.n}
                                                label={s.label}
                                                desc={s.desc}
                                                status={state.stepStatuses[s.n] || ''}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Backend offline error */}
                                {phase === 'error' && backendDown && (
                                    <div className={styles.errorBanner}>
                                        <div className={styles.errorTop}>
                                            <AlertTriangle size={16} />
                                            <span className={styles.errorTitle}>Backend server is not running</span>
                                        </div>
                                        <p className={styles.errorBody}>
                                            The Python backend needs to be running at <code>localhost:5000</code> for the demo to work.
                                        </p>
                                        <div className={styles.errorCode}>
                                            <code>cd backend</code><br />
                                            <code>python app.py</code>
                                        </div>
                                        <p className={styles.errorBody} style={{ marginTop: 6 }}>
                                            Or double-click <code>start_server.bat</code> in the project root.
                                        </p>
                                        <button className={styles.retryBtn} onClick={handleReset}>
                                            <RotateCcw size={12} /> Try Again
                                        </button>
                                    </div>
                                )}

                                {/* Generic error */}
                                {phase === 'error' && !backendDown && (
                                    <div className={styles.errorBanner}>
                                        <div className={styles.errorTop}>
                                            <AlertTriangle size={16} />
                                            <span className={styles.errorTitle}>Demo failed</span>
                                        </div>
                                        <p className={styles.errorBody}>{errorMsg}</p>
                                        <button className={styles.retryBtn} onClick={handleReset}>
                                            <RotateCcw size={12} /> Retry
                                        </button>
                                    </div>
                                )}

                                {/* Start CTA */}
                                {phase === 'idle' && (
                                    <button className={styles.startBtn} onClick={startDemo}>
                                        <Camera size={17} />
                                        <span>Start Demo with Webcam</span>
                                    </button>
                                )}

                                {/* Running state — no extra button */}
                                {phase === 'running' && (
                                    <div className={styles.runningNote}>
                                        <div className={styles.runSpinner} />
                                        <span>Completing cryptographic handshake… webcam will open next.</span>
                                    </div>
                                )}

                                {/* Webcam note */}
                                {phase !== 'error' && (
                                    <div className={styles.webcamNote}>
                                        <Lock size={11} />
                                        <span>
                                            Your webcam is accessed locally by MediaPipe. No video is ever stored or sent — only 468 facial landmark coordinates are transmitted over TLS.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>

                {/* ── Right: Protocol log ── */}
                <ProtocolLog />
            </div>
        </div>
    );
}

/* Wrap in its own HPProvider so state is isolated from other pages */
export function DemoPage() {
    return (
        <HPProvider>
            <DemoInner />
        </HPProvider>
    );
}
