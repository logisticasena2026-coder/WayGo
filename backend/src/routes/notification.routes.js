// ============================================================
// WayGo - Rutas de notificaciones: /api/notifications
// ============================================================
const { Router } = require('express');
const { requireAuth, requireActive } = require('../middlewares/auth');
const prisma = require('../utils/prisma');
const catchAsync = require('../utils/catchAsync');

const router = Router();
router.use(requireAuth, requireActive);

router.get('/', catchAsync(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unread = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
  res.json({ notifications, unread });
}));

router.put('/read-all', catchAsync(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ message: 'Notificaciones marcadas como leidas' });
}));

module.exports = router;
