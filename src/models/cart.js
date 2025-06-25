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
        ref: 'user',
        required: true
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Update total amount before saving
cartSchema.pre('save', function(next) {
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
    next();
});

module.exports = mongoose.model('Cart', cartSchema);
