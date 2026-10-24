CREATE INDEX "pesajes_brutos_fechaRegistro_id_idx" ON "pesajes_brutos"("fechaRegistro" DESC, "id");
CREATE INDEX "pesajes_brutos_campanaId_loteId_fechaRegistro_id_idx" ON "pesajes_brutos"("campanaId", "loteId", "fechaRegistro" DESC, "id");
CREATE INDEX "jornadas_cosecha_fecha_id_idx" ON "jornadas_cosecha"("fecha" DESC, "id");
CREATE INDEX "entregas_fecha_id_idx" ON "entregas"("fecha" DESC, "id");
