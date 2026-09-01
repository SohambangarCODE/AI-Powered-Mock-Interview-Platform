const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header is missing or invalid' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userID);
        if (!user) {
            return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
        }
        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Expected, happens on every stale session — not worth a stack trace.
            console.warn(`Auth: expired token (expired at ${error.expiredAt.toISOString()})`);
            return res.status(401).json({ message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
        }
        if (error.name === 'JsonWebTokenError') {
            console.warn('Auth: malformed or invalid token');
            return res.status(401).json({ message: 'Invalid token.', code: 'TOKEN_INVALID' });
        }
        console.error('Auth: unexpected error verifying token:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = authMiddleware;