const Cart = require('../models/cart');
const Product = require('../models/product');

const cartController = {
    // Get user's cart
    getCart: async (req, res) => {
        try {
            let cart = await Cart.findOne({ user: req.user.userId })
                .populate('items.product');
            
            if (!cart) {
                cart = await Cart.create({ 
                    user: req.user.userId,
                    items: []
                });
            }
            
            res.json(cart);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching cart', error: error.message });
        }
    },

    // Add item to cart
    addToCart: async (req, res) => {
        try {
            const { productId, quantity, size, addOns } = req.body;

            // Validate product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Calculate total price
            let totalPrice = 0;
            if (product.type === 'food') {
                totalPrice = product.price * quantity;
            } else {
                const sizeVariant = product.sizeVariants.find(v => v.size === size);
                if (!sizeVariant) {
                    return res.status(400).json({ message: 'Invalid size selected' });
                }
                totalPrice = sizeVariant.price * quantity;
            }

            // Add add-ons price if any
            if (addOns && addOns.length > 0) {
                const addOnsTotal = addOns.reduce((total, addon) => total + addon.price, 0);
                totalPrice += addOnsTotal * quantity;
            }

            // Find or create cart
            let cart = await Cart.findOne({ user: req.user.userId });
            if (!cart) {
                cart = new Cart({ user: req.user.userId, items: [] });
            }

            // Check if item already exists in cart
            const existingItemIndex = cart.items.findIndex(item => 
                item.product.toString() === productId &&
                item.size === size &&
                JSON.stringify(item.addOns) === JSON.stringify(addOns)
            );

            if (existingItemIndex > -1) {
                // Update existing item
                cart.items[existingItemIndex].quantity += quantity;
                cart.items[existingItemIndex].totalPrice += totalPrice;
            } else {
                // Add new item
                cart.items.push({
                    product: productId,
                    quantity,
                    size,
                    addOns,
                    totalPrice
                });
            }

            await cart.save();
            await cart.populate('items.product');

            res.json(cart);
        } catch (error) {
            res.status(500).json({ message: 'Error adding to cart', error: error.message });
        }
    },

    // Update cart item
    updateCartItem: async (req, res) => {
        try {
            const { itemId, quantity } = req.body;
            
            const cart = await Cart.findOne({ user: req.user.userId });
            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' });
            }

            const item = cart.items.id(itemId);
            if (!item) {
                return res.status(404).json({ message: 'Cart item not found' });
            }

            // Calculate new total price
            const unitPrice = item.totalPrice / item.quantity;
            item.quantity = quantity;
            item.totalPrice = unitPrice * quantity;

            await cart.save();
            await cart.populate('items.product');

            res.json(cart);
        } catch (error) {
            res.status(500).json({ message: 'Error updating cart', error: error.message });
        }
    },

    // Remove item from cart
    removeFromCart: async (req, res) => {
        try {
            const { itemId } = req.params;
            
            const cart = await Cart.findOne({ user: req.user.userId });
            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' });
            }

            cart.items = cart.items.filter(item => item._id.toString() !== itemId);
            await cart.save();
            await cart.populate('items.product');

            res.json(cart);
        } catch (error) {
            res.status(500).json({ message: 'Error removing from cart', error: error.message });
        }
    }
};

module.exports = cartController;
