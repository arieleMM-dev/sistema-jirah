/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/perfil           ║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  Responsabilidad: recibir solicitudes HTTP y delegar        ║
 * ║  completamente al PerfilController (Capa 2).                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest } from 'next/server';
import { PerfilController } from '@/lib/controllers/PerfilController';

/** GET /api/perfil — CU-02: Obtener datos del perfil */
export async function GET(req: NextRequest) {
  return PerfilController.obtener(req);
}

/** PATCH /api/perfil — CU-02.1/2.3: Actualizar teléfono o tema */
export async function PATCH(req: NextRequest) {
  return PerfilController.actualizar(req);
}

/** POST /api/perfil — CU-02.2: Cambiar contraseña */
export async function POST(req: NextRequest) {
  return PerfilController.cambiarPassword(req);
}
