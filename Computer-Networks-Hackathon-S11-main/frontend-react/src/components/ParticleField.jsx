/* ParticleField.jsx */
import { useEffect, useRef } from 'react';
import styles from './ParticleField.module.css';

const PARTICLES = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1.5,
    dur: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    color: ['#6c63ff', '#00d4ff', '#10b981', '#a78bfa', '#f59e0b'][i % 5],
    opacity: 0.15 + Math.random() * 0.3,
}));

export function ParticleField() {
    return (
        <div className={styles.field} aria-hidden="true">
            {PARTICLES.map(p => (
                <div
                    key={p.id}
                    className={styles.particle}
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: p.color,
                        opacity: p.opacity,
                        '--dur': `${p.dur}s`,
                        '--delay': `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}
