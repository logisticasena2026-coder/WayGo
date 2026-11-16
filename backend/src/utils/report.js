// ============================================================
// WayGo - Generacion de reportes (CSV para Excel y PDF minimo)
// Sin dependencias externas.
// ============================================================

/** Convierte un valor para CSV (escapando comas, comillas y saltos) */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Genera contenido CSV a partir de filas */
function toCSV(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

// ------------------------------------------------------------
// PDF minimo (fuente Helvetica estandar, sin dependencias)
// ------------------------------------------------------------
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

/** Genera un PDF de una pagina con titulo y lineas [label, value] */
function toPDF(title, lines, subtitle = '') {
  const content = [];
  let y = 740;
  const newLine = (text, size = 12, bold = false) => {
    if (y < 60) return; // limite de una pagina
    content.push(`BT ${bold ? '/F2' : '/F1'} ${size} Tf 56 ${y} Td (${esc(text)}) Tj ET`);
    y -= 18;
  };

  newLine('WayGo - Reporte', 16, true);
  newLine(title, 14, true);
  if (subtitle) newLine(subtitle, 10);
  newLine(' ');
  for (const [label, value] of lines) {
    newLine(`${label}: ${value}`, 11);
  }
  newLine(' ');
  newLine('Generado el ' + new Date().toISOString(), 9);

  const body = content.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefPos = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

/** Convierte un objeto de estadisticas (summary) a lineas [label, value] */
function summaryToLines(summary) {
  const labels = {
    totalCustomers: 'Total de clientes',
    totalDrivers: 'Total de conductores',
    activeUsers: 'Usuarios activos',
    totalRequests: 'Total de solicitudes',
    completedTrips: 'Viajes completados',
    cancelledServices: 'Servicios cancelados',
    pendingServices: 'Servicios pendientes',
    totalRevenue: 'Ingresos registrados (COP)',
    avgDriverRating: 'Calificacion promedio de conductores',
  };
  return Object.entries(summary)
    .filter(([k]) => labels[k])
    .map(([k, v]) => [labels[k], v === null ? 'n/a' : v]);
}

module.exports = { toCSV, toPDF, summaryToLines };
