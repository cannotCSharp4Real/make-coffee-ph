const mongoose = require('mongoose');

// Define a schema for size variants (for drinks)
const sizeVariantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    enum: ['small', 'medium', 'large']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

// Define a schema for add-ons (for drinks)
const addOnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['drink', 'food']
  },
  category: {
    type: String,
    required: true,
    enum: [
      // Drink categories
      'hot-coffee',
      'iced-coffee',
      'tea',
      'frappe',
      'smoothie',
      // Food categories
      'pastries',
      'sandwiches',
      'desserts',
      'snacks'
    ]
  },
  available: {
    type: Boolean,
    default: true
  },
  // Fields specific to drinks
  sizeVariants: {
    type: [sizeVariantSchema],
    required: function() {
      return this.type === 'drink';
    },
    validate: {
      validator: function(variants) {
        return this.type !== 'drink' || variants.length > 0;
      },
      message: 'Drinks must have at least one size variant'
    }
  },
  addOns: {
    type: [addOnSchema],
    default: function() {
      return this.type === 'drink' ? [] : undefined;
    }
  },
  // Fields specific to food
  price: {
    type: Number,
    required: function() {
      return this.type === 'food';
    },
    min: 0
  },
}, {
  timestamps: true
});

// Add indexes for common queries
productSchema.index({ type: 1, category: 1 });
productSchema.index({ available: 1 });

module.exports = mongoose.model('Product', productSchema);
