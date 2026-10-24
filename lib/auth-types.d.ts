import type { DefaultSession } from 'next-auth';
import type { Rol, EstadoAcceso } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id: string;
      rol: Rol;
      estadoAcceso: EstadoAcceso;
      emailVerificado: boolean;
      nombres: string;
      apellidos: string;
    };
  }

  interface User {
    rol: Rol;
    nombres: string;
    apellidos: string;
    sessionVersion: number;
    estadoAcceso: EstadoAcceso;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    rol?: Rol;
    nombres?: string;
    apellidos?: string;
    sessionVersion?: number;
    revoked?: boolean;
    estadoAcceso?: EstadoAcceso;
    emailVerificado?: boolean;
  }
}
