import { Shield, Copy, RefreshCw, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useHP } from '../context/HPContext';
import styles from './SuccessPanel.module.css';

export function SuccessPanel() {
    const { state, reset } = useHP();
    const { authResult, bioResult, bioChallenge } = state;
    const [copied, setCopied] = useState(false);

    function copyToken() {
        navigator.clipboard.writeText(authResult?.access_token || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const summaryItems = [
        { label: 'User', val: authResult?.user_id || '—' },
        { label: 'Crypto Layer', val: 'RSA-2048 PSS' },
        { label: 'Challenge', val: bioChallenge?.type || '—' },
        { label: 'Liveness', val: bioResult ? `${(bioResult.liveness * 100).toFixed(1)}%` : '—' },
        { label: 'Risk Score', val: bioResult ? `${(bioResult.deepfake_risk * 100).toFixed(1)}%` : '—' },
        { label: 'Token TTL', val: '60 minutes', },
    ];

    return (
        <div className={styles.panel}>
            {/* Orb */}
            <div className={styles.orbWrap}>
                <div className={`${styles.ring} ${styles.ring1}`} />
                <div className={`${styles.ring} ${styles.ring2}`} />
                <div className={`${styles.ring} ${styles.ring3}`} />
                <div className={styles.orb}><CheckCircle size={28} strokeWidth={2} /></div>
            </div>

            <h2 className={styles.title}>Humanity Verified</h2>
            <p className={styles.subtitle}>
                Authentication complete. Both cryptographic and biometric layers passed.
            </p>

            {/* Summary grid */}
            <div className={styles.summaryGrid}>
                {summaryItems.map(({ label, val }) => (
                    <div key={label} className={styles.summaryCard}>
                        <span className={styles.summaryLabel}>{label}</span>
                        <span className={styles.summaryVal}>{val}</span>
                    </div>
                ))}
            </div>

            {/* Token block */}
            <div className={styles.tokenBlock}>
                <div className={styles.tokenHeader}>
                    <span className={styles.tokenTitle}>
                        <Shield size={13} /> Secure Access Token
                    </span>
                    <button className={styles.copyBtn} onClick={copyToken}>
                        {copied
                            ? <><CheckCircle size={12} /> Copied</>
                            : <><Copy size={12} /> Copy</>}
                    </button>
                </div>
                <div className={styles.tokenValue}>{authResult?.access_token || '—'}</div>
                <div className={styles.tokenMeta}>
                    <span className={styles.tokenHash}>
                        SHA-256: {authResult?.token_hash?.slice(0, 36) || '—'}…
                    </span>
                    <span>Issued: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            <button className={styles.resetBtn} onClick={reset}>
                <RefreshCw size={14} /> Start New Session
            </button>
        </div>
    );
}
