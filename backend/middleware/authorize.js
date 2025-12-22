// ===================================
// AUTHORIZE.JS
// Permission Authorization Middleware
// ===================================

/**
 * Check if user has specific permission
 */
function hasPermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const permissions = req.user.permissions || {};

    if (!permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} access required`
      });
    }

    next();
  };
}

/**
 * Check if user has any of the specified permissions
 */
function hasAnyPermission(...permissionList) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const permissions = req.user.permissions || {};
    const hasAny = permissionList.some(perm => permissions[perm]);

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: One of [${permissionList.join(', ')}] required`
      });
    }

    next();
  };
}

/**
 * Check if user has all of the specified permissions
 */
function hasAllPermissions(...permissionList) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const permissions = req.user.permissions || {};
    const hasAll = permissionList.every(perm => permissions[perm]);

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: All of [${permissionList.join(', ')}] required`
      });
    }

    next();
  };
}

/**
 * Check if user is admin
 */
function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const permissions = req.user.permissions || {};

  if (!permissions.admin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Check if user owns the resource
 */
function isOwner(userIdField = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (parseInt(resourceUserId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own resources'
      });
    }

    next();
  };
}

/**
 * Check if user is owner OR admin
 */
function isOwnerOrAdmin(userIdField = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const permissions = req.user.permissions || {};
    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    const isOwner = parseInt(resourceUserId) === req.user.id;
    const isAdmin = permissions.admin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Must be owner or admin'
      });
    }

    next();
  };
}

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdmin,
  isOwner,
  isOwnerOrAdmin
};
