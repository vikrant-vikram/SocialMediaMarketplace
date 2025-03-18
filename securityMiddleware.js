const bcrypt = require("bcrypt");
const User = require("./models/users"); // Import your User model

const securityMiddleware = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        // If already verified, proceed
        if (req.session.extraAuth) {
            return next();
        }

        //  Store the original request URL in session
        if (!req.session.pendingUrl) {
            req.session.pendingUrl = req.originalUrl;
        }

        console.log(" Extra authentication required.",  req.session.pendingUrl);

        // If request is GET, return an authentication form
        if (req.method === "GET") {
            return res.send(`
                <html>
                    <head>
                        <title>Extra Authentication Required</title>
                    </head>
                    <body>
                        <h2>Confirm Your Identity</h2>
                        <form method="POST" action="/verification/huhaha">
                            <label for="username">Contact:</label>
                            <input type="text" name="mobile_number" required><br><br>
                            <label for="password">Password:</label>
                            <input type="password" name="password" required><br><br>
                            <button type="submit">Verify</button>
                        </form>
                    </body>
                </html>
            `);
        }

        next(); // Let it continue for POST requests
    } catch (error) {
        console.error("Security Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = securityMiddleware;