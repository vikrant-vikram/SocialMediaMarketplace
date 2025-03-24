


const resetMiddleware = (req, res, next) => {
    req.session.totp_verified = false;
    console.log("TOTP Reset");
    next();
  };


module.exports = resetMiddleware;