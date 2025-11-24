
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, GraduationCap, Users, ShieldCheck, ChevronRight, ArrowLeft, MapPin } from 'lucide-react';
import { DEPARTMENTS } from '../types';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showDeptSelection, setShowDeptSelection] = useState(false);

  const handleRoleSelect = (role: string) => {
    if (role === 'lecturer') {
      setShowDeptSelection(true);
    } else {
      // Admin or Student - Direct Login
      performLogin(role, role === 'admin' ? 'admin' : 'sv1');
    }
  };

  const performLogin = async (role: string, username: string, dept?: string) => {
    setIsLoading(role);
    try {
      const success = await login(username, dept);
      if (success) {
        navigate('/'); 
      } else {
        alert('Tài khoản mặc định chưa được khởi tạo.');
        setIsLoading(null);
      }
    } catch (err) {
      console.error(err);
      setIsLoading(null);
    }
  };

  // Dept Selection View
  if (showDeptSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-4">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-gray-100 bg-teal-50 flex items-center gap-4">
             <button onClick={() => setShowDeptSelection(false)} className="p-2 hover:bg-white rounded-full transition">
                <ArrowLeft size={20} className="text-teal-700"/>
             </button>
             <div>
                <h2 className="text-2xl font-bold text-teal-800">Chọn Khoa / Bệnh viện</h2>
                <p className="text-sm text-teal-600">Vui lòng chọn đơn vị bạn đang công tác để vào hệ thống</p>
             </div>
          </div>
          
          <div className="p-6 overflow-y-auto bg-gray-50/50">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    onClick={() => performLogin('lecturer', 'gv1', dept)}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-500 hover:ring-1 hover:ring-teal-500 transition text-left flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-teal-100 transition">
                       <MapPin size={20} className="text-gray-500 group-hover:text-teal-600"/>
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-teal-800">{dept}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Role Selection View (Default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-4">
      <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-500">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-teal-600 rounded-2xl shadow-lg mb-4">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Clinical Manager Pro</h1>
          <p className="text-gray-500 text-lg">Cổng thông tin quản lý lâm sàng tập trung</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: ADMIN */}
          <button 
            onClick={() => handleRoleSelect('admin')}
            disabled={!!isLoading}
            className="group relative bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck size={100} className="text-purple-600"/>
            </div>
            
            <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              {isLoading === 'admin' ? <Loader2 className="animate-spin"/> : <ShieldCheck size={28} />}
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-700 transition-colors">Quản Trị Viên</h3>
            <p className="text-gray-500 text-sm mb-6 flex-1">
              Quản lý toàn bộ hệ thống: Giảng viên, Sinh viên, Phân công lâm sàng và Cấu hình.
            </p>
            
            <div className="flex items-center text-purple-600 font-bold text-sm group-hover:gap-2 transition-all">
              Truy cập ngay <ChevronRight size={16} />
            </div>
          </button>

          {/* Card 2: LECTURER */}
          <button 
            onClick={() => handleRoleSelect('lecturer')}
            disabled={!!isLoading}
            className="group relative bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users size={100} className="text-blue-600"/>
            </div>

            <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
               {isLoading === 'lecturer' ? <Loader2 className="animate-spin"/> : <Users size={28} />}
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors">Giảng Viên</h3>
            <p className="text-gray-500 text-sm mb-6 flex-1">
              Quản lý sinh viên, Phân khoa chi tiết, Xếp lịch trực, Chấm công và Báo cáo.
            </p>
            
            <div className="flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
              Chọn Khoa <ChevronRight size={16} />
            </div>
          </button>

          {/* Card 3: STUDENT */}
          <button 
            onClick={() => handleRoleSelect('student')}
            disabled={!!isLoading}
            className="group relative bg-white p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <GraduationCap size={100} className="text-teal-600"/>
            </div>

            <div className="bg-teal-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              {isLoading === 'student' ? <Loader2 className="animate-spin"/> : <GraduationCap size={28} />}
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-teal-700 transition-colors">Sinh Viên</h3>
            <p className="text-gray-500 text-sm mb-6 flex-1">
              Tra cứu lịch học, lịch trực, lịch phân công và thực hiện điểm danh online.
            </p>
            
            <div className="flex items-center text-teal-600 font-bold text-sm group-hover:gap-2 transition-all">
              Truy cập ngay <ChevronRight size={16} />
            </div>
          </button>

        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-400 text-xs">
          <p>&copy; {new Date().getFullYear()} Clinical Manager Pro. Phiên bản demo v1.0</p>
        </div>
      </div>
    </div>
  );
};
