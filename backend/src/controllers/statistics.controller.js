// ============================================================
// WayGo - Controlador de estadisticas y reportes
// ============================================================
const stats = require('../services/statistics.service');
const { toCSV, toPDF, summaryToLines } = require('../utils/report');
const catchAsync = require('../utils/catchAsync');

const general = catchAsync(async (req, res) => {
  const data = await stats.getGeneral();
  res.json(data);
});

const driver = catchAsync(async (req, res) => {
  const data = await stats.getDriverStats(req.params.id || req.user.id);
  res.json({ stats: data });
});

const customer = catchAsync(async (req, res) => {
  const data = await stats.getCustomerStats(req.params.id || req.user.id);
  res.json({ stats: data });
});

const packages = catchAsync(async (req, res) => {
  const data = await stats.getPackageStats();
  res.json({ stats: data });
});

// ---------------- Exportacion ----------------
const exportGeneral = catchAsync(async (req, res) => {
  const data = await stats.getGeneral();
  const format = (req.query.format || 'csv').toLowerCase();

  if (format === 'pdf') {
    const buf = toPDF('Estadisticas generales', summaryToLines(data.summary), 'WayGo - Centro de control');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="waygo-estadisticas.pdf"');
    return res.send(buf);
  }

  const headers = ['Metrica', 'Valor'];
  const rows = summaryToLines(data.summary);
  const csv = toCSV(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="waygo-estadisticas.csv"');
  res.send('\uFEFF' + csv); // BOM para Excel
});

module.exports = { general, driver, customer, packages, exportGeneral };
