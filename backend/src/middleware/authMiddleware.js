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
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;