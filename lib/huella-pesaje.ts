import { createHash } from 'node:crypto';
type Captura = {
  id: string; fechaRegistro: Date; agricultorId: string; campanaId: string; loteId: string;
  pesoBrutoKg: number; numGavetas: number; taraTotal: number; observaciones?: string | null;
};
export function huellaPesaje(p: Captura) {
  return createHash('sha256').update(JSON.stringify([p.id, p.fechaRegistro.toISOString(), p.agricultorId, p.campanaId, p.loteId,
    p.pesoBrutoKg, p.numGavetas, p.taraTotal, p.observaciones ?? null])).digest('hex');
}
