// Constants for Admin Panel

export const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
};

export const PERMISSIONS = {
  AUTO_HIT: 'auto_hit',
  BYPASS: 'bypass',
  ADMIN: 'admin',
};

export const MESSAGES = {
  SUCCESS: {
    USER_APPROVED: 'User approved successfully',
    USER_REJECTED: 'User rejected and removed',
    USER_BLOCKED: 'User blocked successfully',
    USER_UNBLOCKED: 'User unblocked successfully',
    PERMISSIONS_UPDATED: 'Permissions updated successfully',
    PASSWORD_RESET: 'Password reset successfully',
    USER_DELETED: 'User deleted successfully',
  },
  ERROR: {
    FETCH_FAILED: 'Failed to fetch data',
    ACTION_FAILED: 'Action failed',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Unauthorized. Please login again.',
  },
};

export default {
  USER_STATUS,
  PERMISSIONS,
  MESSAGES,
};
