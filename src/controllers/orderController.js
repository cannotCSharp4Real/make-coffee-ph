const { Order, getNextOrderNumber } = require('../models/order');
const Cart = require('../models/cart');

const orderController = {
    // Create a new order
    createOrder: async (req, res) => {
        try {
            const userId = req.user._id;
            const { deliveryMethod, deliveryAddress } = req.body;

            // Get user's cart with populated items
            const cart = await Cart.findOne({ user: userId }).populate('items.product');

            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ message: 'Cart is empty or not found' });
            }

            // Get the next order number
            const orderNumber = await getNextOrderNumber();

            // Calculate total amount including delivery fee
            const totalAmount = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            const deliveryFee = deliveryMethod === 'delivery' ? 50 : 0;

            // Create order object
            const orderData = {
                orderNumber,
                user: userId,
                items: cart.items.map(item => ({
                    product: item.product._id,
                    quantity: item.quantity,
                    size: item.size,
                    addOns: item.addOns || [],
                    totalPrice: item.totalPrice
                })),
                deliveryMethod,
                deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : '',
                totalAmount,
                deliveryFee,
                status: 'pending'
            };

            const order = new Order(orderData);
            await order.save();

            // Clear the cart
            await Cart.findOneAndUpdate(
                { user: userId },
                { $set: { items: [] } },
                { new: true }
            );

            // Return the populated order
            const populatedOrder = await Order.findById(order._id)
                .populate('items.product')
                .populate('user', '-password');

            res.status(201).json({
                message: 'Order created successfully',
                order: populatedOrder,
                cancellationWindow: 10
            });

        } catch (error) {
            console.error('Error in createOrder:', error);
            if (error.code === 11000) {
                return res.status(500).json({
                    message: 'Error creating order number, please try again',
                    error: error.message
                });
            }
            res.status(500).json({
                message: 'Failed to create order',
                error: error.message
            });
        }
    },

    // Cancel an order
    cancelOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const userId = req.user._id;

            const order = await Order.findOne({
                _id: orderId,
                user: userId,
                status: 'pending'
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Order not found or cannot be cancelled'
                });
            }

            order.status = 'cancelled';
            await order.save();

            res.json({ message: 'Order cancelled successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get user's order history
    getOrderHistory: async (req, res) => {
        try {
            const orders = await Order.find({ user: req.user._id })
                .populate('items.product')
                .sort({ createdAt: -1 });

            res.json(orders);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Admin: Update order status
    updateOrderStatus: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            const order = await Order.findByIdAndUpdate(
                orderId,
                { status },
                { 
                    new: true,
                    runValidators: true
                }
            ).populate('user', 'name email')
             .populate('items.product', 'name price');

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Send WebSocket notification to the customer
            if (order.user && req.app.locals.wss) {
                const message = {
                    type: 'orderStatusUpdate',
                    orderId: order._id,
                    status: order.status,
                    message: `Your order #${order.orderNumber} status has been updated to ${status.toUpperCase()}`
                };

                req.app.locals.wss.clients.forEach(client => {
                    // Check if the client's token matches the order's user
                    if (client.userId && client.userId.toString() === order.user._id.toString()) {
                        client.send(JSON.stringify(message));
                    }
                });
            }

            res.json(order);
        } catch (error) {
            console.error('Error in updateOrderStatus:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Admin: Get all orders
    getAllOrders: async (req, res) => {
        try {
            const orders = await Order.find()
                .populate('user', 'name email')
                .populate('items.product', 'name price')
                .sort({ createdAt: -1 });

            res.json(orders);
        } catch (error) {
            console.error('Error in getAllOrders:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Get user's orders
    getMyOrders: async (req, res) => {
        try {
            const orders = await Order.find({ user: req.user._id })
                .populate('items.product', 'name price')
                .sort({ createdAt: -1 });

            res.json(orders);
        } catch (error) {
            console.error('Error in getMyOrders:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = orderController;
