const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin-only routes (protected)
router.post('/', auth, adminAuth, productController.createProduct);
router.put('/:id', auth, adminAuth, productController.updateProduct);
router.delete('/:id', auth, adminAuth, productController.deleteProduct);

// Add this new route in src/routes/products.js
router.get('/events', productController.handleSSE);

module.exports = router; 