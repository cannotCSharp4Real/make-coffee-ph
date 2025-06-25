const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/order');
const Cart = require('../models/cart');

router.use(auth);

// Create new order
router.post('/', async (req, res) => {
    try {
        const {
            items,
            deliveryMethod,
            deliveryAddress,
            paymentMethod,
            totalAmount,
            deliveryFee
        } = req.body;

        const order = new Order({
            user: req.user.userId,
            items,
            deliveryMethod,
            deliveryAddress,
            paymentMethod,
            totalAmount,
            deliveryFee,
            status: 'pending'
        });

        await order.save();

        // Clear the user's cart after successful order
        await Cart.findOneAndUpdate(
            { user: req.user.userId },
            { $set: { items: [] } }
        );

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
});

module.exports = router;
