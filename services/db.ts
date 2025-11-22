
import { 
  Student, Lecturer, Assignment, OnCallSchedule, ClinicalReport, User, Role, TeachingPlan, ClinicalRotation 
} from '../types';

// Keys for LocalStorage
const KEYS = {
  USERS: 'cmp_users',
  STUDENTS: 'cmp_students',
  LECTURERS: 'cmp_lecturers',
  ASSIGNMENTS: 'cmp_assignments',
  ROTATIONS: 'cmp_rotations', // New key for sub-assignments
  SCHEDULES: 'cmp_schedules',
  REPORTS: 'cmp_reports',
  TEACHING_PLANS: 'cmp_teaching_plans',
};

// Generic Helper for Simulated Async DB Calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getItems = <T,>(key: string): T[] => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error("Error reading from localStorage", e);
    return [];
  }
};

const saveItems = <T,>(key: string, items: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
};

// Initial Seed Data
const seedData = () => {
  // Check Users - ONLY SEED IF KEY DOES NOT EXIST
  if (localStorage.getItem(KEYS.USERS) === null) {
    const defaultUsers: User[] = [
      { id: 'u1', username: 'admin', fullName: 'Quản trị viên', role: Role.ADMIN },
      { id: 'u2', username: 'gv1', fullName: 'BS. Nguyễn Văn A', role: Role.LECTURER, relatedId: 'l1' },
      { id: 'u3', username: 'sv1', fullName: 'Trần Thị B', role: Role.STUDENT, relatedId: 's1' },
    ];
    saveItems(KEYS.USERS, defaultUsers);
    console.log("Database: Seeded Users");
  }

  // Check Students
  if (localStorage.getItem(KEYS.STUDENTS) === null) {
    const defaultStudents: Student[] = [
      { id: 's1', studentCode: 'Y2020001', fullName: 'Trần Thị B', classId: 'YK20A', course: 'K46', major: 'Y sỹ đa khoa', academicYear: 3, group: 'Nhom1', dob: '2002-01-15', phone: '0901234567', email: 'b@sv.edu.vn' },
      { id: 's2', studentCode: 'Y2020002', fullName: 'Lê Văn C', classId: 'YK20A', course: 'K46', major: 'Y sỹ đa khoa', academicYear: 3, group: 'Nhom1', dob: '2002-03-20', phone: '0901234568', email: 'c@sv.edu.vn' },
      { id: 's3', studentCode: 'DD21001', fullName: 'Nguyễn Thị H', classId: 'DD21B', course: 'K47', major: 'Điều dưỡng', academicYear: 2, group: 'Nhom2', dob: '2003-05-10', phone: '0901234569', email: 'h@sv.edu.vn' },
      { id: 's4', studentCode: 'YS22005', fullName: 'Phạm Văn K', classId: 'YS22C', course: 'K48', major: 'Y sỹ cổ truyền', academicYear: 1, group: 'Nhom3', dob: '2004-08-12', phone: '0901234570', email: 'k@sv.edu.vn' },
      { id: 's5', studentCode: 'HS22001', fullName: 'Lê Thị M', classId: 'HS22A', course: 'K48', major: 'Hộ sinh', academicYear: 1, group: 'Nhom3', dob: '2004-02-28', phone: '0901234571', email: 'm@sv.edu.vn' },
    ];
    saveItems(KEYS.STUDENTS, defaultStudents);
  }

  // Check Lecturers
  if (localStorage.getItem(KEYS.LECTURERS) === null) {
    const defaultLecturers: Lecturer[] = [
      { id: 'l1', fullName: 'BS. Nguyễn Văn A', department: 'Nội', email: 'a@bv.edu.vn', phone: '0912345678' },
      { id: 'l2', fullName: 'BS. Phạm Thị D', department: 'Ngoại', email: 'd@bv.edu.vn', phone: '0912345679' },
    ];
    saveItems(KEYS.LECTURERS, defaultLecturers);
  }

  // Initialize other keys if they don't exist to prevent null errors on first load
  if (localStorage.getItem(KEYS.ASSIGNMENTS) === null) saveItems(KEYS.ASSIGNMENTS, []);
  if (localStorage.getItem(KEYS.ROTATIONS) === null) saveItems(KEYS.ROTATIONS, []);
  if (localStorage.getItem(KEYS.SCHEDULES) === null) saveItems(KEYS.SCHEDULES, []);
  if (localStorage.getItem(KEYS.REPORTS) === null) saveItems(KEYS.REPORTS, []);
  if (localStorage.getItem(KEYS.TEACHING_PLANS) === null) saveItems(KEYS.TEACHING_PLANS, []);
};

// Execute seed on load
seedData();

// --- API SERVICES ---

export const StudentService = {
  getAll: async (): Promise<Student[]> => {
    await delay(300);
    return getItems<Student>(KEYS.STUDENTS);
  },
  save: async (student: Student): Promise<void> => {
    await delay(300);
    const items = getItems<Student>(KEYS.STUDENTS);
    const index = items.findIndex(i => i.id === student.id);
    if (index >= 0) {
      items[index] = student;
    } else {
      items.push({ ...student, id: student.id || Date.now().toString() });
    }
    saveItems(KEYS.STUDENTS, items);
  },
  delete: async (id: string): Promise<void> => {
    console.log(`%c[API] DELETE /students/${id}`, 'color: red; font-weight: bold;');
    await delay(300);
    const items = getItems<Student>(KEYS.STUDENTS);
    saveItems(KEYS.STUDENTS, items.filter(i => i.id !== id));
    console.log(`%c[API] Success: Student ${id} deleted`, 'color: green;');
  }
};

export const LecturerService = {
  getAll: async (): Promise<Lecturer[]> => {
    await delay(300);
    return getItems<Lecturer>(KEYS.LECTURERS);
  },
  save: async (lecturer: Lecturer): Promise<void> => {
    await delay(300);
    const items = getItems<Lecturer>(KEYS.LECTURERS);
    const index = items.findIndex(i => i.id === lecturer.id);
    if (index >= 0) {
      items[index] = lecturer;
    } else {
      items.push({ ...lecturer, id: lecturer.id || Date.now().toString() });
    }
    saveItems(KEYS.LECTURERS, items);
  },
  delete: async (id: string): Promise<void> => {
    console.log(`%c[API] DELETE /lecturers/${id}`, 'color: red; font-weight: bold;');
    await delay(300);
    const items = getItems<Lecturer>(KEYS.LECTURERS);
    saveItems(KEYS.LECTURERS, items.filter(i => i.id !== id));
    console.log(`%c[API] Success: Lecturer ${id} deleted`, 'color: green;');
  }
};

export const AssignmentService = {
  getAll: async (): Promise<Assignment[]> => {
    await delay(300);
    return getItems<Assignment>(KEYS.ASSIGNMENTS);
  },
  save: async (assignment: Assignment): Promise<void> => {
    await delay(300);
    const items = getItems<Assignment>(KEYS.ASSIGNMENTS);
    items.push({ ...assignment, id: assignment.id || Date.now().toString() });
    saveItems(KEYS.ASSIGNMENTS, items);
  },
  delete: async (id: string): Promise<void> => {
    console.log(`%c[API] DELETE /assignments/${id}`, 'color: red; font-weight: bold;');
    await delay(300);
    const items = getItems<Assignment>(KEYS.ASSIGNMENTS);
    saveItems(KEYS.ASSIGNMENTS, items.filter(i => i.id !== id));
    console.log(`%c[API] Success: Assignment ${id} deleted`, 'color: green;');
  }
};

// NEW: Rotation Service for Sub-Department Assignments
export const RotationService = {
  getAll: async (): Promise<ClinicalRotation[]> => {
    await delay(300);
    return getItems<ClinicalRotation>(KEYS.ROTATIONS);
  },
  save: async (rotation: ClinicalRotation): Promise<void> => {
    await delay(200);
    const items = getItems<ClinicalRotation>(KEYS.ROTATIONS);
    items.push({ ...rotation, id: rotation.id || Date.now().toString() + Math.random().toString() });
    saveItems(KEYS.ROTATIONS, items);
  },
  delete: async (id: string): Promise<void> => {
    console.log(`%c[API] DELETE /rotations/${id}`, 'color: red; font-weight: bold;');
    await delay(300);
    const items = getItems<ClinicalRotation>(KEYS.ROTATIONS);
    saveItems(KEYS.ROTATIONS, items.filter(i => i.id !== id));
    console.log(`%c[API] Success: Rotation ${id} deleted`, 'color: green;');
  }
};

export const TeachingPlanService = {
  getAll: async (): Promise<TeachingPlan[]> => {
    await delay(300);
    return getItems<TeachingPlan>(KEYS.TEACHING_PLANS);
  },
  save: async (plan: TeachingPlan): Promise<void> => {
    await delay(300);
    const items = getItems<TeachingPlan>(KEYS.TEACHING_PLANS);
    const index = items.findIndex(i => i.id === plan.id);
    if (index >= 0) {
      items[index] = plan;
    } else {
      items.push({ ...plan, id: plan.id || Date.now().toString() });
    }
    saveItems(KEYS.TEACHING_PLANS, items);
  },
  delete: async (id: string): Promise<void> => {
    console.log(`%c[API] DELETE /teaching-plans/${id}`, 'color: red; font-weight: bold;');
    await delay(300);
    const items = getItems<TeachingPlan>(KEYS.TEACHING_PLANS);
    saveItems(KEYS.TEACHING_PLANS, items.filter(i => i.id !== id));
    console.log(`%c[API] Success: TeachingPlan ${id} deleted`, 'color: green;');
  }
};

export const ReportService = {
  getAll: async (): Promise<ClinicalReport[]> => {
    await delay(300);
    return getItems<ClinicalReport>(KEYS.REPORTS);
  },
  save: async (report: ClinicalReport): Promise<void> => {
    await delay(300);
    const items = getItems<ClinicalReport>(KEYS.REPORTS);
    items.push({ ...report, id: report.id || Date.now().toString() });
    saveItems(KEYS.REPORTS, items);
  }
};

export const OnCallService = {
  getAll: async (): Promise<OnCallSchedule[]> => {
    await delay(300);
    return getItems<OnCallSchedule>(KEYS.SCHEDULES);
  },
  save: async (schedule: OnCallSchedule): Promise<void> => {
    await delay(300);
    const items = getItems<OnCallSchedule>(KEYS.SCHEDULES);
    const index = items.findIndex(i => i.id === schedule.id);
    if (index >= 0) {
      items[index] = schedule;
    } else {
      items.push({ ...schedule, id: schedule.id || Date.now().toString() });
    }
    saveItems(KEYS.SCHEDULES, items);
  },
  delete: async (id: string): Promise<void> => {
    console.log(`%c[API] DELETE /schedules/${id}`, 'color: red; font-weight: bold;');
    await delay(300);
    const items = getItems<OnCallSchedule>(KEYS.SCHEDULES);
    saveItems(KEYS.SCHEDULES, items.filter(i => i.id !== id));
    console.log(`%c[API] Success: Schedule ${id} deleted`, 'color: green;');
  }
};

export const AuthService = {
  login: async (username: string): Promise<User | undefined> => {
    await delay(600);
    const users = getItems<User>(KEYS.USERS);
    // Ensure case-insensitive login
    return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }
};
