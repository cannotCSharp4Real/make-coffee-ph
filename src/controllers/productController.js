const Product = require('../models/product.js');

const productController = {
  // Get all products
  getAllProducts: async (req, res) => {
    try {
      const { type, category, available } = req.query;
      const filter = {};
      
      if (type) filter.type = type;
      if (category) filter.category = category;
      if (available !== undefined) filter.available = available === 'true';

      const products = await Product.find(filter);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
  },

  // Get single product by ID
  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
  },

  // Create new product (admin only)
  createProduct: async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();
      res.status(201).json({ message: 'Product created successfully', product });
    } catch (error) {
      res.status(400).json({ message: 'Error creating product', error: error.message });
    }
  },

  // Update product (admin only)
  updateProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      res.json({ message: 'Product updated successfully', product });
    } catch (error) {
      res.status(400).json({ message: 'Error updating product', error: error.message });
    }
  },

  // Delete product (admin only)
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      res.json({ message: 'Product deleted successfully', product });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
  }
};

module.exports = productController;