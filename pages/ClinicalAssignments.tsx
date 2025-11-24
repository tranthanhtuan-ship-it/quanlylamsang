
import React, { useEffect, useState, useMemo } from 'react';
import { AssignmentService, StudentService } from '../services/db';
import { Assignment, Student, DEPARTMENTS, MAJORS, SUB_DEPARTMENTS } from '../types';
import { Plus, Trash2, Calendar as CalendarIcon, Users, CheckSquare, Square, ArrowRight, MapPin, ClipboardCheck, AlertTriangle, List, BarChart2, Search, Network } from 'lucide-react';

export const ClinicalAssignments: React.FC = () => {
  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState<'planning' | 'overview'>('planning');

  // --- PLANNING TAB STATE ---
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedSubDept, setSelectedSubDept] = useState<string>(''); // NEW
  
  const [filterMajor, setFilterMajor] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- OVERVIEW TAB STATE ---
  const [viewDept, setViewDept] = useState<string>('');
  const [viewStartDate, setViewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewEndDate, setViewEndDate] = useState<string>(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  // --- SHARED DATA ---
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, assignment: Assignment | null}>({
    isOpen: false, assignment: null
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [sData, aData] = await Promise.all([
        StudentService.getAll(),
        AssignmentService.getAll()
      ]);
      setStudents(sData);
      setAssignments(aData);
      setLoading(false);
    };
    init();
  }, []);

  // --- DERIVED DATA (PLANNING) ---
  
  const courses = useMemo(() => [...new Set(students.map(s => s.course))].sort(), [students]);
  const groups = useMemo(() => [...new Set(students.map(s => s.group))].sort(), [students]);
  
  const availableSubDepts = useMemo(() => {
      return selectedDept ? (SUB_DEPARTMENTS[selectedDept] || []) : [];
  }, [selectedDept]);

  const filteredStudentsForAssignment = useMemo(() => {
    return students.filter(s => {
      if (filterMajor && s.major !== filterMajor) return false;
      if (filterCourse && s.course !== filterCourse) return false;
      if (filterGroup && s.group !== filterGroup) return false;
      return true;
    });
  }, [students, filterMajor, filterCourse, filterGroup]);

  const currentDeptAssignments = useMemo(() => {
      return assignments.filter(a => a.department === selectedDept);
  }, [assignments, selectedDept]);

  // --- DERIVED DATA (OVERVIEW) ---

  const overviewData = useMemo(() => {
      // 1. Filter Assignments based on View Settings
      const relevantAssignments = assignments.filter(a => {
          const matchDept = viewDept ? a.department === viewDept : true;
          // Check Date Overlap: (StartA <= EndB) and (EndA >= StartB)
          const overlap = (a.startDate <= viewEndDate) && (a.endDate >= viewStartDate);
          return matchDept && overlap;
      });

      // 2. Group by Department
      const grouped: Record<string, { assignment: Assignment, students: Student[] }[]> = {};
      
      // Initialize all depts if "All" is selected, or just the selected one
      const deptsToShow = viewDept ? [viewDept] : DEPARTMENTS;
      deptsToShow.forEach(d => grouped[d] = []);

      relevantAssignments.forEach(a => {
          if (!grouped[a.department]) grouped[a.department] = []; // Safety check
          
          // Get student details for this assignment
          const studentDetails = students.filter(s => a.studentIds.includes(s.id));
          
          grouped[a.department].push({
              assignment: a,
              students: studentDetails
          });
      });

      return grouped;
  }, [assignments, students, viewDept, viewStartDate, viewEndDate]);


  // --- HANDLERS ---

  const handleDeptSelection = (dept: string) => {
      setSelectedDept(dept);
      setSelectedSubDept(''); // Reset sub-dept when main dept changes
  };

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const toggleAllFiltered = () => {
    const newSet = new Set(selectedStudentIds);
    const allSelected = filteredStudentsForAssignment.every(s => newSet.has(s.id));
    
    if (allSelected) {
      filteredStudentsForAssignment.forEach(s => newSet.delete(s.id));
    } else {
      filteredStudentsForAssignment.forEach(s => newSet.add(s.id));
    }
    setSelectedStudentIds(newSet);
  };

  const handleAssign = async () => {
    if (!selectedDept) return alert("Vui lòng chọn Khoa lâm sàng.");
    if (selectedStudentIds.size === 0) return alert("Vui lòng chọn ít nhất một sinh viên.");
    if (!startDate || !endDate) return alert("Vui lòng chọn thời gian bắt đầu và kết thúc.");
    if (startDate > endDate) return alert("Ngày kết thúc phải sau ngày bắt đầu.");

    const ids: string[] = Array.from(selectedStudentIds);

    // --- VALIDATION LOGIC: CHECK FOR OVERLAPS ---
    const conflicts: string[] = [];
    
    ids.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        // Check against existing assignments for this student
        const conflictingAssignment = assignments.find(a => {
            if (!a.studentIds.includes(studentId)) return false;
            
            // Check overlap: (StartA <= EndB) and (EndA >= StartB)
            const isOverlap = (startDate <= a.endDate) && (endDate >= a.startDate);
            return isOverlap;
        });

        if (conflictingAssignment) {
            conflicts.push(
                `- ${student.fullName} (${student.studentCode}): Đang ở Khoa ${conflictingAssignment.department} (${conflictingAssignment.startDate} -> ${conflictingAssignment.endDate})`
            );
        }
    });

    if (conflicts.length > 0) {
        alert(
            `KHÔNG THỂ PHÂN CÔNG!\nPhát hiện ${conflicts.length} sinh viên bị trùng lịch thực tập trong khoảng thời gian này:\n\n` + 
            conflicts.slice(0, 10).join("\n") + 
            (conflicts.length > 10 ? `\n... và ${conflicts.length - 10} sinh viên khác.` : "")
        );
        return; // Stop execution
    }
    // --- END VALIDATION ---
    
    const assignmentName = selectedSubDept 
        ? `${filterGroup || 'Nhóm'} - ${selectedSubDept}`
        : `${filterGroup || 'Nhóm'} - ${selectedDept}`;

    const newAssignment: Assignment = {
      id: Date.now().toString(),
      department: selectedDept,
      subDepartment: selectedSubDept || undefined, // Save Sub-dept if selected
      startDate,
      endDate,
      studentIds: ids,
      name: assignmentName
    };

    await AssignmentService.save(newAssignment);
    
    const newAssignments = await AssignmentService.getAll();
    setAssignments(newAssignments);
    setSelectedStudentIds(new Set());
    
    const successMsg = selectedSubDept 
        ? `Đã phân công ${ids.length} sinh viên vào ${selectedSubDept} (thuộc khoa ${selectedDept}) thành công!`
        : `Đã phân công ${ids.length} sinh viên vào khoa ${selectedDept} thành công!`;
    
    alert(successMsg);
  };

  const openDeleteModal = (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, assignment });
  };

  const confirmDelete = async () => {
    if (!deleteModal.assignment) return;
    try {
      await AssignmentService.delete(deleteModal.assignment.id);
      const updatedAssignments = await AssignmentService.getAll();
      setAssignments(updatedAssignments);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Lỗi khi xóa phân công.");
    } finally {
      setDeleteModal({ isOpen: false, assignment: null });
    }
  };

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in">
      {/* HEADER & TABS */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kế hoạch Lâm sàng</h1>
          <p className="text-sm text-gray-500">Quản lý phân công thực tập toàn viện</p>
        </div>
        
        <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('planning')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTab === 'planning' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <ClipboardCheck size={16}/> Lập kế hoạch
            </button>
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTab === 'overview' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <List size={16}/> Xem tổng hợp
            </button>
        </div>
      </div>

      {/* === TAB 1: PLANNING (Original UI) === */}
      {activeTab === 'planning' && (
          <div className="flex flex-1 gap-6 overflow-hidden animate-in slide-in-from-left-4 duration-300">
            {/* LEFT: DEPARTMENT SELECTION */}
            <div className="w-64 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
              <div className="p-4 bg-teal-50 border-b border-teal-100 font-bold text-teal-800 flex items-center gap-2">
                 <Users size={18}/> Khoa Lâm Sàng
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    onClick={() => handleDeptSelection(dept)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center
                      ${selectedDept === dept ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-teal-700'}
                    `}
                  >
                    {dept}
                    {selectedDept === dept && <ArrowRight size={16} />}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: MAIN CONTENT */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                
                {!selectedDept ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Users size={40} className="text-gray-300"/>
                        </div>
                        <p className="text-lg font-medium text-gray-500">Vui lòng chọn Khoa lâm sàng từ danh sách bên trái</p>
                        <p className="text-sm">Để bắt đầu lập kế hoạch phân công</p>
                     </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                         {/* FORM SECTION */}
                         <div className="p-5 border-b border-gray-100 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                                    <MapPin className="text-teal-600" size={20}/> 
                                    Phân công tại Khoa {selectedDept}
                                </h2>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">Bước 1: Lọc sinh viên &rarr; Bước 2: Chọn ngày &rarr; Bước 3: Thực hiện</span>
                            </div>
                            
                            {/* NEW: Sub-Department Selection (Especially for Chuyên khoa lẻ) */}
                            {availableSubDepts.length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                                        <Network size={18}/>
                                        Khoa nhỏ (Tùy chọn):
                                    </div>
                                    <select 
                                        className="flex-1 p-2 border border-blue-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                                        value={selectedSubDept}
                                        onChange={(e) => setSelectedSubDept(e.target.value)}
                                    >
                                        <option value="">-- Chung / Không chọn --</option>
                                        {availableSubDepts.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    <div className="text-xs text-blue-600 italic">
                                        * Chọn để phân công cụ thể ngay (thay vì chỉ phân về khoa lớn).
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Filters */}
                                <div className="lg:col-span-7 grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Đối tượng</label>
                                        <select className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500" value={filterMajor} onChange={e => setFilterMajor(e.target.value)}>
                                            <option value="">-- Tất cả --</option>
                                            {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Khóa</label>
                                        <select className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                                            <option value="">-- Tất cả --</option>
                                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Nhóm</label>
                                        <select className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                                            <option value="">-- Tất cả --</option>
                                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Date & Action */}
                                <div className="lg:col-span-5 flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Thời gian thực tập</label>
                                        <div className="flex items-center gap-2">
                                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                            <span className="text-gray-400">-</span>
                                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleAssign}
                                        className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-teal-700 transition h-[38px] flex items-center gap-1 whitespace-nowrap"
                                    >
                                        <Plus size={18}/> Thực hiện
                                    </button>
                                </div>
                            </div>
                         </div>

                         {/* LIST SECTION */}
                         <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-100">
                            {/* Left: Filtered Student List */}
                            <div className="flex flex-col overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                    <span className="font-bold text-gray-700 text-sm">Danh sách từ Tab Sinh viên ({filteredStudentsForAssignment.length})</span>
                                    <button onClick={toggleAllFiltered} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                        {filteredStudentsForAssignment.length > 0 && filteredStudentsForAssignment.every(s => selectedStudentIds.has(s.id)) ? <Square size={14}/> : <CheckSquare size={14}/>}
                                        {filteredStudentsForAssignment.length > 0 && filteredStudentsForAssignment.every(s => selectedStudentIds.has(s.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {filteredStudentsForAssignment.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 text-sm italic">
                                            Không tìm thấy sinh viên.<br/>Vui lòng kiểm tra lại bộ lọc Đối tượng/Khóa/Nhóm.
                                        </div>
                                    ) : (
                                        filteredStudentsForAssignment.map(s => (
                                            <div 
                                                key={s.id} 
                                                onClick={() => toggleStudent(s.id)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all group
                                                    ${selectedStudentIds.has(s.id) ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
                                                `}
                                            >
                                                <div className={`text-indigo-600 transition-transform ${selectedStudentIds.has(s.id) ? 'scale-110' : 'scale-100'}`}>
                                                    {selectedStudentIds.has(s.id) ? <CheckSquare size={20}/> : <Square size={20} className="text-gray-300 group-hover:text-gray-400"/>}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-gray-800">{s.fullName}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span>{s.studentCode}</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <span>{s.classId}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600 font-medium">{s.group}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Existing Assignments */}
                            <div className="flex flex-col overflow-hidden bg-gray-50/30">
                                 <div className="bg-gray-100/50 px-4 py-3 border-b border-gray-100 font-bold text-gray-700 text-sm flex justify-between items-center">
                                    <span>Đã phân công tại {selectedDept}</span>
                                    <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-xs">{currentDeptAssignments.length} đợt</span>
                                 </div>
                                 <div className="overflow-y-auto flex-1 p-4 space-y-3">
                                    {currentDeptAssignments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                            <ClipboardCheck size={32} className="mb-2 opacity-20"/>
                                            <p className="text-sm italic">Chưa có phân công nào tại khoa này.</p>
                                        </div>
                                    ) : (
                                        currentDeptAssignments.map(assign => (
                                            <div key={assign.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group hover:shadow-md transition">
                                                <button 
                                                    onClick={(e) => openDeleteModal(e, assign)}
                                                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 z-10 bg-white rounded-full border border-gray-200 shadow-sm"
                                                    title="Xóa đợt phân công này"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                
                                                <div className="mb-2">
                                                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                        {assign.name}
                                                    </h4>
                                                    {assign.subDepartment && (
                                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium mt-1 inline-block">
                                                            {assign.subDepartment}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-gray-700 bg-blue-50 p-1.5 rounded">
                                                        <CalendarIcon size={14} className="text-blue-500"/> 
                                                        <span className="font-medium">{assign.startDate}</span> 
                                                        <span className="text-gray-400">&rarr;</span> 
                                                        <span className="font-medium">{assign.endDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-700 bg-teal-50 p-1.5 rounded">
                                                        <Users size={14} className="text-teal-500"/> 
                                                        <span className="font-bold">{assign.studentIds.length}</span> sinh viên
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                 </div>
                            </div>
                         </div>
                    </div>
                )}
            </div>
          </div>
      )}

      {/* === TAB 2: OVERVIEW (New Feature) === */}
      {activeTab === 'overview' && (
          <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              {/* FILTER BAR */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Xem Khoa</label>
                      <select 
                        className="w-full p-2 border rounded-lg text-sm" 
                        value={viewDept} 
                        onChange={e => setViewDept(e.target.value)}
                      >
                          <option value="">-- Tất cả các khoa --</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Từ ngày</label>
                      <input type="date" className="w-full p-2 border rounded-lg text-sm" value={viewStartDate} onChange={e => setViewStartDate(e.target.value)} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Đến ngày</label>
                      <input type="date" className="w-full p-2 border rounded-lg text-sm" value={viewEndDate} onChange={e => setViewEndDate(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-1">
                      <div className="text-sm text-gray-600 font-medium">
                          <BarChart2 size={16} className="inline mr-1 text-teal-600"/>
                          Đang xem kế hoạch tổng thể
                      </div>
                  </div>
              </div>

              {/* RESULTS AREA */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {Object.keys(overviewData).length === 0 ? (
                      <div className="text-center text-gray-400 p-10">Không có dữ liệu.</div>
                  ) : (
                      DEPARTMENTS.map(dept => {
                          // Only show depts that match filter and have data
                          if (viewDept && viewDept !== dept) return null;
                          const groups = overviewData[dept];
                          if (!groups || groups.length === 0) return null;

                          // Calculate total students for this dept in this view
                          const totalStudents = groups.reduce((acc, curr) => acc + curr.students.length, 0);

                          return (
                              <div key={dept} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                  <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                                      <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                                          <MapPin size={20} className="text-indigo-600"/> Khoa {dept}
                                      </h3>
                                      <span className="bg-white border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                          {totalStudents} sinh viên
                                      </span>
                                  </div>
                                  
                                  <div className="p-0">
                                      <table className="w-full text-left text-sm text-gray-600">
                                          <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs border-b border-gray-100">
                                              <tr>
                                                  <th className="px-6 py-3 w-12">#</th>
                                                  <th className="px-6 py-3">Họ và tên</th>
                                                  <th className="px-6 py-3">Mã SV</th>
                                                  <th className="px-6 py-3">Lớp / Nhóm</th>
                                                  <th className="px-6 py-3">Khoa nhỏ / Phân loại</th>
                                                  <th className="px-6 py-3">Thời gian thực tập</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                              {groups.map((group, gIdx) => (
                                                  group.students.map((student, sIdx) => (
                                                      <tr key={`${group.assignment.id}-${student.id}`} className="hover:bg-gray-50">
                                                          <td className="px-6 py-3 text-gray-400">{sIdx + 1}</td>
                                                          <td className="px-6 py-3 font-bold text-gray-800">{student.fullName}</td>
                                                          <td className="px-6 py-3">{student.studentCode}</td>
                                                          <td className="px-6 py-3">
                                                              {student.classId} 
                                                              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded ml-1">{student.group}</span>
                                                          </td>
                                                          <td className="px-6 py-3">
                                                              {group.assignment.subDepartment ? (
                                                                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                                                                      {group.assignment.subDepartment}
                                                                  </span>
                                                              ) : (
                                                                  <span className="text-gray-400 italic text-xs">Chung</span>
                                                              )}
                                                          </td>
                                                          <td className="px-6 py-3">
                                                              <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 w-fit px-2 py-1 rounded text-xs font-medium">
                                                                  <CalendarIcon size={12}/>
                                                                  {group.assignment.startDate} &rarr; {group.assignment.endDate}
                                                              </div>
                                                          </td>
                                                      </tr>
                                                  ))
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          );
                      })
                  )}
                  
                  {/* Empty State helper if valid filter but no results */}
                  {DEPARTMENTS.every(d => !overviewData[d] || overviewData[d].length === 0) && (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                          <Search size={48} className="mb-4 opacity-20"/>
                          <p className="text-lg font-medium">Không có kế hoạch thực tập nào trong khoảng thời gian này.</p>
                          <p className="text-sm">Vui lòng kiểm tra lại bộ lọc thời gian hoặc Khoa.</p>
                      </div>
                  )}
              </div>
          </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.assignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Xác nhận xóa phân công</h3>
                    <p className="text-gray-500 mt-2 text-sm">
                        Hành động này sẽ xóa đợt phân công <strong>{deleteModal.assignment.name}</strong>.
                        <br/>
                        Lịch trực của sinh viên trong đợt này có thể bị ảnh hưởng.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModal({isOpen: false, assignment: null})}
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
