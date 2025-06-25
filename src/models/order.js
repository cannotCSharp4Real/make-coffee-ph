const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
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
        size: String,
        addOns: [{
            name: String,
            price: Number
        }],
        totalPrice: {
            type: Number,
            required: true
        }
    }],
    deliveryMethod: {
        type: String,
        enum: ['delivery', 'pickup'],
        required: true
    },
    deliveryAddress: {
        type: String,
        required: function() {
            return this.deliveryMethod === 'delivery';
        }
    },
    paymentMethod: {
        type: String,
        enum: ['cod'],
        default: 'cod'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
