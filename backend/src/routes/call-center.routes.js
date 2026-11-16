// ============================================================
// WayGo - Rutas del call center: /api/call-center
// ============================================================
const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/callcenter.controller');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive, requireRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, requireActive, requireRole('CALL_CENTER'));

const uuid = (name) => [param(name).isUUID().withMessage(`${name} debe ser UUID`)];

router.get('/dashboard', ctrl.dashboard);
router.get('/map', ctrl.map);
router.get('/drivers/:id', uuid('id'), validate, ctrl.driverDetail);
router.get('/requests/:id', uuid('id'), validate, ctrl.requestDetail);
router.post('/assign', ctrl.manualAssign);
router.post('/requests/:id/cancel', uuid('id'), validate, ctrl.cancelService);

// Tickets / novedades
router.post('/tickets', [
  body('subject').trim().notEmpty().isLength({ max: 160 }),
  body('description').trim().notEmpty(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
], validate, ctrl.createTicket);
router.get('/tickets', ctrl.listTickets);
router.put('/tickets/:id', uuid('id'), validate, ctrl.updateTicket);

module.exports = router;
