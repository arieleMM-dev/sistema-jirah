/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — AjusteService (CU-05.3)                  ║
 * ║  Arquitectura de Tres Capas: Capa 2 (Negocio)               ║
 * ║                                                             ║
 * ║  Reglas de negocio:                                         ║
 * ║  · pesoRechazado ≤ pesoExportacionKg (no puede exceder)    ║
 * ║  · Recalcula % Fruta Efectiva tras el rechazo              ║
 * ║  · Una clasificación solo puede tener un ajuste             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { AjusteRepo } from '@/lib/repositories/AjusteRepository';
import { prisma } from '@/lib/prisma';

export const AjusteService = {
  async listar() {
    return AjusteRepo.findAll();
  },

  async obtener(id: string) {
    const ajuste = await AjusteRepo.findById(id);
    if (!ajuste) throw new Error('AJUSTE_NO_ENCONTRADO');
    return ajuste;
  },

  /**
   * CU-05.3: Registrar ajuste de comprador.
   *
   * Reglas:
   *   1. La clasificación debe existir.
   *   2. No se puede registrar más de un ajuste por clasificación.
   *   3. El pesoRechazado no puede ser mayor al pesoExportacionKg.
   *   4. Recalcula ajusteKg = pesoExportacionKg - pesoRechazado
   *   5. Calcula % Fruta Efectiva = ajusteKg / pesoExportacionKg * 100
   */
  async registrar(input: {
    clasificacionId: string;
    compradorId: string;
    pesoRechazado: number;
    motivoRechazo?: string;
    observaciones?: string;
  }) {
    // 1. Validar que la clasificación existe
    const clasificacion = await prisma.clasificacion.findUnique({
      where: { id: input.clasificacionId },
      include: {
        pesajeBruto: {
          include: {
            campana: { select: { compradorId: true } },
          },
        },
        ajusteComprador: true,
      },
    });

    if (!clasificacion) throw new Error('CLASIFICACION_NO_ENCONTRADA');

    // 2. Validar que no exista ya un ajuste para esta clasificación
    if (clasificacion.ajusteComprador) throw new Error('AJUSTE_YA_REGISTRADO');

    // 3. Validar que el peso rechazado sea positivo
    if (input.pesoRechazado < 0) throw new Error('PESO_RECHAZADO_INVALIDO');

    // 4. E.1 — Validar que el rechazo no exceda la exportación
    if (input.pesoRechazado > clasificacion.pesoExportacionKg) {
      throw new Error('RECHAZO_EXCEDE_EXPORTACION');
    }

    // 5. Validar que el comprador exista
    const comprador = await prisma.comprador.findUnique({
      where: { id: input.compradorId },
    });
    if (!comprador) throw new Error('COMPRADOR_NO_ENCONTRADO');

    // 6. Calcular el peso final aceptado (fruta efectiva)
    const ajusteKg = parseFloat(
      (clasificacion.pesoExportacionKg - input.pesoRechazado).toFixed(3)
    );

    // 7. Crear el ajuste
    const ajuste = await AjusteRepo.create({
      pesoRechazado: input.pesoRechazado,
      motivoRechazo: input.motivoRechazo,
      ajusteKg,
      observaciones: input.observaciones,
      clasificacionId: input.clasificacionId,
      compradorId: input.compradorId,
    });

    // 8. Calcular métricas de retorno
    const pctFrutaEfectiva = clasificacion.pesoExportacionKg > 0
      ? parseFloat((ajusteKg / clasificacion.pesoExportacionKg * 100).toFixed(2))
      : 0;

    return {
      ajuste,
      metricas: {
        pesoExportacionOriginal: clasificacion.pesoExportacionKg,
        pesoRechazado: input.pesoRechazado,
        pesoEfectivo: ajusteKg,
        pctFrutaEfectiva,
      },
    };
  },
};
