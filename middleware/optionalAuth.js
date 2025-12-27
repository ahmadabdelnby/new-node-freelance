const jwt = require('jsonwebtoken');
const User = require('../Models/User');

/**
 * Optional Authentication Middleware
 * Checks if token exists and validates it, but doesn't fail if token is missing
 * Sets req.user if authenticated, otherwise continues without user
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers["authorization"];

    console.log('🔍 OptionalAuth - Auth Header:', authHeader ? 'Present' : 'Missing');

    // If no auth header, continue without user (guest access)
    if (!authHeader) {
        req.user = null;
        return next();
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user still exists in database
        const userExists = await User.findById(payload.id).select('_id email role');

        if (!userExists) {
            console.log(`⚠️ Deleted user attempted access: ${payload.id}`);
            req.user = null;
            return next();
        }

        console.log('✅ OptionalAuth - User authenticated:', payload.id);
        req.user = payload;
        next();
    } catch (err) {
        console.error('⚠️ Optional auth - Invalid token:', err.message);
        // Don't fail, just continue without user
        req.user = null;
        next();
    }
}

module.exports = optionalAuth;
