import { useHP } from '../context/HPContext';
import { LoginPanel } from './LoginPanel';
import { BiometricPanel } from './BiometricPanel';
import { SuccessPanel } from './SuccessPanel';
import { ProtocolLog } from './ProtocolLog';
import styles from './MainLayout.module.css';

export function MainLayout() {
    const { state } = useHP();

    return (
        <div className={styles.layout}>
            <div className={styles.main}>
                {state.phase === 'login' && <LoginPanel />}
                {state.phase === 'bio' && <BiometricPanel />}
                {state.phase === 'success' && <SuccessPanel />}
            </div>
            <ProtocolLog />
        </div>
    );
}
