ALTER TABLE "clasificaciones_jornada" ADD COLUMN "versionComercial" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clasificaciones_jornada" ADD COLUMN "revisionLocal" TEXT;
ALTER TABLE "pesajes_brutos" ADD COLUMN "huellaCaptura" TEXT;
CREATE TABLE "entregas" (
 "id" TEXT NOT NULL PRIMARY KEY, "fecha" TEXT NOT NULL, "compradorId" TEXT NOT NULL, "tipoComprador" TEXT NOT NULL, "nombreComprador" TEXT NOT NULL,
 "taraKg" REAL NOT NULL CHECK ("taraKg" > 0 AND "taraKg" <= 10), "responsableId" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "observaciones" TEXT, "huella" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY ("compradorId") REFERENCES "compradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "detalles_entrega" (
 "id" TEXT NOT NULL PRIMARY KEY, "entregaId" TEXT NOT NULL, "clasificacionId" TEXT, "devolucionId" TEXT,
 "categoria" TEXT NOT NULL CHECK ("categoria" IN ('G','P','N1','N2','N3')),
 "numGavetas" INTEGER NOT NULL CHECK ("numGavetas" > 0), "pesoBrutoKg" REAL NOT NULL CHECK ("pesoBrutoKg" > 0),
 "pesoNetoKg" REAL NOT NULL CHECK ("pesoNetoKg" > 0),
 CHECK (("clasificacionId" IS NOT NULL AND "devolucionId" IS NULL) OR ("clasificacionId" IS NULL AND "devolucionId" IS NOT NULL)),
 CHECK ("devolucionId" IS NULL OR "categoria" IN ('N1','N2','N3')),
 FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("clasificacionId") REFERENCES "clasificaciones_jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "devoluciones" (
 "id" TEXT NOT NULL PRIMARY KEY, "entregaId" TEXT NOT NULL, "detalleOrigenId" TEXT, "fecha" TEXT NOT NULL,
 "numGavetas" INTEGER NOT NULL CHECK ("numGavetas" > 0), "pesoBrutoKg" REAL NOT NULL CHECK ("pesoBrutoKg" > 0),
 "taraKg" REAL NOT NULL CHECK ("taraKg" > 0 AND "taraKg" <= 10), "pesoNetoKg" REAL NOT NULL CHECK ("pesoNetoKg" > 0),
 "motivo" TEXT NOT NULL, "responsableId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "huella" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("detalleOrigenId") REFERENCES "detalles_entrega"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "revisiones_jornada" (
 "id" TEXT NOT NULL PRIMARY KEY, "jornadaId" TEXT NOT NULL, "responsableId" TEXT NOT NULL, "motivo" TEXT NOT NULL,
 "antes" TEXT NOT NULL, "despues" TEXT NOT NULL, "huella" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("jornadaId") REFERENCES "jornadas_cosecha"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "entregas_fecha_idx" ON "entregas"("fecha");
CREATE INDEX "detalles_entrega_clasificacionId_categoria_idx" ON "detalles_entrega"("clasificacionId", "categoria");
CREATE INDEX "detalles_entrega_devolucionId_idx" ON "detalles_entrega"("devolucionId");
CREATE INDEX "devoluciones_entregaId_idx" ON "devoluciones"("entregaId");
CREATE INDEX "revisiones_jornada_jornadaId_idx" ON "revisiones_jornada"("jornadaId");
CREATE TABLE "limites_acceso" ("clave" TEXT NOT NULL PRIMARY KEY, "intentos" INTEGER NOT NULL, "vence" DATETIME NOT NULL);
CREATE INDEX "limites_acceso_vence_idx" ON "limites_acceso"("vence");
