/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — PesajeService (CU-05.1)                  ║
 * ║                                                             ║
 * ║  Fórmula core: Peso Neto = Peso Bruto - (Gavetas × Tara)    ║
 * ║  Validaciones: campaña activa, lote activo, valores > 0     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { PesajeRepo } from '@/lib/repositories/PesajeRepository';
import { CampanaRepo, LoteRepo } from '@/lib/repositories/CatalogoRepository';

export const PesajeService = {
  async listar(filtros: { campanaId?: string; loteId?: string } = {}) {
    return PesajeRepo.findAll(filtros);
  },

  async listarPendientesClasificacion() {
    return PesajeRepo.findPendientesClasificacion();
  },

  async obtener(id: string) {
    const p = await PesajeRepo.findById(id);
    if (!p) throw new Error('PESAJE_NO_ENCONTRADO');
    return p;
  },

  /**
   * CU-05.1: Registrar pesaje bruto de cosecha.
   * Fórmula: pesoNeto = pesoBruto - (numGavetas * taraBase)
   */
  async registrar(input: {
    pesoBrutoKg: number;
    numGavetas: number;
    campanaId: string;
    loteId: string;
    agricultorId: string;
    observaciones?: string;
  }) {
    // Validaciones de entrada
    if (input.pesoBrutoKg <= 0)   throw new Error('PESO_BRUTO_INVALIDO');
    if (input.numGavetas <= 0 || !Number.isInteger(input.numGavetas)) {
      throw new Error('GAVETAS_INVALIDAS');
    }

    // Verificar campaña activa
    const campana = await CampanaRepo.findById(input.campanaId);
    if (!campana)           throw new Error('CAMPANA_NO_ENCONTRADA');
    if (!campana.isActive)  throw new Error('CAMPANA_CERRADA');

    // Verificar lote activo
    const lote = await LoteRepo.findById(input.loteId);
    if (!lote)          throw new Error('LOTE_NO_ENCONTRADO');
    if (!lote.isActive) throw new Error('LOTE_INACTIVO');

    // Cálculo de tara y peso neto
    const taraTotal  = parseFloat((input.numGavetas * campana.taraBase).toFixed(3));
    const pesoNetoKg = parseFloat((input.pesoBrutoKg - taraTotal).toFixed(3));

    if (pesoNetoKg < 0) throw new Error('PESO_NETO_NEGATIVO');

    return PesajeRepo.create({
      pesoBrutoKg: input.pesoBrutoKg,
      numGavetas:  input.numGavetas,
      taraTotal,
      pesoNetoKg,
      observaciones: input.observaciones,
      agricultorId:  input.agricultorId,
      campanaId:     input.campanaId,
      loteId:        input.loteId,
    });
  },
};

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CAPA DE NEGOCIO — ClasificacionService (CU-05.2)           ║
 * ║                                                             ║
 * ║  Regla core: margenError ≤ ±4% → dentroDelMargen = true     ║
 * ║  Si supera: auditFlag = true (bandera para administrador)   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import { ClasificacionRepo } from '@/lib/repositories/PesajeRepository';

export const ClasificacionService = {
  async listarPendientes() {
    return PesajeRepo.findPendientesClasificacion();
  },

  /**
   * CU-05.2: Registrar clasificación poscosecha.
   * Cálculo:
   *   - pesoNetoExportacion = pesoExportacionBruto - (gavetasExportacion * taraBase)
   *   - pesoNetoNacional    = pesoNacionalBruto    - (gavetasNacional    * taraBase)
   *   - totalClasificado    = netoExportacion + netoNacional + pesoDescarte
   *   - margenError         = |totalClasificado - pesoNetoBase| / pesoNetoBase * 100
   */
  async registrar(input: {
    pesajeBrutoId: string;
    clasificadorId: string;
    gavetasExportacion: number;
    pesoExportacionBruto: number;
    gavetasNacional: number;
    pesoNacionalBruto: number;
    pesoDescarte: number;
    observaciones?: string;
    forzar?: boolean; // true = confirmar aunque supere ±4%
  }) {
    const pesaje = await PesajeRepo.findById(input.pesajeBrutoId);
    if (!pesaje)               throw new Error('PESAJE_NO_ENCONTRADO');
    if (pesaje.clasificacion)  throw new Error('YA_CLASIFICADO');

    const taraBase = pesaje.campana.taraBase;

    // Calcular neto por categoría
    const pesoExportacionKg = parseFloat(
      (input.pesoExportacionBruto - input.gavetasExportacion * taraBase).toFixed(3)
    );
    const pesoNacionalKg = parseFloat(
      (input.pesoNacionalBruto - input.gavetasNacional * taraBase).toFixed(3)
    );

    if (pesoExportacionKg < 0) throw new Error('NETO_EXPORTACION_NEGATIVO');
    if (pesoNacionalKg    < 0) throw new Error('NETO_NACIONAL_NEGATIVO');

    const totalClasificado = parseFloat(
      (pesoExportacionKg + pesoNacionalKg + input.pesoDescarte).toFixed(3)
    );

    const pesoNetoBase  = pesaje.pesoNetoKg;
    const margenErrorPct = pesoNetoBase > 0
      ? parseFloat((Math.abs(totalClasificado - pesoNetoBase) / pesoNetoBase * 100).toFixed(2))
      : 0;

    const dentroDelMargen = margenErrorPct <= 4.0;
    const auditFlag       = !dentroDelMargen;

    // Si no está dentro del margen, requiere confirmación forzada
    if (!dentroDelMargen && !input.forzar) {
      throw new Error(`DESCUADRE:${margenErrorPct}`);
    }

    return ClasificacionRepo.create({
      gavetasExportacion: input.gavetasExportacion,
      pesoExportacionBruto: input.pesoExportacionBruto,
      pesoExportacionKg,
      gavetasNacional: input.gavetasNacional,
      pesoNacionalBruto: input.pesoNacionalBruto,
      pesoNacionalKg,
      pesoDescarte: input.pesoDescarte,
      totalClasificado,
      margenErrorPct,
      dentroDelMargen,
      auditFlag,
      observaciones: input.observaciones,
      pesajeBrutoId: input.pesajeBrutoId,
      clasificadorId: input.clasificadorId,
    });
  },
};
