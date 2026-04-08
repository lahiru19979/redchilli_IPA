// import React, {createContext, useState, useContext, useEffect} from 'react';
// import {storage, StorageKeys} from '../utils/storage';
// import {authAPI} from '../api/apiClient';

// const AuthContext = createContext({});

// export const AuthProvider = ({children}) => {
//   const [user, setUser] = useState(null);
//   const [token, setToken] = useState(null);
//   const [loading, setLoading] = useState(true);
  

//   useEffect(() => {
//     loadStoredAuth();
//   }, []);

//   const loadStoredAuth = async () => {
//     try {
//       const storedToken = await storage.get(StorageKeys.TOKEN);
//       const storedUser = await storage.get(StorageKeys.USER);
      
//       if (storedToken && storedUser) {
//         setToken(storedToken);
//         setUser(storedUser);
//       }
//     } catch (error) {
//       console.error('Load auth error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const login = async (email, password) => {
//     try {
//       const response = await authAPI.login(email, password);
//       const data = response.data;
      
//       console.log('Login Response:', data);
      
//       // Check if login was successful
//       if (!data.status) {
//         return {success: false, message: data.message || 'Login failed'};
//       }
      
//       // Extract token and user from YOUR API structure
//       const authToken = data.access_token;
//       const userData = data.user;
      
//       if (!authToken) {
//         return {success: false, message: 'No token received'};
//       }
      
//       if (!userData) {
//         return {success: false, message: 'No user data received'};
//       }
      
//       // Store token and user
//       await storage.set(StorageKeys.TOKEN, authToken);
//       await storage.set(StorageKeys.USER, userData);
      
//       setToken(authToken);
//       setUser(userData);
      
//       console.log('Login successful!');
//       console.log('Token saved:', authToken);
//       console.log('User saved:', userData.first_name);
      
//       return {success: true};
//     } catch (error) {
//       console.error('Login error:', error);
//       console.error('Error response:', error.response?.data);
      
//       const message = 
//         error.response?.data?.message || 
//         error.response?.data?.error ||
//         error.message ||
//         'Login failed. Please try again.';
      
//       return {success: false, message};
//     }
//   };

//   const logout = async () => {
//     try {
//       await authAPI.logout();
//     } catch (error) {
//       console.error('Logout API error:', error);
//     } finally {
//       await storage.clear();
//       setToken(null);
//       setUser(null);
//     }
//   };

//   const updateUser = async (userData) => {
//     setUser(userData);
//     await storage.set(StorageKeys.USER, userData);
//   };

//   // Helper to get full name
//   const getFullName = () => {
//     if (!user) return 'User';
//     return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         token,
//         loading,
//         isAuthenticated: !!token,
//         login,
//         logout,
//         updateUser,
//         getFullName,
//       }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within AuthProvider');
//   }
//   return context;
// };

// context/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import { storage, StorageKeys } from '../utils/storage';
import { authAPI } from '../api/apiClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.get(StorageKeys.TOKEN);
      const storedUser = await storage.get(StorageKeys.USER);
      const storedPermissions = await storage.get(StorageKeys.PERMISSIONS);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        setPermissions(storedPermissions || []);
      }
    } catch (error) {
      console.error('Load auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const data = response.data;

      console.log('Login Response:', data);

      // Check if login was successful
      if (!data.status) {
        return { success: false, message: data.message || 'Login failed' };
      }

      // Extract token, user, and permissions from API response
      const authToken = data.access_token;
      const userData = data.user;
      const userPermissions = data.permissions || [];

      if (!authToken) {
        return { success: false, message: 'No token received' };
      }

      if (!userData) {
        return { success: false, message: 'No user data received' };
      }

      // Store token, user, and permissions
      await storage.set(StorageKeys.TOKEN, authToken);
      await storage.set(StorageKeys.USER, userData);
      await storage.set(StorageKeys.PERMISSIONS, userPermissions);

      setToken(authToken);
      setUser(userData);
      setPermissions(userPermissions);

      console.log('Login successful!');
      console.log('Token saved:', authToken);
      console.log('User saved:', userData.first_name);
      console.log('Permissions saved:', userPermissions);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Login failed. Please try again.';

      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await storage.clear();
      setToken(null);
      setUser(null);
      setPermissions([]);
    }
  };

  const updateUser = async (userData) => {
    setUser(userData);
    await storage.set(StorageKeys.USER, userData);
  };

  /**
   * Check if user has a specific permission
   * User type 1 has ALL permissions
   * @param {string|string[]} permission - Permission name or array of names
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    // User type 1 (Admin) has ALL permissions
    if (user?.role_id == 1) {
      return true;
    }

    // If no permission required, allow access
    if (!permission) return true;

    // If array, check if user has ANY of the permissions
    if (Array.isArray(permission)) {
      return permission.some(p => permissions.includes(p));
    }

    // Check single permission
    return permissions.includes(permission);
  };

  /**
   * Check if user has ALL specified permissions
   * @param {string[]} permissionList - Array of permission names
   * @returns {boolean}
   */
  const hasAllPermissions = (permissionList) => {
    // User type 1 (Admin) has ALL permissions
    if (user?.role_id == 1) {
      return true;
    }

    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.every(p => permissions.includes(p));
  };

  /**
   * Check if user is admin (role_id 1)
   * @returns {boolean}
   */
  const isAdmin = () => {
    return user?.role_id == 1;
  };

  /**
   * Refresh permissions from server
   * @returns {Promise<boolean>}
   */
  const refreshPermissions = async () => {
    try {
      const response = await authAPI.getPermissions();
      if (response.data.status) {
        const newPermissions = response.data.permissions;
        setPermissions(newPermissions);
        await storage.set(StorageKeys.PERMISSIONS, newPermissions);
        console.log('Permissions refreshed:', newPermissions);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      return false;
    }
  };

  // Helper to get full name
  const getFullName = () => {
    if (!user) return 'User';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        loading,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
        getFullName,
        hasPermission,
        hasAllPermissions,
        isAdmin,
        refreshPermissions,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};