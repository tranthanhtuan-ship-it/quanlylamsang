
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentService, ReportService, LecturerService, AssignmentService, TeachingPlanService } from '../services/db';
import { Student, ClinicalReport, Lecturer, DEPARTMENTS, ReportLecturerActivity, Assignment, StudentAbsenceRecord, TeachingPlan, Role } from '../types';
import { FileText, CheckCircle, Plus, Trash2, Calendar, Users, ChevronDown, ChevronUp, X, ListFilter } from 'lucide-react';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<ClinicalReport[]>([]);
  const [teachingPlans, setTeachingPlans] = useState<TeachingPlan[]>([]);

  // Form State
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [lecturerCount, setLecturerCount] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weekNumber: 1,
    startDate: '',
    endDate: '',
    classFeedback: '',
    skillFeedback: '',
    absentStudents: [] as StudentAbsenceRecord[],
    lecturerActivities: [] as ReportLecturerActivity[]
  });

  // Audience Selection Modal State
  const [audienceModal, setAudienceModal] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    selectedItems: Set<string>;
  }>({
    isOpen: false,
    rowIndex: null,
    selectedItems: new Set()
  });

  useEffect(() => {
    const load = async () => {
        const [s, l, a, r, tp] = await Promise.all([
            StudentService.getAll(),
            LecturerService.getAll(),
            AssignmentService.getAll(),
            ReportService.getAll(),
            TeachingPlanService.getAll()
        ]);
        setStudents(s);
        setLecturers(l);
        setAssignments(a);
        setReports(r);
        setTeachingPlans(tp);
    };
    load();
  }, []);

  // --- FILTER LOGIC ---

  // 1. Filter Lecturers by selected Department
  const availableLecturers = useMemo(() => {
      if (!selectedDept) return [];
      return lecturers.filter(l => l.department === selectedDept);
  }, [lecturers, selectedDept]);

  // 2. Filter Students currently assigned to the selected Department
  const availableStudents = useMemo(() => {
      if (!selectedDept) return [];
      // Find assignments for this dept
      const deptAssignmentIds = assignments
        .filter(a => a.department === selectedDept)
        .flatMap(a => a.studentIds);
      const uniqueIds = new Set(deptAssignmentIds);
      
      return students.filter(s => uniqueIds.has(s.id));
  }, [students, assignments, selectedDept]);

  // 3. Extract Unique Cohorts (Major + Course + Group) for Target Audience Selection
  const availableCohorts = useMemo(() => {
    const cohorts = new Set<string>();
    availableStudents.forEach(s => {
        // Format: Major - Course (Group)
        // Example: Y sỹ đa khoa - K46 (Nhóm 1)
        cohorts.add(`${s.major} - ${s.course} (${s.group})`);
    });
    return Array.from(cohorts).sort();
  }, [availableStudents]);


  // --- AUTO-CALCULATION LOGIC ---
  
  const countTheorySessions = (lecturerId: string, start: string, end: string) => {
      if (!lecturerId || !start || !end) return 0;
      return teachingPlans.filter(p => 
        p.lecturerId === lecturerId && 
        p.date >= start && 
        p.date <= end
      ).length;
  };
  
  // Recalculate theory sessions for ALL rows when dates change
  useEffect(() => {
      if (formData.lecturerActivities.length > 0 && formData.startDate && formData.endDate) {
          const updated = formData.lecturerActivities.map(act => ({
              ...act,
              theorySessions: countTheorySessions(act.lecturerId, formData.startDate, formData.endDate)
          }));
          // Only update if values actually changed to prevent infinite loop
          const hasChanged = updated.some((u, i) => u.theorySessions !== formData.lecturerActivities[i].theorySessions);
          if (hasChanged) {
              setFormData(prev => ({ ...prev, lecturerActivities: updated }));
          }
      }
  }, [formData.startDate, formData.endDate, teachingPlans]);


  // --- HANDLERS ---

  const handleLecturerCountChange = (count: number) => {
      setLecturerCount(count);
      const currentActivities = [...formData.lecturerActivities];
      
      if (count > currentActivities.length) {
          // Add rows
          for (let i = currentActivities.length; i < count; i++) {
              currentActivities.push({
                  lecturerId: '',
                  lecturerName: '',
                  clinicalSessions: 0,
                  theorySessions: 0,
                  targetAudience: ''
              });
          }
      } else {
          // Remove rows
          currentActivities.splice(count);
      }
      setFormData({ ...formData, lecturerActivities: currentActivities });
  };

  const updateLecturerRow = (index: number, field: keyof ReportLecturerActivity, value: any) => {
      const newActivities = [...formData.lecturerActivities];
      
      if (field === 'lecturerId') {
          // When selecting ID, auto-fill Name AND Calculate Theory Sessions
          const selectedLec = lecturers.find(l => l.id === value);
          newActivities[index].lecturerName = selectedLec ? selectedLec.fullName : '';
          newActivities[index].lecturerId = value;
          
          // Auto-calc theory sessions if dates are present
          if (formData.startDate && formData.endDate) {
              newActivities[index].theorySessions = countTheorySessions(value, formData.startDate, formData.endDate);
          }

      } else {
          (newActivities[index] as any)[field] = value;
      }
      
      setFormData({ ...formData, lecturerActivities: newActivities });
  };

  // --- AUDIENCE MODAL HANDLERS ---
  const openAudienceModal = (index: number) => {
      const currentStr = formData.lecturerActivities[index].targetAudience || '';
      // Split string back to set, trimming whitespace
      const initialSet = new Set(currentStr ? currentStr.split('; ').filter(Boolean) : []);
      
      setAudienceModal({
          isOpen: true,
          rowIndex: index,
          selectedItems: initialSet
      });
  };

  const toggleAudienceItem = (item: string) => {
      setAudienceModal(prev => {
          const newSet = new Set(prev.selectedItems);
          if (newSet.has(item)) newSet.delete(item);
          else newSet.add(item);
          return { ...prev, selectedItems: newSet };
      });
  };

  const saveAudienceSelection = () => {
      if (audienceModal.rowIndex === null) return;
      
      // Convert Set to String joined by "; "
      const resultStr = Array.from(audienceModal.selectedItems).join('; ');
      updateLecturerRow(audienceModal.rowIndex, 'targetAudience', resultStr);
      
      setAudienceModal({ isOpen: false, rowIndex: null, selectedItems: new Set() });
  };
  // -------------------------------

  const handleStudentAbsenceChange = (studentId: string, value: string) => {
    const count = parseInt(value) || 0;
    setFormData(prev => {
        const currentList = [...prev.absentStudents];
        const index = currentList.findIndex(item => item.studentId === studentId);

        if (count > 0) {
            if (index >= 0) {
                // Update existing
                currentList[index].sessionCount = count;
            } else {
                // Add new
                currentList.push({ studentId, sessionCount: count });
            }
        } else {
            // Remove if 0 or empty
            if (index >= 0) {
                currentList.splice(index, 1);
            }
        }
        return { ...prev, absentStudents: currentList };
    });
  };

  const getStudentAbsenceCount = (studentId: string) => {
      const record = formData.absentStudents.find(r => r.studentId === studentId);
      return record ? record.sessionCount : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (!selectedDept) return alert("Vui lòng chọn Khoa trước khi tạo báo cáo.");

      const newReport: ClinicalReport = {
          id: '', // filled by service
          lecturerId: user.id,
          department: selectedDept,
          ...formData
      };
      
      await ReportService.save(newReport);
      alert('Đã gửi báo cáo thành công!');
      
      // Refresh list
      const r = await ReportService.getAll();
      setReports(r);
      setActiveTab('list');
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        weekNumber: 1,
        startDate: '',
        endDate: '',
        classFeedback: '',
        skillFeedback: '',
        absentStudents: [],
        lecturerActivities: []
      });
      setLecturerCount(0);
      setSelectedDept('');
  };

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Báo cáo Lâm sàng</h1>
          <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200">
              <button 
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'list' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Danh sách báo cáo
              </button>
              {!isAdmin && (
                <button 
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'create' ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Plus size={16} className="inline mr-1"/> Tạo báo cáo mới
                </button>
              )}
          </div>
      </div>

      {activeTab === 'create' && !isAdmin && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-5xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* SECTION 1: THÔNG TIN CHUNG */}
                  <div className="bg-teal-50/50 p-5 rounded-xl border border-teal-100">
                      <h3 className="text-teal-800 font-bold mb-4 flex items-center gap-2">
                          <FileText size={20}/> I. THÔNG TIN CHUNG
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                          <div className="col-span-1">
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Khoa thực tập</label>
                              <select 
                                required
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-medium" 
                                value={selectedDept} 
                                onChange={e => {
                                    setSelectedDept(e.target.value);
                                    // Reset lists dependent on dept
                                    setFormData(prev => ({ ...prev, absentStudents: [], lecturerActivities: [] }));
                                    setLecturerCount(0);
                                }}
                              >
                                  <option value="">-- Chọn Khoa --</option>
                                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Ngày báo cáo</label>
                              <input type="date" required className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tuần thứ</label>
                              <input type="number" min="1" max="52" required className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.weekNumber} onChange={e => setFormData({...formData, weekNumber: parseInt(e.target.value)})}/>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Thời gian (Từ - Đến)</label>
                              <div className="flex items-center gap-1">
                                  <input type="date" required className="w-full p-2.5 border border-gray-300 rounded-lg text-xs" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}/>
                                  <span className="text-gray-400">-</span>
                                  <input type="date" required className="w-full p-2.5 border border-gray-300 rounded-lg text-xs" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}/>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* SECTION 2: HOẠT ĐỘNG GIẢNG DẠY */}
                  <div className="bg-white border border-gray-200 p-5 rounded-xl">
                      <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                          <Users size={20} className="text-indigo-600"/> II. HOẠT ĐỘNG GIẢNG DẠY
                      </h3>
                      
                      <div className="mb-4 flex items-center gap-4">
                          <label className="text-sm font-medium text-gray-700">Số lượng giảng viên tham gia hướng dẫn:</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="20" 
                            className="w-20 p-2 border border-indigo-200 rounded-lg text-center font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                            value={lecturerCount}
                            onChange={(e) => handleLecturerCountChange(parseInt(e.target.value) || 0)}
                          />
                          {!selectedDept && <span className="text-xs text-red-500">* Vui lòng chọn Khoa trước</span>}
                      </div>

                      {lecturerCount > 0 && (
                          <div className="overflow-x-auto border border-gray-200 rounded-lg">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-indigo-50 text-indigo-800 font-semibold text-xs uppercase">
                                      <tr>
                                          <th className="p-3 w-10 text-center">#</th>
                                          <th className="p-3 w-1/4">Họ và tên giảng viên</th>
                                          <th className="p-3 text-center">Số buổi LS</th>
                                          <th className="p-3 text-center">Số buổi Lý thuyết</th>
                                          <th className="p-3">Đối tượng lên lớp</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {formData.lecturerActivities.map((act, idx) => (
                                          <tr key={idx} className="bg-white hover:bg-gray-50">
                                              <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                                              <td className="p-3">
                                                  <select 
                                                    required
                                                    className="w-full p-2 border border-gray-200 rounded focus:border-indigo-500"
                                                    value={act.lecturerId}
                                                    onChange={(e) => updateLecturerRow(idx, 'lecturerId', e.target.value)}
                                                  >
                                                      <option value="">-- Chọn Giảng viên --</option>
                                                      {availableLecturers.map(l => (
                                                          <option key={l.id} value={l.id}>{l.fullName}</option>
                                                      ))}
                                                  </select>
                                              </td>
                                              <td className="p-3">
                                                  <input 
                                                    type="number" min="0"
                                                    className="w-full p-2 border border-gray-200 rounded text-center"
                                                    value={act.clinicalSessions}
                                                    onChange={(e) => updateLecturerRow(idx, 'clinicalSessions', parseInt(e.target.value))}
                                                  />
                                              </td>
                                              <td className="p-3 relative group">
                                                  <input 
                                                    type="number" min="0"
                                                    className="w-full p-2 border border-gray-200 rounded text-center bg-gray-50"
                                                    value={act.theorySessions}
                                                    readOnly
                                                    title="Tự động tính toán từ Kế hoạch lên lớp"
                                                  />
                                                  {/* Tooltip info */}
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-48 bg-gray-800 text-white text-xs p-2 rounded hidden group-hover:block z-10 mb-1 text-center">
                                                      Tự động tính toán dựa trên Kế hoạch lên lớp trong khoảng thời gian này.
                                                  </div>
                                              </td>
                                              <td className="p-3">
                                                  <div 
                                                    onClick={() => openAudienceModal(idx)}
                                                    className={`w-full p-2 border rounded cursor-pointer flex items-center justify-between bg-white hover:border-teal-500 transition
                                                        ${!act.targetAudience ? 'text-gray-400 border-gray-200' : 'text-gray-800 border-teal-200 bg-teal-50/30'}
                                                    `}
                                                  >
                                                      <span className="truncate max-w-[200px]">
                                                          {act.targetAudience || "Chọn đối tượng..."}
                                                      </span>
                                                      <ListFilter size={14} className="text-gray-400 shrink-0"/>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>

                  {/* SECTION 3: TÌNH HÌNH SINH VIÊN */}
                  <div className="bg-white border border-gray-200 p-5 rounded-xl">
                      <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                          <Users size={20} className="text-orange-600"/> III. TÌNH HÌNH SINH VIÊN
                      </h3>
                      
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                             Danh sách sinh viên thực tập tại Khoa {selectedDept || '...'} (Nhập số buổi vắng nếu có)
                          </label>
                          {availableStudents.length === 0 ? (
                              <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                                  {selectedDept 
                                    ? "Không tìm thấy sinh viên nào đang thực tập tại khoa này trong hệ thống phân công." 
                                    : "Vui lòng chọn Khoa ở phần I để tải danh sách sinh viên."}
                              </div>
                          ) : (
                              <div className="overflow-hidden rounded-lg border border-gray-200">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-orange-50 text-orange-800 font-semibold text-xs uppercase border-b border-orange-100">
                                          <tr>
                                              <th className="p-3 w-12 text-center">#</th>
                                              <th className="p-3">MSSV</th>
                                              <th className="p-3">Họ và Tên</th>
                                              <th className="p-3">Lớp / Nhóm</th>
                                              <th className="p-3 text-center w-40">Số buổi vắng</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 bg-white">
                                          {availableStudents.map((s, index) => {
                                              const absentCount = getStudentAbsenceCount(s.id);
                                              const isAbsent = Number(absentCount) > 0;
                                              return (
                                                <tr key={s.id} className={isAbsent ? "bg-red-50" : "hover:bg-gray-50"}>
                                                    <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                                    <td className="p-3 font-medium text-gray-600">{s.studentCode}</td>
                                                    <td className={`p-3 font-bold ${isAbsent ? 'text-red-700' : 'text-gray-800'}`}>
                                                        {s.fullName}
                                                    </td>
                                                    <td className="p-3 text-gray-600">
                                                        {s.classId} <span className="text-xs bg-gray-200 px-1 rounded ml-1">{s.group}</span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            placeholder="0"
                                                            className={`w-20 p-2 border rounded-lg text-center font-bold focus:ring-2 outline-none
                                                                ${isAbsent ? 'border-red-300 text-red-700 focus:ring-red-500 bg-white' : 'border-gray-200 focus:ring-teal-500'}
                                                            `}
                                                            value={absentCount}
                                                            onChange={(e) => handleStudentAbsenceChange(s.id, e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          )}
                          <div className="mt-3 flex justify-end items-center gap-2 text-sm">
                              <span className="text-gray-500">Tổng số sinh viên vắng:</span>
                              <span className="font-bold text-red-600 text-lg">{formData.absentStudents.length}</span>
                          </div>
                      </div>
                  </div>

                  {/* SECTION 4: NHẬN XÉT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Nhận xét tình hình lớp</label>
                          <textarea className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Thái độ học tập, giờ giấc, trang phục..." value={formData.classFeedback} onChange={e => setFormData({...formData, classFeedback: e.target.value})}></textarea>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Nhận xét kỹ năng thực hành</label>
                          <textarea className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Kỹ năng giao tiếp, thăm khám, làm bệnh án..." value={formData.skillFeedback} onChange={e => setFormData({...formData, skillFeedback: e.target.value})}></textarea>
                      </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                      <button type="button" onClick={() => setActiveTab('list')} className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium mr-3">
                          Hủy bỏ
                      </button>
                      <button type="submit" className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-bold shadow-md flex items-center gap-2">
                          <CheckCircle size={20} /> Gửi báo cáo
                      </button>
                  </div>
              </form>
          </div>
      )}

      {activeTab === 'list' && (
          <div className="space-y-4">
             {/* Filter/Search Bar could go here */}
             
             <div className="grid grid-cols-1 gap-4">
                 {reports.length === 0 ? (
                     <div className="text-center p-10 bg-white rounded-xl border border-gray-200 text-gray-500">
                         Chưa có báo cáo nào được tạo.
                     </div>
                 ) : (
                     reports.map(report => {
                         const isExpanded = expandedReportId === report.id;
                         // Fallback for old data structure if necessary
                         const absentCount = report.absentStudents?.length ?? (report as any).absentStudentIds?.length ?? 0;

                         return (
                             <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                                 <div 
                                    className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer bg-gray-50/50"
                                    onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                                 >
                                     <div className="flex items-center gap-4 mb-2 md:mb-0">
                                         <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-col">
                                             <span>Tuần</span>
                                             <span className="text-lg leading-none">{report.weekNumber}</span>
                                         </div>
                                         <div>
                                             <h4 className="font-bold text-gray-800 text-lg">Khoa {report.department}</h4>
                                             <div className="text-xs text-gray-500 flex items-center gap-2">
                                                 <Calendar size={12}/> {report.startDate} - {report.endDate}
                                                 <span className="mx-1">•</span>
                                                 <span>Ngày gửi: {report.date}</span>
                                             </div>
                                         </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-6">
                                         <div className="text-center">
                                             <p className="text-xs text-gray-500 uppercase font-bold">Giảng viên</p>
                                             <p className="font-bold text-indigo-600">{report.lecturerActivities?.length || 0}</p>
                                         </div>
                                         <div className="text-center">
                                             <p className="text-xs text-gray-500 uppercase font-bold">Vắng</p>
                                             <p className={`font-bold ${absentCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                 {absentCount} SV
                                             </p>
                                         </div>
                                         <div className="text-gray-400">
                                             {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                         </div>
                                     </div>
                                 </div>

                                 {isExpanded && (
                                     <div className="p-5 border-t border-gray-100 bg-white animate-in slide-in-from-top-2 duration-200">
                                         
                                         {/* Lecturer Details */}
                                         <div className="mb-6">
                                             <h5 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wider border-b pb-1 border-gray-100">Hoạt động giảng dạy</h5>
                                             <div className="overflow-x-auto">
                                                 <table className="w-full text-sm border-collapse">
                                                     <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                                         <tr>
                                                             <th className="p-2 text-left border border-gray-100">Giảng viên</th>
                                                             <th className="p-2 text-center border border-gray-100">Lâm sàng (buổi)</th>
                                                             <th className="p-2 text-center border border-gray-100">Lý thuyết (buổi)</th>
                                                             <th className="p-2 text-left border border-gray-100">Đối tượng</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody>
                                                         {report.lecturerActivities?.map((act, i) => (
                                                             <tr key={i}>
                                                                 <td className="p-2 border border-gray-100 font-medium">{act.lecturerName}</td>
                                                                 <td className="p-2 border border-gray-100 text-center">{act.clinicalSessions}</td>
                                                                 <td className="p-2 border border-gray-100 text-center">{act.theorySessions}</td>
                                                                 <td className="p-2 border border-gray-100">{act.targetAudience}</td>
                                                             </tr>
                                                         ))}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         </div>

                                         {/* Absent Students */}
                                         {report.absentStudents && report.absentStudents.length > 0 && (
                                            <div className="mb-6">
                                                <h5 className="font-bold text-red-700 text-sm mb-3 uppercase tracking-wider border-b pb-1 border-red-100">Sinh viên vắng ({report.absentStudents.length})</h5>
                                                <div className="overflow-x-auto border border-gray-100 rounded">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-red-50 text-red-800 text-xs uppercase">
                                                            <tr>
                                                                <th className="p-2">Sinh viên</th>
                                                                <th className="p-2">Số buổi vắng</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                        {report.absentStudents.map(record => {
                                                            const s = students.find(st => st.id === record.studentId);
                                                            return (
                                                                <tr key={record.studentId} className="border-t border-gray-100">
                                                                    <td className="p-2">
                                                                        <div className="font-bold text-gray-800">{s ? s.fullName : 'Unknown ID'}</div>
                                                                        <div className="text-xs text-gray-500">{s ? `${s.studentCode} - ${s.classId}` : record.studentId}</div>
                                                                    </td>
                                                                    <td className="p-2 font-bold text-red-600 pl-8">
                                                                        {record.sessionCount}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                         )}

                                         {/* Feedbacks */}
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                             <div className="bg-gray-50 p-3 rounded-lg">
                                                 <span className="font-bold text-gray-700 block mb-1">Nhận xét tình hình lớp:</span>
                                                 <p className="text-gray-600 whitespace-pre-line">{report.classFeedback || 'Không có nhận xét'}</p>
                                             </div>
                                             <div className="bg-gray-50 p-3 rounded-lg">
                                                 <span className="font-bold text-gray-700 block mb-1">Nhận xét kỹ năng:</span>
                                                 <p className="text-gray-600 whitespace-pre-line">{report.skillFeedback || 'Không có nhận xét'}</p>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         );
                     })
                 )}
             </div>
          </div>
      )}

      {/* TARGET AUDIENCE SELECTION MODAL */}
      {audienceModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-teal-50">
                    <h3 className="font-bold text-teal-800">Chọn Đối Tượng Lên Lớp</h3>
                    <button onClick={() => setAudienceModal({...audienceModal, isOpen: false})} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {availableCohorts.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Không tìm thấy nhóm lớp nào được phân công tại khoa này.</p>
                    ) : (
                        <div className="space-y-2">
                            {availableCohorts.map(item => (
                                <div 
                                    key={item}
                                    onClick={() => toggleAudienceItem(item)}
                                    className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition
                                        ${audienceModal.selectedItems.has(item) ? 'bg-indigo-50 border-indigo-300' : 'border-gray-100 hover:bg-gray-50'}
                                    `}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center
                                        ${audienceModal.selectedItems.has(item) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'}
                                    `}>
                                        {audienceModal.selectedItems.has(item) && <CheckCircle size={14}/>}
                                    </div>
                                    <span className={`text-sm font-medium ${audienceModal.selectedItems.has(item) ? 'text-indigo-800' : 'text-gray-700'}`}>
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setAudienceModal({...audienceModal, isOpen: false})}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={saveAudienceSelection}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-bold shadow-sm"
                    >
                        Lưu lựa chọn ({audienceModal.selectedItems.size})
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
