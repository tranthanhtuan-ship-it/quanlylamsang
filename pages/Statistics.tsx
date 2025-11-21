
import React, { useEffect, useState, useMemo } from 'react';
import { LecturerService, ReportService } from '../services/db';
import { Lecturer, ClinicalReport, DEPARTMENTS } from '../types';
import { BarChart2, Download, Filter, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LecturerStats {
  id: string;
  fullName: string;
  department: string;
  clinicalSessions: number;
  clinicalHours: number; // x1.5
  theorySessions: number;
  theoryHours: number; // x0.5
  totalHours: number;
}

export const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [reports, setReports] = useState<ClinicalReport[]>([]);

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [startWeek, setStartWeek] = useState<number>(1);
  const [endWeek, setEndWeek] = useState<number>(52);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [lData, rData] = await Promise.all([
        LecturerService.getAll(),
        ReportService.getAll()
      ]);
      setLecturers(lData);
      setReports(rData);
      setLoading(false);
    };
    loadData();
  }, []);

  const statsData = useMemo(() => {
    const statsMap: Record<string, LecturerStats> = {};

    // Initialize stats for all relevant lecturers
    lecturers.forEach(l => {
      if (filterDept && l.department !== filterDept) return;

      statsMap[l.id] = {
        id: l.id,
        fullName: l.fullName,
        department: l.department,
        clinicalSessions: 0,
        clinicalHours: 0,
        theorySessions: 0,
        theoryHours: 0,
        totalHours: 0
      };
    });

    // Aggregate data from reports
    reports.forEach(report => {
      // Filter by Week
      if (report.weekNumber < startWeek || report.weekNumber > endWeek) return;

      // Process activities
      report.lecturerActivities.forEach(act => {
        const stat = statsMap[act.lecturerId];
        // Only count if lecturer exists in our filtered map (matches Dept filter)
        if (stat) {
          stat.clinicalSessions += act.clinicalSessions;
          stat.theorySessions += act.theorySessions;
        }
      });
    });

    // Calculate Final Hours
    return Object.values(statsMap).map(stat => ({
      ...stat,
      clinicalHours: stat.clinicalSessions * 1.5,
      theoryHours: stat.theorySessions * 0.5,
      totalHours: (stat.clinicalSessions * 1.5) + (stat.theorySessions * 0.5)
    })).sort((a, b) => b.totalHours - a.totalHours); // Sort by total hours descending

  }, [lecturers, reports, filterDept, startWeek, endWeek]);

  const handleExportExcel = () => {
    const header = [
        "STT", 
        "Họ và tên", 
        "Khoa", 
        "Số buổi Lâm sàng", 
        "Giờ Lâm sàng (x1.5)", 
        "Số buổi Lý thuyết", 
        "Giờ Lý thuyết (x0.5)", 
        "Tổng giờ quy đổi"
    ];

    const body = statsData.map((s, index) => [
        index + 1,
        s.fullName,
        s.department,
        s.clinicalSessions,
        s.clinicalHours,
        s.theorySessions,
        s.theoryHours,
        s.totalHours
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    
    // Style widths
    ws['!cols'] = [{wch: 5}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ThongKeGioGiang");
    
    const fileName = `ThongKe_GioGiang_${filterDept || 'ToanVien'}_Tuan${startWeek}-${endWeek}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-teal-600" /> Thống Kê Giờ Giảng
          </h1>
          <p className="text-sm text-gray-500">Tổng hợp số giờ lâm sàng và lý thuyết của giảng viên</p>
        </div>
        
        <button 
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 transition flex items-center gap-2"
        >
            <Download size={18} /> Xuất Excel
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Lọc theo Khoa</label>
            <select 
                className="w-full p-2 border rounded-lg text-sm"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
            >
                <option value="">-- Tất cả các khoa --</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
        </div>
        <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Khoảng thời gian</label>
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 border rounded-lg p-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">Tuần</span>
                    <input 
                        type="number" min="1" max="52" 
                        className="w-full outline-none text-sm font-bold"
                        value={startWeek}
                        onChange={e => setStartWeek(parseInt(e.target.value) || 1)}
                    />
                </div>
                <span className="text-gray-400">&rarr;</span>
                <div className="flex-1 flex items-center gap-2 border rounded-lg p-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">Tuần</span>
                    <input 
                        type="number" min="1" max="52" 
                        className="w-full outline-none text-sm font-bold"
                        value={endWeek}
                        onChange={e => setEndWeek(parseInt(e.target.value) || 52)}
                    />
                </div>
            </div>
        </div>
        <div className="md:col-span-4 text-right pb-2 text-sm text-gray-500 font-medium">
            <Filter size={14} className="inline mr-1"/>
            Kết quả: {statsData.length} giảng viên
        </div>
      </div>

      {/* RESULTS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 w-16 text-center">STT</th>
                        <th className="px-6 py-4">Họ và tên</th>
                        <th className="px-6 py-4">Khoa</th>
                        <th className="px-6 py-4 text-center bg-blue-50 text-blue-800">Số buổi LS</th>
                        <th className="px-6 py-4 text-center bg-blue-100 text-blue-900 border-r border-white">Giờ LS (x1.5)</th>
                        <th className="px-6 py-4 text-center bg-orange-50 text-orange-800">Số buổi LT</th>
                        <th className="px-6 py-4 text-center bg-orange-100 text-orange-900">Giờ LT (x0.5)</th>
                        <th className="px-6 py-4 text-center bg-teal-100 text-teal-900 font-black">Tổng giờ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={8} className="p-10 text-center">Đang tính toán dữ liệu...</td></tr>
                    ) : statsData.length === 0 ? (
                        <tr><td colSpan={8} className="p-10 text-center text-gray-400 italic">Không có dữ liệu phù hợp.</td></tr>
                    ) : (
                        statsData.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">{s.fullName}</td>
                                <td className="px-6 py-4">{s.department}</td>
                                <td className="px-6 py-4 text-center font-medium">{s.clinicalSessions > 0 ? s.clinicalSessions : '-'}</td>
                                <td className="px-6 py-4 text-center font-bold text-blue-700 bg-blue-50/30">
                                    {s.clinicalHours > 0 ? s.clinicalHours.toFixed(1) : '-'}
                                </td>
                                <td className="px-6 py-4 text-center font-medium">{s.theorySessions > 0 ? s.theorySessions : '-'}</td>
                                <td className="px-6 py-4 text-center font-bold text-orange-700 bg-orange-50/30">
                                    {s.theoryHours > 0 ? s.theoryHours.toFixed(1) : '-'}
                                </td>
                                <td className="px-6 py-4 text-center font-black text-teal-800 bg-teal-50/50 text-lg">
                                    {s.totalHours.toFixed(1)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                {/* FOOTER SUMMARY */}
                {!loading && statsData.length > 0 && (
                    <tfoot className="bg-gray-100 font-bold text-gray-800 border-t border-gray-200">
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Tổng cộng:</td>
                            <td className="px-6 py-4 text-center">{statsData.reduce((a,b) => a + b.clinicalSessions, 0)}</td>
                            <td className="px-6 py-4 text-center text-blue-800">{statsData.reduce((a,b) => a + b.clinicalHours, 0).toFixed(1)}</td>
                            <td className="px-6 py-4 text-center">{statsData.reduce((a,b) => a + b.theorySessions, 0)}</td>
                            <td className="px-6 py-4 text-center text-orange-800">{statsData.reduce((a,b) => a + b.theoryHours, 0).toFixed(1)}</td>
                            <td className="px-6 py-4 text-center text-teal-900">{statsData.reduce((a,b) => a + b.totalHours, 0).toFixed(1)}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
          </div>
      </div>
    </div>
  );
};
