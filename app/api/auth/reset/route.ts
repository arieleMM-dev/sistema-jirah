/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/auth/reset       ║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  CU-01.2: Consumir token y restablecer contraseña.          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest } from 'next/server';
import { AuthController } from '@/lib/controllers/AuthController';

export async function POST(req: NextRequest) {
  return AuthController.resetPassword(req);
}
