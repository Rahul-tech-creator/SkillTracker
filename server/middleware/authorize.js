/**
 * Role-based authorization middleware factory.
 * Usage: authorize('ADMIN') or authorize('ADMIN', 'PROVIDER')
 * Must be used AFTER protect middleware.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

module.exports = { authorize };
