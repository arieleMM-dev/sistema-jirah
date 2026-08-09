-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_campanas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "funda" TEXT NOT NULL,
    "taraBase" REAL NOT NULL DEFAULT 1.70,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "compradorId" TEXT,
    CONSTRAINT "campanas_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "compradores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_campanas" ("codigo", "createdAt", "funda", "id", "isActive", "nombre", "taraBase", "updatedAt") SELECT "codigo", "createdAt", "funda", "id", "isActive", "nombre", "taraBase", "updatedAt" FROM "campanas";
DROP TABLE "campanas";
ALTER TABLE "new_campanas" RENAME TO "campanas";
CREATE UNIQUE INDEX "campanas_codigo_key" ON "campanas"("codigo");
CREATE TABLE "new_clasificaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fechaRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gavetasExportacion" INTEGER NOT NULL DEFAULT 0,
    "pesoExportacionBruto" REAL NOT NULL DEFAULT 0,
    "pesoExportacionKg" REAL NOT NULL DEFAULT 0,
    "gavetasNacional" INTEGER NOT NULL DEFAULT 0,
    "pesoNacionalBruto" REAL NOT NULL DEFAULT 0,
    "pesoNacionalKg" REAL NOT NULL DEFAULT 0,
    "pesoDescarte" REAL NOT NULL DEFAULT 0,
    "totalClasificado" REAL NOT NULL,
    "margenErrorPct" REAL NOT NULL,
    "dentroDelMargen" BOOLEAN NOT NULL,
    "auditFlag" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "pesajeBrutoId" TEXT NOT NULL,
    "clasificadorId" TEXT NOT NULL,
    CONSTRAINT "clasificaciones_pesajeBrutoId_fkey" FOREIGN KEY ("pesajeBrutoId") REFERENCES "pesajes_brutos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clasificaciones_clasificadorId_fkey" FOREIGN KEY ("clasificadorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_clasificaciones" ("clasificadorId", "dentroDelMargen", "fechaRegistro", "id", "margenErrorPct", "observaciones", "pesajeBrutoId", "pesoDescarte", "pesoExportacionKg", "pesoNacionalKg", "syncStatus", "totalClasificado") SELECT "clasificadorId", "dentroDelMargen", "fechaRegistro", "id", "margenErrorPct", "observaciones", "pesajeBrutoId", "pesoDescarte", "pesoExportacionKg", "pesoNacionalKg", "syncStatus", "totalClasificado" FROM "clasificaciones";
DROP TABLE "clasificaciones";
ALTER TABLE "new_clasificaciones" RENAME TO "clasificaciones";
CREATE UNIQUE INDEX "clasificaciones_pesajeBrutoId_key" ON "clasificaciones"("pesajeBrutoId");
CREATE TABLE "new_compradores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'MAYORISTA',
    "contacto" TEXT,
    "toleranciaPct" REAL NOT NULL DEFAULT 4.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_compradores" ("contacto", "createdAt", "id", "isActive", "nombre", "tipo", "updatedAt") SELECT "contacto", "createdAt", "id", "isActive", "nombre", "tipo", "updatedAt" FROM "compradores";
DROP TABLE "compradores";
ALTER TABLE "new_compradores" RENAME TO "compradores";
CREATE UNIQUE INDEX "compradores_ruc_key" ON "compradores"("ruc");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
