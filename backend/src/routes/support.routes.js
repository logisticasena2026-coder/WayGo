// ============================================================
// WayGo - Rutas de soporte para usuarios: /api/support
// Clientes y conductores crean tickets; ven los propios.
// ============================================================
const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { requireAuth, requireActive } = require('../middlewares/auth');
const prisma = require('../utils/prisma');
const catchAsync = require('../utils/catchAsync');

const router = Router();

router.use(requireAuth, requireActive);

router.post('/tickets', [
  body('subject').trim().notEmpty().isLength({ max: 160 }),
  body('description').trim().notEmpty(),
  body('requestId').optional({ nullable: true }).isUUID(),
], validate, catchAsync(async (req, res) => {
  const ticket = await prisma.supportTicket.create({
    data: { subject: req.body.subject, description: req.body.description, reporterId: req.user.id, requestId: req.body.requestId || null },
  });
  res.status(201).json({ message: 'Reporte registrado. El call center lo revisara.', ticket });
}));

router.get('/tickets', catchAsync(async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { reporterId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ tickets });
}));

module.exports = router;
