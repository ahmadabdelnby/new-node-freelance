const jwt = require('jsonwebtoken');
const User = require('../Models/User');

async function authenticate(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header not found, you must be logged in" });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
        return res.status(401).json({ message: "Token not found, you must be logged in" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 🔥 CRITICAL: Verify user still exists in database
        const userExists = await User.findById(payload.id).select('_id email role');

        if (!userExists) {
            console.log(`⚠️ Deleted user attempted access: ${payload.id}`);
            return res.status(401).json({
                message: "User account no longer exists. Please login again.",
                accountDeleted: true // Signal to frontend to clear tokens
            });
        }

        req.user = payload;
        next();
    } catch (err) {
        console.error('❌ JWT verification error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired, please login again" });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid token" });
        }
        return res.status(401).json({ message: "Authentication failed" });
    }
}

module.exports = authenticate;