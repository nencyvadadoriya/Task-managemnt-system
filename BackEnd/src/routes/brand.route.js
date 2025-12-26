const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { requireAdminOrManager } = require('../middleware/role.middleware');
const {
    getBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand,
} = require('../Controller/brand.controller');


// Apply auth middleware to all brand routes
router.use(authMiddleware);

router.get('/', getBrands);
router.get('/:id', getBrandById);
router.post('/', requireAdminOrManager, createBrand);
router.put('/:id', requireAdminOrManager, updateBrand);
router.delete('/:id', requireAdminOrManager, deleteBrand);

module.exports = router;