/**
 * Barrel export de la Capa de Datos (Repositories).
 * Importar siempre desde '@/lib/repositories' para mantener
 * el encapsulamiento de la capa de datos.
 */
export { UserRepository }          from './UserRepository';
export { CampanaRepository, LoteRepository, CompradorRepository } from './CampanaRepository';
export type { CreateUserInput, UpdateUserInput, PublicUser } from './UserRepository';
