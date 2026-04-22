/* ProtocolStepRow.jsx */
import { Check, X, Loader } from 'lucide-react';
import styles from './ProtocolStepRow.module.css';

const STATUS_ICONS = {
    active: <Loader size={13} className={styles.iconSpin} />,
    done: <Check size={13} strokeWidth={3} />,
    failed: <X size={13} strokeWidth={3} />,
};

export function ProtocolStepRow({ number, label, desc, status }) {
    return (
        <div className={`${styles.row} ${status ? styles[`row--${status}`] : ''}`}>
            <div className={styles.num}>{number}</div>
            <div className={styles.info}>
                <span className={styles.label}>{label}</span>
                <span className={styles.desc}>{desc}</span>
            </div>
            <div className={`${styles.icon} ${status ? styles[`icon--${status}`] : ''}`}>
                {STATUS_ICONS[status] || <span className={styles.dot} />}
            </div>
        </div>
    );
}
