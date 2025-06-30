const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.post('/order', protect, orderController.createOrder);
router.patch('/update/:id', protect, orderController.updateOrder);
router.delete('/cancel/:id', protect, orderController.cancelOrder);
router.get('/my-orders', protect, orderController.getUserOrders);
router.get('/:id', protect, orderController.getOrder);

// Farmer routes
router.get('/farmer/orders', protect, authorize('farmer'), orderController.getFarmerOrders);
router.get('/farmer/:id', protect, authorize('farmer'), orderController.getFarmerOrder);
router.patch('/farmer/update-status/:id', protect, authorize('farmer'), orderController.updateOrderStatus);

module.exports = router; 