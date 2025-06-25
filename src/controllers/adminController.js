const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');

const adminController = {
    // Order Management
    getAllOrders: async (req, res) => {
        try {
            const { status, date } = req.query;
            let query = {};

            if (status) {
                query.status = status;
            }

            if (date) {
                const startDate = new Date(date);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1);
                query.createdAt = { $gte: startDate, $lt: endDate };
            }

            const orders = await Order.find(query)
                .populate('user', 'email')
                .populate('items.product')
                .sort({ createdAt: -1 });

            res.json(orders);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching orders', error: error.message });
        }
    },

    updateOrderStatus: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            order.status = status;
            order.statusHistory.push({
                status,
                timestamp: new Date(),
                note: req.body.note || ''
            });

            await order.save();
            res.json(order);
        } catch (error) {
            res.status(500).json({ message: 'Error updating order status', error: error.message });
        }
    },

    // User Management
    getAllUsers: async (req, res) => {
        try {
            const users = await User.find({}, '-password')
                .sort({ createdAt: -1 });
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching users', error: error.message });
        }
    },

    updateUserRole: async (req, res) => {
        try {
            const { userId } = req.params;
            const { role } = req.body;

            const user = await User.findByIdAndUpdate(
                userId,
                { role },
                { new: true, select: '-password' }
            );

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            res.status(500).json({ message: 'Error updating user role', error: error.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User.findByIdAndDelete(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting user', error: error.message });
        }
    },

    // Sales Report
    getSalesReport: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            let dateQuery = {};

            if (startDate && endDate) {
                dateQuery = {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                };
            }

            const orders = await Order.find({
                ...dateQuery,
                status: { $in: ['completed', 'delivered'] }
            });

            // Calculate total sales
            const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

            // Calculate sales by product
            const salesByProduct = {};
            orders.forEach(order => {
                order.items.forEach(item => {
                    const productId = item.product.toString();
                    if (!salesByProduct[productId]) {
                        salesByProduct[productId] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    salesByProduct[productId].quantity += item.quantity;
                    salesByProduct[productId].revenue += item.totalPrice;
                });
            });

            // Calculate daily sales
            const dailySales = orders.reduce((acc, order) => {
                const date = order.createdAt.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = 0;
                }
                acc[date] += order.totalAmount;
                return acc;
            }, {});

            res.json({
                totalSales,
                orderCount: orders.length,
                salesByProduct,
                dailySales
            });
        } catch (error) {
            res.status(500).json({ message: 'Error generating sales report', error: error.message });
        }
    },

    // Product Management
    getAllProducts: async (req, res) => {
        try {
            const products = await Product.find().sort({ category: 1, name: 1 });
            res.json(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ message: 'Error fetching products', error: error.message });
        }
    },

    getProductById: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.json(product);
        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({ message: 'Error fetching product', error: error.message });
        }
    },

    createProduct: async (req, res) => {
        try {
            console.log('Creating product with data:', req.body);
            const product = new Product(req.body);
            await product.save();
            res.status(201).json(product);
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(400).json({ message: 'Error creating product', error: error.message });
        }
    },

    updateProduct: async (req, res) => {
        try {
            console.log('Updating product with data:', req.body);
            const product = await Product.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.json(product);
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(400).json({ message: 'Error updating product', error: error.message });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const product = await Product.findByIdAndDelete(req.params.id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.json({ message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({ message: 'Error deleting product', error: error.message });
        }
    }
};

module.exports = adminController;
