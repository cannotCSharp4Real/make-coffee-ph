const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Product = require('../models/product');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin-only routes (protected)
router.post('/', auth, adminAuth, productController.createProduct);
router.put('/:id', auth, adminAuth, productController.updateProduct);
router.delete('/:id', auth, adminAuth, productController.deleteProduct);

// Add this new route in src/routes/products.js
router.get('/events', productController.handleSSE);

// SSE endpoint for real-time product updates
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send an initial message
    res.write('data: {"type": "connected"}\n\n');

    // Create a function to send updates
    const sendUpdate = () => {
        if (!res.finished) {
            res.write('data: {"type": "ping"}\n\n');
        }
    };

    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(sendUpdate, 30000);

    // Handle client disconnect
    req.on('close', () => {
        clearInterval(pingInterval);
    });
});

module.exports = router; 