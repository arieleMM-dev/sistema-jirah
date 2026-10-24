ALTER TABLE "campanas" ADD COLUMN "fechaNacimiento" TEXT;
ALTER TABLE "campanas" ADD COLUMN "minimoPGr" REAL NOT NULL DEFAULT 180;
ALTER TABLE "campanas" ADD COLUMN "minimoGGr" REAL NOT NULL DEFAULT 280;

CREATE TABLE "jornadas_cosecha" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fecha" TEXT NOT NULL,
  "campanaId" TEXT NOT NULL,
  "loteId" TEXT NOT NULL,
  "taraBase" REAL NOT NULL,
  "minimoPGr" REAL NOT NULL,
  "minimoGGr" REAL NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
  CONSTRAINT "jornadas_cosecha_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "jornadas_cosecha_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "jornadas_cosecha_campanaId_loteId_fecha_key" ON "jornadas_cosecha"("campanaId", "loteId", "fecha");

ALTER TABLE "pesajes_brutos" ADD COLUMN "jornadaId" TEXT REFERENCES "jornadas_cosecha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "pesajes_brutos_jornadaId_idx" ON "pesajes_brutos"("jornadaId");

CREATE TABLE "clasificaciones_jornada" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jornadaId" TEXT NOT NULL,
  "clasificadorId" TEXT NOT NULL,
  "fechaRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pesoCosechadoKg" REAL NOT NULL,
  "pesoExportacionKg" REAL NOT NULL,
  "pesoNacionalKg" REAL NOT NULL,
  "totalClasificado" REAL NOT NULL,
  "diferenciaKg" REAL NOT NULL,
  "margenErrorPct" REAL NOT NULL,
  "dentroDelMargen" BOOLEAN NOT NULL,
  "observaciones" TEXT,
  "huella" TEXT NOT NULL,
  "aprobadorId" TEXT,
  "motivoAprobacion" TEXT,
  "fechaAprobacion" DATETIME,
  CONSTRAINT "clasificaciones_jornada_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornadas_cosecha"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clasificaciones_jornada_clasificadorId_fkey" FOREIGN KEY ("clasificadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clasificaciones_jornada_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "clasificaciones_jornada_jornadaId_key" ON "clasificaciones_jornada"("jornadaId");

CREATE TABLE "detalles_clasificacion_jornada" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clasificacionId" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "numGavetas" INTEGER NOT NULL,
  "pesoBrutoKg" REAL NOT NULL,
  "pesoNetoKg" REAL NOT NULL,
  CONSTRAINT "detalles_clasificacion_jornada_clasificacionId_fkey" FOREIGN KEY ("clasificacionId") REFERENCES "clasificaciones_jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "detalles_clasificacion_jornada_clasificacionId_categoria_key" ON "detalles_clasificacion_jornada"("clasificacionId", "categoria");
