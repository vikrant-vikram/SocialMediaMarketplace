const crypto = require("crypto");

const CSRF_COOKIE_NAME = "XSRF-TOKEN"; // Readable cookie
const CSRF_HTTP_ONLY_COOKIE_NAME = "XSRF-SECURE"; // Secure HTTP-only cookie

const csrfMiddleware = (req, res, next) => {
    // Generate a CSRF token if it doesn't exist
    if (!req.cookies[CSRF_COOKIE_NAME] || !req.cookies[CSRF_HTTP_ONLY_COOKIE_NAME]) {
        const token = crypto.randomBytes(32).toString("hex");

        res.cookie(CSRF_COOKIE_NAME, token, {
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        res.cookie(CSRF_HTTP_ONLY_COOKIE_NAME, token, {
            httpOnly: true, // Prevent client-side JavaScript access
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        return next();
    }

    // Bypass CSRF check for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    // Verify CSRF token in cookies
    if (req.cookies[CSRF_COOKIE_NAME] !== req.cookies[CSRF_HTTP_ONLY_COOKIE_NAME]) {
        return res.status(403).json({ error: "CSRF token validation failed" });
    }

    next();
};

module.exports = csrfMiddleware;