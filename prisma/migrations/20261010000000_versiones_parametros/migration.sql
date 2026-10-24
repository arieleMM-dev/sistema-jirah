ALTER TABLE "campanas" ADD COLUMN "versionParametros" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "parametros_campana" (
  "campanaId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "taraBase" REAL NOT NULL,
  "minimoPGr" REAL NOT NULL,
  "minimoGGr" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("campanaId", "version"),
  CONSTRAINT "parametros_campana_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "parametros_campana" ("campanaId", "version", "taraBase", "minimoPGr", "minimoGGr")
SELECT "id", "versionParametros", "taraBase", "minimoPGr", "minimoGGr" FROM "campanas";
