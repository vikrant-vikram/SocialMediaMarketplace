const speakeasy = require("speakeasy");

const totpMiddleware = async (req, res, next) => {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.redirect("/login"); // Redirect to login if no session
        }

        // If user is already TOTP verified, allow access
        if (req.session.totp_verified) {
            console.log("TOTP Verified");
            return next();
        }
        req.session.returnTo = req.originalUrl;
        // If TOTP code was submitted
        if (req.method === "POST" && req.body.totp_token) {
            const user = req.session.user;

            const isValid = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: "base32",
                token: req.body.totp_token,
                window: 1, // Allow small time drift
            });

            

            if (isValid) {
                req.session.totp_verified = true; // Mark user as verified
                return res.redirect(req.originalUrl); // Redirect to requested page
            } else {
                return res.send(`
                    <h2> Invalid TOTP Code. Try again.</h2>
                    <form method="POST">
                        <label for="totp_token">Enter TOTP Code:</label>
                        <input type="text" name="totp_token" required>
                        <button type="submit">Verify</button>
                    </form>
                `);
            }
        }

        // If no TOTP submitted, show form
        res.send(`
            <h2>🔐 Two-Factor Authentication Required</h2>
            <form method="POST" action= "/verify-totp">
                <label for="totp_token">Enter TOTP Code:</label>
                <input type="text" name="mobile_number" required>
                <input type="text" name="totp_token" required>
                <button type="submit">Verify</button>
            </form>
        `);

    } catch (err) {
        console.error("TOTP Middleware Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = totpMiddleware;