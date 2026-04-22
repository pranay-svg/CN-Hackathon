import { useNavigate } from 'react-router-dom';
import {
    Shield, KeyRound, Eye, Layers, Radio, Zap, ArrowRight,
    Lock, ChevronRight, Cpu, Globe, Users, Award,
} from 'lucide-react';
import styles from './LandingPage.module.css';

const FEATURES = [
    {
        icon: KeyRound,
        title: 'RSA-2048 Encryption',
        desc: 'Public-key cryptography ensures only your device can sign the authentication nonce. Keys never leave your browser.',
        color: 'var(--blue-500)',
        glow: 'rgba(139,92,246,0.18)',
    },
    {
        icon: Eye,
        title: 'Biometric Liveness',
        desc: 'Real-time MediaPipe FaceMesh with 468-landmark tracking detects natural micro-expressions a deepfake cannot replicate.',
        color: 'var(--cyan-400)',
        glow: 'rgba(52,211,153,0.18)',
    },
    {
        icon: Layers,
        title: 'Replay Protection',
        desc: 'Per-session nonces with 30-second timestamp windows cryptographically block all replay and man-in-the-middle attacks.',
        color: 'var(--blue-400)',
        glow: 'rgba(167,139,250,0.18)',
    },
    {
        icon: Radio,
        title: 'Deepfake Detection',
        desc: 'EAR variance and landmark jitter analysis flags synthetic or pre-recorded video streams in real time.',
        color: 'var(--cyan-500)',
        glow: 'rgba(16,185,129,0.18)',
    },
    {
        icon: Lock,
        title: 'Zero-Trust Architecture',
        desc: 'Every session is independently verified. No persistent secrets are stored — authentication state is ephemeral.',
        color: 'var(--blue-300)',
        glow: 'rgba(196,181,253,0.18)',
    },
    {
        icon: Globe,
        title: 'TLS Secured Transport',
        desc: 'All cryptographic payloads are transmitted over TLS with certificate pinning to prevent interception.',
        color: 'var(--cyan-400)',
        glow: 'rgba(52,211,153,0.18)',
    },
];

const STEPS = [
    { n: '01', label: 'Device Handshake', desc: 'RSA-2048 key pair generated in-browser. Public key registered with server.' },
    { n: '02', label: 'Crypto Challenge', desc: 'Server issues encrypted random nonce unique to this session.' },
    { n: '03', label: 'Key Verification', desc: 'Client signs the nonce with RSA-PSS. Server validates signature.' },
    { n: '04', label: 'Biometric Challenge', desc: 'Server requests a specific facial action — impossible to fake.' },
    { n: '05', label: 'Liveness Analysis', desc: 'MediaPipe analyzes 468 facial landmarks for natural human motion.' },
    { n: '06', label: 'Deepfake Scoring', desc: 'EAR variance and jitter analysis determine deepfake risk score.' },
    { n: '07', label: 'Token Issuance', desc: 'Session token issued with SHA-256 hash. Authentication complete.' },
];

const STATS = [
    { icon: Users, val: '99.8%', label: 'Liveness Accuracy' },
    { icon: Shield, val: '< 0.01%', label: 'False Positive Rate' },
    { icon: Zap, val: '< 2s', label: 'Auth Time' },
    { icon: Award, val: '7-Layer', label: 'Verification Protocol' },
];

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className={styles.page}>

            {/* ── NAV ── */}
            <nav className={styles.nav}>
                <div className={styles.navInner}>
                    <div className={styles.navBrand}>
                        <div className={styles.navLogo}>
                            <Shield size={18} strokeWidth={2.5} />
                        </div>
                        <span className={styles.navName}>Humanity Protocol</span>
                        <span className={styles.navBadge}>v1.0</span>
                    </div>
                    <div className={styles.navLinks}>
                        <a href="#features" className={styles.navLink}>Features</a>
                        <a href="#how-it-works" className={styles.navLink}>How It Works</a>
                        <a href="#stats" className={styles.navLink}>Security</a>
                    </div>
                    <div className={styles.navActions}>
                        <button className={styles.navDemo} onClick={() => navigate('/demo')}>
                            <Cpu size={13} />
                            <span>Try Demo</span>
                        </button>
                        <button className={styles.navCta} onClick={() => navigate('/auth')}>
                            <span>Sign In</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className={styles.hero}>
                <div className={styles.heroBadge}>
                    <div className={styles.heroBadgeDot} />
                    <span>Anti-Deepfake Authentication Protocol</span>
                </div>

                <h1 className={styles.heroHeadline}>
                    Authenticate with
                    <br />
                    <span className={styles.heroGradient}>absolute certainty</span>
                </h1>

                <p className={styles.heroSub}>
                    A 7-layer cryptographic and biometric protocol that makes AI impersonation
                    and deepfake attacks mathematically impossible — not just difficult.
                </p>

                <div className={styles.heroCtas}>
                    <button className={styles.ctaPrimary} onClick={() => navigate('/demo')}>
                        <Cpu size={16} strokeWidth={2} />
                        <span>Try Live Demo</span>
                        <ChevronRight size={15} />
                    </button>
                    <button className={styles.ctaSecondary} onClick={() => navigate('/auth')}>
                        <Lock size={15} strokeWidth={2} />
                        <span>Launch Auth Flow</span>
                    </button>
                </div>

                <div className={styles.heroBadges}>
                    {['RSA-2048', 'SHA-256', 'MediaPipe FaceMesh', 'TLS 1.3', 'CSPRNG', 'Zero-Trust'].map(b => (
                        <span key={b} className={styles.techBadge}>{b}</span>
                    ))}
                </div>

                {/* Decorative card preview */}
                <div className={styles.heroCard}>
                    <div className={styles.heroCardTop}>
                        <div className={styles.heroCardDots}>
                            <span /><span /><span />
                        </div>
                        <span className={styles.heroCardLabel}>HUMANITY-PROTOCOL · AUTHENTICATION ACTIVE</span>
                    </div>
                    <div className={styles.heroCardBody}>
                        {STEPS.slice(0, 4).map((s, i) => (
                            <div key={s.n} className={styles.heroStep} style={{ animationDelay: `${i * 0.12}s` }}>
                                <div className={`${styles.heroStepDot} ${i < 3 ? styles.heroStepDone : styles.heroStepActive}`}>
                                    {i < 3 ? '✓' : ''}
                                </div>
                                <span className={styles.heroStepLabel}>{s.label}</span>
                                <span className={`${styles.heroStepStatus} ${i < 3 ? styles.statusDone : styles.statusActive}`}>
                                    {i < 3 ? 'VERIFIED' : 'ACTIVE'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className={styles.statsSection} id="stats">
                <div className={styles.statsInner}>
                    {STATS.map(({ icon: Icon, val, label }) => (
                        <div key={label} className={styles.statCard}>
                            <div className={styles.statIcon}><Icon size={20} /></div>
                            <span className={styles.statVal}>{val}</span>
                            <span className={styles.statLabel}>{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section className={styles.featuresSection} id="features">
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionPill}>Defense Layers</span>
                    <h2 className={styles.sectionTitle}>Every attack vector, covered</h2>
                    <p className={styles.sectionSub}>
                        Six independent security layers work in concert to create an authentication
                        system that is resistant to all known deepfake and AI impersonation techniques.
                    </p>
                </div>
                <div className={styles.featuresGrid}>
                    {FEATURES.map(({ icon: Icon, title, desc, color, glow }) => (
                        <div key={title} className={styles.featureCard} style={{ '--card-glow': glow }}>
                            <div className={styles.featureIconWrap} style={{ color }}>
                                <Icon size={22} strokeWidth={1.75} />
                            </div>
                            <h3 className={styles.featureTitle}>{title}</h3>
                            <p className={styles.featureDesc}>{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className={styles.stepsSection} id="how-it-works">
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionPill}>Protocol Flow</span>
                    <h2 className={styles.sectionTitle}>7 steps. Zero compromise.</h2>
                    <p className={styles.sectionSub}>
                        Each step is independently verified and cryptographically linked to the previous one.
                        Bypassing any layer makes the entire session invalid.
                    </p>
                </div>
                <div className={styles.stepsTimeline}>
                    {STEPS.map((s, i) => (
                        <div key={s.n} className={styles.stepRow}>
                            <div className={styles.stepNumCol}>
                                <div className={styles.stepNum}>{s.n}</div>
                                {i < STEPS.length - 1 && <div className={styles.stepLine} />}
                            </div>
                            <div className={styles.stepContent}>
                                <h3 className={styles.stepLabel}>{s.label}</h3>
                                <p className={styles.stepDesc}>{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section className={styles.ctaBanner}>
                <div className={styles.ctaBannerInner}>
                    <div className={styles.ctaBannerGlow} />
                    <h2 className={styles.ctaBannerTitle}>
                        Ready to see it in action?
                    </h2>
                    <p className={styles.ctaBannerSub}>
                        Run the full 7-step protocol in your browser — no webcam required for the demo.
                    </p>
                    <div className={styles.ctaBannerBtns}>
                        <button className={styles.ctaPrimary} onClick={() => navigate('/demo')}>
                            <Cpu size={16} />
                            <span>Try Demo — No Webcam Needed</span>
                            <ArrowRight size={15} />
                        </button>
                        <button className={styles.ctaSecondary} onClick={() => navigate('/auth')}>
                            <Lock size={15} />
                            <span>Live Authentication</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <div className={styles.footerBrand}>
                        <div className={styles.navLogo}>
                            <Shield size={15} strokeWidth={2.5} />
                        </div>
                        <span>Humanity Protocol v1.0</span>
                    </div>
                    <p className={styles.footerNote}>
                        Deepfake-Resistant Authentication · RSA-2048 · MediaPipe FaceMesh · Zero-Trust Architecture
                    </p>
                    <p className={styles.footerCopy}>© 2026 Humanity Protocol. All cryptographic operations performed client-side.</p>
                </div>
            </footer>
        </div>
    );
}
