import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch } from '../types';
import { authApi, mastersApi } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedBranchId: string | null;
  branches: Branch[];
  setSelectedBranchId: (branchId: string | null) => void;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithOtp: (mobileNumber: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => {
    const saved = localStorage.getItem('ks_selected_branch_id');
    return saved && saved !== 'undefined' && saved !== 'null' ? saved : null;
  });

  const setSelectedBranchId = (branchId: string | null) => {
    if (branchId && branchId !== 'undefined' && branchId !== 'null') {
      setSelectedBranchIdState(branchId);
      localStorage.setItem('ks_selected_branch_id', branchId);
    } else {
      setSelectedBranchIdState(null);
      localStorage.removeItem('ks_selected_branch_id');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      const raw = (res as any)?.data || res;
      const userObj = raw?.user ? { ...raw.user, permissions: raw.permissions } : raw;
      if (userObj) {
        setUser(userObj);
        localStorage.setItem('ks_user', JSON.stringify(userObj));
      }

      // Fetch branches for branch switcher
      try {
        const branchesRes = await mastersApi.getBranches();
        const branchList = (branchesRes as any)?.data || branchesRes || [];
        setBranches(Array.isArray(branchList) ? branchList : []);
        if (!selectedBranchId && userObj?.primary_branch_id) {
          setSelectedBranchId(userObj.primary_branch_id);
        }
      } catch (bErr) {
        console.warn('Could not load branches:', bErr);
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('ks_access_token');
      localStorage.removeItem('ks_refresh_token');
      localStorage.removeItem('ks_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('ks_access_token');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginWithPassword = async (email: string, password: string) => {
    const res: any = await authApi.loginPassword({
      email,
      password,
      devicePlatform: 'WEB',
    });

    const data = res?.data || res;
    const accessToken = data?.accessToken || data?.tokens?.accessToken;
    const refreshToken = data?.refreshToken || data?.tokens?.refreshToken;
    const userObj = data?.user ? { ...data.user, permissions: data.permissions } : data;

    if (accessToken) {
      localStorage.setItem('ks_access_token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('ks_refresh_token', refreshToken);
    }
    if (userObj) {
      setUser(userObj);
      localStorage.setItem('ks_user', JSON.stringify(userObj));
      if (userObj.primary_branch_id) {
        setSelectedBranchId(userObj.primary_branch_id);
      }
    }
    await refreshUser();
  };

  const loginWithOtp = async (mobileNumber: string, otpCode: string) => {
    const res: any = await authApi.loginOtp({
      mobileNumber,
      otpCode,
      devicePlatform: 'WEB',
    });

    const data = res?.data || res;
    const accessToken = data?.accessToken || data?.tokens?.accessToken;
    const refreshToken = data?.refreshToken || data?.tokens?.refreshToken;
    const userObj = data?.user ? { ...data.user, permissions: data.permissions } : data;

    if (accessToken) {
      localStorage.setItem('ks_access_token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('ks_refresh_token', refreshToken);
    }
    if (userObj) {
      setUser(userObj);
      localStorage.setItem('ks_user', JSON.stringify(userObj));
      if (userObj.primary_branch_id) {
        setSelectedBranchId(userObj.primary_branch_id);
      }
    }
    await refreshUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('ks_refresh_token');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        // ignore logout error
      }
    }
    localStorage.removeItem('ks_access_token');
    localStorage.removeItem('ks_refresh_token');
    localStorage.removeItem('ks_user');
    localStorage.removeItem('ks_selected_branch_id');
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.role_code === 'ROLE_SUPER_ADMIN') return true;
    return user.permissions?.includes(permissionCode) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        selectedBranchId,
        branches,
        setSelectedBranchId,
        loginWithPassword,
        loginWithOtp,
        logout,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
