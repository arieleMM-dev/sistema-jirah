import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { connection } from 'next/server';
import './globals.css';

const manrope = localFont({ src: './fonts/Manrope-Variable.ttf', variable: '--font-jirah', weight: '200 800', display: 'swap' });

export const metadata: Metadata = {
  title: 'Jirah — Sistema de Gestión Agrícola',
  description: 'Control, gestión y trazabilidad de cosechas de pitahaya. Finca Jirah, Ecuador.',
  manifest: '/manifest.json',
  icons: { apple: '/apple-touch-icon.png', icon: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Jirah',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La política CSP utiliza un nonce distinto para cada documento.
  await connection();
  return (
    <html lang="es" className={`antialiased ${manrope.variable}`}>
      <body className="font-sans bg-agri-bg-light dark:bg-[#09090b] text-agri-slate dark:text-gray-300 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
