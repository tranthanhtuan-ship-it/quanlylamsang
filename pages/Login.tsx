import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setError('');
    setIsLoggingIn(true);
    
    try {
      const success = await login(username);
      if (success) {
        navigate('/'); // Chuyển hướng về trang chủ (Dashboard)
      } else {
        setError('Tài khoản không tồn tại. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-800 to-gray-900">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-teal-100 p-3 rounded-full mb-4 shadow-inner">
            <Activity className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Đăng nhập hệ thống</h1>
          <p className="text-gray-500 text-sm mt-2">Quản lý lâm sàng tập trung</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition disabled:bg-gray-100"
              placeholder="Nhập tên đăng nhập..."
              required
              disabled={isLoggingIn}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
              </>
            ) : (
              'Truy cập hệ thống'
            )}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-400 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <p className="font-bold text-gray-600 mb-2">Tài khoản mặc định:</p>
          <ul className="space-y-1.5">
            <li className="flex justify-between"><span>Quản trị viên:</span> <code className="bg-gray-200 px-1 rounded text-gray-700">admin</code></li>
            <li className="flex justify-between"><span>Giảng viên:</span> <code className="bg-gray-200 px-1 rounded text-gray-700">gv1</code></li>
            <li className="flex justify-between"><span>Sinh viên:</span> <code className="bg-gray-200 px-1 rounded text-gray-700">sv1</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};