/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE LÓGICA DE NEGOCIO — AgricultorController           ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio) — MVC         ║
 * ║                                                             ║
 * ║  Responsabilidad: orquesta las peticiones HTTP hacia los    ║
 * ║  servicios. Separa la lógica de enrutamiento (Route         ║
 * ║  Handlers) de la lógica de negocio (Services).             ║
 * ║                                                             ║
 * ║  Flujo: Route Handler → Controller → Service → Repository  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgricultorService } from '@/lib/services/agricultor.service';
import type { Rol } from '@prisma/client';

export const AgricultorController = {
  /**
   * GET /api/agricultores?q=...
   * CU-03.2 — Listar y buscar trabajadores.
   */
  async listar(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') ?? '';

    const agricultores = await AgricultorService.buscar(query);
    return NextResponse.json({ agricultores });
  },

  /**
   * POST /api/agricultores
   * CU-03.1 — Crear nueva ficha contractual.
   */
  async crear(req: NextRequest): Promise<NextResponse> {
    const body = await req.json();
    const { nombres, apellidos, cedula, email, rol, telefono } = body;

    const nom = nombres?.trim() || '';
    const ape = apellidos?.trim() || '';
    const ced = cedula?.trim() || '';
    const mail = email?.trim() || '';
    const tel = telefono?.trim() || '';

    if (!nom || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom) || nom.length < 2 || nom.length > 50) {
      return NextResponse.json({ error: 'Nombres inválidos' }, { status: 400 });
    }
    if (!ape || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(ape) || ape.length < 2 || ape.length > 50) {
      return NextResponse.json({ error: 'Apellidos inválidos' }, { status: 400 });
    }
    if (!ced) {
      return NextResponse.json({ error: 'Cédula obligatoria' }, { status: 400 });
    }
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 100) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }
    if (tel && !/^09\d{8}$/.test(tel)) {
      return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });
    }

    const rolPermitidos: Rol[] = ['AGRICULTOR', 'CLASIFICADOR', 'AGRICULTOR_CLASIFICADOR'];
    if (!rolPermitidos.includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    try {
      const { user, _dev_password } = await AgricultorService.crear({
        nombres: nom,
        apellidos: ape,
        cedula: ced,
        email: mail.toLowerCase(),
        telefono: tel || null,
        rol,
      });

      return NextResponse.json({ user, _dev_password }, { status: 201 });
    } catch (error: any) {
      const errorMap: Record<string, { status: number; error: string }> = {
        CEDULA_INVALIDA: { status: 422, error: 'La cédula ecuatoriana ingresada no es válida' },
        EMAIL_EN_USO:   { status: 409, error: 'El correo electrónico ya está registrado en el sistema' },
        CEDULA_EN_USO:  { status: 409, error: 'La cédula ya está registrada en el sistema' },
      };
      const mapped = errorMap[error.message];
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      return NextResponse.json({ error: 'Error interno al crear el registro' }, { status: 500 });
    }
  },

  /**
   * GET /api/agricultores/[id]
   * CU-03.2 — Ver expediente de un trabajador.
   */
  async obtener(id: string): Promise<NextResponse> {
    const agricultor = await AgricultorService.obtener(id);
    if (!agricultor) {
      return NextResponse.json({ error: 'Agricultor no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ agricultor });
  },

  /**
   * PUT /api/agricultores/[id]
   * CU-03.3 — Editar ficha contractual.
   */
  async editar(id: string, req: NextRequest): Promise<NextResponse> {
    const { nombres, apellidos, email, telefono } = await req.json();

    const nom = nombres?.trim() || '';
    const ape = apellidos?.trim() || '';
    const mail = email?.trim() || '';
    const tel = telefono?.trim() || '';

    if (!nom || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom) || nom.length < 2 || nom.length > 50) {
      return NextResponse.json({ error: 'Nombres inválidos' }, { status: 400 });
    }
    if (!ape || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(ape) || ape.length < 2 || ape.length > 50) {
      return NextResponse.json({ error: 'Apellidos inválidos' }, { status: 400 });
    }
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 100) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 });
    }
    if (tel && !/^09\d{8}$/.test(tel)) {
      return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });
    }

    try {
      const agricultor = await AgricultorService.editar(id, {
        nombres: nom,
        apellidos: ape,
        email: mail.toLowerCase(),
        telefono: tel || null,
      });
      return NextResponse.json({ message: 'Expediente actualizado', agricultor });
    } catch (error: any) {
      if (error.message === 'EMAIL_EN_USO') {
        return NextResponse.json(
          { error: 'El correo especificado ya pertenece a otra cuenta activa' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Error al actualizar el expediente' }, { status: 500 });
    }
  },

  /**
   * DELETE /api/agricultores/[id]
   * CU-03.4 — Desactivar cuenta (soft-delete).
   */
  async desactivar(id: string, adminId: string): Promise<NextResponse> {
    try {
      await AgricultorService.desactivar(id, adminId);
      return NextResponse.json({ message: 'Cuenta desactivada exitosamente' });
    } catch (error: any) {
      if (error.message === 'SELF_DEACTIVATION') {
        return NextResponse.json(
          { error: 'Operación denegada. No puede desactivar su propia cuenta activa' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Error al desactivar la cuenta' }, { status: 500 });
    }
  },

  /**
   * PATCH /api/agricultores/[id] (con body { action: 'reactivar' })
   * CU-03.4 — Reactivar cuenta.
   */
  async reactivar(id: string): Promise<NextResponse> {
    try {
      await AgricultorService.reactivar(id);
      return NextResponse.json({ message: 'Cuenta reactivada exitosamente' });
    } catch (error: any) {
      return NextResponse.json({ error: 'Error al reactivar la cuenta' }, { status: 500 });
    }
  },
};
