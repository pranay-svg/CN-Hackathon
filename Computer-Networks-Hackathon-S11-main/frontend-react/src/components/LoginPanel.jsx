import { useState } from 'react';
import {
    Shield, Cpu, Eye, Lock, ChevronRight,
    Fingerprint, Radio, Layers, KeyRound, Zap, ArrowRight,
} from 'lucide-react';
import { useHP } from '../context/HPContext';
import { ProtocolStepRow } from './ProtocolStepRow';
import styles from './LoginPanel.module.css';

const STEP_DEFS = [
    { n: 1, label: 'Device Handshake', desc: 'RSA-2048 public-key registration' },
    { n: 2, label: 'Crypto Challenge', desc: 'Server-encrypted random nonce' },
    { n: 3, label: 'Key Verification', desc: 'RSA-PSS signature validation' },
    { n: 4, label: 'Biometric Challenge', desc: 'Anti-deepfake liveness proof' },
    { n: 5, label: 'Session Token', desc: 'Cryptographic access token issued' },
];

const FEATURES = [
    {
        icon: KeyRound,
        title: 'RSA-2048 Encryption',
        desc: 'Public-key cryptography ensures only your device can sign the authentication nonce.',
    },
    {
        icon: Eye,
        title: 'Biometric Liveness',
        desc: 'Real-time MediaPipe FaceMesh detects natural micro-expressions a deepfake cannot fake.',
    },
    {
        icon: Layers,
        title: 'Replay Protection',
        desc: 'Per-session nonces with 30-second timestamp windows block all replay attacks.',
    },
    {
        icon: Radio,
        title: 'Deepfake Detection',
        desc: 'EAR variance and landmark jitter analysis flags synthetic or pre-recorded video.',
    },
];

export function LoginPanel() {
    const { state, dispatch, log, runCryptoLayers, requestBioChallenge, runDemoFlow } = useHP();
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);

    async function handleStart() {
        if (!userId.trim() || loading) return;
        setLoading(true);
        try {
            const sessionId = await runCryptoLayers(userId.trim());
            dispatch({ type: 'SET_SESSION', payload: sessionId });
            await requestBioChallenge(sessionId);
            dispatch({ type: 'SET_PHASE', payload: 'bio' });
        } catch (err) {
            log(`✗ ${err.message}`, 'error');
            [1, 2, 3, 4].forEach(n =>
                dispatch({ type: 'SET_STEP_STATUS', step: n, status: 'failed' })
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleDemo() {
        if (demoLoading || loading) return;
        setDemoLoading(true);
        try {
            await runDemoFlow();
        } finally {
            setDemoLoading(false);
        }
    }

    return (
        <div className={styles.wrapper}>
            {/* ═══════════════════════════════════════
          LEFT HERO PANEL
      ═══════════════════════════════════════ */}
            <div className={styles.hero}>
                {/* Wordmark */}
                <div className={styles.wordmark}>
                    <div className={styles.logoMark}>
                        <Shield size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className={styles.logoName}>Humanity Protocol</span>
                        <span className={styles.logoVersion}>v1.0 — DEEPFAKE RESISTANT</span>
                    </div>
                </div>

                {/* Hero headline */}
                <div className={styles.heroText}>
                    <h1 className={styles.heroHeadline}>
                        Authenticate with absolute certainty
                    </h1>
                    <p className={styles.heroSub}>
                        A 7-step multi-layer protocol combining RSA cryptographic verification
                        with real-time biometric liveness detection to stop deepfakes and AI
                        impersonation at the network level.
                    </p>
                </div>

                {/* Feature list */}
                <div className={styles.features}>
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className={styles.featureRow}>
                            <div className={styles.featureIcon}>
                                <Icon size={16} strokeWidth={2} />
                            </div>
                            <div>
                                <p className={styles.featureTitle}>{title}</p>
                                <p className={styles.featureDesc}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Protocol badges */}
                <div className={styles.protoBadges}>
                    {['RSA-2048', 'SHA-256', 'MediaPipe FaceMesh', 'TLS', 'CSPRNG'].map(b => (
                        <span key={b} className={styles.protoBadge}>{b}</span>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════
          RIGHT AUTH FORM
      ═══════════════════════════════════════ */}
            <div className={styles.formSide}>
                {/* Card header */}
                <div className={styles.card}>
                    {/* Top bar */}
                    <div className={styles.cardTop}>
                        <div className={styles.cardTopLeft}>
                            <div className={styles.statusDot} />
                            <span className={styles.cardTopText}>Secure Authentication</span>
                        </div>
                        <div className={styles.cardTopRight}>
                            <Fingerprint size={15} />
                            <span>HP Protocol</span>
                        </div>
                    </div>

                    <div className={styles.cardBody}>
                        <div className={styles.cardHeadGroup}>
                            <h2 className={styles.cardTitle}>Sign in</h2>
                            <p className={styles.cardSub}>
                                Your identity will be verified across two independent layers.
                            </p>
                        </div>

                        {/* User ID field */}
                        <div className={styles.field}>
                            <label htmlFor="userId" className={styles.label}>User ID</label>
                            <div className={styles.inputWrap}>
                                <span className={styles.inputIcon}>
                                    <Lock size={14} />
                                </span>
                                <input
                                    id="userId"
                                    type="text"
                                    className={styles.input}
                                    value={userId}
                                    onChange={e => setUserId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                                    placeholder="e.g. alice@orgname.io"
                                    disabled={loading}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
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

                        {/* CTA */}
                        <button
                            id="btnStart"
                            className={styles.cta}
                            onClick={handleStart}
                            disabled={loading || demoLoading || !userId.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className={styles.spinner} />
                                    <span className={styles.ctaText}>{state.statusText}</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={15} strokeWidth={2.5} />
                                    <span className={styles.ctaText}>Begin Verification</span>
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>

                        {/* Demo button */}
                        <button
                            id="btnDemo"
                            className={styles.demoBtn}
                            onClick={handleDemo}
                            disabled={loading || demoLoading}
                        >
                            {demoLoading ? (
                                <>
                                    <span className={styles.spinnerDark} />
                                    <span>{state.statusText || 'Running demo…'}</span>
                                </>
                            ) : (
                                <>
                                    <Cpu size={14} strokeWidth={2} />
                                    <span>Try Demo — no webcam needed</span>
                                    <ChevronRight size={13} />
                                </>
                            )}
                        </button>

                        {/* Footer note */}
                        <p className={styles.footnote}>
                            <Lock size={10} />
                            &nbsp;RSA private keys are generated locally and never transmitted.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
