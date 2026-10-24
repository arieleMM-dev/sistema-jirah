import type { Viewport } from 'next';
import AuthShell from '../ui/auth/AuthShell';

export const viewport: Viewport = { themeColor: '#F7F9F2' };

export default function RecoveryLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
