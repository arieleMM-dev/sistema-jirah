/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/auth/recuperar   ║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  Responsabilidad: recibir la solicitud HTTP y delegarla     ║
 * ║  al AuthController. Sin lógica de negocio aquí.             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest } from 'next/server';
import { AuthController } from '@/lib/controllers/AuthController';

export async function POST(req: NextRequest) {
  return AuthController.recuperar(req);
}
