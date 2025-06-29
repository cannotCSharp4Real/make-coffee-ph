const Cart = require('../models/cart');
const Product = require('../models/product');
const { v4: uuidv4 } = require('uuid');

const cartController = {
    // Get cart (works for both guest and logged-in users)
    getCart: async (req, res) => {
        try {
            let cart;
            if (req.user) {
                // Logged-in user
                cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
            } else {
                // Guest user
                const guestId = req.cookies.guestId || uuidv4();
                res.cookie('guestId', guestId, { 
                    httpOnly: true, 
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });
                cart = await Cart.findOne({ guestId }).populate('items.product');
            }
            res.json(cart || { items: [], totalAmount: 0 });
        } catch (error) {
            console.error('Error getting cart:', error);
            res.status(500).json({ message: 'Error getting cart', error: error.message });
        }
    },

    // Add to cart
    addToCart: async (req, res) => {
        try {
            const { productId, quantity = 1, size, addOns = [] } = req.body;

            // Get product to calculate price
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            let cart;
            if (req.user) {
                cart = await Cart.findOne({ user: req.user._id });
                if (!cart) {
                    cart = new Cart({ 
                        user: req.user._id,
                        items: []
                    });
                }
            } else {
                const guestId = req.cookies.guestId || uuidv4();
                res.cookie('guestId', guestId, { 
                    httpOnly: true, 
                    maxAge: 7 * 24 * 60 * 60 * 1000 
                });
                cart = await Cart.findOne({ guestId });
                if (!cart) {
                    cart = new Cart({ 
                        guestId,
                        items: [],
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    });
                }
            }

            // Calculate total price
            const totalPrice = calculateTotalPrice(product, quantity, size, addOns);

            // Add item to cart
            cart.items.push({
                product: productId,
                quantity,
                size,
                addOns,
                totalPrice
            });

            await cart.save();
            await cart.populate('items.product');
            res.json(cart);
        } catch (error) {
            console.error('Error adding to cart:', error);
            res.status(500).json({ message: 'Error adding to cart', error: error.message });
        }
    },

    // Update cart item
    updateCartItem: async (req, res) => {
        try {
            const { itemId, quantity } = req.body;
            
            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' });
            }

            const item = cart.items.id(itemId);
            if (!item) {
                return res.status(404).json({ message: 'Cart item not found' });
            }

            // Calculate new total price
            const product = await Product.findById(item.product);
            const totalPrice = calculateTotalPrice(product, quantity, item.size, item.addOns);

            item.quantity = quantity;
            item.totalPrice = totalPrice;

            await cart.save();
            await cart.populate('items.product');

            res.json(cart);
        } catch (error) {
            console.error('Error updating cart:', error);
            res.status(500).json({ message: 'Error updating cart', error: error.message });
        }
    },

    // Remove item from cart
    removeFromCart: async (req, res) => {
        try {
            const { itemId } = req.params;
            
            const cart = await Cart.findOne({ user: req.user._id });
            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' });
            }

            cart.items = cart.items.filter(item => item._id.toString() !== itemId);
            await cart.save();
            await cart.populate('items.product');

            res.json(cart);
        } catch (error) {
            console.error('Error removing from cart:', error);
            res.status(500).json({ message: 'Error removing from cart', error: error.message });
        }
    },

    // Merge guest cart with user cart on login
    mergeCart: async (req, res) => {
        try {
            const { guestId } = req.cookies;
            if (!guestId || !req.user) {
                return res.status(400).json({ message: 'No guest cart to merge' });
            }

            // Find guest and user carts
            const guestCart = await Cart.findOne({ guestId });
            let userCart = await Cart.findOne({ user: req.user._id });

            if (!guestCart) {
                return res.status(404).json({ message: 'Guest cart not found' });
            }

            if (!userCart) {
                // If user has no cart, convert guest cart to user cart
                guestCart.user = req.user._id;
                guestCart.guestId = undefined;
                guestCart.expiresAt = undefined;
                await guestCart.save();
                return res.json(guestCart);
            }

            // Merge items from guest cart to user cart
            userCart.items = [...userCart.items, ...guestCart.items];
            await userCart.save();

            // Delete guest cart
            await Cart.deleteOne({ guestId });

            // Clear guest cookie
            res.clearCookie('guestId');

            await userCart.populate('items.product');
            res.json(userCart);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// Helper function to calculate total price
function calculateTotalPrice(product, quantity, size, addOns = []) {
    let basePrice = 0;
    
    // Get base price based on product type and size
    if (product.type === 'food') {
        basePrice = product.price;
    } else {
        // For drinks, get price based on size from sizeVariants
        const sizeVariant = product.sizeVariants.find(v => v.size === size);
        if (!sizeVariant) {
            throw new Error(`Invalid size ${size} for product ${product.name}`);
        }
        basePrice = sizeVariant.price;
    }

    // Calculate add-ons total
    const addOnsTotal = addOns.reduce((total, addon) => total + addon.price, 0);

    return (basePrice + addOnsTotal) * quantity;
}

module.exports = cartController;
