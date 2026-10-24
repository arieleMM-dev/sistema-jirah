import mailer from 'smtp-mailer';

export const CorreoService = {
  configuracion() {
    const host = process.env.SMTP_HOST, from = process.env.SMTP_FROM;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER, pass = process.env.SMTP_PASSWORD;
    const origin = process.env.NEXTAUTH_URL;
    const localTest = process.env.SMTP_LOCAL_TEST === 'true';
    if (localTest && (process.env.NODE_ENV !== 'development' || !['127.0.0.1', 'localhost', '::1'].includes(host ?? ''))) throw new Error('RECUPERACION_NO_CONFIGURADA');
    if (!host || !from || !origin || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(user) !== Boolean(pass)) throw new Error('RECUPERACION_NO_CONFIGURADA');
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error('RECUPERACION_NO_CONFIGURADA'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('RECUPERACION_NO_CONFIGURADA');
    return { host, port, secure, from, origin: url.origin, user, pass, localTest };
  },
  async recuperacion(email: string, token: string) {
    return CorreoService.enviarEnlace(email, token, '/recuperar/reset', 'Finca JIRAH: establecer contraseña',
      'Solicitaste establecer tu contraseña en Finca JIRAH. El enlace vence en una hora.');
  },
  async verificacion(email: string, token: string) {
    return CorreoService.enviarEnlace(email, token, '/verificar', 'Finca JIRAH: confirma tu correo',
      'Confirma tu correo para solicitar acceso a Finca JIRAH. El enlace vence en 24 horas. Necesitarás ingresar con la cuenta que registraste. La aprobación corresponde al administrador.');
  },
  async enviarEnlace(email: string, token: string, ruta: string, subject: string, mensaje: string) {
    const c = CorreoService.configuracion();
    const url = new URL(ruta, c.origin);
    url.hash = new URLSearchParams({ token }).toString();
    const transport = mailer.createTransport({ host: c.host, port: c.port, secure: c.secure,
      requireTLS: !c.secure && !c.localTest, ignoreTLS: c.localTest,
      auth: c.user && c.pass ? { user: c.user, pass: c.pass } : undefined,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    try {
      const result = await transport.sendMail({ from: c.from, to: email, subject,
        text: `${mensaje}\n\n${url.toString()}\n\nSi no lo solicitaste, ignora este mensaje.` });
      if (!result.accepted?.length || result.rejected?.length) throw new Error('CORREO_NO_ENTREGADO');
    } finally { transport.close(); }
  },
};
