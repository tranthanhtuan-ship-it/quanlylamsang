
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentService, OnCallService, AssignmentService } from '../services/db';
import { Student, OnCallSchedule, ShiftTime, Role, DEPARTMENTS, AttendanceStatus, MAJORS, Assignment } from '../types';
import { Calendar, CheckCircle, MapPin, Search, Square, CheckSquare, Plus, Filter, Info, List, Trash2, Eye, AlertTriangle, RotateCcw, Clock, Users, Navigation, ExternalLink, Loader2 } from 'lucide-react';

// --- CONSTANTS FOR SHIFT TIMES ---
const SHIFT_HOURS: Record<ShiftTime, string> = {
  [ShiftTime.MORNING]: '07:00 - 11:00',
  [ShiftTime.AFTERNOON]: '13:00 - 17:00',
  [ShiftTime.EVENING]: '18:00 - 21:30'
};

export const OnCallSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const isStudent = user?.role === Role.STUDENT;
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'create' | 'list'>(isAdmin ? 'list' : 'create');
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, scheduleId: string | null, details?: string}>({
    isOpen: false, scheduleId: null
  });

  // Create Mode State
  const [filterDept, setFilterDept] = useState<string>(DEPARTMENTS[0]);
  const [filterMajor, setFilterMajor] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetShifts, setTargetShifts] = useState({
    [ShiftTime.MORNING]: false,
    [ShiftTime.AFTERNOON]: false,
    [ShiftTime.EVENING]: false,
  });

  // List View State
  const [viewStartDate, setViewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewEndDate, setViewEndDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [viewDept, setViewDept] = useState<string>('');

  // STUDENT SEARCH STATE
  const [studentSearchKeyword, setStudentSearchKeyword] = useState('');
  const [studentSearchStart, setStudentSearchStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentSearchEnd, setStudentSearchEnd] = useState<string>(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // CHECK-IN STATE
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<OnCallSchedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]); // Add assignments state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sData, scData, aData] = await Promise.all([
      StudentService.getAll(),
      OnCallService.getAll(),
      AssignmentService.getAll() // Fetch assignments
    ]);
    setStudents(sData);
    setSchedules(scData);
    setAssignments(aData);
    setLoading(false);
  };

  // --- HELPER: GET WEEK BOUNDS (Monday to Sunday) ---
  const getWeekBounds = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      startDisplay: monday.toLocaleDateString('vi-VN'),
      endDisplay: sunday.toLocaleDateString('vi-VN')
    };
  };

  const weekInfo = useMemo(() => getWeekBounds(targetDate), [targetDate]);

  // --- DERIVED DATA ---
  const courses = useMemo(() => [...new Set(students.map(s => s.course))].sort(), [students]);
  const groups = useMemo(() => [...new Set(students.map(s => s.group))].sort(), [students]);

  // 1. Determine which students are ALREADY SCHEDULED this week
  const busyStudentIdsInWeek = useMemo(() => {
    return new Set(
      schedules
        .filter(s => s.date >= weekInfo.start && s.date <= weekInfo.end)
        .map(s => s.studentId)
    );
  }, [schedules, weekInfo]);

  // 2. Determine which students are ASSIGNED to the selected Department on the selected Date
  const assignedStudentIdsForDeptAndDate = useMemo(() => {
      const validIds = new Set<string>();
      assignments.forEach(assign => {
          // Check Department match
          if (assign.department !== filterDept) return;
          
          // Check Date match (Target date must be within Assignment range)
          if (targetDate >= assign.startDate && targetDate <= assign.endDate) {
              assign.studentIds.forEach(id => validIds.add(id));
          }
      });
      return validIds;
  }, [assignments, filterDept, targetDate]);

  // 3. Combine filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Basic demographic filters
      if (filterMajor && s.major !== filterMajor) return false;
      if (filterCourse && s.course !== filterCourse) return false;
      if (filterGroup && s.group !== filterGroup) return false;
      
      // CRITICAL: Check if student is assigned to this Dept at this Date
      if (!assignedStudentIdsForDeptAndDate.has(s.id)) return false;

      // Check if already scheduled in this week
      if (busyStudentIdsInWeek.has(s.id)) return false;

      return true;
    });
  }, [students, filterMajor, filterCourse, filterGroup, busyStudentIdsInWeek, assignedStudentIdsForDeptAndDate]);

  const filteredScheduleList = useMemo(() => {
    return schedules
      .filter(s => {
        const inDateRange = s.date >= viewStartDate && s.date <= viewEndDate;
        const matchDept = viewDept ? s.department === viewDept : true;
        return inDateRange && matchDept;
      })
      .map(s => {
        const student = students.find(st => st.id === s.studentId);
        return { ...s, student };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedules, students, viewStartDate, viewEndDate, viewDept]);

  // Derived Data for Student Search View
  const studentSearchResults = useMemo(() => {
      if (!foundStudent) return [];
      return schedules
        .filter(s => 
            s.studentId === foundStudent.id && 
            s.date >= studentSearchStart && 
            s.date <= studentSearchEnd
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedules, foundStudent, studentSearchStart, studentSearchEnd]);

  // --- HANDLERS ---

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const toggleAll = () => {
    const newSet = new Set(selectedStudentIds);
    const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => newSet.has(s.id));
    
    if (allSelected) {
      filteredStudents.forEach(s => newSet.delete(s.id));
    } else {
      filteredStudents.forEach(s => newSet.add(s.id));
    }
    setSelectedStudentIds(newSet);
  };

  const handleExecute = async () => {
    if (!targetDate) return alert("Vui lòng chọn ngày trực.");
    if (selectedStudentIds.size === 0) return alert("Vui lòng chọn ít nhất một sinh viên.");
    if (!targetShifts[ShiftTime.MORNING] && !targetShifts[ShiftTime.AFTERNOON] && !targetShifts[ShiftTime.EVENING]) {
      return alert("Vui lòng chọn ít nhất một ca trực (Sáng, Chiều hoặc Tối).");
    }

    const newSchedules: OnCallSchedule[] = [];
    selectedStudentIds.forEach(studentId => {
      if (targetShifts[ShiftTime.MORNING]) newSchedules.push(createScheduleObj(studentId, targetDate, ShiftTime.MORNING));
      if (targetShifts[ShiftTime.AFTERNOON]) newSchedules.push(createScheduleObj(studentId, targetDate, ShiftTime.AFTERNOON));
      if (targetShifts[ShiftTime.EVENING]) newSchedules.push(createScheduleObj(studentId, targetDate, ShiftTime.EVENING));
    });

    for (const s of newSchedules) {
      await OnCallService.save(s);
    }

    await loadData();
    alert(`Đã xếp lịch thành công cho ${selectedStudentIds.size} sinh viên!`);
    setSelectedStudentIds(new Set());
    setActiveTab('list');
  };

  const openDeleteModal = (scheduleId: string, studentName?: string, date?: string, shift?: string) => {
      const details = `${studentName || 'Sinh viên'} - Ngày ${date} (${shift})`;
      setDeleteModal({ isOpen: true, scheduleId, details });
  };

  const confirmDelete = async () => {
      if (!deleteModal.scheduleId) return;
      await OnCallService.delete(deleteModal.scheduleId);
      loadData();
      setDeleteModal({ isOpen: false, scheduleId: null });
  };

  const handleStudentSearch = () => {
      if (!studentSearchKeyword.trim()) return alert("Vui lòng nhập thông tin tìm kiếm.");
      
      const keyword = studentSearchKeyword.toLowerCase().trim();
      // Exact match MSSV or Partial match Name
      const match = students.find(s => 
          s.studentCode.toLowerCase() === keyword || 
          s.fullName.toLowerCase().includes(keyword)
      );

      setHasSearched(true);
      setFoundStudent(match || null);
      
      if (!match) {
          alert("Không tìm thấy sinh viên nào với thông tin đã nhập.");
      }
  };

  const resetStudentSearch = () => {
      setStudentSearchKeyword('');
      setFoundStudent(null);
      setHasSearched(false);
  };

  const createScheduleObj = (sid: string, date: string, shift: ShiftTime): OnCallSchedule => ({
    id: Date.now().toString() + Math.random(),
    studentId: sid,
    department: filterDept,
    date: date,
    shift: shift,
    status: AttendanceStatus.PRESENT // Default status
  });

  // --- GEOLOCATION CHECK-IN HANDLER ---
  const handleCheckIn = async (schedule: OnCallSchedule) => {
      if (!navigator.geolocation) {
          alert("Trình duyệt của bạn không hỗ trợ định vị (Geolocation).");
          return;
      }

      setCheckingInId(schedule.id);

      navigator.geolocation.getCurrentPosition(
          async (position) => {
              try {
                  const updatedSchedule: OnCallSchedule = {
                      ...schedule,
                      checkInTime: new Date().toISOString(),
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      status: AttendanceStatus.PRESENT
                  };
                  
                  await OnCallService.save(updatedSchedule);
                  await loadData(); // Refresh UI
                  // alert("Điểm danh thành công!"); // Optional alert
              } catch (e) {
                  console.error(e);
                  alert("Có lỗi xảy ra khi lưu dữ liệu điểm danh.");
              } finally {
                  setCheckingInId(null);
              }
          },
          (error) => {
              console.error("Error accessing location:", error);
              setCheckingInId(null);
              let msg = "Không thể truy cập vị trí.";
              if (error.code === 1) msg = "Vui lòng cho phép trình duyệt truy cập vị trí để điểm danh.";
              else if (error.code === 2) msg = "Không thể xác định vị trí hiện tại.";
              else if (error.code === 3) msg = "Quá thời gian chờ lấy vị trí.";
              alert(msg);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
  };

  // --- STUDENT VIEW ---
  if (isStudent) {
    return (
      <div className="h-full flex flex-col animate-in fade-in">
        <div className="mb-6">
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <Calendar className="text-teal-600" /> Điểm Danh Trực Lâm Sàng
           </h1>
           <p className="text-gray-500 text-sm">Nhập thông tin cá nhân để xem lịch trực và thực hiện điểm danh</p>
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
                            value={studentSearchKeyword}
                            onChange={e => setStudentSearchKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleStudentSearch()}
                        />
                    </div>
                </div>
                <div className="md:col-span-5">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Thời gian xem lịch</label>
                    <div className="flex items-center gap-2">
                        <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={studentSearchStart} onChange={e => setStudentSearchStart(e.target.value)}/>
                        <span className="text-gray-400">-</span>
                        <input type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={studentSearchEnd} onChange={e => setStudentSearchEnd(e.target.value)}/>
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
                            onClick={resetStudentSearch}
                            className="px-3 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold hover:bg-gray-200 transition"
                            title="Làm mới"
                        >
                            <RotateCcw size={18}/>
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* RESULT SECTION */}
        {!hasSearched ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                <Calendar size={48} className="mb-3 opacity-20"/>
                <p className="font-medium">Vui lòng nhập thông tin để tra cứu lịch trực.</p>
            </div>
        ) : !foundStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 text-gray-500">
                <p className="font-medium">Không tìm thấy sinh viên.</p>
            </div>
        ) : (
            <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                 {/* Found Student Header */}
                 <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-200 text-teal-800 rounded-full flex items-center justify-center font-bold text-lg">
                        {foundStudent.fullName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-teal-900 text-lg">{foundStudent.fullName}</h3>
                        <div className="flex gap-3 text-sm text-teal-700">
                            <span>MSSV: <b>{foundStudent.studentCode}</b></span>
                            <span>•</span>
                            <span>Lớp: <b>{foundStudent.classId}</b></span>
                            <span>•</span>
                            <span>Nhóm: <b>{foundStudent.group}</b></span>
                        </div>
                    </div>
                 </div>

                 {/* Schedule Table */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase">
                            <Clock size={16} className="text-teal-600"/> Kết quả tìm kiếm
                        </h3>
                        <span className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-lg">
                            {studentSearchResults.length} ca trực
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-white text-gray-700 font-bold uppercase text-xs sticky top-0 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 bg-gray-50">Ngày trực</th>
                                    <th className="px-6 py-3 bg-gray-50">Khoa lâm sàng</th>
                                    <th className="px-6 py-3 bg-gray-50">Ca trực</th>
                                    <th className="px-6 py-3 bg-gray-50 text-right">Trạng thái điểm danh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {studentSearchResults.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-10 text-center italic text-gray-400">
                                        Không có lịch trực nào trong khoảng thời gian này.
                                    </td></tr>
                                ) : (
                                    studentSearchResults.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{s.date}</td>
                                        <td className="px-6 py-4">{s.department}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit
                                                    ${s.shift === ShiftTime.MORNING ? 'bg-yellow-100 text-yellow-800' : 
                                                    s.shift === ShiftTime.AFTERNOON ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}
                                                `}>
                                                    {s.shift}
                                                </span>
                                                <span className="text-xs text-gray-400 mt-1 font-medium pl-1">
                                                    {SHIFT_HOURS[s.shift]}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {s.checkInTime ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-green-600 flex items-center gap-1 font-bold bg-green-50 px-3 py-1 rounded-full text-xs">
                                                        <CheckCircle size={14}/> Đã điểm danh
                                                    </span>
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        Lúc: {new Date(s.checkInTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => handleCheckIn(s)}
                                                        disabled={checkingInId === s.id}
                                                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-wait transition"
                                                    >
                                                        {checkingInId === s.id ? (
                                                            <><Loader2 size={14} className="animate-spin"/> Đang xử lý...</>
                                                        ) : (
                                                            <><Navigation size={14}/> Bắt đầu điểm danh</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </div>
        )}
      </div>
    );
  }

  // --- LECTURER / ADMIN VIEW ---

  return (
    <div className="h-full flex flex-col animate-in fade-in">
      <div className="mb-4 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">
                {isAdmin ? 'Xem Lịch Trực Toàn Viện' : 'Quản lý Lịch Trực'}
            </h1>
            <p className="text-gray-500">
                {isAdmin 
                    ? 'Theo dõi phân công trực của sinh viên tại các khoa' 
                    : 'Xếp lịch và theo dõi lịch trực lâm sàng của sinh viên'
                }
            </p>
        </div>
        
        {!isAdmin && (
            <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 flex gap-1">
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition
                        ${activeTab === 'create' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}
                    `}
                >
                    <Plus size={16}/> Xếp lịch mới
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition
                        ${activeTab === 'list' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}
                    `}
                >
                    <List size={16}/> Danh sách lịch trực
                </button>
            </div>
        )}
      </div>

      {activeTab === 'create' && !isAdmin ? (
        <div className="flex gap-6 h-full overflow-hidden">
            {/* Create Tab Content (Unchanged layout but cleaned up) */}
            <div className="w-80 flex flex-col gap-4 overflow-y-auto shrink-0">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm uppercase">
                    <Filter size={16} className="text-teal-600"/> 1. Chọn nhóm sinh viên
                </h3>
                <div className="space-y-3">
                    <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Khoa thực tập</label>
                    <select className="w-full p-2 border rounded-lg text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Đối tượng</label>
                    <select className="w-full p-2 border rounded-lg text-sm" value={filterMajor} onChange={e => setFilterMajor(e.target.value)}>
                        <option value="">-- Tất cả --</option>
                        {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Khóa</label>
                    <select className="w-full p-2 border rounded-lg text-sm" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                        <option value="">-- Tất cả --</option>
                        {courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nhóm</label>
                    <select className="w-full p-2 border rounded-lg text-sm" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                        <option value="">-- Tất cả --</option>
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex-1">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm uppercase">
                    <Calendar size={16} className="text-teal-600"/> 2. Thông tin trực
                </h3>

                <div className="space-y-4">
                    <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Ngày trực</label>
                    <input 
                        type="date" 
                        className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                    />
                    <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-800">
                        <p className="font-bold mb-1 flex items-center gap-1"><Info size={12}/> Tuần hiện tại:</p>
                        <p>{weekInfo.startDisplay} - {weekInfo.endDisplay}</p>
                    </div>
                    </div>
                    
                    <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Chọn ca trực</label>
                    <div className="space-y-2">
                        {[ShiftTime.MORNING, ShiftTime.AFTERNOON, ShiftTime.EVENING].map(shift => (
                            <label key={shift} className="flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-gray-50">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 text-teal-600 rounded"
                                checked={targetShifts[shift]}
                                onChange={e => setTargetShifts({...targetShifts, [shift]: e.target.checked})}
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{shift}</span>
                                <span className="text-xs text-gray-500">{SHIFT_HOURS[shift]}</span>
                            </div>
                            </label>
                        ))}
                    </div>
                    </div>

                    <button 
                        onClick={handleExecute}
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-teal-700 transition flex items-center justify-center gap-2 mt-4"
                    >
                        <Plus size={18}/> Thực hiện
                    </button>
                </div>
            </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Users size={16} className="text-gray-400"/>
                        <span className="font-bold">Danh sách Sinh viên Khả dụng ({filteredStudents.length})</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Đang thực tập tại {filterDept} vào ngày {new Date(targetDate).toLocaleDateString('vi-VN')}</p>
                </div>
                
                <button onClick={toggleAll} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-indigo-50 transition">
                    {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id)) ? <CheckSquare size={16}/> : <Square size={16}/>}
                    {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
                {loading ? (
                    <div className="p-10 text-center text-gray-400">Đang tải dữ liệu...</div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle size={32} className="opacity-20"/>
                        </div>
                        <p className="text-center font-medium mb-2">Không có sinh viên nào.</p>
                        <p className="text-xs text-center max-w-xs text-gray-500 mb-2">
                            Lý do có thể:
                        </p>
                        <ul className="text-xs text-left text-gray-500 list-disc pl-6 space-y-1">
                            <li>Chưa có sinh viên nào được phân công thực tập tại <b>Khoa {filterDept}</b> vào ngày này.</li>
                            <li>Sinh viên đã có lịch trực khác trong tuần này (đã bị ẩn).</li>
                            <li>Bộ lọc Đối tượng/Khóa/Nhóm không khớp.</li>
                        </ul>
                        <p className="text-xs text-center mt-4 text-indigo-600">
                           Vui lòng kiểm tra lại Tab "Kế hoạch lâm sàng" (Admin).
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredStudents.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => toggleStudent(s.id)}
                                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all select-none
                                    ${selectedStudentIds.has(s.id) ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
                                `}
                            >
                                <div className={`text-indigo-600 transition-transform ${selectedStudentIds.has(s.id) ? 'scale-110' : 'scale-100'}`}>
                                    {selectedStudentIds.has(s.id) ? <CheckSquare size={20}/> : <Square size={20} className="text-gray-300 hover:text-gray-400"/>}
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{s.fullName}</div>
                                        <div className="text-xs text-gray-500">{s.studentCode}</div>
                                    </div>
                                    <div className="text-xs text-gray-600 flex items-center">
                                        <span className="bg-gray-100 px-2 py-1 rounded">{s.major}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>Lớp: {s.classId}</span>
                                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                        <span>Nhóm: {s.group}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                Đã chọn {selectedStudentIds.size} sinh viên
            </div>
            </div>
        </div>
      ) : (
        /* --- TAB: LIST VIEW (Lecturer & Admin) --- */
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Từ ngày</label>
                    <input type="date" className="w-full p-2 border rounded-lg text-sm" value={viewStartDate} onChange={e => setViewStartDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Đến ngày</label>
                    <input type="date" className="w-full p-2 border rounded-lg text-sm" value={viewEndDate} onChange={e => setViewEndDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Khoa</label>
                    <select className="w-full p-2 border rounded-lg text-sm" value={viewDept} onChange={e => setViewDept(e.target.value)}>
                        <option value="">-- Tất cả các khoa --</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="flex items-end pb-0.5">
                    <div className="text-sm text-gray-500 font-medium">
                        Tìm thấy <span className="text-teal-600 font-bold text-lg">{filteredScheduleList.length}</span> lượt trực
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-white text-gray-700 font-bold uppercase text-xs border-b border-gray-200 sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="px-4 py-3">Ngày trực</th>
                            <th className="px-4 py-3">Ca</th>
                            <th className="px-4 py-3">Khoa</th>
                            <th className="px-4 py-3">Sinh viên</th>
                            <th className="px-4 py-3">Lớp / Nhóm</th>
                            <th className="px-4 py-3">Điểm danh</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredScheduleList.length === 0 ? (
                             <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">Không tìm thấy dữ liệu trong khoảng thời gian này.</td></tr>
                        ) : (
                            filteredScheduleList.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">{item.date}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold w-fit
                                                ${item.shift === ShiftTime.MORNING ? 'bg-yellow-100 text-yellow-800' : 
                                                item.shift === ShiftTime.AFTERNOON ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'}
                                            `}>
                                                {item.shift}
                                            </span>
                                            <span className="text-xs text-gray-400 mt-0.5 font-medium">
                                                {SHIFT_HOURS[item.shift]}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{item.department}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-800">{item.student?.fullName}</div>
                                        <div className="text-xs text-gray-500">{item.student?.studentCode}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span>{item.student?.classId}</span>
                                            <span className="text-xs text-gray-400">{item.student?.group}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.checkInTime ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                                    <CheckCircle size={12}/> {new Date(item.checkInTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                                {item.latitude && item.longitude && (
                                                    <a 
                                                        href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 w-fit px-1.5 py-0.5 rounded"
                                                    >
                                                        <MapPin size={10}/> Xem vị trí
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Chưa điểm danh</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {!isAdmin && (
                                            <button 
                                                onClick={() => openDeleteModal(item.id, item.student?.fullName, item.date, item.shift)}
                                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                                                title="Xóa lịch trực này"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.scheduleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Xác nhận hủy lịch trực</h3>
                    <p className="text-gray-500 mt-2 text-sm">
                        Bạn có chắc chắn muốn xóa lịch trực: <br/>
                        <strong>{deleteModal.details}</strong>?
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModal({isOpen: false, scheduleId: null})}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm transition flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18}/> Xóa ngay
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
