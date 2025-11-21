
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { 
  Users, GraduationCap, Calendar, ClipboardList, 
  FileText, Activity, LogOut, LayoutDashboard, BookOpen, PieChart, Network, Search
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800';

  const navItems = [
    { name: 'Tổng quan', path: '/', icon: LayoutDashboard, roles: [Role.ADMIN, Role.LECTURER, Role.STUDENT] },
    { name: 'Thống kê', path: '/statistics', icon: PieChart, roles: [Role.ADMIN] },
    { name: 'Sinh viên', path: '/students', icon: GraduationCap, roles: [Role.ADMIN, Role.LECTURER] },
    { name: 'Giảng viên', path: '/lecturers', icon: Users, roles: [Role.ADMIN] },
    { name: 'Kế hoạch lâm sàng', path: '/assignments', icon: ClipboardList, roles: [Role.ADMIN] },
    // Lecturer only
    { name: 'Phân khoa chi tiết', path: '/lecturer-rotation', icon: Network, roles: [Role.LECTURER] },
    // Student only
    { name: 'Xem lịch phân công', path: '/student-rotation', icon: Calendar, roles: [Role.STUDENT] },
    
    { name: 'Kế hoạch lên lớp', path: '/teaching-plan', icon: BookOpen, roles: [Role.ADMIN, Role.LECTURER, Role.STUDENT] },
    { name: 'Lịch trực', path: '/schedule', icon: Calendar, roles: [Role.ADMIN, Role.LECTURER, Role.STUDENT] },
    { name: 'Báo cáo', path: '/reports', icon: FileText, roles: [Role.ADMIN, Role.LECTURER] },
    { name: 'Đánh giá', path: '/evaluations', icon: Activity, roles: [Role.ADMIN, Role.LECTURER] },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-teal-900 text-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-teal-800">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-teal-400" />
            ClinicalPro
          </h1>
          <p className="text-xs text-teal-300 mt-1">Quản lý lâm sàng</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.filter(item => user && item.roles.includes(user.role)).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-teal-800">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-200 hover:text-white hover:bg-red-900/50 rounded-lg transition"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
};
