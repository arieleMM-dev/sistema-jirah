ALTER TABLE "users" ADD COLUMN "estadoAcceso" TEXT NOT NULL DEFAULT 'APROBADO';
ALTER TABLE "users" ADD COLUMN "emailVerificadoAt" DATETIME;

CREATE TABLE "verificaciones_correo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verificaciones_correo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "verificaciones_correo_token_key" ON "verificaciones_correo"("token");
CREATE INDEX "verificaciones_correo_userId_idx" ON "verificaciones_correo"("userId");

CREATE TABLE "decisiones_acceso" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "solicitanteId" TEXT NOT NULL,
  "administradorId" TEXT NOT NULL,
  "estadoAnterior" TEXT NOT NULL,
  "estadoNuevo" TEXT NOT NULL,
  "rolAsignado" TEXT NOT NULL,
  "motivo" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "decisiones_acceso_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "decisiones_acceso_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "decisiones_acceso_solicitanteId_idx" ON "decisiones_acceso"("solicitanteId");
