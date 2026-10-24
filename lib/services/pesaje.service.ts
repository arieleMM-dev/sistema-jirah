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
import { fechaFinca, jornadaId } from '@/lib/cosecha';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { paginaValida } from '@/lib/paginacion';

export const PesajeService = {
  async listar(filtros: { campanaId?: string; loteId?: string } = {}, pagina = 1, limite = 25) {
    if (!Number.isSafeInteger(limite) || limite < 1 || limite > 100) throw new Error('PAGINACION_INVALIDA');
    return PesajeRepo.findAll(filtros, paginaValida(pagina), limite);
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
    id?: string;
    fechaRegistro?: Date;
    pesoBrutoKg: number;
    numGavetas: number;
    campanaId: string;
    loteId: string;
    agricultorId: string;
    observaciones?: string;
    parametros?: { taraBase: number; minimoPGr: number; minimoGGr: number };
    capturaDiferida?: boolean;
  }) {
    // Validaciones de entrada
    if (!Number.isFinite(input.pesoBrutoKg) || input.pesoBrutoKg <= 0) throw new Error('PESO_BRUTO_INVALIDO');
    if (input.numGavetas <= 0 || !Number.isSafeInteger(input.numGavetas)) {
      throw new Error('GAVETAS_INVALIDAS');
    }
    if (typeof input.campanaId !== 'string' || !input.campanaId.trim() ||
        typeof input.loteId !== 'string' || !input.loteId.trim() ||
        typeof input.agricultorId !== 'string' || !input.agricultorId.trim() ||
        (input.observaciones !== undefined && (typeof input.observaciones !== 'string' || input.observaciones.length > 2000))) {
      throw new Error('DATOS_INVALIDOS');
    }

    // Verificar campaña activa
    const campana = await CampanaRepo.findById(input.campanaId);
    if (!campana)           throw new Error('CAMPANA_NO_ENCONTRADA');
    const fechaCaptura = input.fechaRegistro;
    const anteriorAlCierre = input.capturaDiferida && fechaCaptura instanceof Date && Number.isFinite(fechaCaptura.getTime()) &&
      campana.cerradaAt && fechaCaptura <= campana.cerradaAt;
    if (!campana.isActive && !anteriorAlCierre) throw new Error('CAMPANA_CERRADA');

    // Verificar lote activo
    const lote = await LoteRepo.findById(input.loteId);
    if (!lote)          throw new Error('LOTE_NO_ENCONTRADO');
    const anteriorAInactivacion = input.capturaDiferida && fechaCaptura instanceof Date && Number.isFinite(fechaCaptura.getTime()) &&
      lote.inactivadoAt && fechaCaptura <= lote.inactivadoAt;
    if (!lote.isActive && !anteriorAInactivacion) throw new Error('LOTE_INACTIVO');

    // Cálculo de tara y peso neto
    const fechaRegistro = input.fechaRegistro ?? new Date();
    if (!(fechaRegistro instanceof Date) || !Number.isFinite(fechaRegistro.getTime()) || fechaRegistro.getTime() > Date.now() + 300_000) throw new Error('FECHA_INVALIDA');
    const fecha = fechaFinca(fechaRegistro);
    const parametros = input.parametros ?? campana;
    const taraTotal  = parseFloat((input.numGavetas * parametros.taraBase).toFixed(3));
    const pesoNetoKg = parseFloat((input.pesoBrutoKg - taraTotal).toFixed(3));

    if (!Number.isFinite(taraTotal) || !Number.isFinite(pesoNetoKg)) throw new Error('PESO_BRUTO_INVALIDO');
    if (pesoNetoKg < 0) throw new Error('PESO_NETO_NEGATIVO');

    return PesajeRepo.create({
      id: input.id,
      fechaRegistro,
      jornada: { id: jornadaId(input.campanaId, input.loteId, fecha), fecha,
        taraBase: parametros.taraBase, minimoPGr: parametros.minimoPGr, minimoGGr: parametros.minimoGGr },
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
    id?: string;
    fechaRegistro?: Date;
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
    if (typeof input.pesajeBrutoId !== 'string' || !input.pesajeBrutoId.trim() ||
        typeof input.clasificadorId !== 'string' || !input.clasificadorId.trim() ||
        (input.forzar !== undefined && typeof input.forzar !== 'boolean') ||
        (input.observaciones !== undefined && typeof input.observaciones !== 'string')) {
      throw new Error('DATOS_INVALIDOS');
    }
    if (![input.gavetasExportacion, input.gavetasNacional].every(n => Number.isSafeInteger(n) && n >= 0)) {
      throw new Error('GAVETAS_CLASIFICACION_INVALIDAS');
    }
    if (![input.pesoExportacionBruto, input.pesoNacionalBruto, input.pesoDescarte]
      .every(n => Number.isFinite(n) && n >= 0)) throw new Error('PESOS_CLASIFICACION_INVALIDOS');

    const pesaje = await PesajeRepo.findById(input.pesajeBrutoId);
    if (!pesaje)               throw new Error('PESAJE_NO_ENCONTRADO');
    if (pesaje.jornadaId) throw new Error('PESAJE_AGRUPADO');
    if (pesaje.clasificacion)  throw new Error('YA_CLASIFICADO');
    if (input.forzar) {
      const actor = await UserRepository.findSessionUser(input.clasificadorId);
      if (!actor?.isActive || actor.rol !== 'ADMIN') throw new Error('APROBACION_NO_AUTORIZADA');
    }

    // Conservar la tara aplicada al pesaje, incluso si cambia el catálogo.
    const taraBase = pesaje.taraTotal / pesaje.numGavetas;

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

    if (!Number.isFinite(totalClasificado)) throw new Error('PESOS_CLASIFICACION_INVALIDOS');

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
      id: input.id,
      fechaRegistro: input.fechaRegistro,
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
