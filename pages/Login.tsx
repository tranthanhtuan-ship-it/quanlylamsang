
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, GraduationCap, Users, ShieldCheck, ChevronRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleQuickLogin = async (role: string, username: string) => {
    setIsLoading(role);
    
    try {
      // Giả lập độ trễ mạng nhỏ để hiệu ứng loading mượt hơn
      const success = await login(username);
      if (success) {
        navigate('/'); 
      } else {
        alert('Tài khoản mặc định chưa được khởi tạo. Vui lòng Reset Database.');
        setIsLoading(null);
      }
    } catch (err) {
      console.error(err);
      setIsLoading(null);
    }
  };

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
            onClick={() => handleQuickLogin('admin', 'admin')}
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
            onClick={() => handleQuickLogin('lecturer', 'gv1')}
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
              Truy cập ngay <ChevronRight size={16} />
            </div>
          </button>

          {/* Card 3: STUDENT */}
          <button 
            onClick={() => handleQuickLogin('student', 'sv1')}
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
