


const resetMiddleware = (req, res, next) => {
    // req.body = req.session.pendingFormData;
    console.log("Reset Middleware", req.body);
    delete req.session.totp_verified;
    console.log("TOTP Reset");
    next();
  };


module.exports = resetMiddleware;