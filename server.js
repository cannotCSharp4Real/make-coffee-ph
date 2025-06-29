const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('src/public'));

// MongoDB connection with detailed error logging
mongoose.connect('mongodb://127.0.0.1:27017/coffee-shop', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB successfully');
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
});

mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});

// Add this after your mongoose.connect call
mongoose.connection.once('open', async () => {
    try {
        // Initialize the order number counter if it doesn't exist
        const Counter = require('./src/models/counter');
        await Counter.findOneAndUpdate(
            { _id: 'orderNumber' },
            {},
            { upsert: true }
        );
        console.log('Order number counter initialized successfully');
    } catch (error) {
        console.error('Error initializing order number counter:', error);
    }
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
const orderRoutes = require('./src/routes/orders');
app.use('/api/orders', orderRoutes);
app.use('/api/admin', require('./src/routes/admin'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? {
            message: err.message,
            stack: err.stack
        } : {}
    });
});

// Serve index.html from the correct location
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coffee-shop'}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});