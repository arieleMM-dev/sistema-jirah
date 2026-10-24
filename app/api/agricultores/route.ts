/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/agricultores     ║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  Responsabilidad: autenticación de sesión + delegación al  ║
 * ║  AgricultorController. Sin lógica de negocio aquí.          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import type { Session } from 'next-auth';
import { AgricultorController } from '@/lib/controllers/AgricultorController';

function esAdmin(session: Session | null): boolean {
  return session?.user?.rol === 'ADMIN';
}

/**
 * GET /api/agricultores?q=<query>
 * CU-03.2 — Buscar y listar trabajadores.
 */
export async function GET(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session || !esAdmin(session)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  return AgricultorController.listar(req);
}

/**
 * POST /api/agricultores
 * CU-03.1 — Crear nueva ficha contractual.
 */
export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session || !esAdmin(session)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  return AgricultorController.crear(req);
}
