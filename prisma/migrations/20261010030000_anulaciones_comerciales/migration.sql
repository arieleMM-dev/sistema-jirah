CREATE TABLE "anulaciones_comerciales" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entregaId" TEXT,
  "devolucionId" TEXT,
  "responsableId" TEXT NOT NULL,
  "motivo" TEXT NOT NULL,
  "antes" TEXT NOT NULL,
  "huella" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "anulaciones_entrega_fk" FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "anulaciones_devolucion_fk" FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "anulaciones_responsable_fk" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (("entregaId" IS NULL) != ("devolucionId" IS NULL))
);
CREATE UNIQUE INDEX "anulaciones_comerciales_entregaId_key" ON "anulaciones_comerciales"("entregaId");
CREATE UNIQUE INDEX "anulaciones_comerciales_devolucionId_key" ON "anulaciones_comerciales"("devolucionId");
