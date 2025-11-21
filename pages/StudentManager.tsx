import React, { useEffect, useState, useRef } from 'react';
import { StudentService } from '../services/db';
import { Student, Major, MAJORS } from '../types';
import { Plus, Search, Trash2, Edit, X, ChevronDown, ChevronRight, Upload, FolderOpen, User, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

// Types for the tree structure
interface Category {
  year: number;
  majors: Major[];
}

const CATEGORIES: Category[] = [
  { year: 1, majors: ['Điều dưỡng', 'Y sỹ đa khoa', 'Y sỹ cổ truyền', 'Hộ sinh'] },
  { year: 2, majors: ['Điều dưỡng', 'Y sỹ đa khoa', 'Y sỹ cổ truyền', 'Hộ sinh'] },
  { year: 3, majors: ['Điều dưỡng', 'Y sỹ đa khoa', 'Y sỹ cổ truyền', 'Hộ sinh'] },
];

export const StudentManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, student: Student | null}>({
    isOpen: false, student: null
  });

  // Navigation State
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [expandedYears, setExpandedYears] = useState<number[]>([1, 2, 3]);

  // Initial Form State
  const initialForm: Student = {
    id: '',
    studentCode: '',
    fullName: '',
    classId: '',
    course: '',
    group: '',
    major: 'Y sỹ đa khoa',
    academicYear: 1,
    dob: '',
    phone: '',
    email: '',
  };
  const [formData, setFormData] = useState<Student>(initialForm);

  const loadStudents = async () => {
    setLoading(true);
    const data = await StudentService.getAll();
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await StudentService.save(editingStudent ? { ...formData, id: editingStudent.id } : formData);
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData(initialForm);
    loadStudents();
  };

  const confirmDelete = async () => {
    if (!deleteModal.student) return;
    try {
      await StudentService.delete(deleteModal.student.id);
      loadStudents(); // Refresh List
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Có lỗi xảy ra khi xóa sinh viên.");
    } finally {
      setDeleteModal({ isOpen: false, student: null });
    }
  };

  const openDeleteModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, student });
  };

  const openEdit = (e: React.MouseEvent, s: Student) => {
    e.stopPropagation();
    setEditingStudent(s);
    setFormData(s);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingStudent(null);
    setFormData({
      ...initialForm,
      academicYear: selectedYear || 1,
      major: selectedMajor || 'Y sỹ đa khoa'
    });
    setIsModalOpen(true);
  };

  // --- EXCEL FUNCTIONS ---

  const handleDownloadTemplate = () => {
    // Define Headers mapping
    const headers = [
      ['Mã Sinh Viên', 'Họ và Tên', 'Lớp', 'Khóa', 'Ngày Sinh (YYYY-MM-DD)', 'Số Điện Thoại', 'Email', 'Nhóm Lâm Sàng']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(headers);
    
    // Add some example data
    XLSX.utils.sheet_add_aoa(ws, [
      ['Y2024001', 'Nguyễn Văn A', 'YK20A', 'K46', '2003-01-01', '0901234567', 'a@sv.edu.vn', 'Nhom1'],
      ['Y2024002', 'Trần Thị B', 'YK20A', 'K46', '2003-05-20', '0901234568', 'b@sv.edu.vn', 'Nhom1'],
    ], { origin: "A2" });

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // MSSV
      { wch: 25 }, // Name
      { wch: 10 }, // Class
      { wch: 10 }, // Course
      { wch: 15 }, // DOB
      { wch: 15 }, // Phone
      { wch: 20 }, // Email
      { wch: 15 }, // Group
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachSinhVien");
    
    // Generate file name based on context
    const fileName = selectedMajor && selectedYear 
      ? `Mau_DS_${selectedMajor.replace(/\s/g, '_')}_Nam${selectedYear}.xlsx` 
      : 'Mau_Danh_Sach_Sinh_Vien.xlsx';

    XLSX.writeFile(wb, fileName);
  };

  const triggerFileUpload = () => {
    if (!selectedMajor || !selectedYear) {
        alert("Vui lòng chọn Năm học và Chuyên ngành cụ thể (ở cột bên trái) trước khi nhập danh sách.");
        return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header row (index 0)
        const rows = data.slice(1) as any[];
        
        let count = 0;
        for (const row of rows) {
          // Ensure row has minimum data (MSSV + Name)
          if (!row[0] || !row[1]) continue;

          const newStudent: Student = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            studentCode: row[0]?.toString() || '',
            fullName: row[1]?.toString() || '',
            classId: row[2]?.toString() || '',
            course: row[3]?.toString() || '',
            major: selectedMajor!, // Use currently selected Major
            academicYear: selectedYear!, // Use currently selected Year
            dob: row[4]?.toString() || '',
            phone: row[5]?.toString() || '',
            email: row[6]?.toString() || '',
            group: row[7]?.toString() || '',
          };
          
          // Save one by one (In real app, use bulk insert)
          await StudentService.save(newStudent);
          count++;
        }

        alert(`Đã nhập thành công ${count} sinh viên vào danh sách ${selectedMajor} - Năm ${selectedYear}.`);
        loadStudents();

      } catch (error) {
        console.error(error);
        alert("Lỗi khi đọc file Excel. Vui lòng đảm bảo file đúng định dạng mẫu.");
      } finally {
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- END EXCEL FUNCTIONS ---

  const toggleYear = (year: number) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const selectCategory = (year: number, major: Major) => {
    setSelectedYear(year);
    setSelectedMajor(major);
  };

  // Filter Logic
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear ? s.academicYear === selectedYear : true;
    const matchesMajor = selectedMajor ? s.major === selectedMajor : true;
    
    return matchesSearch && matchesYear && matchesMajor;
  });

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar: Tree Navigation */}
      <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-140px)]">
        <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <FolderOpen size={18} className="text-teal-600"/> Danh mục
            </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
            <div 
                className={`cursor-pointer p-2 rounded-lg mb-1 text-sm font-medium ${!selectedYear ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => { setSelectedYear(null); setSelectedMajor(null); }}
            >
                Tất cả sinh viên
            </div>
            
            {CATEGORIES.map(cat => (
                <div key={cat.year} className="mb-1">
                    <div 
                        className="flex items-center gap-1 p-2 text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-50 rounded-lg"
                        onClick={() => toggleYear(cat.year)}
                    >
                        {expandedYears.includes(cat.year) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        Sinh viên Năm {cat.year}
                    </div>
                    
                    {expandedYears.includes(cat.year) && (
                        <div className="ml-6 space-y-1 mt-1 border-l-2 border-gray-100 pl-2">
                            {cat.majors.map(major => (
                                <div 
                                    key={major}
                                    onClick={() => selectCategory(cat.year, major)}
                                    className={`cursor-pointer text-sm px-3 py-2 rounded-md transition-colors flex items-center justify-between group
                                        ${selectedYear === cat.year && selectedMajor === major 
                                            ? 'bg-teal-600 text-white shadow-sm' 
                                            : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                                        }`}
                                >
                                    <span>{major}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Right Content: List */}
      <div className="flex-1 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    {selectedMajor ? `${selectedMajor} - Năm ${selectedYear}` : 'Tất cả sinh viên'}
                </h1>
                <p className="text-sm text-gray-500">Quản lý hồ sơ và quá trình thực tập</p>
            </div>
            <div className="flex gap-3">
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileUpload} 
                />

                {selectedMajor && (
                  <>
                    <button 
                        onClick={handleDownloadTemplate}
                        className="bg-white text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition border border-gray-300 shadow-sm text-sm font-medium"
                        title="Tải file Excel mẫu"
                    >
                        <FileSpreadsheet size={18} className="text-green-600"/> Tải mẫu
                    </button>
                    <button 
                        onClick={triggerFileUpload}
                        className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100 transition border border-indigo-200 shadow-sm font-medium"
                    >
                        <Upload size={18} /> Nhập Excel
                    </button>
                  </>
                )}
                <button 
                    onClick={openAdd}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 transition shadow-sm font-medium"
                >
                    <Plus size={18} /> Thêm mới
                </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                    type="text" 
                    placeholder="Tìm kiếm sinh viên..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="px-6 py-4">MSSV</th>
                    <th className="px-6 py-4">Họ tên</th>
                    <th className="px-6 py-4">Chuyên ngành</th>
                    <th className="px-6 py-4">Lớp</th>
                    <th className="px-6 py-4">Nhóm</th>
                    <th className="px-6 py-4">SĐT</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {loading ? (
                    <tr><td colSpan={8} className="px-6 py-4 text-center">Đang tải...</td></tr>
                ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-4 text-center py-10">
                        <div className="flex flex-col items-center text-gray-400">
                            <User size={48} className="mb-2 opacity-20"/>
                            <p>Không tìm thấy sinh viên trong danh sách này.</p>
                            {selectedMajor && <p className="text-xs mt-2">Hãy nhấn "Nhập Excel" để thêm danh sách.</p>}
                        </div>
                    </td></tr>
                ) : (
                    filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition group">
                        <td className="px-6 py-4 font-medium text-gray-900">{s.studentCode}</td>
                        <td className="px-6 py-4 font-medium">{s.fullName}</td>
                        <td className="px-6 py-4">{s.major}</td>
                        <td className="px-6 py-4">{s.classId}</td>
                        <td className="px-6 py-4"><span className="bg-teal-50 text-teal-700 px-2 py-1 rounded border border-teal-100">{s.group}</span></td>
                        <td className="px-6 py-4">{s.phone}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={(e) => openEdit(e, s)} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition"><Edit size={16} /></button>
                        <button onClick={(e) => openDeleteModal(e, s)} className="text-red-600 hover:text-red-800 bg-red-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition z-10 relative"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
          </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.student && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Xác nhận xóa sinh viên</h3>
                    <p className="text-gray-500 mt-2 text-sm">
                        Bạn có chắc chắn muốn xóa sinh viên <strong>{deleteModal.student.fullName}</strong>?
                    </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 text-sm text-left">
                    <div className="grid grid-cols-2 gap-y-2">
                        <span className="text-gray-500">Mã sinh viên:</span>
                        <span className="font-medium text-gray-800 text-right">{deleteModal.student.studentCode}</span>
                        
                        <span className="text-gray-500">Lớp/Khóa:</span>
                        <span className="font-medium text-gray-800 text-right">{deleteModal.student.classId} - {deleteModal.student.course}</span>
                        
                        <span className="text-gray-500">Chuyên ngành:</span>
                        <span className="font-medium text-gray-800 text-right">{deleteModal.student.major}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModal({isOpen: false, student: null})}
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

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-teal-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-teal-800">{editingStudent ? 'Sửa thông tin' : 'Thêm sinh viên mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên ngành</label>
                  <select 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={formData.major} 
                    onChange={e => setFormData({...formData, major: e.target.value as Major})}
                  >
                    {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
                  <select 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    value={formData.academicYear} 
                    onChange={e => setFormData({...formData, academicYear: parseInt(e.target.value)})}
                  >
                    <option value={1}>Năm 1</option>
                    <option value={2}>Năm 2</option>
                    <option value={3}>Năm 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã số SV</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.studentCode} onChange={e => setFormData({...formData, studentCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khóa</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm lâm sàng</label>
                  <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.group} onChange={e => setFormData({...formData, group: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                  <input type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="tel" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};