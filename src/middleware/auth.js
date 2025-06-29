const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        
        // Store user information consistently
        req.user = {
            _id: decoded.userId,  // Use _id consistently
            role: decoded.role
        };

        console.log('Authenticated user:', req.user);
        
    next();
  } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = auth;