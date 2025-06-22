const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('src/public'));

// MongoDB connection with detailed error logging
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coffee-shop', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('MONGODB_URI:', process.env.MONGODB_URI);
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error details:', err);
    res.status(500).json({
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
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
app.listen(PORT, () => {
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