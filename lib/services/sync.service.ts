import { Prisma } from '@prisma/client';
import { PesajeRepo, ClasificacionRepo } from '@/lib/repositories/PesajeRepository';
import { CampanaRepo } from '@/lib/repositories/CatalogoRepository';
import { PesajeService, ClasificacionService } from './pesaje.service';
import { JornadaService } from './jornada.service';
import { huellaPesaje } from '@/lib/huella-pesaje';

export class SyncInputError extends Error {}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SyncInputError('Registro inválido.');
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || !value.trim()) throw new SyncInputError(`Falta el campo ${field}.`);
  return value;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new SyncInputError(`Revise el campo ${field}; debe ser numérico.`);
  return value;
}

function readIdentity(record: Record<string, unknown>, actorField: string, actorId: string) {
  if (record[actorField] !== actorId) throw new SyncInputError('El registro pertenece a otra cuenta.');
  const id = readString(record, 'localId');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new SyncInputError('Identificador local inválido.');
  const fechaRegistro = new Date(readString(record, 'timestamp'));
  if (!Number.isFinite(fechaRegistro.getTime())) throw new SyncInputError('Fecha del registro inválida.');
  const observaciones = record.observaciones;
  if (observaciones != null && typeof observaciones !== 'string') throw new SyncInputError('Observaciones inválidas.');
  return { id, fechaRegistro, observaciones: observaciones ?? undefined };
}

function sameOperation(stored: object, expected: object) {
  const values = stored as Record<string, unknown>;
  return Object.entries(expected).every(([field, value]) => {
    const actual = values[field];
    return value instanceof Date ? actual instanceof Date && actual.getTime() === value.getTime()
      : (actual ?? null) === (value ?? null);
  });
}

async function saveOnce(expected: { id: string; [field: string]: unknown }, find: (id: string) => Promise<object | null>, create: () => Promise<object>, huellaCaptura?: string): Promise<void> {
  const confirm = (stored: object) => {
    if (huellaCaptura && 'huellaCaptura' in stored && stored.huellaCaptura === huellaCaptura) return;
    if (!sameOperation(stored, expected)) throw new SyncInputError('El identificador ya corresponde a otro contenido. Revise el registro pendiente.');
  };
  const existing = await find(expected.id);
  if (existing) return confirm(existing);
  try { await create(); }
  catch (error: unknown) {
    // La PK también resuelve intentos simultáneos de varias pestañas.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const stored = await find(expected.id);
      if (stored) return confirm(stored);
    }
    throw error;
  }
}

export const SyncService = {
  async registrarPesaje(payload: unknown, actorId: string) {
    const record = readRecord(payload);
    const identity = readIdentity(record, 'agricultor_id', actorId);
    if (record.tara_base === undefined) throw new SyncInputError('Registro anterior sin tara guardada. Revise sus pesos antes de volver a registrarlo.');
    const taraBase = readNumber(record, 'tara_base');
    if (taraBase <= 0 || taraBase > 10) throw new SyncInputError('Tara inválida.');
    const input = {
      ...identity, agricultorId: actorId,
      campanaId: readString(record, 'campana_codigo'), loteId: readString(record, 'lote_codigo'),
      pesoBrutoKg: readNumber(record, 'peso_bruto'), numGavetas: readNumber(record, 'num_gavetas'),
    };
    const original = { ...input, taraTotal: +(input.numGavetas * taraBase).toFixed(3) };
    await saveOnce(original, PesajeRepo.findById, async () => {
      const campana = await CampanaRepo.findById(input.campanaId);
      if (!campana) throw new Error('CAMPANA_NO_ENCONTRADA');
      let parametros = { taraBase: campana.taraBase, minimoPGr: campana.minimoPGr, minimoGGr: campana.minimoGGr };
      if (record.version_parametros !== undefined) {
        if (!Number.isSafeInteger(record.version_parametros) || (record.version_parametros as number) < 1) throw new SyncInputError('Versión de parámetros inválida.');
        const historicos = await CampanaRepo.findParametros(campana.id, record.version_parametros as number);
        const aplicados = historicos ?? (record.version_parametros === campana.versionParametros ? campana : null);
        if (!aplicados || aplicados.taraBase !== taraBase || aplicados.minimoPGr !== record.minimo_p_gr || aplicados.minimoGGr !== record.minimo_g_gr) throw new SyncInputError('Los parámetros capturados no corresponden a una versión conocida. Revise el pendiente.');
        parametros = aplicados;
      } else if (campana.taraBase !== taraBase) throw new SyncInputError('La tara de campaña cambió. Revise el registro pendiente para conservar su cálculo original.');
      return PesajeService.registrar({ ...input, parametros, capturaDiferida: true });
    }, huellaPesaje(original));
    return identity.id;
  },

  async registrarClasificacion(payload: unknown, actorId: string) {
    const record = readRecord(payload);
    const identity = readIdentity(record, 'clasificador_id', actorId);
    if (record.versionFormato === 2) {
      await JornadaService.clasificar({ ...record, id: identity.id }, actorId);
      return identity.id;
    }
    if (record.gavetas_exportacion === undefined || record.gavetas_nacional === undefined ||
        record.peso_exportacion_bruto === undefined || record.peso_nacional_bruto === undefined) {
      throw new SyncInputError('Clasificación anterior sin detalle de gavetas y brutos. Revísela antes de volver a registrarla.');
    }
    if (record.forzar !== undefined && typeof record.forzar !== 'boolean') throw new SyncInputError('Confirmación de descuadre inválida.');
    const input = {
      ...identity, clasificadorId: actorId, pesajeBrutoId: readString(record, 'pesaje_local_id'),
      gavetasExportacion: readNumber(record, 'gavetas_exportacion'), pesoExportacionBruto: readNumber(record, 'peso_exportacion_bruto'),
      gavetasNacional: readNumber(record, 'gavetas_nacional'), pesoNacionalBruto: readNumber(record, 'peso_nacional_bruto'),
      pesoDescarte: readNumber(record, 'descarte_kg'),
    };
    await saveOnce(input, ClasificacionRepo.findById, () => ClasificacionService.registrar({ ...input, forzar: record.forzar === true }));
    return identity.id;
  },
};
