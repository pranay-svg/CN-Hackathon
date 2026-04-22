/* ProtocolLog.jsx */
import { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { useHP } from '../context/HPContext';
import styles from './ProtocolLog.module.css';

const TYPE_STYLES = {
    info: styles.entryInfo,
    success: styles.entrySuccess,
    warn: styles.entryWarn,
    error: styles.entryError,
    crypto: styles.entryCrypto,
};

const TYPE_PREFIX = {
    info: '  ',
    success: '✓ ',
    warn: '⚠ ',
    error: '✗ ',
    crypto: '🔐 ',
};

export function ProtocolLog() {
    const { state, clearLogs } = useHP();
    const bodyRef = useRef(null);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [state.logs]);

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.titleWrap}>
                    <div className={styles.liveDot} />
                    <Terminal size={13} />
                    <span className={styles.title}>Protocol Log</span>
                    <span className={styles.count}>{state.logs.length}</span>
                </div>
                <button className={styles.clearBtn} onClick={clearLogs} title="Clear log">
                    <Trash2 size={12} />
                </button>
            </div>

            <div className={styles.body} ref={bodyRef}>
                {state.logs.length === 0 && (
                    <div className={styles.empty}>No events yet</div>
                )}
                {state.logs.map(entry => (
                    <div
                        key={entry.id}
                        className={`${styles.entry} ${TYPE_STYLES[entry.type] || styles.entryInfo}`}
                    >
                        <span className={styles.ts}>{entry.ts}</span>
                        <span className={styles.msg}>{TYPE_PREFIX[entry.type]}{entry.msg}</span>
                    </div>
                ))}
            </div>

            {/* Footer stats */}
            <div className={styles.footer}>
                <span>Server: localhost:5000</span>
                <span>HP v1.0</span>
            </div>
        </aside>
    );
}
