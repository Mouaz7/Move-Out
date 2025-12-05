module.exports = (req, res, next) => {
  // Endast redirect i production och om inte redan HTTPS
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    // Kolla efter x-forwarded-proto header (för reverse proxies som nginx)
    const forwardedProto = req.headers['x-forwarded-proto'];
    if (forwardedProto !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
  }
  next();
};
