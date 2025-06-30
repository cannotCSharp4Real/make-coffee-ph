const Product = require('../models/product.js');

// Store SSE clients
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
      
      // Notify clients of the update
      productController.notifyClients('update');
    } catch (error) {
      console.error('Error fetching products:', error);
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
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
  },

  // Create new product (admin only)
  createProduct: async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();
      res.status(201).json(product);
      
      // Notify clients of the update
      productController.notifyClients('create', product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(400).json({ 
        message: 'Error creating product', 
        error: error.message,
        details: error.errors
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
      
      res.json(product);
      
      // Notify clients of the update
      productController.notifyClients('update', product);
    } catch (error) {
      console.error('Error updating product:', error);
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
      
      // Notify clients of the update
      productController.notifyClients('delete', product);
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
  },

  // Handle SSE connections
  handleSSE: (req, res) => {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection message
    const data = JSON.stringify({ type: 'connected' });
    res.write(`data: ${data}\n\n`);

    // Create a client object with the response and a ping interval
    const clientId = Date.now();
    const client = {
      id: clientId,
      res,
      pingInterval: setInterval(() => {
        if (!res.finished) {
          const pingData = JSON.stringify({ type: 'ping', timestamp: Date.now() });
          res.write(`data: ${pingData}\n\n`);
        }
      }, 30000) // Send ping every 30 seconds
    };

    // Add client to Set
    clients.add(client);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(client.pingInterval);
      clients.delete(client);
    });

    // Handle errors
    res.on('error', (error) => {
      console.error('SSE error:', error);
      clearInterval(client.pingInterval);
      clients.delete(client);
    });
  },

  // Notify all clients of changes
  notifyClients: (eventType, data = null) => {
    const eventData = JSON.stringify({
      type: eventType,
      timestamp: Date.now(),
      data
    });

    clients.forEach(client => {
      try {
        if (!client.res.finished) {
          client.res.write(`data: ${eventData}\n\n`);
        }
      } catch (error) {
        console.error('Error sending SSE update:', error);
        clearInterval(client.pingInterval);
        clients.delete(client);
      }
    });
  }
};

module.exports = productController;