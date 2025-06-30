const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { email, password, username } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ 
          message: 'Email and password are required' 
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'User with this email already exists' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        email,
        password: hashedPassword,
        username, // Add username if provided
        role: 'customer' // Default to customer role
      });

      await newUser.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          _id: newUser._id,  // Use _id consistently
          role: newUser.role 
        },
        process.env.JWT_SECRET || 'fallback-secret-key', // Add fallback secret key
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role
        }
      });

    } catch (error) {
      console.error('Registration error:', error); // Add detailed error logging
      res.status(500).json({ 
        message: 'Server error during registration', 
        error: error.message 
      });
    }
  },

 // Login user
 login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { _id: user._id, role: user.role },  // Use _id consistently
        process.env.JWT_SECRET || 'fallback-secret-key',  // Add fallback secret key
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user._id;  // Use _id consistently
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

module.exports = authController;