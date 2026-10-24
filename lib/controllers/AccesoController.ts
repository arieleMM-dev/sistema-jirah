import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession, getIdentifiedSession } from '@/lib/auth/session';
import { AccesoService } from '@/lib/services/acceso.service';

function errorAcceso(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const errors: Record<string, [number, string]> = {
    REGISTRO_INVALIDO: [422, 'Revise nombres, apellidos, cédula y correo. No seleccione permisos al registrarse.'],
    DECISION_INVALIDA: [422, 'Seleccione una solicitud y escriba un motivo de entre 5 y 1000 caracteres.'],
    VERIFICACION_INVALIDA: [410, 'El enlace no es válido para esta cuenta, ya se utilizó o expiró. Solicite otro desde su bienvenida.'],
    VERIFICACION_NO_ENVIADA: [503, 'La cuenta sigue pendiente. No pudimos enviar el correo; ingrese y solicite un nuevo enlace desde la bienvenida.'],
    RECUPERACION_NO_CONFIGURADA: [503, 'El correo de la finca todavía no está disponible. Intente más tarde o contacte al administrador.'],
    ACCESO_LIMITE: [429, 'Demasiados intentos. Espere 15 minutos antes de volver a intentar.'],
    ACCESO_NO_AUTORIZADO: [403, 'Solo el administrador puede decidir solicitudes.'],
    SOLICITUD_NO_DISPONIBLE: [409, 'La solicitud ya fue resuelta o no está disponible. Actualice la lista.'],
    SOLICITUD_MODIFICADA: [409, 'La solicitud cambió. Actualice la lista antes de decidir.'],
    CORREO_NO_VERIFICADO: [422, 'El trabajador debe confirmar su correo antes de recibir acceso.'],
  };
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Solicitud JSON inválida.' }, { status: 400 });
  const policy = ['Use al menos 15 caracteres.', 'La contraseña supera los 72 bytes permitidos. Use una frase más corta.', 'Esa contraseña es demasiado común. Elija otra frase.'];
  const [status, message] = errors[code] ?? (policy.includes(code) ? [422, code] : [500, 'No se pudo completar la solicitud. Intente nuevamente.']);
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '900' } : {}) } });
}

export const AccesoController = {
  async registrar(req: NextRequest) {
    try { await AccesoService.registrar(await req.json());
      return NextResponse.json({ message: 'Si los datos permiten crear una cuenta, recibirá un enlace. Puede ingresar para consultar su solicitud o reenviar la verificación.' }, { status: 201 });
    } catch (error) { return errorAcceso(error); }
  },
  async estado() {
    const session = await getIdentifiedSession();
    if (!session?.user) return NextResponse.json({ error: 'Inicie sesión nuevamente para consultar su acceso.' }, { status: 401 });
    return NextResponse.json({ user: session.user });
  },
  async verificar(req: NextRequest) {
    const session = await getIdentifiedSession();
    if (!session?.user) return NextResponse.json({ error: 'Ingrese con la cuenta que registró para confirmar su correo.' }, { status: 401 });
    try { await AccesoService.verificar(session.user.id, await req.json()); return NextResponse.json({ message: 'Correo confirmado. El administrador ya puede revisar su solicitud.' }); }
    catch (error) { return errorAcceso(error); }
  },
  async reenviar() {
    const session = await getIdentifiedSession();
    if (!session?.user) return NextResponse.json({ error: 'Inicie sesión para solicitar un enlace.' }, { status: 401 });
    try { await AccesoService.enviarVerificacion(session.user.id); return NextResponse.json({ message: 'Si su correo necesita verificación, recibirá un enlace. Revise también la carpeta de correo no deseado y espere un minuto entre envíos.' }); }
    catch (error) { return errorAcceso(error); }
  },
  async solicitudes(req?: NextRequest) {
    const session = await getAuthenticatedSession();
    if (!session?.user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    try {
      if (req?.method === 'POST') return NextResponse.json({ user: await AccesoService.decidir(session.user.id, await req.json()) });
      const params = req ? new URL(req.url).searchParams : new URLSearchParams();
      return NextResponse.json(await AccesoService.listar(params.get('estado') ?? 'PENDIENTE', Number(params.get('pagina') ?? 1)));
    }
    catch (error) { return errorAcceso(error); }
  },
};
