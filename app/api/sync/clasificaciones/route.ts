import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/controllers/AuthController';
import { prisma } from '@/lib/prisma';
import { OfflinePayloadAdapter, OfflineClasificacionPayload } from '@/lib/adapters/OfflinePayloadAdapter';

const adapter = new OfflinePayloadAdapter();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload: { clasificaciones: OfflineClasificacionPayload[] } = await req.json();
    if (!payload.clasificaciones || !Array.isArray(payload.clasificaciones)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const savedIds: string[] = [];
    const errors: any[] = [];

    for (const cls of payload.clasificaciones) {
      try {
        // Necesitamos el pesoBrutoKg para el cálculo del margen.
        const pesajeBruto = await prisma.pesajeBruto.findUnique({
          where: { id: cls.pesaje_local_id }
        });

        if (!pesajeBruto) {
          throw new Error(`Pesaje Bruto con ID ${cls.pesaje_local_id} no encontrado`);
        }

        const prismaData = adapter.adaptClasificacion(cls, pesajeBruto.id, pesajeBruto.pesoNetoKg);

        await prisma.clasificacion.create({
          data: {
            ...prismaData,
            fechaRegistro: new Date(cls.timestamp),
            auditFlag: !prismaData.dentroDelMargen, // Si no está dentro del margen, requiere auditoría
            syncStatus: 'SYNCED',
          }
        });

        // Actualizar el estado del pesaje a SYNCED si estaba en pending
        await prisma.pesajeBruto.update({
          where: { id: pesajeBruto.id },
          data: { syncStatus: 'SYNCED' }
        });

        savedIds.push(cls.localId);
      } catch (err: any) {
        errors.push({ localId: cls.localId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, savedIds, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
