
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentService, LecturerService, AssignmentService, TeachingPlanService, RotationService, OnCallService, DatabaseAdminService } from '../services/db';
import { Users, GraduationCap, ClipboardCheck, AlertCircle, Calendar, Clock, MapPin, FileText, BookOpen, Search, Network, CheckCircle, ArrowRight, RotateCcw, Database, Download, Upload, RefreshCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Role, Student, Lecturer, Assignment, TeachingPlan, ClinicalRotation, OnCallSchedule, ShiftTime, DEPARTMENTS } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // --- ADMIN / LECTURER STATE ---
  const [stats, setStats] = useState({ students: 0, lecturers: 0, assignments: 0, issues: 0 });
  const [myLecturerProfile, setMyLecturerProfile] = useState<Lecturer | undefined>(undefined);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<Record<string, TeachingPlan[]>>({});
  const [weekDateRange, setWeekDateRange] = useState({ start: '', end: '' });

  // --- ADMIN DB TOOLS STATE ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingDB, setIsProcessingDB] = useState(false);

  // --- STUDENT SEARCH STATE ---
  const [searchKeyword, setSearchKeyword] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Student Data Stores
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]); // Admin assignments
  const [allRotations, setAllRotations] = useState<ClinicalRotation[]>([]); // Lecturer sub-assignments
  const [allTeachingPlans, setAllTeachingPlans] = useState<TeachingPlan[]>([]);
  const [allSchedules, setAllSchedules] = useState<OnCallSchedule[]>([]);

  // Helper: Get start of week (Monday)
  const getMonday = (d: Date) => {
    const day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Helper: Date formatting
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}-${m}-${y}`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      if (user?.role === Role.ADMIN) {
        const s = await StudentService.getAll();
        const l = await LecturerService.getAll();
        const a = await AssignmentService.getAll();
        setStats({ students: s.length, lecturers: l.length, assignments: a.length, issues: 2 });
      } 
      else if (user?.role === Role.LECTURER) {
        const [lData, aData, pData] = await Promise.all([
            LecturerService.getAll(),
            AssignmentService.getAll(),
            TeachingPlanService.getAll()
        ]);

        const me = lData.find(l => l.id === user.relatedId);
        setMyLecturerProfile(me);
        
        if (me) {
          const myAssigns = aData.filter(a => a.lecturerId === me.id);
          setMyAssignments(myAssigns);
        }

        const today = new Date();
        const monday = getMonday(new Date(today));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startStr = monday.toISOString().split('T')[0];
        const endStr = sunday.toISOString().split('T')[0];
        setWeekDateRange({ start: startStr, end: endStr });

        const filteredPlans = pData.filter(p => p.date >= startStr && p.date <= endStr);
        const grouped: Record<string, TeachingPlan[]> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dStr = d.toISOString().split('T')[0];
            grouped[dStr] = [];
        }
        filteredPlans.forEach(p => {
            if (grouped[p.date]) grouped[p.date].push(p);
        });
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => a.department.localeCompare(b.department));
        });
        setWeeklyPlans(grouped);
      } 
      else if (user?.role === Role.STUDENT) {
        // Load EVERYTHING needed for search
        const [s, a, r, tp, sc] = await Promise.all([
            StudentService.getAll(),
            AssignmentService.getAll(),
            RotationService.getAll(),
            TeachingPlanService.getAll(),
            OnCallService.getAll()
        ]);
        setAllStudents(s);
        setAllAssignments(a);
        setAllRotations(r);
        setAllTeachingPlans(tp);
        setAllSchedules(sc);
      }

      setLoading(false);
    };
    
    if (user) loadData();
  }, [user]);

  // --- ADMIN DB HANDLERS ---
  const handleExportDB = async () => {
    setIsProcessingDB(true);
    try {
      const json = await DatabaseAdminService.exportDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClinicalManager_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Lỗi khi xuất dữ liệu");
    } finally {
      setIsProcessingDB(false);
    }
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("CẢNH BÁO: Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu từ file backup. Bạn có chắc chắn không?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingDB(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const json = evt.target?.result as string;
      const success = await DatabaseAdminService.importDatabase(json);
      if (success) {
        alert("Khôi phục dữ liệu thành công! Trang web sẽ tải lại.");
        window.location.reload();
      } else {
        alert("File không hợp lệ.");
      }
      setIsProcessingDB(false);
    };
    reader.readAsText(file);
  };

  const handleResetDB = async () => {
    if (window.confirm("NGUY HIỂM: Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu và đưa về mặc định? Hành động này không thể hoàn tác!")) {
      setIsProcessingDB(true);
      await DatabaseAdminService.resetDatabase();
      window.location.reload();
    }
  };

  // --- STUDENT SEARCH LOGIC ---
  const handleStudentSearch = () => {
      if (!searchKeyword.trim()) return alert("Vui lòng nhập Mã SV hoặc Họ tên.");
      
      const keyword = searchKeyword.toLowerCase().trim();
      const student = allStudents.find(s => s.studentCode.toLowerCase() === keyword) || 
                      allStudents.find(s => s.fullName.toLowerCase().includes(keyword));
      
      if (student) {
          setFoundStudent(student);
          setHasSearched(true);
      } else {
          setFoundStudent(null);
          alert("Không tìm thấy sinh viên.");
      }
  };

  const studentOverviewData = useMemo(() => {
      if (!foundStudent) return null;

      // Calculate 2 weeks range: Start of current week -> End of next week
      const today = new Date();
      const startCurrentWeek = getMonday(new Date(today));
      const endNextWeek = new Date(startCurrentWeek);
      endNextWeek.setDate(startCurrentWeek.getDate() + 13); // +13 days (2 weeks total)

      const startStr = startCurrentWeek.toISOString().split('T')[0];
      const endStr = endNextWeek.toISOString().split('T')[0];

      // 1. CLINICAL ASSIGNMENTS (Both General and Specific)
      // General (Admin)
      const generalAssignments = allAssignments.filter(a => 
          a.studentIds.includes(foundStudent.id) && 
          a.startDate <= endStr && a.endDate >= startStr
      );
      
      // Specific (Lecturer)
      const specificRotations = allRotations.filter(r => 
          r.studentId === foundStudent.id &&
          r.startDate <= endStr && r.endDate >= startStr
      );

      // 2. ON-CALL SCHEDULES
      const schedules = allSchedules.filter(s => 
          s.studentId === foundStudent.id &&
          s.date >= startStr && s.date <= endStr
      ).sort((a,b) => a.date.localeCompare(b.date));

      // 3. TEACHING PLANS
      // Logic: Find which Dept the student is in, then find plans for that Dept
      const relevantDepts = new Set<string>();
      generalAssignments.forEach(a => relevantDepts.add(a.department));
      specificRotations.forEach(r => relevantDepts.add(r.mainDepartment)); // Usually same as assignment

      const teachingPlans = allTeachingPlans.filter(p => 
          relevantDepts.has(p.department) &&
          p.date >= startStr && p.date <= endStr
      ).sort((a,b) => a.date.localeCompare(b.date));

      return {
          dateRangeDisplay: `${formatDate(startStr)} - ${formatDate(endStr)}`,
          generalAssignments,
          specificRotations,
          schedules,
          teachingPlans
      };

  }, [foundStudent, allAssignments, allRotations, allSchedules, allTeachingPlans]);


  if (loading) return <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>;

  // --- VIEW CHO ADMIN ---
  if (user?.role === Role.ADMIN) {
    const chartData = [
      { name: 'Nội', students: 12 },
      { name: 'Ngoại', students: 19 },
      { name: 'Sản', students: 8 },
      { name: 'Nhi', students: 15 },
    ];

    return (
      <div className="animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tổng quan quản trị</h1>
        <p className="text-gray-500 mb-6">Chào mừng quay trở lại, {user.fullName}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={<GraduationCap size={24} />} color="bg-blue-100 text-blue-600" title="Tổng sinh viên" value={stats.students} />
          <StatCard icon={<Users size={24} />} color="bg-green-100 text-green-600" title="Giảng viên" value={stats.lecturers} />
          <StatCard icon={<ClipboardCheck size={24} />} color="bg-purple-100 text-purple-600" title="Đợt thực tập" value={stats.assignments} />
          <StatCard icon={<AlertCircle size={24} />} color="bg-orange-100 text-orange-600" title="Cảnh báo vắng" value={stats.issues} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Phân bố sinh viên theo khoa</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="students" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DATABASE TOOLS PANEL */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
               <Database size={20} className="text-indigo-600"/>
               <h2 className="text-lg font-semibold text-gray-800">Quản lý Dữ liệu Hệ thống</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
               Do ứng dụng chạy trên môi trường tĩnh (Static Hosting), dữ liệu được lưu trên trình duyệt. 
               Sử dụng các công cụ dưới đây để sao lưu và đồng bộ dữ liệu giữa các thiết bị.
            </p>
            
            <div className="space-y-4 flex-1">
                <button 
                  onClick={handleExportDB}
                  disabled={isProcessingDB}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition group"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-200">
                            <Download size={20}/>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-gray-700">Sao lưu dữ liệu (Backup)</p>
                            <p className="text-xs text-gray-500">Tải về file JSON chứa toàn bộ dữ liệu hiện tại</p>
                        </div>
                    </div>
                </button>

                <div className="relative group">
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportDB} 
                        accept=".json"
                        className="hidden"
                     />
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingDB}
                        className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition"
                     >
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg text-green-600 group-hover:bg-green-200">
                                <Upload size={20}/>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-700">Khôi phục dữ liệu (Restore)</p>
                                <p className="text-xs text-gray-500">Tải lên file Backup để đồng bộ dữ liệu mới</p>
                            </div>
                        </div>
                     </button>
                </div>

                <button 
                  onClick={handleResetDB}
                  disabled={isProcessingDB}
                  className="w-full flex items-center justify-between p-4 border border-red-200 rounded-lg hover:bg-red-50 transition group mt-auto"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600 group-hover:bg-red-200">
                            <RefreshCcw size={20}/>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-red-700">Reset hệ thống</p>
                            <p className="text-xs text-red-500">Xóa toàn bộ dữ liệu và quay về mặc định</p>
                        </div>
                    </div>
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW CHO GIẢNG VIÊN ---
  if (user?.role === Role.LECTURER) {
    return (
      <div className="animate-in fade-in duration-500">
        {/* Section 1: My Assignments */}
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-teal-500 pl-3">Lớp lâm sàng phụ trách</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {myAssignments.length === 0 ? (
            <div className="col-span-3 bg-gray-50 p-6 rounded-lg text-center text-gray-500 border border-dashed border-gray-300 text-sm">
              Hiện chưa được phân công phụ trách nhóm nào.
            </div>
          ) : (
            myAssignments.map(assign => (
              <div key={assign.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-bold text-sm">
                    {assign.name || 'Nhóm thực tập'}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {assign.department}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                   <div className="flex items-center gap-2">
                     <Calendar size={16} className="text-teal-500" />
                     <span>{formatDate(assign.startDate)} — {formatDate(assign.endDate)}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <MapPin size={16} className="text-teal-500" />
                     <span>Khoa: {assign.department}</span>
                   </div>
                </div>
                <button className="mt-4 w-full py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition">
                  Điểm danh / Báo cáo
                </button>
              </div>
            ))
          )}
        </div>

        {/* Section 2: Weekly Teaching Plans (All Depts) */}
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 border-l-4 border-indigo-500 pl-3">
                Kế hoạch giảng dạy toàn viện (Tuần này)
            </h2>
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded border border-gray-200 shadow-sm">
                {formatDate(weekDateRange.start)} - {formatDate(weekDateRange.end)}
            </span>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="grid grid-cols-1 divide-y divide-gray-100">
                 {Object.keys(weeklyPlans).sort().map((date) => {
                     const plans = weeklyPlans[date];
                     const dateObj = new Date(date);
                     const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
                     const isToday = date === new Date().toISOString().split('T')[0];

                     return (
                         <div key={date} className={`p-4 ${isToday ? 'bg-blue-50/30' : ''}`}>
                             <div className="flex items-start gap-4">
                                 {/* Date Column */}
                                 <div className={`w-32 shrink-0 flex flex-col ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                     <span className="font-bold text-sm uppercase">{dayName}</span>
                                     <span className="text-2xl font-light text-gray-800">{dateObj.getDate()}/{dateObj.getMonth() + 1}</span>
                                 </div>

                                 {/* Plans List */}
                                 <div className="flex-1 space-y-3">
                                     {plans.length === 0 ? (
                                         <div className="text-xs text-gray-400 italic py-2">Không có lịch giảng dạy.</div>
                                     ) : (
                                         plans.map(p => (
                                             <div key={p.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100 hover:bg-white hover:shadow-sm hover:border-gray-200 transition">
                                                 <div className="w-32 shrink-0">
                                                     <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-1 rounded">
                                                         Khoa {p.department}
                                                     </span>
                                                 </div>
                                                 <div className="flex-1">
                                                     <div className="font-bold text-gray-800 text-sm">{p.topic}</div>
                                                     <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                         <span className="flex items-center gap-1"><Users size={12}/> {p.lecturerName}</span>
                                                         <span>•</span>
                                                         <span className="flex items-center gap-1"><MapPin size={12}/> {p.room}</span>
                                                         <span>•</span>
                                                         <span className="text-indigo-600">{p.targetAudience}</span>
                                                     </div>
                                                 </div>
                                             </div>
                                         ))
                                     )}
                                 </div>
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>
      </div>
    );
  }

  // --- VIEW CHO SINH VIÊN (TỔNG HỢP TRA CỨU) ---
  if (user?.role === Role.STUDENT) {
    return (
      <div className="animate-in fade-in duration-500">
        
        {/* SEARCH HEADER */}
        <div className="mb-8 text-center">
           <h1 className="text-3xl font-bold text-gray-800 mb-2">Cổng Thông Tin Lâm Sàng</h1>
           <p className="text-gray-500">Tra cứu lịch thực tập, lịch giảng và lịch trực trong 2 tuần tới</p>
        </div>

        {/* SEARCH BOX */}
        <div className="max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-lg border border-gray-200 flex gap-2 mb-10">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-gray-700 placeholder-gray-400"
                    placeholder="Nhập Mã Sinh Viên hoặc Họ Tên..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStudentSearch()}
                />
            </div>
            <button 
                onClick={handleStudentSearch}
                className="bg-teal-600 text-white px-8 rounded-xl font-bold hover:bg-teal-700 transition shadow-sm"
            >
                Tra cứu
            </button>
            {hasSearched && (
                <button onClick={() => {setFoundStudent(null); setSearchKeyword(''); setHasSearched(false);}} className="px-4 text-gray-500 hover:bg-gray-100 rounded-xl">
                    <RotateCcw size={20}/>
                </button>
            )}
        </div>

        {/* RESULTS DISPLAY */}
        {hasSearched && foundStudent && studentOverviewData && (
             <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                 
                 {/* STUDENT INFO CARD */}
                 <div className="bg-gradient-to-r from-teal-800 to-teal-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                             {foundStudent.fullName.charAt(0)}
                         </div>
                         <div>
                             <h2 className="text-2xl font-bold">{foundStudent.fullName}</h2>
                             <div className="flex gap-3 text-teal-100 text-sm">
                                 <span>MSSV: {foundStudent.studentCode}</span>
                                 <span>•</span>
                                 <span>Lớp: {foundStudent.classId}</span>
                             </div>
                         </div>
                     </div>
                     <div className="text-right bg-black/20 px-4 py-2 rounded-lg">
                         <p className="text-xs text-teal-200 uppercase font-bold">Phạm vi hiển thị</p>
                         <p className="font-bold text-lg">{studentOverviewData.dateRangeDisplay}</p>
                         <p className="text-xs text-teal-200">(Tuần hiện tại & Tuần kế tiếp)</p>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     
                     {/* COL 1: CLINICAL ASSIGNMENTS */}
                     <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                         <div className="p-4 border-b border-gray-200 bg-indigo-50">
                             <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                 <ClipboardCheck size={20}/> Lịch Phân Công
                             </h3>
                         </div>
                         <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-96">
                             {/* General Assignments */}
                             {studentOverviewData.generalAssignments.length === 0 && studentOverviewData.specificRotations.length === 0 ? (
                                 <p className="text-gray-400 italic text-center py-4">Không có phân công trong 2 tuần này.</p>
                             ) : (
                                 <>
                                     {studentOverviewData.generalAssignments.map(a => (
                                         <div key={a.id} className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/30">
                                             <div className="flex justify-between items-start">
                                                <span className="font-bold text-indigo-800">Khoa {a.department}</span>
                                                <span className="text-xs bg-white border border-indigo-100 px-2 py-0.5 rounded text-indigo-600">Khoa Lớn</span>
                                             </div>
                                             <p className="text-xs text-gray-500 mt-1">
                                                 {formatDate(a.startDate)} &rarr; {formatDate(a.endDate)}
                                             </p>
                                         </div>
                                     ))}
                                     {/* Detailed Rotations */}
                                     {studentOverviewData.specificRotations.map(r => (
                                         <div key={r.id} className="border-l-4 border-teal-500 pl-3 py-2">
                                             <div className="font-bold text-gray-800">{r.subDepartment}</div>
                                             <div className="text-xs text-gray-500 flex items-center gap-1">
                                                 <ArrowRight size={12}/>
                                                 {formatDate(r.startDate)} đến {formatDate(r.endDate)}
                                             </div>
                                         </div>
                                     ))}
                                 </>
                             )}
                         </div>
                     </div>

                     {/* COL 2: TEACHING SCHEDULE */}
                     <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                         <div className="p-4 border-b border-gray-200 bg-teal-50">
                             <h3 className="font-bold text-teal-900 flex items-center gap-2">
                                 <BookOpen size={20}/> Lịch Giảng Dạy
                             </h3>
                         </div>
                         <div className="p-0 flex-1 overflow-y-auto max-h-96">
                             {studentOverviewData.teachingPlans.length === 0 ? (
                                 <p className="text-gray-400 italic text-center py-8">Chưa có lịch giảng dạy.</p>
                             ) : (
                                 <table className="w-full text-left text-sm">
                                     <tbody className="divide-y divide-gray-100">
                                         {studentOverviewData.teachingPlans.map(p => (
                                             <tr key={p.id} className="hover:bg-gray-50">
                                                 <td className="p-3 align-top">
                                                     <div className="font-bold text-gray-700 text-xs whitespace-nowrap">{formatDate(p.date)}</div>
                                                     <div className="text-xs text-gray-400">{p.department}</div>
                                                 </td>
                                                 <td className="p-3">
                                                     <div className="font-bold text-teal-800 text-sm">{p.topic}</div>
                                                     <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                         <span><Users size={10} className="inline"/> {p.lecturerName}</span>
                                                         <span><MapPin size={10} className="inline"/> {p.room}</span>
                                                     </div>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             )}
                         </div>
                     </div>

                     {/* COL 3: ON-CALL SCHEDULE */}
                     <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                         <div className="p-4 border-b border-gray-200 bg-orange-50">
                             <h3 className="font-bold text-orange-900 flex items-center gap-2">
                                 <Clock size={20}/> Lịch Trực
                             </h3>
                         </div>
                         <div className="p-4 flex-1 overflow-y-auto max-h-96 space-y-3">
                             {studentOverviewData.schedules.length === 0 ? (
                                 <p className="text-gray-400 italic text-center py-4">Không có lịch trực.</p>
                             ) : (
                                 studentOverviewData.schedules.map(s => (
                                     <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-orange-100 bg-orange-50/30">
                                         <div className="text-center min-w-[50px]">
                                             <p className="text-xs font-bold text-gray-500 uppercase">{new Date(s.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</p>
                                             <p className="font-bold text-orange-800">{formatDate(s.date).slice(0,5)}</p>
                                         </div>
                                         <div className="flex-1">
                                             <p className="font-bold text-gray-800">{s.department}</p>
                                             <p className="text-xs text-gray-600">
                                                 {s.shift} ({s.shift === ShiftTime.MORNING ? '7h-11h' : s.shift === ShiftTime.AFTERNOON ? '13h-17h' : '18h-21h30'})
                                             </p>
                                         </div>
                                         {s.checkInTime && (
                                             <CheckCircle size={16} className="text-green-600" title="Đã điểm danh"/>
                                         )}
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>

                 </div>
             </div>
        )}

      </div>
    );
  }

  return <div>Role not found</div>;
};

// Helper Component
const StatCard = ({ icon, color, title, value }: { icon: React.ReactNode, color: string, title: string, value: number }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
    </div>
  </div>
);
