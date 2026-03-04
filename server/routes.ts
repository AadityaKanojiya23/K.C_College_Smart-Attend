import type { Express, Request, Response, NextFunction } from 'express';
import { createServer, type Server } from 'node:http';
import session from 'express-session';
import { storage } from './storage';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = storage.getUserById(req.session.userId!);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    (req as any).currentUser = user;
    next();
  };
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function genToken(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
}

function safeUser(user: ReturnType<typeof storage.getUserById>) {
  if (!user) return null;
  const { password: _, ...safe } = user;
  return safe;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'campus-attendance-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = storage.getUserByEmail(email);
    if (!user || !storage.verifyPassword(user, password))
      return res.status(401).json({ message: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({ user: safeUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: 'Session expired' });
    res.json({ user: safeUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  // ── Users (Admin) ─────────────────────────────────────────────────────────
  app.get('/api/users', requireAuth, requireRole('admin'), (_req, res) => {
    const users = storage.getUsers().map(safeUser);
    res.json({ users });
  });

  app.post('/api/users', requireAuth, requireRole('admin'), (req, res) => {
    const { name, email, password, role, class: cls, subject } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: 'name, email, password and role are required' });
    if (storage.getUserByEmail(email))
      return res.status(409).json({ message: 'Email already in use' });

    const user = storage.createUser({ name, email, password, role, class: cls, subject });
    res.status(201).json({ user: safeUser(user) });
  });

  app.put('/api/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    const user = storage.updateUser(String(req.params.id), req.body);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: safeUser(user) });
  });

  app.delete('/api/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    if (!storage.deleteUser(String(req.params.id)))
      return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true });
  });

  // ── Attendance Sessions (Teacher) ─────────────────────────────────────────
  app.post('/api/sessions', requireAuth, requireRole('teacher'), (req, res) => {
    const teacher = (req as any).currentUser;
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined)
      return res.status(400).json({ message: 'GPS location is required' });

    const qrToken = genToken();
    const expiryTime = new Date(Date.now() + 60 * 1000);

    const sess = storage.createSession({
      teacherId: teacher.id,
      class: teacher.class || 'General',
      subject: teacher.subject || 'General',
      qrToken,
      latitude: Number(latitude),
      longitude: Number(longitude),
      expiryTime,
    });
    res.status(201).json({ session: sess });
  });

  app.get('/api/sessions/my', requireAuth, requireRole('teacher'), (req, res) => {
    const teacher = (req as any).currentUser;
    const sessions = storage.getTeacherSessions(teacher.id);
    res.json({ sessions });
  });

  app.get(
    '/api/sessions/:id/attendance',
    requireAuth,
    requireRole('teacher', 'admin'),
    (req, res) => {
      const records = storage.getAttendanceBySession(String(req.params.id)).map((r) => {
        const student = storage.getUserById(r.studentId);
        return {
          ...r,
          studentName: student?.name,
          studentEmail: student?.email,
          studentClass: student?.class,
        };
      });
      res.json({ records });
    }
  );

  // ── Student: Mark Attendance ───────────────────────────────────────────────
  app.post('/api/attendance', requireAuth, requireRole('student'), (req, res) => {
    const student = (req as any).currentUser;
    const { qrToken, latitude, longitude } = req.body;

    if (!qrToken || latitude === undefined || longitude === undefined)
      return res.status(400).json({ message: 'QR token and GPS location are required' });

    const sess = storage.getSessionByToken(qrToken);
    if (!sess) return res.status(404).json({ message: 'Invalid QR code' });
    if (!sess.isActive) return res.status(410).json({ message: 'Session is no longer active' });

    if (new Date() > sess.expiryTime) {
      storage.deactivateSession(sess.id);
      return res.status(410).json({ message: 'QR code has expired' });
    }

    if (student.class && sess.class !== student.class)
      return res
        .status(403)
        .json({ message: `This session is for class ${sess.class}, you are in ${student.class}` });

    if (storage.hasMarkedAttendance(student.id, sess.id))
      return res.status(409).json({ message: 'Attendance already marked for this session' });

    const dist = getDistance(Number(latitude), Number(longitude), sess.latitude, sess.longitude);
    if (dist > 100)
      return res.status(403).json({
        message: `You are ${Math.round(dist)}m from teacher. Must be within 100m.`,
      });

    const record = storage.markAttendance({
      studentId: student.id,
      sessionId: sess.id,
      timestamp: new Date(),
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    res.status(201).json({ record, message: 'Attendance marked successfully!' });
  });

  app.get('/api/attendance/my', requireAuth, requireRole('student'), (req, res) => {
    const student = (req as any).currentUser;
    const records = storage.getStudentAttendance(student.id).map((r) => {
      const sess = storage.getSessionById(r.sessionId);
      return { ...r, session: sess };
    });
    res.json({ records });
  });

  // ── Reports (Admin) ───────────────────────────────────────────────────────
  app.get('/api/attendance/report', requireAuth, requireRole('admin'), (_req, res) => {
    const records = storage.getAllAttendance().map((r) => {
      const student = storage.getUserById(r.studentId);
      const sess = storage.getSessionById(r.sessionId);
      return {
        ...r,
        student: student ? { name: student.name, email: student.email, class: student.class } : null,
        session: sess,
      };
    });
    res.json({ records });
  });

  app.get('/api/stats', requireAuth, requireRole('admin'), (_req, res) => {
    res.json(storage.getStats());
  });

  const httpServer = createServer(app);
  return httpServer;
}
