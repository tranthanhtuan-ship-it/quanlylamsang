
import React, { useEffect, useState, useRef } from 'react';
import { LecturerService } from '../services/db';
import { Lecturer, DEPARTMENTS } from '../types';
import { Plus, Trash2, Edit, X, Upload, FileSpreadsheet, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const LecturerManager: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Lecturer>({
    id: '', fullName: '', department: '', email: '', phone: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, lecturer: Lecturer | null}>({
    isOpen: false, lecturer: null
  });

  useEffect(() => {
    loadLecturers();
  }, []);

  const loadLecturers = async () => {
    const data = await LecturerService.getAll();
    setLecturers(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await LecturerService.save(formData);
      setIsModalOpen(false);
      loadLecturers();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi lưu giảng viên");
    }
  };

  const openDeleteModal = (e: React.MouseEvent, lecturer: Lecturer) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, lecturer });
  };

  const confirmDelete = async () => {
    if (!deleteModal.lecturer) return;
    try {
      await LecturerService.delete(deleteModal.lecturer.id);
      loadLecturers();
    } catch (error) {
      console.error("Error deleting lecturer:", error);
      alert("Có lỗi khi xóa giảng viên.");
    } finally {
      setDeleteModal({ isOpen: false, lecturer: null });
    }
  };

  // --- EXCEL FUNCTIONS ---

  const handleDownloadTemplate = () => {
    const headers = [
      ['Họ và Tên (kèm chức danh)', 'Khoa phụ trách hướng dẫn', 'Số Điện Thoại', 'Email']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(headers);
    
    // Sample Data
    XLSX.utils.sheet_add_aoa(ws, [
      ['BS. Nguyễn Văn A', 'Nội', '0901234567', 'a@bv.edu.vn'],
      ['TS. Trần Thị B', 'Ngoại', '0909876543', 'b@bv.edu.vn'],
    ], { origin: "A2" });

    // Column Widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 25 }, // Dept
      { wch: 15 }, // Phone
      { wch: 20 }, // Email
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachGiangVien");
    XLSX.writeFile(wb, "Mau_DS_GiangVien.xlsx");
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
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header row
        const rows = data.slice(1) as any[];
        let count = 0;

        for (const row of rows) {
          // Basic validation: Must have Name (col 0)
          if (!row[0]) continue;

          // Normalize Department if possible, else take raw
          const rawDept = row[1]?.toString().trim() || '';
          // Try to match with DEPARTMENTS constant for consistency
          const matchedDept = DEPARTMENTS.find(d => d.toLowerCase() === rawDept.toLowerCase()) || rawDept;

          const newLecturer: Lecturer = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            fullName: row[0]?.toString() || '',
            department: matchedDept,
            phone: row[2]?.toString() || '', 
            email: row[3]?.toString() || '', 
          };
          
          await LecturerService.save(newLecturer);
          count++;
        }

        alert(`Đã nhập thành công ${count} giảng viên.`);
        loadLecturers();

      } catch (error) {
        console.error(error);
        alert("Lỗi khi đọc file. Vui lòng kiểm tra lại định dạng.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- END EXCEL FUNCTIONS ---

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Giảng viên</h1>
          <p className="text-sm text-gray-500">Danh sách giảng viên hướng dẫn thực hành lâm sàng</p>
        </div>
        
        <div className="flex gap-3">
           <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
           />
           <button 
              onClick={handleDownloadTemplate}
              className="bg-white text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition border border-gray-300 shadow-sm text-sm font-medium"
              title="Tải file Excel mẫu"
           >
              <FileSpreadsheet size={18} className="text-green-600"/> Tải mẫu
           </button>
           <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100 transition border border-indigo-200 shadow-sm font-medium text-sm"
           >
              <Upload size={18} /> Nhập Excel
           </button>
           <button onClick={() => { setFormData({id: '', fullName: '', department: '', email: '', phone: ''}); setIsModalOpen(true); }} 
              className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 shadow-sm font-medium text-sm">
              <Plus size={18} /> Thêm mới
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {lecturers.map(l => (
            <div key={l.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative hover:shadow-md transition group">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                    <button onClick={(e) => { e.stopPropagation(); setFormData(l); setIsModalOpen(true); }} className="text-gray-400 hover:text-indigo-600 bg-gray-50 p-1 rounded border border-gray-200"><Edit size={16}/></button>
                    <button onClick={(e) => openDeleteModal(e, l)} className="text-gray-400 hover:text-red-600 bg-gray-50 p-1 rounded border border-gray-200"><Trash2 size={16}/></button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
                        {l.fullName.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="font-bold text-gray-800 truncate" title={l.fullName}>{l.fullName}</h3>
                        <p className="text-xs text-gray-500 truncate">{l.email || 'Chưa có email'}</p>
                    </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between"><span>Khoa phụ trách hướng dẫn:</span> <span className="font-medium text-gray-800">{l.department}</span></div>
                    <div className="flex justify-between"><span>SĐT:</span> <span className="font-medium">{l.phone}</span></div>
                </div>
            </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.lecturer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Xác nhận xóa giảng viên</h3>
                    <p className="text-gray-500 mt-2 text-sm">
                        Bạn có chắc chắn muốn xóa giảng viên <strong>{deleteModal.lecturer.fullName}</strong> khỏi hệ thống?
                    </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 text-sm text-left">
                    <div className="grid grid-cols-2 gap-y-2">
                        <span className="text-gray-500">Khoa phụ trách:</span>
                        <span className="font-medium text-gray-800 text-right">{deleteModal.lecturer.department}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModal({isOpen: false, lecturer: null})}
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-teal-50 rounded-t-xl">
                 <h2 className="font-bold text-xl text-teal-800">{formData.id ? 'Cập nhật thông tin' : 'Thêm Giảng viên mới'}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
             </div>
             <form onSubmit={handleSave} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên đầy đủ</label>
                    <input required placeholder="VD: BS. Nguyễn Văn A" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khoa phụ trách hướng dẫn</label>
                    <select 
                        required
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value})}
                    >
                        <option value="">-- Chọn Khoa --</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input placeholder="email@example.com" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                        <input placeholder="09xxxxxxxx" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                 </div>

                 <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium">Lưu thông tin</button>
                 </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
