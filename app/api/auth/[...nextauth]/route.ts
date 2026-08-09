/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/auth/[...nextauth]║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  Responsabilidad: entry point HTTP para NextAuth.           ║
 * ║  Delega TODA la lógica a AuthController (Capa 2).           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/controllers/AuthController';

// No exportar authOptions desde aquí para no romper el build de Next.js

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
