export function readSyncConfirmation(value: unknown, pendingIds: string[]) {
  if (!value || typeof value !== 'object') throw new Error('Respuesta de sincronización inválida.');
  const record = value as Record<string, unknown>;
  const sent = new Set(pendingIds);
  if (typeof record.success !== 'boolean' || !Array.isArray(record.savedIds) || !record.savedIds.every(id => typeof id === 'string' && sent.has(id)) ||
      !Array.isArray(record.errors)) throw new Error('Respuesta de sincronización inválida.');
  const savedIds: string[] = record.savedIds;
  const remaining = pendingIds.filter(id => !savedIds.includes(id));
  const messages = record.errors.map((error: unknown) => {
    if (!error || typeof error !== 'object' || typeof (error as Record<string, unknown>).error !== 'string') {
      throw new Error('Respuesta de sincronización inválida.');
    }
    const e = error as { error: string; localId?: unknown; retryable?: unknown };
    if (e.retryable !== undefined && typeof e.retryable !== 'boolean') throw new Error('Respuesta de sincronización inválida.');
    if (e.localId !== undefined && (typeof e.localId !== 'string' || !sent.has(e.localId))) throw new Error('Respuesta de sincronización inválida.');
    return { error: e.error, localId: e.localId as string | undefined, retryable: e.retryable === true };
  });
  return {
    savedIds,
    errors: messages,
    retryable: messages.some(e => e.retryable),
    error: messages[0]?.error ?? (remaining.length > 0 || !record.success ? 'El servidor no confirmó todos los registros.' : null),
  };
}
