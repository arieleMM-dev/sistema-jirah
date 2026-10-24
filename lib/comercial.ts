import { kg, CATEGORIAS } from '@/lib/cosecha';
import { validarFiltros } from '@/lib/filtros-cosecha';

export function registro(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('DATOS_INVALIDOS');
  return raw as Record<string, unknown>;
}
export function identificador(value: unknown) {
  if (typeof value !== 'string' || !value || value.length > 200) throw new Error('DATOS_INVALIDOS');
  return value;
}
export function uuid(value: unknown) {
  const id = identificador(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('DATOS_INVALIDOS');
  return id;
}
export function fechaComercial(value: unknown) {
  const fecha = identificador(value);
  validarFiltros({ fechaDesde: fecha });
  return fecha;
}
export function motivoRevision(value: unknown) {
  if (typeof value !== 'string' || value.trim().length < 5 || value.trim().length > 1000) throw new Error('MOTIVO_REQUERIDO');
  return value.trim();
}
export function taraComercial(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 10) throw new Error('TARA_INVALIDA');
  return value;
}
export function pesoComercial(numGavetas: unknown, pesoBrutoKg: unknown, tara: number) {
  if (typeof numGavetas !== 'number' || !Number.isSafeInteger(numGavetas) || numGavetas <= 0 ||
    typeof pesoBrutoKg !== 'number' || !Number.isFinite(pesoBrutoKg) || pesoBrutoKg <= 0) throw new Error('PESOS_INVALIDOS');
  const pesoNetoKg = kg(pesoBrutoKg - numGavetas * tara);
  if (!Number.isFinite(pesoNetoKg) || pesoNetoKg <= 0) throw new Error('PESOS_INVALIDOS');
  return { numGavetas, pesoBrutoKg, pesoNetoKg };
}
export function categoriaComercial(value: unknown) {
  const categoria = CATEGORIAS.find(c => c === value);
  if (!categoria) throw new Error('CATEGORIAS_INVALIDAS');
  return categoria;
}
export const esExportacion = (categoria: string) => categoria === 'G' || categoria === 'P';

export const mensajesComerciales: Record<string, string> = {
  DATOS_INVALIDOS: 'Revise los datos enviados.', FILTROS_INVALIDOS: 'Revise la fecha.',
  TARA_INVALIDA: 'Indique la tara por gaveta, mayor que cero y hasta 10 kg.', PESOS_INVALIDOS: 'Revise gavetas, bruto y tara: el neto debe ser positivo.',
  CATEGORIAS_INVALIDAS: 'Seleccione una categoría válida.', MOTIVO_REQUERIDO: 'Escriba un motivo de 5 a 1000 caracteres.',
  NO_AUTORIZADO: 'Esta operación requiere un administrador activo.', ORIGEN_INVALIDO: 'El origen no existe o no está aprobado para entregar.',
  STOCK_INSUFICIENTE: 'El peso supera el saldo disponible del origen.', COMPRADOR_INVALIDO: 'El comprador no está activo o no admite esta categoría.',
  CONFLICTO_COMERCIAL: 'Los saldos cambiaron. Actualice y revise antes de confirmar.', IDENTIDAD_CONFLICTIVA: 'El identificador corresponde a otra operación.',
  ENTREGA_INVALIDA: 'Seleccione una entrega de exportación válida.', FECHA_COMERCIAL_INVALIDA: 'La fecha no puede preceder al origen de la fruta.',
  RECHAZO_EXCESIVO: 'El rechazo supera los kilos exportados pendientes de devolución.',
  MOVIMIENTO_NO_ENCONTRADO: 'El movimiento no existe.', MOVIMIENTO_ANULADO: 'El movimiento ya fue anulado.',
  DEPENDENCIAS_ACTIVAS: 'Primero anule las devoluciones o reventas que dependen de este movimiento.',
  CORRECCION_NO_PERMITIDA: 'Solo se pueden corregir jornadas cerradas sin entregas vigentes. Anule primero sus movimientos dependientes.',
  JORNADA_MODIFICADA: 'La jornada cambió. Actualice y revise la corrección.', JORNADA_NO_ENCONTRADA: 'Jornada no encontrada.',
};
