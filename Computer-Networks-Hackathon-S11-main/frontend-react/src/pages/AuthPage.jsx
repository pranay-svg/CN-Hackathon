/**
 * AuthPage.jsx — The full live authentication page.
 * Wraps LoginPanel / BiometricPanel / SuccessPanel with a top nav
 * and a "back to home" link.
 */
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { HPProvider } from '../context/HPContext';
import { MainLayout } from '../components/MainLayout';
import styles from './AuthPage.module.css';

export function AuthPage() {
    const navigate = useNavigate();

    return (
        <HPProvider>
            <div className={styles.page}>
                {/* Mini nav */}
                <header className={styles.header}>
                    <button className={styles.backBtn} onClick={() => navigate('/')}>
                        <ArrowLeft size={15} />
                        <span>Home</span>
                    </button>
                    <div className={styles.brand}>
                        <div className={styles.brandLogo}>
                            <Shield size={16} strokeWidth={2.5} />
                        </div>
                        <span className={styles.brandName}>Humanity Protocol</span>
                        <span className={styles.brandTag}>SECURE AUTH</span>
                    </div>
                    <div className={styles.placeholder} />
                </header>

                {/* Full auth flow */}
                <div className={styles.content}>
                    <MainLayout />
                </div>
            </div>
        </HPProvider>
    );
}
