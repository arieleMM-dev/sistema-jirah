'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './auth.module.css';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  describedBy?: string;
  invalid?: boolean;
};

export default function PasswordField({ id, label, value, onChange, autoComplete, describedBy, invalid }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} required maxLength={1024} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={styles.input} />
        <button type="button" className={styles.revealButton} onClick={() => setVisible(current => !current)} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-controls={id} aria-pressed={visible}>
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
