export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_BYTES = 72;

export function validatePassword(password: unknown): { ok: boolean; mensaje?: string } {
  if (typeof password !== 'string' || Array.from(password).length < MIN_PASSWORD_LENGTH) {
    return { ok: false, mensaje: 'Use al menos 15 caracteres.' };
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return { ok: false, mensaje: 'La contraseña supera los 72 bytes permitidos. Use una frase más corta.' };
  }
  if (/^(.)\1+$/u.test(password) || ['passwordpassword', 'password123456789', '123456789012345', 'qwertyuiopasdfgh'].includes(password.toLowerCase())) {
    return { ok: false, mensaje: 'Esa contraseña es demasiado común. Elija otra frase.' };
  }
  return { ok: true };
}
