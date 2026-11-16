// ============================================================
// WayGo - 404 para rutas no encontradas
// ============================================================
module.exports = (req, res) => {
  res.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
};
