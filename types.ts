
// Database Schema Definitions

export enum Role {
  ADMIN = 'admin',
  LECTURER = 'lecturer',
  STUDENT = 'student',
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  relatedId?: string; // Links to Student or Lecturer ID
}

export type Major = 'Điều dưỡng' | 'Y sỹ đa khoa' | 'Y sỹ cổ truyền' | 'Hộ sinh';

export interface Student {
  id: string;
  studentCode: string; // Mã sinh viên
  fullName: string;
  classId: string; // Lớp
  course: string; // Khóa
  major: Major; // Chuyên ngành
  academicYear: number; // Năm 1, 2, 3
  group: string; // Nhóm lâm sàng
  dob: string;
  phone: string;
  email: string;
  attendanceScore?: number;
  practiceScore?: number;
  logbookScore?: number;
}

export interface Lecturer {
  id: string;
  fullName: string;
  department: string; // Khoa phụ trách hướng dẫn
  email: string;
  phone: string;
}

export interface TeachingPlan {
  id: string;
  lecturerId: string;
  lecturerName: string; // Cache name
  department: string;
  subDepartment?: string; // Khoa nhỏ (Optional)
  date: string;
  topic: string;
  targetAudience: string; // Đối tượng
  room: string;
}

export interface Assignment {
  id: string;
  department: string; // Khoa thực tập (Khoa lớn)
  subDepartment?: string; // Khoa nhỏ (Optional - VD: Mắt, TMH trong Chuyên khoa lẻ)
  startDate: string;
  endDate: string;
  studentIds: string[]; // Danh sách ID sinh viên được phân công
  lecturerId?: string; // Giảng viên phụ trách (Optional)
  name?: string; // Tên đợt (Optional - tự sinh VD: Nhóm 1 - Nội)
}

// New Interface for Sub-Department Rotation (Lecturer assigns this)
export interface ClinicalRotation {
  id: string;
  mainDepartment: string; // Khoa lớn (VD: Nội)
  subDepartment: string;  // Khoa nhỏ (VD: Nội Tim mạch)
  studentId: string;
  startDate: string;
  endDate: string;
}

export enum ShiftTime {
  MORNING = 'Sáng',
  AFTERNOON = 'Chiều',
  EVENING = 'Tối',
}

export enum AttendanceStatus {
  PRESENT = 'Có mặt',
  ABSENT = 'Vắng',
  LATE = 'Trễ',
}

export interface OnCallSchedule {
  id: string;
  studentId: string;
  department: string;
  date: string;
  shift: ShiftTime;
  status: AttendanceStatus;
  note?: string; // Lý do vắng
  
  // Geolocation Check-in Data
  checkInTime?: string; // ISO timestamp
  latitude?: number;
  longitude?: number;
}

export interface ReportLecturerActivity {
  lecturerId: string;
  lecturerName: string; // Cache name for easier display
  lecturerDepartment?: string; // Khoa của GV
  clinicalSessions: number; // Số buổi hướng dẫn lâm sàng
  theorySessions: number; // Số buổi lên lớp
  targetAudience: string; // Đối tượng lên lớp
}

export interface StudentAbsenceRecord {
  studentId: string;
  sessionCount: number;
}

export interface ClinicalReport {
  id: string;
  lecturerId: string; // Người tạo báo cáo
  department: string; // Khoa báo cáo
  subDepartment?: string; // Khoa nhỏ (Optional)
  date: string; // Ngày báo cáo
  weekNumber: number;
  startDate: string;
  endDate: string;
  
  // Hoạt động giảng dạy
  lecturerActivities: ReportLecturerActivity[];

  // Tình hình sinh viên
  absentStudents: StudentAbsenceRecord[]; // Updated structure
  
  // Nhận xét
  classFeedback: string; // Nhận xét tình hình lớp
  skillFeedback: string; // Nhận xét kỹ năng
}

// Updated Department List: Grouped miscellaneous specialties
export const DEPARTMENTS = [
  'Nội', 
  'Ngoại', 
  'Sản', 
  'Nhi', 
  'Nhiễm',
  'BV YDCT PHCN',
  'Chuyên khoa lẻ'
];

// Mapping for Sub-Departments
export const SUB_DEPARTMENTS: Record<string, string[]> = {
  'Nội': ['Nội Tim mạch', 'Nội Hô hấp', 'Nội Tiêu hóa', 'Nội Thần kinh', 'Nội Thận - Tiết niệu', 'Nội Cơ Xương Khớp', 'Nội Tiết', 'Nội Tổng hợp'],
  'Ngoại': ['Ngoại Tổng quát', 'Ngoại Lồng ngực', 'Ngoại Thần kinh', 'Ngoại Chấn thương chỉnh hình', 'Ngoại Tiết niệu'],
  'Sản': ['Sản bệnh', 'Phòng sanh', 'Hậu phẫu', 'Phụ khoa', 'Sản (TT YT LX)'],
  'Nhi': ['Nhi Hô hấp', 'Nhi Tiêu hóa', 'Nhi Nhiễm', 'Nhi Sơ sinh', 'Cấp cứu Nhi'],
  'Nhiễm': ['Khoa Nhiễm'],
  'BV YDCT PHCN': ['Khoa Y học cổ truyền', 'Khoa Phục hồi chức năng', 'Châm cứu - Dưỡng sinh'],
  'Chuyên khoa lẻ': [
    // BV 3CK
    'Mắt (BV 3CK)', 
    'Tai Mũi Họng (BV 3CK)', 
    'Răng Hàm Mặt (BV 3CK)',
    // BV ĐK AG
    'Mắt (BV ĐK AG)',
    'Tai Mũi Họng (BV ĐK AG)',
    'Răng Hàm Mặt (BV ĐK AG)',
    'Da liễu (BV ĐK AG)', 
    'Phục hồi chức năng (BV ĐK AG)', 
    'ICU (BV ĐK AG)', 
    'Tâm thần (BV ĐK AG)',
    'Cấp cứu (BV ĐK AG)',
    'Tim mạch (BV ĐK AG)',
    // BV TIM MẠCH
    'Tim mạch (BV TIM MẠCH)', 
    'Cấp cứu (BV TIM MẠCH)',
    // BV SN AG
    'Da liễu (BV SN AG)',
    'Phục hồi chức năng (BV SN AG)'
  ]
};

export const SUBJECTS = ['Nội khoa', 'Ngoại khoa', 'Sản phụ khoa', 'Nhi khoa', 'Truyền nhiễm', 'Chuyên khoa lẻ'];
export const MAJORS: Major[] = ['Điều dưỡng', 'Y sỹ đa khoa', 'Y sỹ cổ truyền', 'Hộ sinh'];
export const SHIFT_HOURS: Record<ShiftTime, string> = {
  [ShiftTime.MORNING]: '07:00 - 11:00',
  [ShiftTime.AFTERNOON]: '13:00 - 17:00',
  [ShiftTime.EVENING]: '18:00 - 21:30'
};
