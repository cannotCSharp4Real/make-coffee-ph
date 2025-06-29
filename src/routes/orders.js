const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Customer routes
router.post('/', auth, orderController.createOrder);
router.post('/:orderId/cancel', auth, orderController.cancelOrder);
router.get('/history', auth, orderController.getOrderHistory);

// Admin routes
router.get('/all', auth, adminAuth, orderController.getAllOrders);
router.put('/:orderId/status', auth, adminAuth, orderController.updateOrderStatus);

// Serve checkout page
router.get('/checkout', auth, (req, res) => {
    res.sendFile('checkout.html', { root: './src/public' });
});

// Get user's orders (for polling)
router.get('/my-orders', auth, orderController.getMyOrders);

module.exports = router;
