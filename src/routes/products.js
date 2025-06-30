const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Product = require('../models/product');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/events', productController.handleSSE);  // SSE endpoint
router.get('/:id', productController.getProductById);

// Admin-only routes (protected)
router.post('/', auth, adminAuth, productController.createProduct);
router.put('/:id', auth, adminAuth, productController.updateProduct);
router.delete('/:id', auth, adminAuth, productController.deleteProduct);

module.exports = router; 