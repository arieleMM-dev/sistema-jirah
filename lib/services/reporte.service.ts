import { ReporteRepo } from '@/lib/repositories/ReporteRepository';
import { CATEGORIAS, kg } from '@/lib/cosecha';
import { validarFiltros, type FiltrosCosecha } from '@/lib/filtros-cosecha';

export const ReporteService = {
  async obtener(filtros: FiltrosCosecha = {}) {
    const validos = validarFiltros(filtros);
    const [[grupos, anteriores], [campanas, lotes]] = await Promise.all([ReporteRepo.obtener(validos), ReporteRepo.opciones()]);
    const jornadas = grupos.map(j => ({ ...j,
      numGavetas: j.pesajes.reduce((sum, p) => sum + p.numGavetas, 0),
      pesoBrutoKg: kg(j.pesajes.reduce((sum, p) => sum + p.pesoBrutoKg, 0)),
      pesoNetoKg: kg(j.pesajes.reduce((sum, p) => sum + p.pesoNetoKg, 0)),
      pesajes: j.pesajes.map(p => ({ ...p, fechaRegistro: p.fechaRegistro.toISOString() })),
      clasificacion: j.clasificacion ? { ...j.clasificacion,
        fechaRegistro: j.clasificacion.fechaRegistro.toISOString(),
        fechaAprobacion: j.clasificacion.fechaAprobacion?.toISOString() ?? null } : null,
    }));
    const clasificadas = jornadas.filter(j => j.clasificacion !== null);
    const sum = (values: number[]) => kg(values.reduce((a, b) => a + b, 0));
    const cosechado = sum(jornadas.map(j => j.pesoNetoKg));
    const cosechadoClasificado = sum(clasificadas.map(j => j.clasificacion!.pesoCosechadoKg));
    const exportacion = sum(clasificadas.map(j => j.clasificacion!.pesoExportacionKg));
    const nacional = sum(clasificadas.map(j => j.clasificacion!.pesoNacionalKg));
    const totalClasificado = kg(exportacion + nacional);
    const diferenciaKg = kg(cosechadoClasificado - totalClasificado);
    const ids = new Set(clasificadas.map(j => j.clasificacion!.id));
    const [movimientos, revisiones] = await Promise.all([ReporteRepo.comercial([...ids]), ReporteRepo.revisiones(jornadas.map(j => j.id))]);
    let rechazoAtribuidoKg = 0, rechazoSinAtribuirKg = 0, rechazoAjustableKg = 0;
    let ajusteIncompleto = false;
    const entregas = movimientos.map(e => {
      const origenesCompletos = e.detalles.every(d => d.clasificacionId && ids.has(d.clasificacionId));
      for (const r of e.anulacion ? [] : e.devoluciones.filter(d => !d.anulacion)) {
        const origen = e.detalles.find(d => d.id === r.detalleOrigenId);
        if (origen?.clasificacionId && ids.has(origen.clasificacionId)) {
          rechazoAtribuidoKg += r.pesoNetoKg; rechazoAjustableKg += r.pesoNetoKg;
        } else if (!r.detalleOrigenId) {
          rechazoSinAtribuirKg += r.pesoNetoKg;
          if (origenesCompletos) rechazoAjustableKg += r.pesoNetoKg;
          else ajusteIncompleto = true;
        }
      }
      return { ...e, createdAt: e.createdAt.toISOString(), incluyeOrigenesFueraDelFiltro: !origenesCompletos,
        anulacion: e.anulacion ? { ...e.anulacion, createdAt: e.anulacion.createdAt.toISOString() } : null,
        devoluciones: e.devoluciones.map(r => ({ ...r, createdAt: r.createdAt.toISOString(),
          anulacion: r.anulacion ? { ...r.anulacion, createdAt: r.anulacion.createdAt.toISOString() } : null })) };
    });
    const exportacionAjustada = ajusteIncompleto ? null : kg(exportacion - rechazoAjustableKg);
    const nacionalAjustada = ajusteIncompleto ? null : kg(nacional + rechazoAjustableKg);
    return {
      generadoEn: new Date().toISOString(), filtros: validos, jornadas, campanas, lotes,
      entregas, revisiones: revisiones.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
      comercial: { rechazoAtribuidoKg: kg(rechazoAtribuidoKg), rechazoSinAtribuirKg: kg(rechazoSinAtribuirKg), ajusteIncompleto,
        exportacionAjustada, nacionalAjustada,
        pctExportacionAjustada: totalClasificado > 0 && exportacionAjustada !== null ? exportacionAjustada / totalClasificado * 100 : null,
        pctNacionalAjustada: totalClasificado > 0 && nacionalAjustada !== null ? nacionalAjustada / totalClasificado * 100 : null },
      historicos: anteriores.map(p => ({ ...p, fechaRegistro: p.fechaRegistro.toISOString() })),
      categorias: CATEGORIAS.map(categoria => {
        const detalles = clasificadas.flatMap(j => j.clasificacion!.detalles.filter(d => d.categoria === categoria));
        return { categoria, numGavetas: detalles.reduce((s, d) => s + d.numGavetas, 0),
          pesoBrutoKg: sum(detalles.map(d => d.pesoBrutoKg)), pesoNetoKg: sum(detalles.map(d => d.pesoNetoKg)) };
      }),
      totales: {
        cosechado, pesoBrutoKg: sum(jornadas.map(j => j.pesoBrutoKg)),
        numGavetas: jornadas.reduce((s, j) => s + j.numGavetas, 0),
        cosechadoClasificado, exportacion, nacional, totalClasificado, diferenciaKg,
        margenErrorPct: totalClasificado > 0 ? diferenciaKg / totalClasificado * 100 : null,
        pctExportacion: totalClasificado > 0 ? exportacion / totalClasificado * 100 : null,
        pctNacional: totalClasificado > 0 ? nacional / totalClasificado * 100 : null,
        jornadasPendientes: jornadas.filter(j => !j.clasificacion).length,
        pendientesAprobacion: jornadas.filter(j => j.estado === 'PENDIENTE_APROBACION').length,
      },
    };
  },
};

export type ReporteCosecha = Awaited<ReturnType<typeof ReporteService.obtener>>;
