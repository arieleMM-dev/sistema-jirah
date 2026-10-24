import { NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { AgricultorService } from '@/lib/services/agricultor.service';
import { AuthService } from '@/lib/services/auth.service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.rol !== 'ADMIN') return NextResponse.json({ error: 'Solo el administrador puede enviar invitaciones.' }, { status: 403 });
  try {
    const user = await AgricultorService.obtener((await params).id);
    if (!user?.isActive) return NextResponse.json({ error: 'Cuenta activa no encontrada.' }, { status: 404 });
    await AuthService.generarTokenRecuperacion(user.email);
    return NextResponse.json({ message: 'Solicitud procesada. El enlace se envía al correo registrado; espere un minuto antes de repetir.' });
  } catch { return NextResponse.json({ error: 'No se pudo enviar el enlace. Compruebe la configuración de correo.' }, { status: 503 }); }
}
