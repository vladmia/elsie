const express = require('express');
const router = express.Router();
const farmController = require('../controllers/farm.controller');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/public', farmController.getPublicProducts);

// Protected routes
router.get('/my-products', protect, farmController.getMyProducts);
router.post('/', protect, farmController.createProduct);
router.patch('/:id', protect, farmController.updateProduct);
router.delete('/:id', protect, farmController.deleteProduct);

// Admin routes
router.get('/admin-products', protect, authorize('admin'), farmController.getAllProductsAdmin);
router.patch('/:id/approve', protect, authorize('admin'), farmController.approveProduct);
router.post('/:id/approve', protect, authorize('admin'), farmController.approveProduct);

// Get single product by ID (must be last to avoid conflicts with other routes)
router.get('/:id', farmController.getProductById);

module.exports = router; 