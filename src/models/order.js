const mongoose = require('mongoose');
const Counter = require('./counter');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: Number,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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

// Function to get the next order number
async function getNextOrderNumber() {
    const counter = await Counter.findByIdAndUpdate(
        'orderNumber',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}

module.exports = {
    Order: mongoose.model('Order', orderSchema),
    getNextOrderNumber
};
