import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { SyncInputError, SyncService } from '@/lib/services/sync.service';
import { mensajeCosecha } from '@/lib/cosecha';

const DOMAIN_ERRORS: Record<string, string> = {
  CAMPANA_NO_ENCONTRADA: 'Campaña no encontrada.', CAMPANA_CERRADA: 'La campaña está cerrada. El registro sigue pendiente de revisión.',
  LOTE_NO_ENCONTRADO: 'Lote no encontrado.', LOTE_INACTIVO: 'El lote está inactivo. El registro sigue pendiente de revisión.',
  TARA_JORNADA_CAMBIO: 'La tara no coincide con la jornada. Revise el registro antes de volver a enviarlo.',
  PESAJE_NO_ENCONTRADO: 'El pesaje de origen todavía no está disponible.', YA_CLASIFICADO: 'El pesaje ya tiene otra clasificación.',
  PESO_BRUTO_INVALIDO: 'Peso bruto inválido.', GAVETAS_INVALIDAS: 'Gavetas inválidas.', PESO_NETO_NEGATIVO: 'El peso bruto es menor que la tara.',
  GAVETAS_CLASIFICACION_INVALIDAS: 'Las gavetas deben ser enteros mayores o iguales a cero.',
  PESOS_CLASIFICACION_INVALIDOS: 'Los pesos deben ser números finitos mayores o iguales a cero.',
  NETO_EXPORTACION_NEGATIVO: 'El bruto de exportación es menor que su tara.', NETO_NACIONAL_NEGATIVO: 'El bruto nacional es menor que su tara.',
};

export const SyncController = {
  async sync(req: NextRequest, kind: 'pesajes' | 'clasificaciones') {
    try {
      const session = await getAuthenticatedSession();
      if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      const body: unknown = await req.json();
      const entries: unknown = body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)[kind] : null;
      if (!Array.isArray(entries)) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
      if (entries.length > 100) return NextResponse.json({ error: 'Envíe como máximo 100 operaciones por solicitud.' }, { status: 422 });
      const savedIds: string[] = [];
      const errors: { localId?: string; error: string; retryable?: boolean }[] = [];
      for (const entry of entries as unknown[]) {
        try {
          savedIds.push(await (kind === 'pesajes' ? SyncService.registrarPesaje(entry, session.user.id)
            : SyncService.registrarClasificacion(entry, session.user.id)));
        } catch (error: unknown) {
          const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : null;
          const localId = typeof record?.localId === 'string' ? record.localId : undefined;
          const code = error instanceof Error ? error.message : '';
          const detail = error instanceof SyncInputError ? error.message
            : code.startsWith('DESCUADRE:') ? 'El cuadre requiere revisión y confirmación.'
            : DOMAIN_ERRORS[code] ?? mensajeCosecha(error);
          const known = error instanceof SyncInputError || Boolean(DOMAIN_ERRORS[code]) ||
            !mensajeCosecha(error).startsWith('No se pudo') || code.startsWith('DESCUADRE:');
          errors.push({ localId, error: detail, retryable: !known });
        }
      }
      return NextResponse.json({ success: errors.length === 0, savedIds, errors });
    } catch (error: unknown) {
      return NextResponse.json({ error: 'No se pudo procesar la sincronización' }, { status: error instanceof SyntaxError ? 400 : 500 });
    }
  },
};
