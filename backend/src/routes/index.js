// ============================================================
// WayGo - Indice de rutas de la API
// Cada modulo se monta bajo su prefijo /api/<modulo>
// (Los modulos de fases posteriores se iran registrando aqui)
// ============================================================
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const customerRoutes = require('./customer.routes');
const driverRoutes = require('./driver.routes');
const vehicleRoutes = require('./vehicle.routes');
const adminRoutes = require('./admin.routes');
const serviceRoutes = require('./service.routes');
const offerRoutes = require('./offer.routes');
const assignmentRoutes = require('./assignment.routes');
const callCenterRoutes = require('./call-center.routes');
const supportRoutes = require('./support.routes');
const packageRoutes = require('./package.routes');
const contractRoutes = require('./contract.routes');
const reviewRoutes = require('./review.routes');
const statisticsRoutes = require('./statistics.routes');
const notificationRoutes = require('./notification.routes');

const router = Router();

// Estado de la API (sin autenticacion)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'WayGo API', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', driverRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/admin', adminRoutes);
router.use('/services', serviceRoutes);
router.use('/offers', offerRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/call-center', callCenterRoutes);
router.use('/support', supportRoutes);
router.use('/packages', packageRoutes);
router.use('/contracts', contractRoutes);
router.use('/reviews', reviewRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
