const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { requireAdminOrManager } = require('../middleware/role.middleware');
const {
  getCompanies,
  createCompany,
  bulkUpsertCompanies,
  deleteCompany
} = require('../Controller/company.controller');

router.use(authMiddleware);

router.get('/', getCompanies);
router.post('/', requireAdminOrManager, createCompany);
router.post('/bulk', requireAdminOrManager, bulkUpsertCompanies);
router.delete('/:id', requireAdminOrManager, deleteCompany);

module.exports = router;
