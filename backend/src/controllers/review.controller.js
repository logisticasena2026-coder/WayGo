// ============================================================
// WayGo - Controlador de evaluaciones
// ============================================================
const reviewService = require('../services/review.service');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../utils/prisma');

const criteriaList = catchAsync(async (req, res) => {
  const criteria = await prisma.reviewCriteria.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  const map = {};
  for (const c of criteria) map[c.code] = c.id;
  res.json({ criteria: map });
});

const create = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(req.user.id, req.body, req);
  res.status(201).json({ message: 'Evaluacion registrada', review });
});

const listMine = catchAsync(async (req, res) => {
  const result = await reviewService.listMyReviews(req.user.id);
  res.json(result);
});

const driverSummary = catchAsync(async (req, res) => {
  const summary = await reviewService.getDriverSummary(req.params.id);
  res.json({ summary });
});

module.exports = { create, listMine, driverSummary, criteriaList };
