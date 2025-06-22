const Product = require('../models/product.js');

let clients = new Set();

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
      productController.notifyClients();
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
      productController.notifyClients();
    } catch (error) {
      res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
  },

  // Create new product (admin only)
  createProduct: async (req, res) => {
    try {
      console.log('Received product data:', req.body);
      
      const product = new Product(req.body);
      console.log('Created product instance:', product);
      
      await product.save();
      console.log('Product saved successfully');
      
      res.status(201).json({ message: 'Product created successfully', product });
      productController.notifyClients();
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(400).json({ 
        message: 'Error creating product', 
        error: error.message,
        details: error.errors // This will show validation errors if any
      });
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
      productController.notifyClients();
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
      productController.notifyClients();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
  },

  // Handle SSE connections
  handleSSE: (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection message
    res.write('data: connected\n\n');

    // Add client to Set
    clients.add(res);

    // Remove client when connection closes
    req.on('close', () => {
      clients.delete(res);
    });
  },

  // Notify all clients of changes
  notifyClients: () => {
    clients.forEach(client => {
      client.write('data: update\n\n');
    });
  }
};

module.exports = productController;