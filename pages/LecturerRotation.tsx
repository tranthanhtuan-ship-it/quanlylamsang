
import React, { useEffect, useState, useMemo } from 'react';
import { AssignmentService, StudentService, RotationService, LecturerService } from '../services/db';
import { Assignment, Student, ClinicalRotation, DEPARTMENTS, SUB_DEPARTMENTS, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Square, Plus, Trash2, Network, ArrowRight, Calendar, Users, MapPin, AlertTriangle, Search, RotateCcw, ShieldCheck } from 'lucide-react';

export const LecturerRotationPage: React.FC = () => {
  const { user, selectedDepartment } = useAuth();
  const isStudent = user?.role === Role.STUDENT;
  const [loading, setLoading] = useState(true);

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rotations, setRotations] = useState<ClinicalRotation[]>([]);

  // Filters & Selection (Lecturer View)
  const [selectedMainDept, setSelectedMainDept] = useState<string>('');
  const [selectedSubDept, setSelectedSubDept] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Search State (Student View)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // UI State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, rotationId: string | null}>({
    isOpen: false, rotationId: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sData, aData, rData, lData] = await Promise.all([
      StudentService.getAll(),
      AssignmentService.getAll(),
      RotationService.getAll(),
      LecturerService.getAll()
    ]);
    
    setStudents(sData);
    setAssignments(aData);
    setRotations(rData);

    // AUTO-SELECT DEPT FROM CONTEXT
    if (selectedDepartment) {
        setSelectedMainDept(selectedDepartment);
    } else if (user?.role === 'lecturer' && user.relatedId) {
        // Fallback to lecturer profile dept
        const lecturer = lData.find(l => l.id === user.relatedId);
        if (lecturer) setSelectedMainDept(lecturer.department);
    }

    setLoading(false);
  };

  // --- STUDENT VIEW LOGIC ---
  const handleStudentSearch = () => {
    if (!searchKeyword.trim()) {
        alert("Vui lòng nhập Mã sinh viên hoặc Họ tên.");
        return;
    }
    const keyword = searchKeyword.toLowerCase().trim();
    const student = students.find(s => s.studentCode.toLowerCase() === keyword) || 
                    students.find(s => s.fullName.toLowerCase().includes(keyword));

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

  // Combine Rotations from DB and Admin Assignments for the student view
  const studentRotations = useMemo(() => {
      if (!foundStudent) return [];
      
      // 1. Manual Rotations
      const manual = rotations.filter(r => r.studentId === foundStudent.id);

      // 2. Admin Assignments converted to Rotations (if they have subDept)
      const adminDerived: ClinicalRotation[] = [];
      assignments.forEach(a => {
          if (a.subDepartment && a.studentIds.includes(foundStudent.id)) {
              adminDerived.push({
                  id: `ADMIN_${a.id}`,
                  mainDepartment: a.department,
                  subDepartment: a.subDepartment,
                  studentId: foundStudent.id,
                  startDate: a.startDate,
                  endDate: a.endDate
              });
          }
      });

      return [...manual, ...adminDerived].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [rotations, assignments, foundStudent]);


  // --- LECTURER VIEW LOGIC ---

  // Calculate Available Students based on Main Dept AND Time Conflicts
  const availableStudents = useMemo(() => {
      if (!selectedMainDept) return [];

      // 1. Get assignments for Main Dept (Admin's Plan)
      let relevantAssignments = assignments.filter(a => a.department === selectedMainDept);

      // Filter by DATE OVERLAP if set
      if (startDate && endDate) {
          relevantAssignments = relevantAssignments.filter(a => {
              return a.startDate <= endDate && a.endDate >= startDate;
          });
      }

      const validStudentIds = new Set<string>();
      relevantAssignments.forEach(a => {
          // EXCLUDE students who already have a subDepartment assigned by Admin
          // because they shouldn't be re-assigned manually here.
          if (!a.subDepartment) { 
             a.studentIds.forEach(id => validStudentIds.add(id));
          }
      });

      // 2. Filter out students who are BUSY in another sub-dept (Manual Rotation)
      if (startDate && endDate) {
          const busyIds = new Set<string>();
          rotations.forEach(r => {
              if (r.startDate <= endDate && r.endDate >= startDate) {
                  busyIds.add(r.studentId);
              }
          });
          return students.filter(s => validStudentIds.has(s.id) && !busyIds.has(s.id));
      }

      return students.filter(s => validStudentIds.has(s.id));
  }, [selectedMainDept, assignments, students, rotations, startDate, endDate]);

  // 3. Get Combined Rotations (Manual + Admin)
  const currentRotations = useMemo(() => {
      // A. Manual Rotations (Lecturer created)
      const manual = rotations.filter(r => r.mainDepartment === selectedMainDept);

      // B. Admin Assignments (Where Admin already set the sub-department)
      const adminDerived: ClinicalRotation[] = [];
      assignments.forEach(a => {
          if (a.department === selectedMainDept && a.subDepartment) {
              a.studentIds.forEach(sid => {
                  adminDerived.push({
                      id: `ADMIN_ASSIGN_${a.id}_${sid}`, // Synthetic ID to identify source
                      mainDepartment: a.department,
                      subDepartment: a.subDepartment!,
                      studentId: sid,
                      startDate: a.startDate,
                      endDate: a.endDate
                  });
              });
          }
      });

      return [...manual, ...adminDerived];
  }, [rotations, assignments, selectedMainDept]);

  // --- HANDLERS ---

  const handleMainDeptChange = (dept: string) => {
      setSelectedMainDept(dept);
      setSelectedSubDept('');
      setSelectedStudentIds(new Set());
  };

  const toggleStudent = (id: string) => {
      const newSet = new Set(selectedStudentIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedStudentIds(newSet);
  };

  const toggleAll = () => {
    const newSet = new Set(selectedStudentIds);
    const allSelected = availableStudents.length > 0 && availableStudents.every(s => newSet.has(s.id));
    
    if (allSelected) {
      availableStudents.forEach(s => newSet.delete(s.id));
    } else {
      availableStudents.forEach(s => newSet.add(s.id));
    }
    setSelectedStudentIds(newSet);
  };

  const handleSave = async () => {
      if (!selectedMainDept) return alert("Vui lòng chọn Khoa lớn.");
      if (!selectedSubDept) return alert("Vui lòng chọn Khoa nhỏ.");
      if (!startDate || !endDate) return alert("Vui lòng chọn thời gian.");
      if (selectedStudentIds.size === 0) return alert("Vui lòng chọn sinh viên.");

      const newRotations: ClinicalRotation[] = [];
      selectedStudentIds.forEach(sid => {
          newRotations.push({
              id: '', // filled by service
              mainDepartment: selectedMainDept,
              subDepartment: selectedSubDept,
              studentId: sid,
              startDate,
              endDate
          });
      });

      for (const r of newRotations) {
          await RotationService.save(r);
      }

      await loadData();
      alert(`Đã phân công ${newRotations.length} sinh viên về khoa ${selectedSubDept}.`);
      setSelectedStudentIds(new Set());
  };

  const confirmDelete = async () => {
      if (!deleteModal.rotationId) return;
      await RotationService.delete(deleteModal.rotationId);
      loadData();
      setDeleteModal({isOpen: false, rotationId: null});
  };

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

  // ===========================
  // RENDER: STUDENT VIEW
  // ===========================
  if (isStudent) {
    return (
      <div className="h-full flex flex-col animate-in fade-in">
          <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Network className="text-teal-600" /> Tra Cứu Phân Khoa Chi Tiết
              </h1>
              <p className="text-sm text-gray-500">Xem lịch đi các khoa lẻ / phòng bệnh chi tiết</p>
          </div>

          {/* SEARCH CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex gap-4 items-end">
                  <div className="flex-1">
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
                  <div className="flex gap-2">
                      <button 
                          onClick={handleStudentSearch}
                          className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2"
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

          {/* RESULT AREA */}
          {!hasSearched ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                  <Network size={48} className="mb-3 opacity-20"/>
                  <p className="font-medium">Vui lòng nhập Mã sinh viên hoặc Họ tên để tra cứu.</p>
              </div>
          ) : !foundStudent ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 text-gray-500">
                  <p className="font-medium">Không tìm thấy sinh viên.</p>
              </div>
          ) : (
              <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500">
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
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                      <div className="p-4 border-b border-gray-200 bg-gray-50">
                           <h3 className="font-bold text-gray-700 uppercase text-sm">Lịch trình chi tiết</h3>
                      </div>
                      <div className="overflow-y-auto flex-1">
                          {studentRotations.length === 0 ? (
                              <div className="p-10 text-center text-gray-400 italic">Chưa có thông tin phân khoa chi tiết.</div>
                          ) : (
                              <table className="w-full text-left text-sm text-gray-600">
                                  <thead className="bg-white text-gray-700 font-bold uppercase text-xs sticky top-0 border-b border-gray-100">
                                      <tr>
                                          <th className="px-6 py-3 bg-gray-50">Khoa Lớn</th>
                                          <th className="px-6 py-3 bg-gray-50">Khoa Nhỏ / Phòng</th>
                                          <th className="px-6 py-3 bg-gray-50">Thời gian thực tập</th>
                                          <th className="px-6 py-3 bg-gray-50">Trạng thái</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {studentRotations.map(rot => {
                                          const now = new Date().toISOString().split('T')[0];
                                          let status = 'Sắp tới';
                                          let statusColor = 'bg-gray-100 text-gray-600';
                                          const isAdminAssigned = rot.id.startsWith('ADMIN');

                                          if (rot.startDate <= now && rot.endDate >= now) {
                                              status = 'Đang diễn ra';
                                              statusColor = 'bg-green-100 text-green-700';
                                          } else if (rot.endDate < now) {
                                              status = 'Đã kết thúc';
                                              statusColor = 'bg-blue-50 text-blue-700';
                                          }

                                          return (
                                              <tr key={rot.id} className="hover:bg-gray-50">
                                                  <td className="px-6 py-4 font-bold text-gray-800">{rot.mainDepartment}</td>
                                                  <td className="px-6 py-4">
                                                      <div className="flex items-center gap-2">
                                                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium border border-indigo-100">
                                                              {rot.subDepartment}
                                                          </span>
                                                          {isAdminAssigned && <ShieldCheck size={14} className="text-teal-500" title="Do Admin phân công"/>}
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <div className="flex items-center gap-2">
                                                          <Calendar size={14} className="text-gray-400"/>
                                                          {new Date(rot.startDate).toLocaleDateString('vi-VN')} &rarr; {new Date(rot.endDate).toLocaleDateString('vi-VN')}
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>
                                                          {status}
                                                      </span>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>
    );
  }

  // ===========================
  // RENDER: LECTURER VIEW (Original)
  // ===========================
  const availableSubDepts = selectedMainDept ? (SUB_DEPARTMENTS[selectedMainDept] || []) : [];

  return (
    <div className="h-full flex flex-col animate-in fade-in">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Network className="text-teal-600"/> Phân Khoa Chi Tiết
            </h1>
            <p className="text-sm text-gray-500">Phân công sinh viên về các khoa nhỏ (VD: Nội -> Nội Tim mạch)</p>
        </div>

        <div className="flex gap-6 h-full overflow-hidden">
            {/* LEFT COLUMN: CONTROLS & STUDENT SELECTION */}
            <div className="w-1/3 flex flex-col gap-4">
                
                {/* Step 1: Select Context */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase border-b pb-2">1. Thiết lập phân công</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Khoa Lớn (Đã được Admin phân)</label>
                            <select 
                                className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 ${selectedDepartment ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                                value={selectedMainDept}
                                onChange={e => handleMainDeptChange(e.target.value)}
                                disabled={!!selectedDepartment}
                            >
                                <option value="">-- Chọn Khoa Lớn --</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Khoa Nhỏ / Phòng</label>
                            <select 
                                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                value={selectedSubDept}
                                onChange={e => setSelectedSubDept(e.target.value)}
                                disabled={!selectedMainDept}
                            >
                                <option value="">-- Chọn Khoa Nhỏ --</option>
                                {availableSubDepts.length > 0 ? (
                                    availableSubDepts.map(sd => <option key={sd} value={sd}>{sd}</option>)
                                ) : (
                                    <option disabled>Không có khoa nhỏ định nghĩa</option>
                                )}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Từ ngày</label>
                                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Đến ngày</label>
                                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2: Select Students */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                     <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 text-sm uppercase">2. Chọn Sinh viên</h3>
                        <button onClick={toggleAll} className="text-xs text-indigo-600 font-medium hover:underline">
                             {availableStudents.length > 0 && availableStudents.every(s => selectedStudentIds.has(s.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-2">
                        {availableStudents.length === 0 ? (
                            <div className="text-center p-6 text-gray-400 text-sm italic">
                                {selectedMainDept 
                                    ? 'Không có sinh viên mới nào. Tất cả đã được phân công.' 
                                    : 'Vui lòng chọn Khoa Lớn.'}
                            </div>
                        ) : (
                            availableStudents.map(s => (
                                <div 
                                    key={s.id} 
                                    onClick={() => toggleStudent(s.id)}
                                    className={`flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition
                                        ${selectedStudentIds.has(s.id) ? 'bg-indigo-50' : ''}
                                    `}
                                >
                                    <div className={selectedStudentIds.has(s.id) ? 'text-indigo-600' : 'text-gray-300'}>
                                        {selectedStudentIds.has(s.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{s.fullName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{s.studentCode}</span>
                                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                            <span>{s.group}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>

                     <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <button 
                            onClick={handleSave}
                            className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-teal-700 transition flex items-center justify-center gap-2"
                        >
                            <Plus size={18}/> Lưu phân công
                        </button>
                     </div>
                </div>
            </div>

            {/* RIGHT COLUMN: LIST OF ASSIGNMENTS */}
            <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-800 uppercase text-sm">Danh sách phân công chi tiết</h3>
                        <p className="text-xs text-gray-500 mt-1">Tại khoa: {selectedMainDept || '...'}</p>
                    </div>
                    <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-bold">
                        {currentRotations.length} lượt
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-white text-gray-700 font-bold uppercase text-xs sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="px-6 py-3 bg-gray-50">Khoa Nhỏ</th>
                                <th className="px-6 py-3 bg-gray-50">Sinh viên</th>
                                <th className="px-6 py-3 bg-gray-50">Lớp / Nhóm</th>
                                <th className="px-6 py-3 bg-gray-50">Thời gian</th>
                                <th className="px-6 py-3 bg-gray-50 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentRotations.length === 0 ? (
                                <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">Chưa có phân công chi tiết nào.</td></tr>
                            ) : (
                                currentRotations.map(rot => {
                                    const student = students.find(s => s.id === rot.studentId);
                                    const isAdminAssigned = rot.id.startsWith('ADMIN_ASSIGN_');

                                    return (
                                        <tr key={rot.id} className={`hover:bg-gray-50 transition ${isAdminAssigned ? 'bg-teal-50/20' : ''}`}>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded font-medium border 
                                                    ${isAdminAssigned ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-blue-50 text-blue-700 border-blue-100'}
                                                `}>
                                                    {rot.subDepartment}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{student?.fullName || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500">{student?.studentCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {student?.classId} - {student?.group}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-600 bg-gray-100 w-fit px-2 py-1 rounded text-xs">
                                                    <Calendar size={12}/> {new Date(rot.startDate).toLocaleDateString('vi-VN')} &rarr; {new Date(rot.endDate).toLocaleDateString('vi-VN')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdminAssigned ? (
                                                    <span title="Được phân công bởi Admin" className="text-teal-500 cursor-help inline-flex items-center justify-center p-1.5">
                                                        <ShieldCheck size={18}/>
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={() => setDeleteModal({isOpen: true, rotationId: rot.id})}
                                                        className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* DELETE MODAL */}
        {deleteModal.isOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 text-center">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Xóa phân công?</h3>
                    <p className="text-gray-500 text-sm mb-6">Hành động này không thể hoàn tác.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteModal({isOpen: false, rotationId: null})} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
                        <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Xóa</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
