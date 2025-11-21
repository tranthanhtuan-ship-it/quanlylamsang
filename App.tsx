
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentManager } from './pages/StudentManager';
import { ClinicalAssignments } from './pages/ClinicalAssignments';
import { Reports } from './pages/Reports';
import { LecturerManager } from './pages/LecturerManager';
import { OnCallSchedulePage } from './pages/OnCallSchedulePage';
import { TeachingPlanPage } from './pages/TeachingPlan';
import { StatisticsPage } from './pages/Statistics';
import { LecturerRotationPage } from './pages/LecturerRotation';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><StudentManager /></ProtectedRoute>} />
      <Route path="/lecturers" element={<ProtectedRoute><LecturerManager /></ProtectedRoute>} />
      <Route path="/assignments" element={<ProtectedRoute><ClinicalAssignments /></ProtectedRoute>} />
      
      {/* Lecturer View */}
      <Route path="/lecturer-rotation" element={<ProtectedRoute><LecturerRotationPage /></ProtectedRoute>} />
      {/* Student View (Reuses component but logic inside handles role) */}
      <Route path="/student-rotation" element={<ProtectedRoute><LecturerRotationPage /></ProtectedRoute>} />
      
      <Route path="/teaching-plan" element={<ProtectedRoute><TeachingPlanPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><OnCallSchedulePage /></ProtectedRoute>} />
      <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
      
      {/* Placeholder Routes for optional features */}
      <Route path="/evaluations" element={<ProtectedRoute><div className="p-10 text-gray-500">Chức năng Đánh giá đang phát triển...</div></ProtectedRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
