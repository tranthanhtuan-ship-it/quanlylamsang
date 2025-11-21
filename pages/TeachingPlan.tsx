
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { TeachingPlanService, LecturerService, StudentService, AssignmentService } from '../services/db';
import { TeachingPlan, Lecturer, DEPARTMENTS, Role, Student, Assignment } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit, X, Calendar, User, BookOpen, MapPin, Users, AlertTriangle, BarChart2, List, GraduationCap, ClipboardCheck, Search, RotateCcw, CheckCircle } from 'lucide-react';

export const TeachingPlanPage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === Role.STUDENT;
  const isAdmin = user?.role === Role.ADMIN;
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'management' | 'situation'>('management');
  const [loading, setLoading] = useState(true);

  // Data
  const [plans, setPlans] = useState<TeachingPlan[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  
  // Student View Data (All loaded for search)
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  
  // Search State for Student View
  const [searchKeyword, setSearchKeyword] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Autocomplete State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // --- DATE HELPERS ---
  const getMonday = (d: Date) => {
    const day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const today = new Date();
  const monday = getMonday(new Date(today));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Common Filters
  const [filterDept, setFilterDept] = useState('');
  const [startDate, setStartDate] = useState(monday.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(sunday.toISOString().split('T')[0]);

  // Form State (Management)
  const initialForm: TeachingPlan = {
    id: '',
    lecturerId: '',
    lecturerName: '',
    department: '',
    date: new Date().toISOString().split('T')[0],
    topic: '',
    targetAudience: '',
    room: ''
  };
  const [formData, setFormData] = useState<TeachingPlan>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, plan: TeachingPlan | null}>({
    isOpen: false, plan: null
  });

  useEffect(() => {
    loadData();

    // Click outside to close suggestions
    const handleClickOutside = (event: MouseEvent) => {
        if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    const promises: any[] = [
        TeachingPlanService.getAll(),
        LecturerService.getAll()
    ];

    // Load all student/assignment data if it is student view to allow searching
    if (isStudent) {
        promises.push(StudentService.getAll());
        promises.push(AssignmentService.getAll());
    }

    const [pData, lData, sData, aData] = await Promise.all(promises);
    
    setPlans(pData);
    setLecturers(lData);

    if (isStudent) {
        setAllStudents(sData || []);
        setAllAssignments(aData || []);
    }

    setLoading(false);
  };

  // --- LOGIC FOR STUDENT SEARCH VIEW ---
  
  const handleStudentSearch = () => {
      if (!searchKeyword.trim()) {
          alert("Vui lòng nhập Mã sinh viên hoặc Họ tên.");
          return;
      }

      const keyword = searchKeyword.toLowerCase().trim();
      // Find exact MSSV match first, then partial Name match
      const student = allStudents.find(s => s.studentCode.toLowerCase() === keyword) || 
                      allStudents.find(s => s.fullName.toLowerCase().includes(keyword));

      if (student) {
          setFoundStudent(student);
      } else {
          setFoundStudent(null);
          alert("Không tìm thấy sinh viên nào với thông tin đã nhập.");
      }
      setHasSearched(true);
  };

  const resetSearch = () => {
      setSearchKeyword('');
      setFoundStudent(null);
      setHasSearched(false);
  };

  const studentViewData = useMemo(() => {
    if (!isStudent || !foundStudent) return { currentAssignments: [], visiblePlans: [] };

    // 1. Find assignments active within the selected Date Range for the FOUND student
    const activeAssignments = allAssignments.filter(a => {
        const belongsToStudent = a.studentIds.includes(foundStudent.id);
        // Check for date overlap: [a.start, a.end] vs [startDate, endDate]
        const dateOverlap = (a.startDate <= endDate) && (a.endDate >= startDate);
        return belongsToStudent && dateOverlap;
    });

    const activeDepts = new Set(activeAssignments.map(a => a.department));

    // 2. Filter Teaching Plans
    // Show plans that are in the active Departments AND within date range
    const visiblePlans = plans.filter(p => {
        const inDate = p.date >= startDate && p.date <= endDate;
        const inDept = activeDepts.has(p.department);
        return inDate && inDept;
    }).sort((a, b) => a.date.localeCompare(b.date));

    return { currentAssignments: activeAssignments, visiblePlans };
  }, [isStudent, foundStudent, allAssignments, plans, startDate, endDate]);


  // --- LOGIC FOR ADMIN/LECTURER VIEW ---
  const filteredPlans = useMemo(() => {
      return plans.filter(p => {
        const matchDept = filterDept ? p.department === filterDept : true;
        const matchDateRange = p.date >= startDate && p.date <= endDate;
        
        const isLecturer = user?.role === Role.LECTURER;
        const matchUser = (activeTab === 'management' && isLecturer) 
            ? p.lecturerId === user.relatedId 
            : true; 
        
        return matchDept && matchDateRange && matchUser;
      });
  }, [plans, filterDept, startDate, endDate, user, activeTab]);

  const groupedPlans = useMemo(() => {
      const groups: Record<string, TeachingPlan[]> = {};
      DEPARTMENTS.forEach(d => groups[d] = []);
      filteredPlans.forEach(p => {
          if (!groups[p.department]) groups[p.department] = [];
          groups[p.department].push(p);
      });
      Object.keys(groups).forEach(k => {
          groups[k].sort((a, b) => a.date.localeCompare(b.date));
      });
      return groups;
  }, [filteredPlans]);

  // Filter Lecturers based on selected Department in Form
  // UPDATED: Robust matching logic + Filter by manual input
  const formAvailableLecturers = useMemo(() => {
      if (!formData.department) return [];
      const targetDept = formData.department.trim().toLowerCase();
      
      let list = lecturers.filter(l => {
          if (!l.department) return false;
          const lDept = l.department.toString().trim().toLowerCase();
          
          if (lDept === targetDept) return true;
          if (lDept.includes(targetDept)) return true;
          if (targetDept.includes(lDept)) return true;
          return false;
      });

      // Further filter by typed name if it's not an exact match yet
      if (formData.lecturerName) {
          const search = formData.lecturerName.toLowerCase();
          list = list.filter(l => l.fullName.toLowerCase().includes(search));
      }
      
      return list;
  }, [lecturers, formData.department, formData.lecturerName]);

  // --- HANDLERS ---
  const handleOpenAdd = async () => {
    // Force reload lecturers to ensure sync with Admin page
    const freshLecturers = await LecturerService.getAll();
    setLecturers(freshLecturers);

    let defaultLecturerId = '';
    let defaultLecturerName = '';
    let defaultDept = '';

    if (user?.role === Role.LECTURER && user.relatedId) {
        const me = freshLecturers.find(l => l.id === user.relatedId);
        if (me) {
            defaultLecturerId = me.id;
            defaultLecturerName = me.fullName;
            defaultDept = me.department;
        }
    }
    setFormData({...initialForm, lecturerId: defaultLecturerId, lecturerName: defaultLecturerName, department: defaultDept});
    setIsModalOpen(true);
    setShowSuggestions(false);
  };

  const handleEdit = async (plan: TeachingPlan) => {
      const freshLecturers = await LecturerService.getAll();
      setLecturers(freshLecturers);
      setFormData(plan);
      setIsModalOpen(true);
      setShowSuggestions(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Relax validation for lecturerId (allow manual name)
    if (!formData.lecturerName || !formData.department || !formData.date || !formData.topic) {
        return alert("Vui lòng điền đầy đủ thông tin bắt buộc (Khoa, Ngày, Giảng viên, Tên bài).");
    }
    await TeachingPlanService.save(formData);
    setIsModalOpen(false);
    loadData();
  };

  const confirmDelete = async () => {
    if (!deleteModal.plan) return;
    await TeachingPlanService.delete(deleteModal.plan.id);
    setDeleteModal({ isOpen: false, plan: null });
    loadData();
  };

  const handleDeptChangeInForm = (newDept: string) => {
      setFormData(prev => ({
          ...prev,
          department: newDept,
          lecturerId: '',
          lecturerName: ''
      }));
      setShowSuggestions(false);
  };

  // Handle Manual Typing in Lecturer Field
  const handleLecturerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      setFormData(prev => ({
          ...prev,
          lecturerName: name,
          lecturerId: '' // Clear ID when typing manually (will be re-set if clicked)
      }));
      setShowSuggestions(true);
  };

  const selectLecturerSuggestion = (lecturer: Lecturer) => {
      setFormData(prev => ({
          ...prev,
          lecturerId: lecturer.id,
          lecturerName: lecturer.fullName,
          department: lecturer.department // ensure consistency
      }));
      setShowSuggestions(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // ... (Student view logic - kept same, omitting for brevity to focus on changes) ...
  if (isStudent) {
      // Return Student View (Same as before)
      return (
        <div className="h-full flex flex-col animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BookOpen className="text-teal-600" /> Tra Cứu Lịch Học Lâm Sàng
                </h1>
                <p className="text-sm text-gray-500">Nhập thông tin sinh viên để xem kế hoạch giảng dạy</p>
            </div>

            {/* SEARCH CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Mã SV hoặc Họ tên</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="VD: Y2020001 hoặc Nguyễn Văn A"
                                value={searchKeyword}
                                onChange={e => setSearchKeyword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleStudentSearch()}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-5">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Thời gian xem lịch</label>
                        <div className="flex items-center gap-2">
                            <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                            <span className="text-gray-400">-</span>
                            <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
                        </div>
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                        <button 
                            onClick={handleStudentSearch}
                            className="flex-1 bg-teal-600 text-white py-2 rounded-lg font-bold hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2"
                        >
                            <Search size={18}/> Tra cứu
                        </button>
                        {hasSearched && (
                            <button 
                                onClick={resetSearch}
                                className="px-3 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold hover:bg-gray-200 transition"
                                title="Làm mới"
                            >
                                <RotateCcw size={18}/>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* RESULTS AREA */}
            {!hasSearched ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                    <Search size={48} className="mb-3 opacity-20"/>
                    <p className="font-medium">Vui lòng nhập Mã sinh viên hoặc Họ tên để tra cứu.</p>
                </div>
            ) : !foundStudent ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 text-gray-500">
                    <p className="font-medium">Không tìm thấy kết quả phù hợp.</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                    {/* FOUND STUDENT INFO */}
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-200 text-teal-800 rounded-full flex items-center justify-center font-bold text-lg">
                            {foundStudent.fullName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-teal-900 text-lg">{foundStudent.fullName}</h3>
                            <div className="flex gap-3 text-sm text-teal-700">
                                <span><span className="font-semibold">MSSV:</span> {foundStudent.studentCode}</span>
                                <span>•</span>
                                <span><span className="font-semibold">Lớp:</span> {foundStudent.classId}</span>
                                <span>•</span>
                                <span><span className="font-semibold">Nhóm:</span> {foundStudent.group}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                        {/* LEFT: ASSIGNMENT STATUS */}
                        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col overflow-hidden">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4 uppercase text-sm">
                                <ClipboardCheck size={18} className="text-orange-600"/> Đợt thực tập (Trong khoảng thời gian này)
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {studentViewData.currentAssignments.length === 0 ? (
                                    <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm">
                                        Sinh viên không có phân công thực tập nào trong khoảng thời gian này.
                                    </div>
                                ) : (
                                    studentViewData.currentAssignments.map(assign => (
                                        <div key={assign.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-orange-800 text-lg">Khoa {assign.department}</span>
                                                <span className="text-xs bg-white text-orange-700 px-2 py-1 rounded border border-orange-100 font-bold">
                                                    {assign.name}
                                                </span>
                                            </div>
                                            <div className="text-sm text-orange-700 flex items-center gap-2">
                                                <Calendar size={14}/> 
                                                {assign.startDate} &rarr; {assign.endDate}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* RIGHT: TEACHING SCHEDULE */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col overflow-hidden">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4 uppercase text-sm">
                                <GraduationCap size={18} className="text-indigo-600"/> Lịch giảng dạy chi tiết
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto">
                                {studentViewData.visiblePlans.length === 0 ? (
                                    <div className="text-center p-10 text-gray-400 italic border border-dashed border-gray-200 rounded-lg">
                                        Chưa có lịch giảng dạy nào được cập nhật cho các khoa thực tập trong khoảng thời gian này.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">Ngày</th>
                                                <th className="px-4 py-3">Khoa</th>
                                                <th className="px-4 py-3">Nội dung / Bài giảng</th>
                                                <th className="px-4 py-3">Giảng viên</th>
                                                <th className="px-4 py-3">Phòng</th>
                                                <th className="px-4 py-3">Đối tượng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {studentViewData.visiblePlans.map(plan => (
                                                <tr key={plan.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-900">{plan.date}</td>
                                                    <td className="px-4 py-3">{plan.department}</td>
                                                    <td className="px-4 py-3 font-bold text-indigo-700">{plan.topic}</td>
                                                    <td className="px-4 py-3">{plan.lecturerName}</td>
                                                    <td className="px-4 py-3">{plan.room}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{plan.targetAudience}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )
  }

  // ... (Admin/Lecturer Views) ...

  return (
    <div className="h-full flex flex-col animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
              <h1 className="text-2xl font-bold text-gray-800">Kế hoạch Lên Lớp Lâm Sàng</h1>
              <p className="text-sm text-gray-500">Quản lý lịch giảng dạy lý thuyết tại bệnh viện</p>
          </div>
          
          <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
              <button 
                onClick={() => setActiveTab('management')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTab === 'management' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List size={16}/> Quản lý kế hoạch
              </button>
              <button 
                onClick={() => setActiveTab('situation')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTab === 'situation' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BarChart2 size={16}/> Tình hình giảng dạy
              </button>
          </div>

          {activeTab === 'management' && !isAdmin && (
            <button 
                onClick={handleOpenAdd}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-teal-700 transition flex items-center gap-2"
            >
                <Plus size={18}/> Thêm kế hoạch
            </button>
          )}
      </div>

      {/* COMMON FILTERS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Lọc theo Khoa</label>
              <select className="w-full p-2 border rounded-lg text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  <option value="">-- Tất cả khoa --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
          </div>
          <div className="md:col-span-5">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Thời gian (Từ - Đến)</label>
              <div className="flex items-center gap-2">
                  <input type="date" className="w-full p-2 border rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                  <span className="text-gray-400">-</span>
                  <input type="date" className="w-full p-2 border rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
              </div>
          </div>
          <div className="md:col-span-4 text-right pb-2 text-sm text-gray-500">
             {activeTab === 'management' 
                ? `Hiển thị ${filteredPlans.length} kế hoạch`
                : `Tổng cộng ${filteredPlans.length} buổi giảng toàn viện`
             }
          </div>
      </div>

      {/* --- TAB 1: MANAGEMENT (TABLE VIEW) --- */}
      {activeTab === 'management' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs sticky top-0">
                    <tr>
                        <th className="px-6 py-3 w-32">Ngày</th>
                        <th className="px-6 py-3">Khoa</th>
                        <th className="px-6 py-3">Giảng viên</th>
                        <th className="px-6 py-3">Tên bài / Chủ đề</th>
                        <th className="px-6 py-3">Đối tượng</th>
                        <th className="px-6 py-3">Phòng</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={7} className="p-6 text-center">Đang tải...</td></tr>
                    ) : filteredPlans.length === 0 ? (
                        <tr><td colSpan={7} className="p-10 text-center italic text-gray-400">
                            Không tìm thấy kế hoạch nào trong khoảng thời gian này.<br/>
                            <span className="text-xs">Vui lòng chọn khoảng thời gian khác hoặc thêm mới.</span>
                        </td></tr>
                    ) : (
                        filteredPlans.map(plan => (
                            <tr key={plan.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 font-medium">{plan.date}</td>
                                <td className="px-6 py-4">{plan.department}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                    {plan.lecturerName}
                                    {plan.lecturerId && <CheckCircle size={12} className="text-teal-500" title="Đã liên kết hồ sơ"/>}
                                </td>
                                <td className="px-6 py-4">{plan.topic}</td>
                                <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{plan.targetAudience}</span></td>
                                <td className="px-6 py-4">{plan.room}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {!isAdmin && (
                                        <>
                                            <button onClick={() => handleEdit(plan)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><Edit size={16}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteModal({isOpen: true, plan}); }} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      )}

      {/* --- TAB 2: SITUATION (GROUPED VIEW) --- */}
      {activeTab === 'situation' && (
          <div className="flex-1 overflow-y-auto space-y-6">
              {loading ? (
                  <div className="text-center p-10">Đang tải dữ liệu...</div>
              ) : (
                  Object.entries(groupedPlans).map(([dept, deptPlans]: [string, TeachingPlan[]]) => {
                      if (filterDept && filterDept !== dept) return null;
                      if (deptPlans.length === 0 && filterDept) return null;

                      return (
                        <div key={dept} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Users className="text-teal-600" size={18}/> Khoa {dept}
                                </h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${deptPlans.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-500'}`}>
                                    {deptPlans.length} buổi giảng
                                </span>
                            </div>
                            
                            {deptPlans.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-400 italic bg-white">
                                    Không có lịch giảng dạy trong tuần này.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {deptPlans.map(plan => (
                                        <div key={plan.id} className="p-4 hover:bg-blue-50/30 transition flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="w-32 shrink-0 flex items-center gap-2 text-gray-700 font-medium">
                                                <Calendar size={16} className="text-gray-400"/> {plan.date}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-indigo-700 mb-1">{plan.topic}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-3">
                                                    <span className="flex items-center gap-1">
                                                        <User size={12}/> 
                                                        {plan.lecturerName}
                                                        {plan.lecturerId && <CheckCircle size={10} className="text-teal-500"/>}
                                                    </span>
                                                    <span className="flex items-center gap-1"><MapPin size={12}/> {plan.room}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                                    {plan.targetAudience}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                      );
                  })
              )}
              <div className="h-10"></div>
          </div>
      )}

      {/* ADD/EDIT MODAL (ADMIN/LECTURER ONLY) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-teal-50 rounded-t-xl">
                 <h2 className="font-bold text-xl text-teal-800 flex items-center gap-2">
                    <BookOpen size={20}/>
                    {formData.id ? 'Sửa Kế Hoạch' : 'Lên Kế Hoạch Mới'}
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
             </div>
             <form onSubmit={handleSave} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Khoa</label>
                        <select 
                            required
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            value={formData.department}
                            onChange={e => handleDeptChangeInForm(e.target.value)}
                        >
                            <option value="">-- Chọn Khoa --</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày lên lớp</label>
                        <input required type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                     </div>
                 </div>
                 
                 {/* COMBOBOX FOR LECTURER */}
                 <div className="relative" ref={suggestionRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên</label>
                    <div className="relative">
                        <input 
                            type="text"
                            required
                            disabled={!formData.department}
                            placeholder={!formData.department ? "Vui lòng chọn Khoa trước" : "Nhập tên hoặc chọn từ danh sách..."}
                            className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${!formData.department ? 'bg-gray-100' : ''}`}
                            value={formData.lecturerName}
                            onChange={handleLecturerNameChange}
                            onFocus={() => setShowSuggestions(true)}
                        />
                        {/* ID Indicator */}
                        {formData.lecturerId && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 pointer-events-none" title="Đã liên kết ID">
                                <CheckCircle size={16} />
                            </div>
                        )}
                    </div>
                    
                    {/* Suggestion List */}
                    {showSuggestions && formData.department && (
                        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                            {formAvailableLecturers.length === 0 ? (
                                <div className="p-3 text-xs text-gray-500 text-center">
                                    Không tìm thấy giảng viên phù hợp trong danh sách khoa này.<br/>
                                    Bạn có thể tiếp tục nhập tên thủ công.
                                </div>
                            ) : (
                                formAvailableLecturers.map(l => (
                                    <div 
                                        key={l.id}
                                        onClick={() => selectLecturerSuggestion(l)}
                                        className="p-2 hover:bg-teal-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between group"
                                    >
                                        <span>{l.fullName}</span>
                                        <span className="text-xs text-gray-400 group-hover:text-teal-600">{l.email}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên bài / Chủ đề</label>
                    <input required placeholder="VD: Viêm phổi cộng đồng" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng lên lớp</label>
                        <input required placeholder="VD: Y4, ĐD K15..." className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.targetAudience} onChange={e => setFormData({...formData, targetAudience: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phòng / Địa điểm</label>
                        <input required placeholder="VD: P. Giao ban" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
                     </div>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">Lưu kế hoạch</button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.isOpen && deleteModal.plan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Xác nhận xóa</h3>
                    <p className="text-gray-500 mt-2 text-sm">
                        Bạn có chắc chắn muốn xóa kế hoạch bài giảng: <br/>
                        <strong>{deleteModal.plan.topic}</strong>?
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setDeleteModal({isOpen: false, plan: null})} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Hủy bỏ</button>
                    <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm flex items-center justify-center gap-2"><Trash2 size={18}/> Xóa ngay</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
