import { useState, useCallback } from 'react';
import api from '../services/api';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getPendingUsers();
      setUsers(response.data?.users || []);
      return response.data?.users || [];
    } catch (err) {
      setError(err.message || 'Failed to fetch pending users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getActiveUsers();
      setUsers(response.data?.users || []);
      return response.data?.users || [];
    } catch (err) {
      setError(err.message || 'Failed to fetch active users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBlockedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getBlockedUsers();
      setUsers(response.data?.users || []);
      return response.data?.users || [];
    } catch (err) {
      setError(err.message || 'Failed to fetch blocked users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const approveUser = useCallback(async (userId, password, permissions) => {
    try {
      const response = await api.approveUser(userId, password, permissions);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const rejectUser = useCallback(async (userId) => {
    try {
      const response = await api.rejectUser(userId);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const blockUser = useCallback(async (userId, reason) => {
    try {
      const response = await api.blockUser(userId, reason);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const unblockUser = useCallback(async (userId) => {
    try {
      const response = await api.unblockUser(userId);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const updatePermissions = useCallback(async (userId, permissions) => {
    try {
      const response = await api.updatePermissions(userId, permissions);
      if (response.success) {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, permissions } : u
        ));
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteUser = useCallback(async (userId) => {
    try {
      const response = await api.deleteUser(userId);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (userId, password) => {
    try {
      return await api.resetPassword(userId, password);
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    users,
    loading,
    error,
    fetchPendingUsers,
    fetchActiveUsers,
    fetchBlockedUsers,
    approveUser,
    rejectUser,
    blockUser,
    unblockUser,
    updatePermissions,
    deleteUser,
    resetPassword,
  };
}

export default useUsers;
