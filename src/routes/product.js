const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// All routes require authentication and admin role
router.use(auth, isAdmin);

router.post('/', productController.create);
router.get('/', productController.getAll);
router.get('/:id', productController.getOne);
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);

module.exports = router; 