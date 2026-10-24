import { filasReporte, csvSeguro } from '@/lib/reportes/filas';
import type { ReporteCosecha } from '@/lib/services/reporte.service';
import { fechaFinca } from '@/lib/cosecha';
import { crearLibroReporte } from '@/lib/reportes/libro';

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = nombre; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarReporte(r: ReporteCosecha, formato: 'csv' | 'xlsx' | 'pdf') {
  const hojas = filasReporte(r);
  const nombre = `cosecha_jirah_${fechaFinca()}`;
  if (formato === 'csv') {
    const rows = Object.entries(hojas).flatMap(([titulo, filas]) => [[titulo], ...filas, []]);
    descargar(new Blob([csvSeguro(rows)], { type: 'text/csv;charset=utf-8' }), `${nombre}.csv`);
  } else if (formato === 'xlsx') {
    const libro = await crearLibroReporte(r);
    const bytes = await libro.xlsx.writeBuffer();
    descargar(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nombre}.xlsx`);
  } else {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text('Finca JIRAH — Reporte de cosecha', 14, 14);
    autoTable(doc, { startY: 21, body: hojas.Resumen.slice(1), styles: { fontSize: 9 }, columnStyles: { 0: { cellWidth: 110 } } });
    const tablas = {
      Jornadas: [hojas.Jornadas[0].slice(0, 8), ...hojas.Jornadas.slice(1).map(f => f.slice(0, 8))],
      Cuadres: [['Fecha', 'Campaña', 'Lote', 'Estado', 'Exportación kg', 'Nacional kg', 'Clasificado kg', 'Diferencia kg', 'Diferencia %'],
        ...hojas.Jornadas.slice(1).map(f => [f[0], f[1], f[2], f[4], ...f.slice(11, 16)])],
      Categorias: hojas.Categorias, Pesajes: hojas.Pesajes, Historicos: hojas.Historicos,
      Entregas: hojas.Entregas.map(f => [...f.slice(0, 4), ...f.slice(6, 15), f[16]]), Devoluciones: hojas.Devoluciones,
      Anulaciones: hojas.Anulaciones.map(f => f.slice(0, 6)),
      Correcciones: hojas.Correcciones.map(f => f.slice(0, 5)),
      Aprobaciones: [['Fecha', 'Campaña', 'Lote', 'Clasificador', 'Observaciones', 'Aprobador', 'Motivo', 'Fecha aprobación'],
        ...hojas.Jornadas.slice(1).map(f => [f[0], f[1], f[2], f[18], f[20], ...f.slice(21, 24)])],
    };
    for (const [titulo, filas] of Object.entries(tablas)) {
      if (filas.length < 2) continue;
      doc.addPage(); doc.setFontSize(14); doc.text(titulo, 14, 14);
      autoTable(doc, { startY: 21, head: [filas[0]], body: filas.slice(1).map(f => f.map(v => v ?? '—')), styles: { fontSize: 7, overflow: 'linebreak' } });
    }
    const pages = doc.getNumberOfPages();
    for (let n = 1; n <= pages; n++) { doc.setPage(n); doc.setFontSize(8); doc.text(`Página ${n} de ${pages}`, 255, 203); }
    doc.save(`${nombre}.pdf`);
  }
}
