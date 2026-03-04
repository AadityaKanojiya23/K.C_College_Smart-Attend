import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  class?: string;
  subject?: string;
}

export interface AttendanceSession {
  id: string;
  teacherId: string;
  class: string;
  subject: string;
  qrToken: string;
  latitude: number;
  longitude: number;
  expiryTime: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

const users: User[] = [
  {
    id: 'admin-1',
    name: 'Dr. Rajesh Sharma',
    email: 'admin@campus.edu',
    password: hashPassword('admin123'),
    role: 'admin',
  },
  {
    id: 'teacher-1',
    name: 'Prof. Anita Patel',
    email: 'anita@campus.edu',
    password: hashPassword('teacher123'),
    role: 'teacher',
    class: '10-A',
    subject: 'Mathematics',
  },
  {
    id: 'teacher-2',
    name: 'Prof. Suresh Kumar',
    email: 'suresh@campus.edu',
    password: hashPassword('teacher123'),
    role: 'teacher',
    class: '10-B',
    subject: 'Physics',
  },
  {
    id: 'student-1',
    name: 'Priya Mehta',
    email: 'priya@campus.edu',
    password: hashPassword('student123'),
    role: 'student',
    class: '10-A',
  },
  {
    id: 'student-2',
    name: 'Rahul Gupta',
    email: 'rahul@campus.edu',
    password: hashPassword('student123'),
    role: 'student',
    class: '10-A',
  },
  {
    id: 'student-3',
    name: 'Neha Singh',
    email: 'neha@campus.edu',
    password: hashPassword('student123'),
    role: 'student',
    class: '10-B',
  },
];

const attendanceSessions: AttendanceSession[] = [];
const attendanceRecords: AttendanceRecord[] = [];

export const storage = {
  getUsers: () => users,
  getUserById: (id: string) => users.find((u) => u.id === id),
  getUserByEmail: (email: string) => users.find((u) => u.email === email.toLowerCase()),

  createUser: (data: Omit<User, 'id' | 'password'> & { password: string }): User => {
    const user: User = {
      ...data,
      id: genId(),
      email: data.email.toLowerCase(),
      password: hashPassword(data.password),
    };
    users.push(user);
    return user;
  },

  updateUser: (id: string, updates: Partial<Omit<User, 'id'>>): User | null => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const updated = { ...users[idx], ...updates };
    if (updates.password) updated.password = hashPassword(updates.password);
    users[idx] = updated;
    return users[idx];
  },

  deleteUser: (id: string): boolean => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    users.splice(idx, 1);
    return true;
  },

  verifyPassword: (user: User, password: string): boolean =>
    bcrypt.compareSync(password, user.password),

  createSession: (
    data: Omit<AttendanceSession, 'id' | 'createdAt' | 'isActive'>
  ): AttendanceSession => {
    const session: AttendanceSession = {
      ...data,
      id: genId(),
      isActive: true,
      createdAt: new Date(),
    };
    attendanceSessions.push(session);
    return session;
  },

  getSessionByToken: (token: string) => attendanceSessions.find((s) => s.qrToken === token),
  getSessionById: (id: string) => attendanceSessions.find((s) => s.id === id),
  getTeacherSessions: (teacherId: string) =>
    [...attendanceSessions.filter((s) => s.teacherId === teacherId)].reverse(),
  deactivateSession: (id: string) => {
    const s = attendanceSessions.find((s) => s.id === id);
    if (s) s.isActive = false;
  },

  markAttendance: (data: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
    const record: AttendanceRecord = { ...data, id: genId() };
    attendanceRecords.push(record);
    return record;
  },

  getAttendanceBySession: (sessionId: string) =>
    attendanceRecords.filter((a) => a.sessionId === sessionId),
  getStudentAttendance: (studentId: string) =>
    attendanceRecords.filter((a) => a.studentId === studentId),
  hasMarkedAttendance: (studentId: string, sessionId: string): boolean =>
    attendanceRecords.some((a) => a.studentId === studentId && a.sessionId === sessionId),
  getAllAttendance: () => attendanceRecords,

  getStats: () => ({
    totalStudents: users.filter((u) => u.role === 'student').length,
    totalTeachers: users.filter((u) => u.role === 'teacher').length,
    totalSessions: attendanceSessions.length,
    totalAttendance: attendanceRecords.length,
    classes: [...new Set(users.filter((u) => u.class).map((u) => u.class))],
  }),
};
