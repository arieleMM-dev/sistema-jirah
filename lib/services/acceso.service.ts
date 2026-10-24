import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AccesoRepo } from '@/lib/repositories/AccesoRepository';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { LimiteAccesoRepo } from '@/lib/repositories/LimiteAccesoRepository';
import { AgricultorService } from './agricultor.service';
import { AuthService } from './auth.service';
import { CorreoService } from './correo.service';

const registro = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('REGISTRO_INVALIDO');
  return raw as Record<string, unknown>;
};
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const AccesoService = {
  async registrar(raw: unknown) {
    const body = registro(raw);
    if (Object.keys(body).some(k => !['nombres', 'apellidos', 'cedula', 'email', 'password'].includes(k))) throw new Error('REGISTRO_INVALIDO');
    const { nombres, apellidos, cedula, password } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (![nombres, apellidos].every(v => typeof v === 'string' && /^[\p{L} ]{2,50}$/u.test(v.trim())) ||
      typeof cedula !== 'string' || !AgricultorService.validarCedulaEC(cedula) ||
      email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string') throw new Error('REGISTRO_INVALIDO');
    const policy = AuthService.validarFortaleza(password);
    if (!policy.ok) throw new Error(policy.mensaje);
    if (!await LimiteAccesoRepo.consumir('registro', email, 3, 15 * 60_000)) throw new Error('ACCESO_LIMITE');
    CorreoService.configuracion();
    // Un registro repetido nunca reemplaza credenciales, identidad ni permisos de otra cuenta.
    if (await UserRepository.findByEmail(email) || await UserRepository.existsByCedula(cedula)) return;
    try {
      const user = await AccesoRepo.crear({ email, cedula, nombres: (nombres as string).trim(), apellidos: (apellidos as string).trim(),
        passwordHash: await AuthService.hashPassword(password) });
      await this.enviarVerificacion(user.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }
  },
  async enviarVerificacion(userId: string) {
    if (!await LimiteAccesoRepo.consumir('verificar-correo', userId, 5, 15 * 60_000)) throw new Error('ACCESO_LIMITE');
    CorreoService.configuracion();
    const token = randomBytes(32).toString('hex');
    const issued = await AccesoRepo.emitirVerificacion(userId, hashToken(token));
    if (!issued) return;
    const user = await UserRepository.findById(userId);
    if (!user?.isActive) return;
    try { await CorreoService.verificacion(user.email, token); }
    catch {
      await AccesoRepo.invalidarVerificacion(issued.id);
      // La cuenta permanece pendiente y puede solicitar otro envío; nunca se habilita por un fallo de correo.
      throw new Error('VERIFICACION_NO_ENVIADA');
    }
  },
  async verificar(userId: string, raw: unknown) {
    const { token } = registro(raw);
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) throw new Error('VERIFICACION_INVALIDA');
    if (!await LimiteAccesoRepo.consumir('confirmar-correo', userId, 10, 15 * 60_000)) throw new Error('ACCESO_LIMITE');
    // Requiere la sesión de la misma cuenta: el enlace por sí solo no valida la contraseña elegida por un tercero.
    await AccesoRepo.verificar(userId, hashToken(token));
  },
  listar(estado = 'PENDIENTE', pagina = 1) {
    if (!['PENDIENTE', 'RECHAZADO'].includes(estado) || !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100_000) throw new Error('DECISION_INVALIDA');
    return AccesoRepo.listar(estado as 'PENDIENTE' | 'RECHAZADO', pagina);
  },
  async decidir(administradorId: string, raw: unknown) {
    const body = registro(raw);
    if (typeof body.id !== 'string' || !body.id || !Number.isSafeInteger(body.version) ||
        !['APROBAR', 'RECHAZAR'].includes(body.accion as string) || typeof body.motivo !== 'string' ||
        body.motivo.trim().length < 5 || body.motivo.length > 1000) throw new Error('DECISION_INVALIDA');
    return AccesoRepo.decidir(body.id, administradorId, body.version as number, body.accion === 'APROBAR', body.motivo.trim());
  },
};
