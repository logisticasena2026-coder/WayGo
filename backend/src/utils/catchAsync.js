// ============================================================
// WayGo - Envoltura para controladores async
// Propaga errores al manejador centralizado de Express
// ============================================================
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
