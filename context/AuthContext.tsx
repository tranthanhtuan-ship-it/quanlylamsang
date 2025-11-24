
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { AuthService } from '../services/db';

interface AuthContextType {
  user: User | null;
  selectedDepartment: string | null; // Khoa được chọn khi đăng nhập
  login: (username: string, department?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('cmp_current_user');
    const storedDept = localStorage.getItem('cmp_current_dept');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedDept) {
      setSelectedDepartment(storedDept);
    }
    
    setLoading(false);
  }, []);

  const login = async (username: string, department?: string) => {
    const foundUser = await AuthService.login(username);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('cmp_current_user', JSON.stringify(foundUser));
      
      if (department) {
        setSelectedDepartment(department);
        localStorage.setItem('cmp_current_dept', department);
      } else {
        setSelectedDepartment(null);
        localStorage.removeItem('cmp_current_dept');
      }
      
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setSelectedDepartment(null);
    localStorage.removeItem('cmp_current_user');
    localStorage.removeItem('cmp_current_dept');
  };

  return (
    <AuthContext.Provider value={{ user, selectedDepartment, login, logout, loading }}>
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
