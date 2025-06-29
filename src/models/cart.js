const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    size: {
        type: String,
        enum: ['small', 'medium', 'large'],
        required: function() {
            return this.type === 'drink';
        }
    },
    addOns: [{
        name: String,
        price: Number
    }],
    totalPrice: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return !this.guestId; // Only required if there's no guestId
        }
    },
    guestId: {
        type: String,
        required: function() {
            return !this.user; // Only required if there's no user
        }
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: function() {
            return !!this.guestId; // Required for guest carts
        }
    }
}, {
    timestamps: true
});

// Update total amount before saving
cartSchema.pre('save', function(next) {
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
    next();
});

// Add this method to the cartSchema before creating the model
cartSchema.methods.toJSON = function() {
    const cart = this.toObject();
    if (cart.user && typeof cart.user === 'object') {
        cart.user = cart.user._id || cart.user;
    }
    return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
