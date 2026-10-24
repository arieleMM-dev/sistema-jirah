import type { ReporteCosecha } from '@/lib/services/reporte.service';
import { filasReporte } from '@/lib/reportes/filas';
import { CATEGORIAS } from '@/lib/cosecha';

export async function crearLibroReporte(r: ReporteCosecha) {
  const { Workbook } = await import('exceljs');
  const libro = new Workbook();
  libro.creator = 'Finca JIRAH'; libro.created = new Date(r.generadoEn);
  for (const [titulo, filas] of Object.entries(filasReporte(r))) {
    const hoja = libro.addWorksheet(titulo);
    hoja.addRows(filas); hoja.columns.forEach(col => { col.width = 22; });
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
  }
  const matriz = libro.addWorksheet('Cuadre con formulas');
  matriz.getColumn(1).width = 44;
  for (let col = 2; col <= 7; col++) matriz.getColumn(col).width = 18;
  matriz.addRow(['Finca JIRAH · Clasificación original por jornada y lote']);
  matriz.addRow(['Los brutos agrupados conservan su cantidad explícita de gavetas. El rechazo comercial se detalla en hojas separadas.']);
  for (const j of r.jornadas) {
    matriz.addRow([]);
    const first = matriz.rowCount + 1, c = j.clasificacion;
    matriz.addRow([`${j.fecha} · ${j.campana.codigo} · ${j.lote.codigo} · ${j.estado}`]);
    matriz.mergeCells(first, 1, first, 7); matriz.getRow(first).font = { bold: true, color: { argb: 'FF166534' } };
    matriz.addRow(['Concepto', 'Cosechado', ...CATEGORIAS]);
    const categorias = CATEGORIAS.map(cat => c?.detalles.find(d => d.categoria === cat));
    const count = first + 2, gross = first + 3, tare = first + 4, net = first + 5;
    matriz.addRow(['Gavetas', j.numGavetas, ...categorias.map(d => d?.numGavetas ?? null)]);
    matriz.addRow(['Peso bruto kg', j.pesoBrutoKg, ...categorias.map(d => d?.pesoBrutoKg ?? null)]);
    matriz.addRow(['Tara kg/gaveta', j.taraBase, ...categorias.map(d => d ? j.taraBase : null)]);
    matriz.addRow(['Peso neto kg']);
    [j.pesoNetoKg, ...categorias.map(d => d?.pesoNetoKg ?? null)].forEach((value, index) => {
      if (value === null) return;
      const letter = String.fromCharCode(66 + index);
      matriz.getCell(net, index + 2).value = { formula: `${letter}${gross}-${letter}${count}*${letter}${tare}`, result: value };
    });
    const total = first + 6, diff = first + 7, margin = first + 8;
    matriz.addRow(['Exportación + nacional kg']); matriz.addRow(['Cosechado − clasificado kg']); matriz.addRow(['Diferencia / clasificado %']);
    if (c) {
      matriz.getCell(total, 2).value = { formula: `SUM(C${net}:G${net})`, result: c.totalClasificado };
      matriz.getCell(diff, 2).value = { formula: `B${net}-B${total}`, result: c.diferenciaKg };
      matriz.getCell(margin, 2).value = { formula: `B${diff}/B${total}`, result: c.margenErrorPct / 100 };
      matriz.getCell(margin, 2).numFmt = '0.00%';
    }
    for (let row = gross; row <= diff; row++) for (let col = 2; col <= 7; col++) matriz.getCell(row, col).numFmt = '0.000';
    matriz.getRow(net).font = { bold: true };
  }
  matriz.views = [{ state: 'frozen', ySplit: 2 }];
  matriz.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return libro;
}
