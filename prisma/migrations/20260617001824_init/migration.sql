-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "telefono" TEXT,
    "avatar" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'AGRICULTOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tema" TEXT NOT NULL DEFAULT 'OSCURO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campanas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "funda" TEXT NOT NULL,
    "taraBase" REAL NOT NULL DEFAULT 1.70,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hectareas" REAL,
    "descripcion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "compradores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'MAYORISTA',
    "contacto" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pesajes_brutos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fechaRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoBrutoKg" REAL NOT NULL,
    "numGavetas" INTEGER NOT NULL,
    "taraTotal" REAL NOT NULL,
    "pesoNetoKg" REAL NOT NULL,
    "observaciones" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncedAt" DATETIME,
    "agricultorId" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    CONSTRAINT "pesajes_brutos_agricultorId_fkey" FOREIGN KEY ("agricultorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pesajes_brutos_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pesajes_brutos_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clasificaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fechaRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoExportacionKg" REAL NOT NULL DEFAULT 0,
    "pesoNacionalKg" REAL NOT NULL DEFAULT 0,
    "pesoDescarte" REAL NOT NULL DEFAULT 0,
    "totalClasificado" REAL NOT NULL,
    "margenErrorPct" REAL NOT NULL,
    "dentroDelMargen" BOOLEAN NOT NULL,
    "observaciones" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "pesajeBrutoId" TEXT NOT NULL,
    "clasificadorId" TEXT NOT NULL,
    CONSTRAINT "clasificaciones_pesajeBrutoId_fkey" FOREIGN KEY ("pesajeBrutoId") REFERENCES "pesajes_brutos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clasificaciones_clasificadorId_fkey" FOREIGN KEY ("clasificadorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ajustes_comprador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fechaRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoRechazado" REAL NOT NULL DEFAULT 0,
    "motivoRechazo" TEXT,
    "ajusteKg" REAL NOT NULL,
    "observaciones" TEXT,
    "clasificacionId" TEXT NOT NULL,
    "compradorId" TEXT NOT NULL,
    CONSTRAINT "ajustes_comprador_clasificacionId_fkey" FOREIGN KEY ("clasificacionId") REFERENCES "clasificaciones" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ajustes_comprador_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "compradores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cedula_key" ON "users"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "campanas_codigo_key" ON "campanas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_codigo_key" ON "lotes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "clasificaciones_pesajeBrutoId_key" ON "clasificaciones"("pesajeBrutoId");

-- CreateIndex
CREATE UNIQUE INDEX "ajustes_comprador_clasificacionId_key" ON "ajustes_comprador"("clasificacionId");
