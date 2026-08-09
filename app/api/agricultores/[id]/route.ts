/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE PRESENTACIÓN — Route Handler /api/agricultores/[id]║
 * ║  Arquitectura de Tres Capas: Capa 1 (Presentación)          ║
 * ║                                                             ║
 * ║  Responsabilidad: verificar sesión + delegar al Controller. ║
 * ║  params es Promise<> en Next.js 16 — se debe await.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/controllers/AuthController';
import { AgricultorController } from '@/lib/controllers/AgricultorController';

type Params = Promise<{ id: string }>;

function esAdmin(session: any): boolean {
  return session?.user?.rol === 'ADMIN';
}

/** GET /api/agricultores/[id] — CU-03.2: Ver expediente */
export async function GET(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !esAdmin(session)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  const { id } = await params;
  return AgricultorController.obtener(id);
}

/** PUT /api/agricultores/[id] — CU-03.3: Editar expediente */
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !esAdmin(session)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  const { id } = await params;
  return AgricultorController.editar(id, req);
}

/** DELETE /api/agricultores/[id] — CU-03.4: Desactivar cuenta */
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !esAdmin(session)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  const { id } = await params;
  const adminId = (session.user as any).id;
  return AgricultorController.desactivar(id, adminId);
}

/** PATCH /api/agricultores/[id] — CU-03.4: Reactivar cuenta */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !esAdmin(session)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  
  if (action === 'reactivar') {
    return AgricultorController.reactivar(id);
  }
  
  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
