import Image from 'next/image';
import AuthScene from './AuthScene';
import ThemeButton from './ThemeButton';
import styles from './auth.module.css';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.root}>
      <a className={styles.skipLink} href="#acceso">Ir al formulario</a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image src="/Logo.jpeg" width={76} height={77} alt="Logotipo de Finca JIRAH" className={styles.logo} />
          <div><span className={styles.brandName} translate="no">Finca JIRAH</span><span className={styles.brandDescription}>Gestión de cosechas</span></div>
        </div>
        <ThemeButton />
      </header>
      <div className={styles.layout}>
        <AuthScene prototype3D={process.env.JIRAH_AUTH_3D_PROTOTYPE === 'true'} />
        <section className={styles.formPanel} id="acceso" tabIndex={-1} aria-label="Acceso a la finca">
          <div className={styles.formContent}>{children}</div>
          <p className={styles.accessNote}>Acceso exclusivo para el equipo de la finca.</p>
        </section>
      </div>
    </main>
  );
}
