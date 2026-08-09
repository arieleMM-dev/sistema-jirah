import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/controllers/AuthController';
import { prisma } from '@/lib/prisma';
import { OfflinePayloadAdapter, OfflinePesajePayload } from '@/lib/adapters/OfflinePayloadAdapter';

const adapter = new OfflinePayloadAdapter();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload: { pesajes: OfflinePesajePayload[] } = await req.json();
    if (!payload.pesajes || !Array.isArray(payload.pesajes)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const savedIds: string[] = [];
    const errors: any[] = [];

    // Procesar en lote
    for (const pesaje of payload.pesajes) {
      try {
        const prismaData = adapter.adaptPesaje(pesaje, {
          campanaId: pesaje.campana_codigo, // Frontend manda el ID en este campo
          loteId: pesaje.lote_codigo,       // Frontend manda el ID en este campo
        });

        await prisma.pesajeBruto.create({
          data: {
            ...prismaData,
            fechaRegistro: new Date(pesaje.timestamp),
          }
        });
        savedIds.push(pesaje.localId);
      } catch (err: any) {
        errors.push({ localId: pesaje.localId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, savedIds, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
