
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
  date: string;
  topic: string;
  targetAudience: string; // Đối tượng
  room: string;
}

export interface Assignment {
  id: string;
  department: string; // Khoa thực tập (Khoa lớn)
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

// Mock Data Constants for Initial Load
export const DEPARTMENTS = [
  'Nội', 
  'Ngoại', 
  'Sản', 
  'Nhi', 
  'Nhiễm', 
  'Mắt', 
  'Tai Mũi Họng', 
  'Răng Hàm Mặt', 
  'Phục hồi chức năng', 
  'Da liễu', 
  'Tâm thần', 
  'ICU', 
  'Cấp cứu', 
  'Tim mạch lão học'
];

// Mapping for Sub-Departments
export const SUB_DEPARTMENTS: Record<string, string[]> = {
  'Nội': ['Nội Tim mạch', 'Nội Hô hấp', 'Nội Tiêu hóa', 'Nội Thần kinh', 'Nội Thận - Tiết niệu', 'Nội Cơ Xương Khớp', 'Nội Tiết', 'Nội Tổng hợp'],
  'Ngoại': ['Ngoại Tổng quát', 'Ngoại Lồng ngực', 'Ngoại Thần kinh', 'Ngoại Chấn thương chỉnh hình', 'Ngoại Tiết niệu'],
  'Sản': ['Sản bệnh', 'Phòng sanh', 'Hậu phẫu', 'Phụ khoa'],
  'Nhi': ['Nhi Hô hấp', 'Nhi Tiêu hóa', 'Nhi Nhiễm', 'Nhi Sơ sinh', 'Cấp cứu Nhi'],
  'Cấp cứu': ['Cấp cứu Nội', 'Cấp cứu Ngoại'],
  'ICU': ['ICU A', 'ICU B'],
  // Default empty arrays for others, can be extended
};

export const SUBJECTS = ['Nội khoa', 'Ngoại khoa', 'Sản phụ khoa', 'Nhi khoa', 'Truyền nhiễm', 'Chuyên khoa lẻ'];
export const MAJORS: Major[] = ['Điều dưỡng', 'Y sỹ đa khoa', 'Y sỹ cổ truyền', 'Hộ sinh'];
