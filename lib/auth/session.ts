import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/controllers/AuthController';
import { isKnownRole } from '@/lib/auth/permissions';

export function isAuthenticatedSession(session: Session | null): session is Session & {
  user: NonNullable<Session['user']>;
} {
  return Boolean(
    session?.user?.id && isKnownRole(session.user.rol) && session.user.estadoAcceso === 'APROBADO' &&
    // NextAuth elimina expires en getServerSession() de App Router.
    // La caducidad del JWT ya se comprueba antes de devolver esta sesión.
    (session.expires === undefined ||
      (Number.isFinite(Date.parse(session.expires)) && Date.parse(session.expires) > Date.now()))
  );
}

// La bienvenida y la verificación aceptan una identidad válida sin otorgar acceso operativo.
export async function getIdentifiedSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.expires !== undefined &&
      (!Number.isFinite(Date.parse(session.expires)) || Date.parse(session.expires) <= Date.now()))) return null;
  const user = session.user;
  return isAuthenticatedSession(session) || (user.rol === 'SIN_ASIGNAR' &&
    ['PENDIENTE', 'RECHAZADO'].includes(user.estadoAcceso)) ? session : null;
}

export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);
  return isAuthenticatedSession(session) ? session : null;
}
