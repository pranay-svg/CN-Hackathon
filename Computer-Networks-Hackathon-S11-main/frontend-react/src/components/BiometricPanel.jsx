import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, Video, Lock, Activity } from 'lucide-react';
import { useHP } from '../context/HPContext';
import { createFaceMeshController } from '../lib/faceMesh';
import styles from './BiometricPanel.module.css';

const TIMER_TOTAL = 15;
const CIRCUMFERENCE = 2 * Math.PI * 26; // r=26

export function BiometricPanel() {
    const { state, dispatch, log, submitBioResponse, faceMeshRef } = useHP();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const controller = useRef(null);
    const timerRef = useRef(null);

    const [metrics, setMetrics] = useState({
        ear: null, yaw: null, pitch: null, liveness: 0, faceFound: false,
    });
    const [timeLeft, setTimeLeft] = useState(TIMER_TOTAL);
    const [cameraReady, setCameraReady] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const challenge = state.bioChallenge;

    // ── Start webcam + FaceMesh ──────────────────────────────────────
    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;
        let active = true;

        controller.current = createFaceMeshController();
        faceMeshRef.current = controller.current;

        (async () => {
            try {
                await controller.current.start(
                    videoRef.current, canvasRef.current,
                    m => { if (active) setMetrics(m); }
                );
                if (!active) return;
                setCameraReady(true);
                log('Camera active · MediaPipe FaceMesh running at 30fps', 'success');
                controller.current.startCapture();

                let sec = TIMER_TOTAL;
                timerRef.current = setInterval(() => {
                    sec--;
                    setTimeLeft(sec);
                    if (sec <= 0) {
                        clearInterval(timerRef.current);
                        if (active) handleSubmit(true);
                    }
                }, 1000);
            } catch (err) {
                log(`Camera error: ${err.message}`, 'error');
            }
        })();

        return () => {
            active = false;
            clearInterval(timerRef.current);
            controller.current?.stop().catch(() => { });
        };
    }, []);

    const handleSubmit = useCallback(async (auto = false) => {
        if (submitting) return;
        setSubmitting(true);
        clearInterval(timerRef.current);
        const data = controller.current?.stopCapture() ?? { landmarks: [], frames: [] };
        if (!auto) log('Manual submission.', 'info');
        try {
            const result = await submitBioResponse(state.sessionId, data.landmarks, data.frames);
            await controller.current?.stop();
            dispatch({ type: 'SET_AUTH_RESULT', payload: result });
            dispatch({ type: 'SET_PHASE', payload: 'success' });
        } catch (err) {
            log(`✗ Bio failed: ${err.message}`, 'error');
            setSubmitting(false);
        }
    }, [submitting, state.sessionId, submitBioResponse, dispatch, log]);

    // ── Derived values ────────────────────────────────────────────────
    const timerProgress = timeLeft / TIMER_TOTAL;
    const strokeOffset = CIRCUMFERENCE * (1 - timerProgress);
    const livenessPct = Math.round(metrics.liveness * 100);
    const riskPct = 100 - livenessPct;
    const riskColor = riskPct < 30 ? 'var(--success)' : riskPct < 65 ? 'var(--warn)' : 'var(--danger)';
    const fmt = (n, d) => n !== null
        ? ((n >= 0 && d > 0 ? '+' : '') + n.toFixed(d))
        : '—';

    return (
        <div className={styles.panel}>

            {/* ── Top bar ── */}
            <div className={styles.topBar}>
                <div className={styles.topLeft}>
                    <div className={styles.challengePill}>
                        <span>{challenge?.icon || '👁️'}</span>
                        CHALLENGE ACTIVE
                    </div>
                    <div className={styles.topMeta}>
                        <span className={styles.topTitle}>Biometric Verification</span>
                        <span className={styles.topSub}>Step 4 of 7 — Deepfake Detection Active</span>
                    </div>
                </div>

                {/* Timer ring */}
                <div className={styles.timerRing}>
                    <svg viewBox="0 0 60 60" className={styles.timerSvg}>
                        <circle cx="30" cy="30" r="26" fill="none"
                            stroke="rgba(59,130,246,0.1)" strokeWidth="4" />
                        <circle cx="30" cy="30" r="26" fill="none"
                            stroke="url(#tGrad)" strokeWidth="4"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={strokeOffset}
                            strokeLinecap="round"
                            transform="rotate(-90 30 30)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }} />
                        <defs>
                            <linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#06B6D4" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className={styles.timerNum}>{Math.max(0, timeLeft)}</span>
                </div>
            </div>

            {/* ── Webcam card ── */}
            <div className={styles.webcamCard}>
                {/* Camera status bar */}
                <div className={styles.camBar}>
                    <div className={styles.camBarLeft}>
                        <div className={styles.camRecDot} />
                        <span>LIVE · FaceMesh 468-landmark tracking</span>
                    </div>
                    <div className={styles.camRight}>
                        <span className={styles.camTag}><Video size={10} /> WebRTC</span>
                        <span className={styles.camTag}><Lock size={10} /> MediaPipe</span>
                    </div>
                </div>

                {/* Video + canvas */}
                <div className={styles.webcamArea}>
                    <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
                    <canvas ref={canvasRef} className={styles.canvas} />

                    {/* Corners */}
                    <div className={`${styles.corner} ${styles.cornerTL}`} />
                    <div className={`${styles.corner} ${styles.cornerTR}`} />
                    <div className={`${styles.corner} ${styles.cornerBL}`} />
                    <div className={`${styles.corner} ${styles.cornerBR}`} />

                    <div className={styles.scanLine} />

                    {/* Face badge */}
                    <div className={`${styles.faceBadge} ${metrics.faceFound ? styles.faceBadgeOn : ''}`}>
                        <Video size={10} />
                        {metrics.faceFound ? 'Face Detected' : 'Searching for face…'}
                    </div>

                    {/* Metrics */}
                    <div className={styles.metricsOverlay}>
                        {[
                            { label: 'EAR', value: fmt(metrics.ear, 3) },
                            { label: 'YAW', value: fmt(metrics.yaw, 2) },
                            { label: 'PITCH', value: fmt(metrics.pitch, 2) },
                        ].map(m => (
                            <div key={m.label} className={styles.metricChip}>
                                <span className={styles.metricLabel}>{m.label}</span>
                                <span className={styles.metricVal}>{m.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Challenge instruction */}
                    <div className={styles.challengeOverlay}>
                        <span className={styles.challengeTag}>PERFORM ACTION</span>
                        <p className={styles.challengeInstruction}>
                            {challenge?.instruction || 'Awaiting challenge…'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Analysis cards ── */}
            <div className={styles.analysisRow}>
                {/* Live metrics card */}
                <div className={styles.analysisCard}>
                    <div className={styles.analysisTitle}>
                        <Activity size={12} /> Live Metrics
                    </div>
                    <div className={styles.metricGrid}>
                        {[
                            { label: 'EAR', val: fmt(metrics.ear, 3) },
                            { label: 'Yaw', val: fmt(metrics.yaw, 2) },
                            { label: 'Pitch', val: fmt(metrics.pitch, 2) },
                            { label: 'Live', val: `${livenessPct}%` },
                        ].map(m => (
                            <div key={m.label} className={styles.metricBlock}>
                                <span className={styles.mbLabel}>{m.label}</span>
                                <span className={styles.mbValue}>{m.val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deepfake risk card */}
                <div className={styles.analysisCard}>
                    <div className={styles.analysisTitle}>
                        <Video size={12} /> Deepfake Analysis
                    </div>
                    {[
                        { label: 'Liveness', pct: livenessPct, color: 'linear-gradient(90deg,var(--blue-600),var(--success))' },
                        { label: 'Risk', pct: riskPct, color: riskColor },
                    ].map(r => (
                        <div key={r.label} className={styles.riskRow}>
                            <span className={styles.riskLbl}>{r.label}</span>
                            <div className={styles.riskTrack}>
                                <div className={styles.riskFill}
                                    style={{ width: `${r.pct}%`, background: r.color }} />
                            </div>
                            <span className={styles.riskPct} style={{ color: r.color }}>{r.pct}%</span>
                        </div>
                    ))}
                    <p className={styles.riskStatus} style={{ color: riskColor }}>
                        {riskPct < 30
                            ? '✓ Low risk — natural human motion'
                            : riskPct < 65
                                ? '⚠ Moderate — continuing analysis…'
                                : '✗ High risk — unnatural motion detected'}
                    </p>
                </div>
            </div>

            {/* ── Bottom row ── */}
            <div className={styles.bottomRow}>
                <p className={styles.secNote}>
                    <Lock size={11} />
                    Landmark data processed server-side over TLS
                </p>
                <button
                    className={styles.submitBtn}
                    onClick={() => handleSubmit(false)}
                    disabled={submitting || !cameraReady}
                >
                    {submitting
                        ? <><span className={styles.spinner} /> Verifying…</>
                        : <><CheckCircle size={15} /> Submit Verification</>}
                </button>
            </div>
        </div>
    );
}
