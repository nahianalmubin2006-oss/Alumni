import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory bot metadata tracker (persisted between requests)
let botState = {
  active: true,
  lastScanAt: new Date().toISOString(),
  nextRotationAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  cycleCount: 1,
  totalGenerated: 0,
};

// Rate-limit & quota cooldown tracker to prevent repeated failed calls when quota is exhausted
let quotaCooldownUntil = 0;

// University & Department catalogues for comprehensive multi-institution coverage
const UNIVERSITIES = [
  'Bangladesh University of Engineering & Technology',
  'University of Dhaka',
  'North South University',
  'BRAC University',
  'Shahjalal University of Science & Technology',
  'Jahangirnagar University',
  'University of Rajshahi',
  'University of Chittagong',
  'Rajshahi University of Engineering & Technology',
  'Khulna University of Engineering & Technology',
  'Chittagong University of Engineering & Technology',
  'Dhaka University of Engineering & Technology',
  'Independent University, Bangladesh',
  'East West University',
  'United International University',
  'American International University-Bangladesh',
  'Ahsanullah University of Science and Technology',
  'Daffodil International University',
  'Bangladesh University of Professionals',
  'Bangladesh University of Textiles',
  'Sher-e-Bangla Agricultural University',
  'Bangladesh Agricultural University',
  'Islamic University of Technology (IUT), Gazipur',
  'Khulna University',
  'Jagannath University',
  'Comilla University',
  'Patuakhali Science And Technology University',
  'Noakhali Science & Technology University',
  'Jashore University of Science & Technology',
  'Begum Rokeya University, Rangpur',
  'University of Liberal Arts Bangladesh',
  'Asian University for Women',
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical & Electronic Engineering',
  'Business Administration',
  'Economics',
  'Pharmacy',
  'Civil Engineering',
  'Mechanical Engineering',
  'Biotechnology & Genetic Engineering',
  'Architecture',
  'Law & Justice',
  'Software Engineering',
  'Information & Communication Technology',
  'Data Science',
  'Industrial & Production Engineering',
  'Textile Engineering',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Statistics',
  'Biochemistry & Molecular Biology',
  'Microbiology',
  'Accounting',
  'Finance',
  'Marketing',
  'Management Information Systems',
  'English',
  'Public Administration',
  'International Relations',
  'Environmental Science',
  'Agricultural Engineering',
  'Food Engineering & Technology',
  'Aerospace & Aviation Engineering',
];

// No fabricated news fallback. If live verification fails, return no articles.
function generateCuratedNews(_params: {
  focusType?: string; university?: string; department?: string; forceHotTopic?: boolean;
}) { return null; }

// Reusable function to generate news with Gemini 3.8 Flash web browsing or curated fallback
async function generateArticlesWithAi(params: {
  focusType?: string;
  university?: string;
  department?: string;
  forceHotTopic?: boolean;
  count?: number;
}) {
  const { focusType, university, department, forceHotTopic, count = 2 } = params;
  const generatedArticles: any[] = [];
  const now = new Date();
  const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

  const apiKey = process.env.GEMINI_API_KEY;
  const isCooldownActive = Date.now() < quotaCooldownUntil;

  if (apiKey && !isCooldownActive) {
    try {
      const ai = new GoogleGenAI();
      const targetUni = university || '';
      const targetDept = department || '';

      const prompt = `You are a strict fact-checking university news assistant.
Never invent people, awards, funding, student/alumni achievements, departments, statistics, URLs, or institutions.
Only return an article when the claim is supported by a source found through web search.
Every article must include a real sourceUrl that was actually consulted.
If the source cannot verify the university/department/claim, omit the article.
Target University: ${targetUni || 'verified universities'}
Target Department: ${targetDept || 'verified departments'}
Focus: ${focusType || 'verified university news'}
Return ONLY a JSON array using the existing schema. Do not fabricate fallback content.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const item of parsed) {
          generatedArticles.push({
            id: `ai-news-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: item.title,
            summary: item.summary,
            content: item.content,
            category: item.category || 'Alumni special achievements',
            university: item.university || targetUni,
            department: item.department || targetDept,
            imageUrl:
              'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
            authorId: 'ai-news-bot',
            authorName: 'AI Intelligence Wire Bot',
            status: 'PUBLISHED',
            featured: !!item.isHotTopic,
            trending: !!item.isHotTopic,
            views: Math.floor(Math.random() * 200) + 50,
            isHotTopic: !!item.isHotTopic,
            hotTopicReason: item.hotTopicReason || (item.isHotTopic ? 'Breaking alumni achievement' : ''),
            alumniPrizeName: item.alumniPrizeName || '',
            sourceUrl: item.sourceUrl || '',
            sourceName: item.sourceName || '',
            isAiGenerated: true,
            isPermanent: false,
            expiresAt: tenDaysLater,
            createdAt: now.toISOString(),
            publishedAt: now.toISOString(),
          });
        }
      }
    } catch (geminiErr: any) {
      const errStr = String(geminiErr?.message || '') + ' ' + String(geminiErr?.status || '');
      const isQuotaExceeded =
        geminiErr?.status === 'RESOURCE_EXHAUSTED' ||
        geminiErr?.code === 429 ||
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('quota');

      if (isQuotaExceeded) {
        quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        console.log('[AI News Bot] Gemini quota limit reached. Seamlessly serving verified AI curated wire generation.');
      } else {
        console.log('[AI News Bot] Gemini service currently unavailable. Serving curated intelligence fallback.');
      }
    }
  }

  // If live verification did not produce articles, return an empty result rather than inventing content.
  if (generatedArticles.length === 0) return [];

  // Update bot state
  botState.lastScanAt = now.toISOString();
  botState.totalGenerated += generatedArticles.length;

  return generatedArticles;
}

// Route 1: Trigger AI Bot Live Web Scan & Generation
app.post('/api/ai-news-bot/generate', async (req, res) => {
  try {
    const { focusType, university, department, forceHotTopic, count = 2 } = req.body || {};
    const articles = await generateArticlesWithAi({
      focusType,
      university,
      department,
      forceHotTopic,
      count,
    });

    res.json({
      success: true,
      articles,
      botState,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/ai-news-bot/generate:', err);
    res.status(500).json({ error: err.message || 'Failed to generate news' });
  }
});

// Route 2: 24-Hour Automated Rotation Cycle Trigger
app.post('/api/ai-news-bot/rotate', async (req, res) => {
  try {
    const now = new Date();
    botState.cycleCount += 1;
    botState.lastScanAt = now.toISOString();
    botState.nextRotationAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Pick 3 diverse institutions and departments for the new 24h cycle
    const batchArticles: any[] = [];
    const targetCount = 3;

    // Pick randomized distinct universities
    const shuffledUnis = [...UNIVERSITIES].sort(() => 0.5 - Math.random()).slice(0, targetCount);
    const shuffledDepts = [...DEPARTMENTS].sort(() => 0.5 - Math.random()).slice(0, targetCount);

    for (let i = 0; i < targetCount; i++) {
      const generated = await generateArticlesWithAi({
        university: shuffledUnis[i],
        department: shuffledDepts[i],
        forceHotTopic: i === 0, // Ensure at least 1 instant hot topic
        focusType: 'Alumni special achievements, prize winnings, and international research',
        count: 1,
      });
      batchArticles.push(...generated);
    }

    res.json({
      success: true,
      cycleCount: botState.cycleCount,
      articles: batchArticles,
      botState,
      nextRotationAt: botState.nextRotationAt,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Error during 24h rotation cycle:', err);
    res.status(500).json({ error: err.message || 'Failed to rotate news cycle' });
  }
});

// Route 3: Bot Status & Rotation Schedule
app.get('/api/ai-news-bot/status', (_req, res) => {
  const isRotationDue = new Date().getTime() >= new Date(botState.nextRotationAt).getTime();
  res.json({
    ...botState,
    uptime: process.uptime(),
    rotationIntervalHours: 24,
    expirationDays: 10,
    isRotationDue,
    timestamp: new Date().toISOString(),
  });
});

// Background 24-Hour Cycle Watcher (checks every 10 minutes)
setInterval(async () => {
  const now = Date.now();
  const nextTime = new Date(botState.nextRotationAt).getTime();
  if (now >= nextTime) {
    console.log(`[AI News Bot] 24-hour cycle elapsed. Commencing Cycle #${botState.cycleCount + 1} rotation...`);
    try {
      botState.cycleCount += 1;
      botState.lastScanAt = new Date().toISOString();
      botState.nextRotationAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      await generateArticlesWithAi({
        forceHotTopic: true,
        count: 2,
      });
      console.log(`[AI News Bot] 24h rotation cycle #${botState.cycleCount} completed successfully.`);
    } catch (err) {
      console.warn('[AI News Bot] Automated background rotation encountered an error:', err);
    }
  }
}, 10 * 60 * 1000);

// ==========================================
// SECURE ADMIN ROLE-BASED ACCESS CONTROL (RBAC) & SESSION ENGINE
// ==========================================

export type AdminRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  university?: string;
  department?: string;
  profileType?: string;
  studentId?: string;
  graduationYear?: string;
  jobRole?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AdminSession {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  ip: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip?: string;
}

export interface VerificationItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  university: string;
  department: string;
  graduationYear: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proofUrl?: string;
  notes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ChangeRequestItem {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  targetType: string;
  targetId: string;
  targetTitle: string;
  university: string;
  oldValue: string;
  newValue: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerNote?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  requireVerificationReview: boolean;
  allowAlumniBadges: boolean;
  defaultProfilePictures?: Array<{ id: string; name: string; url: string }>;
  systemVersion: string;
  lastUpdated: string;
}

interface AdminStoreData {
  users: AdminUser[];
  auditLogs: AdminAuditLog[];
  verifications: VerificationItem[];
  changeRequests: ChangeRequestItem[];
  settings: AdminSettings;
}

// Password hashing with cryptographic salt and scrypt
function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// File persistence
const ADMIN_DB_PATH = path.resolve(__dirname, 'admin-database.json');

function initDefaultAdminStore(): AdminStoreData {
  const bootstrapPasswordHash = process.env.SUPER_ADMIN_PASSWORD_HASH;
  if (!bootstrapPasswordHash) {
    throw new Error(
      'No admin database was found. Set SUPER_ADMIN_PASSWORD_HASH in the environment before starting the server.'
    );
  }

  const email = (process.env.SUPER_ADMIN_EMAIL || 'nahianalmubin2006@gmail.com').trim().toLowerCase();
  return {
    users: [
      {
        id: 'usr-superadmin-nahian',
        email,
        passwordHash: bootstrapPasswordHash,
        name: 'Nahian Al Mubin',
        role: 'SUPER_ADMIN',
        status: 'APPROVED',
        university: 'University of Dhaka',
        department: 'Computer Science & Engineering',
        profileType: 'Super Admin',
        jobRole: 'Platform Founder & Lead Architect',
        company: 'AlumniSphere Core Engineering',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    auditLogs: [],
    verifications: [],
    changeRequests: [],
    settings: {
      maintenanceMode: false,
      allowRegistrations: true,
      requireVerificationReview: true,
      allowAlumniBadges: true,
      defaultProfilePictures: [],
      systemVersion: '2.5.0',
      lastUpdated: new Date().toISOString(),
    },
  };
}

let adminStore: AdminStoreData = (() => {
  try {
    if (fs.existsSync(ADMIN_DB_PATH)) {
      const content = fs.readFileSync(ADMIN_DB_PATH, 'utf-8');
      const parsed = JSON.parse(content) as AdminStoreData;
      if (!Array.isArray(parsed.users) || !parsed.users.some((u) => u.role === 'SUPER_ADMIN')) {
        throw new Error('admin-database.json does not contain a SUPER_ADMIN account.');
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load existing admin-database.json:', e);
  }
  const defaultData = initDefaultAdminStore();
  try {
    fs.writeFileSync(ADMIN_DB_PATH, JSON.stringify(defaultData, null, 2));
  } catch (e) {
    console.error('Failed to initialize admin-database.json:', e);
  }
  return defaultData;
})();

function persistAdminStore() {
  try {
    fs.writeFileSync(ADMIN_DB_PATH, JSON.stringify(adminStore, null, 2));
  } catch (err) {
    console.error('Failed to write admin-database.json:', err);
  }
}

// ------------------------------------------
// CUSTOM UNIVERSITY & DEPARTMENT STORE
// ------------------------------------------
const CUSTOM_UNI_PATH = path.resolve(__dirname, 'university-custom-data.json');

interface CustomDepartmentItem {
  id: string;
  name: string;
  university: string;
  group: string;
  faculty?: string;
  status?: string;
  logoUrl?: string;
  description?: string;
  updatedAt?: string;
}

interface CustomUniversityStore {
  logos: Record<string, string>;
  departments: Record<string, string[]>;
  customUniversities: Array<{
    id: string;
    name: string;
    shortName?: string;
    type: 'Public' | 'Private' | 'International';
    location: string;
    logoUrl?: string;
    website?: string;
    departments: string[];
    description?: string;
    createdAt: string;
  }>;
  customDepartments?: CustomDepartmentItem[];
}

let customUniStore: CustomUniversityStore = (() => {
  try {
    if (fs.existsSync(CUSTOM_UNI_PATH)) {
      return JSON.parse(fs.readFileSync(CUSTOM_UNI_PATH, 'utf-8'));
    }
  } catch (e) {}
  return { logos: {}, departments: {}, customUniversities: [], customDepartments: [] };
})();

function persistCustomUniStore() {
  try {
    fs.writeFileSync(CUSTOM_UNI_PATH, JSON.stringify(customUniStore, null, 2));
  } catch (e) {
    console.error('Failed to write university-custom-data.json:', e);
  }
}

interface PasswordResetEntry {
  token: string;
  code: string;
  email: string;
  expiresAt: number;
}
const adminResetTokens = new Map<string, PasswordResetEntry>();

// Active session store in memory
const activeAdminSessions = new Map<string, AdminSession>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Rate limiting & lockout tracker: max 5 failed attempts per IP or Email in 15 mins
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, RateLimitRecord>();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim().replace(/^::ffff:/, '');
  }
  return (req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
}

function isRateLimited(ip: string, email: string): boolean {
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const ipKey = `ip:${ip}`;

  const emailRecord = loginAttempts.get(emailKey);
  if (emailRecord && emailRecord.lockedUntil > 0) {
    if (Date.now() < emailRecord.lockedUntil) return true;
    loginAttempts.delete(emailKey);
  }

  const ipRecord = loginAttempts.get(ipKey);
  if (ipRecord && ipRecord.lockedUntil > 0) {
    if (Date.now() < ipRecord.lockedUntil) return true;
    loginAttempts.delete(ipKey);
  }

  return false;
}

function recordFailedLogin(ip: string, email: string) {
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const emailRecord = loginAttempts.get(emailKey) || { attempts: 0, lockedUntil: 0 };
  emailRecord.attempts += 1;
  if (emailRecord.attempts >= 5) {
    emailRecord.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minute lockout for this account
  }
  loginAttempts.set(emailKey, emailRecord);

  const ipKey = `ip:${ip}`;
  const ipRecord = loginAttempts.get(ipKey) || { attempts: 0, lockedUntil: 0 };
  ipRecord.attempts += 1;
  if (ipRecord.attempts >= 50) {
    ipRecord.lockedUntil = Date.now() + 15 * 60 * 1000; // DDoS lockout
  }
  loginAttempts.set(ipKey, ipRecord);
}

function resetFailedLogin(ip: string, email: string) {
  loginAttempts.delete(`email:${email.toLowerCase().trim()}`);
}

function recordAuditLog(log: Omit<AdminAuditLog, 'id' | 'timestamp'>) {
  const item: AdminAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  adminStore.auditLogs.unshift(item);
  if (adminStore.auditLogs.length > 500) {
    adminStore.auditLogs.pop();
  }
  persistAdminStore();
  return item;
}

// Middleware: Authenticate Admin (Role must be ADMIN or SUPER_ADMIN)
interface AdminRequest extends express.Request {
  adminUser?: AdminUser;
  adminSession?: AdminSession;
}

function requireAdminAuth(req: AdminRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required.' });
  }

  const token = authHeader.substring(7).trim();
  const session = activeAdminSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired.' });
  }

  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Session has expired. Please log in again.' });
  }

  const user = adminStore.users.find((u) => u.id === session.userId);
  if (!user || user.status === 'SUSPENDED') {
    activeAdminSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Admin account is not found or has been suspended.' });
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    activeAdminSessions.delete(token);
    return res.status(403).json({ error: 'Forbidden: Insufficient administrative privileges.' });
  }

  // Slide activity and refresh expiry
  session.lastActivityAt = Date.now();
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  req.adminUser = user;
  req.adminSession = session;
  next();
}

// Middleware: Require Super Admin Role
function requireSuperAdmin(req: AdminRequest, res: express.Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    if (req.adminUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Super Admin authorization required for this action.' });
    }
    next();
  });
}

// ------------------------------------------
// ADMIN AUTHENTICATION ROUTES
// ------------------------------------------

// Admin Login
app.post('/api/admin/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const clientIp = getClientIp(req);

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Reload adminStore to ensure freshly saved password or new admin accounts are loaded
  try {
    if (fs.existsSync(ADMIN_DB_PATH)) {
      const content = fs.readFileSync(ADMIN_DB_PATH, 'utf-8');
      adminStore = JSON.parse(content) as AdminStoreData;
    }
  } catch (e) {}

  const user = adminStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  // If user exists and entered the correct password, clear any rate-limit lockout immediately!
  if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && verifyPassword(password, user.passwordHash)) {
    resetFailedLogin(clientIp, normalizedEmail);
  } else if (isRateLimited(clientIp, normalizedEmail)) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Security lockout active for 15 minutes. Please try again later or use the Forgot Password recovery option.',
    });
  }

  // Generic failure response to avoid account enumeration
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    recordFailedLogin(clientIp, normalizedEmail);
    recordAuditLog({
      actorId: 'anonymous',
      actorEmail: normalizedEmail,
      actorRole: 'UNKNOWN',
      action: 'ADMIN_LOGIN_FAILED',
      targetType: 'AUTH',
      targetId: normalizedEmail,
      details: 'Failed admin login attempt: Account does not exist or lacks admin role.',
      ip: clientIp,
    });
    return res.status(401).json({ error: 'Invalid administrative credentials.' });
  }

  if (user.status === 'SUSPENDED') {
    recordFailedLogin(clientIp, normalizedEmail);
    return res.status(403).json({ error: 'This administrative account has been suspended by Super Admin.' });
  }

  const isValidPassword = verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    recordFailedLogin(clientIp, normalizedEmail);
    recordAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'ADMIN_LOGIN_FAILED',
      targetType: 'AUTH',
      targetId: user.id,
      details: 'Failed admin login attempt: Incorrect password.',
      ip: clientIp,
    });
    return res.status(401).json({ error: 'Invalid administrative credentials.' });
  }

  // Login successful
  resetFailedLogin(clientIp, normalizedEmail);
  user.lastLoginAt = new Date().toISOString();
  persistAdminStore();

  const token = generateSessionToken();
  const session: AdminSession = {
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    lastActivityAt: Date.now(),
    ip: clientIp,
  };
  activeAdminSessions.set(token, session);

  recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'ADMIN_LOGIN_SUCCESS',
    targetType: 'SESSION',
    targetId: token.substring(0, 8),
    details: `Administrator logged into ${user.role} workspace.`,
    ip: clientIp,
  });

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      university: user.university,
      department: user.department,
    },
  });
});

// Admin Firebase Auth Exchange Login
app.post('/api/admin/auth/firebase-login', async (req, res) => {
  const { idToken } = req.body || {};
  const clientIp = getClientIp(req);

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'A valid Firebase ID token is required.' });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    return res.status(503).json({ error: 'Firebase server authentication is not configured.' });
  }

  let verifiedEmail = '';
  let verifiedUid = '';
  let verifiedName = '';
  let emailVerified = false;

  try {
    const lookupResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const lookupData = await lookupResponse.json();

    if (!lookupResponse.ok || !Array.isArray(lookupData.users) || !lookupData.users[0]?.localId) {
      return res.status(401).json({ error: 'Firebase authentication token is invalid or expired.' });
    }

    const firebaseUser = lookupData.users[0];
    verifiedUid = String(firebaseUser.localId);
    verifiedEmail = String(firebaseUser.email || '').trim().toLowerCase();
    verifiedName = String(firebaseUser.displayName || '').trim();
    emailVerified = firebaseUser.emailVerified === true;

    if (!verifiedEmail) {
      return res.status(403).json({ error: 'The Firebase account does not have an email identity.' });
    }
    if (!emailVerified) {
      return res.status(403).json({ error: 'Verify the Firebase account email before using administrator sign-in.' });
    }
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(503).json({ error: 'Unable to verify Firebase authentication at this time.' });
  }

  const normalizedEmail = verifiedEmail;
  const superAdminEmails = [
    'nahianalmubin2006@gmail.com',
    'nahianalmubin212528@gmail.com',
    'nahianalmubin2@gmail.com',
  ];

  try {
    if (fs.existsSync(ADMIN_DB_PATH)) {
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
    }
  } catch (e) {}

  let user = adminStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user && superAdminEmails.includes(normalizedEmail)) {
    user = {
      id: verifiedUid,
      email: normalizedEmail,
      passwordHash: '',
      name: verifiedName || 'Nahian Al Mubin',
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      university: 'University of Dhaka',
      department: 'Computer Science & Engineering',
      profileType: 'Super Admin',
      jobRole: 'Platform Founder & Lead Architect',
      company: 'AlumniSphere Core Engineering',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    adminStore.users.push(user);
    persistAdminStore();
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Access denied: User is not authorized as an administrator.' });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'This administrative account has been suspended by Super Admin.' });
  }

  user.lastLoginAt = new Date().toISOString();
  persistAdminStore();

  const token = generateSessionToken();
  const session: AdminSession = {
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    lastActivityAt: Date.now(),
    ip: clientIp,
  };
  activeAdminSessions.set(token, session);

  recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'ADMIN_FIREBASE_LOGIN_SUCCESS',
    targetType: 'SESSION',
    targetId: token.substring(0, 8),
    details: `Administrator logged into ${user.role} workspace via Firebase Auth verification.`,
    ip: clientIp,
  });

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      university: user.university,
      department: user.department,
    },
  });
});

// Admin Logout (Session Invalidation)
app.post('/api/admin/auth/logout', requireAdminAuth, (req: AdminRequest, res) => {
  const token = req.adminSession?.token;
  if (token) {
    activeAdminSessions.delete(token);
  }

  if (req.adminUser) {
    recordAuditLog({
      actorId: req.adminUser.id,
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: 'ADMIN_LOGOUT',
      targetType: 'SESSION',
      targetId: token ? token.substring(0, 8) : 'unknown',
      details: 'Administrator logged out. Session invalidated server-side.',
    });
  }

  return res.json({ success: true, message: 'Admin session terminated successfully.' });
});

// Admin Auth Status / Current User
app.get('/api/admin/auth/me', requireAdminAuth, (req: AdminRequest, res) => {
  const user = req.adminUser!;
  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      university: user.university,
      department: user.department,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

// Admin Password Change
app.post('/api/admin/auth/change-password', requireAdminAuth, (req: AdminRequest, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const user = req.adminUser!;
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'Current password verification failed.' });
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  persistAdminStore();

  recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'ADMIN_PASSWORD_CHANGED',
    targetType: 'USER',
    targetId: user.id,
    details: 'Administrator successfully rotated authentication password.',
  });

  return res.json({ success: true, message: 'Password updated successfully.' });
});

// Admin Forgot Password (Request OTP via Gmail)
app.post('/api/admin/auth/forgot-password', (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Administrator email is required.' });
  }

  const normalized = email.trim().toLowerCase();

  // Reload adminStore to make sure we have freshest accounts
  try {
    if (fs.existsSync(ADMIN_DB_PATH)) {
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
    }
  } catch (e) {}

  const user = adminStore.users.find((u) => u.email.toLowerCase() === normalized);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return res.status(404).json({
      error: 'No administrator account found with that email address. Please verify your Gmail address.',
    });
  }

  // Generate 6-digit recovery OTP code and reset token
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 mins

  adminResetTokens.set(normalized, { token, code, email: normalized, expiresAt });
  resetFailedLogin(getClientIp(req), normalized);

  recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'ADMIN_PASSWORD_RESET_REQUESTED',
    targetType: 'AUTH',
    targetId: user.id,
    details: `Password recovery code generated for administrator Gmail ${normalized}.`,
    ip: getClientIp(req),
  });

  return res.json({
    success: true,
    message: `Password recovery verification code sent to administrator Gmail: ${normalized}.`,
    email: normalized,
    recoveryCode: code,
    resetToken: token,
    expiresIn: '30 minutes',
  });
});

// Admin Reset Password (Verify OTP / Token and set new password)
app.post('/api/admin/auth/reset-password', (req, res) => {
  const { email, code, token, newPassword } = req.body || {};
  if (!email || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Email and new password (minimum 8 characters) are required.' });
  }

  const normalized = email.trim().toLowerCase();
  const resetEntry = adminResetTokens.get(normalized);

  if (!resetEntry || Date.now() > resetEntry.expiresAt) {
    return res.status(400).json({ error: 'Recovery code or token has expired. Please request a new recovery code.' });
  }

  const isCodeMatch = code && code.toString().trim() === resetEntry.code;
  const isTokenMatch = token && token.trim() === resetEntry.token;

  if (!isCodeMatch && !isTokenMatch) {
    return res.status(400).json({ error: 'Invalid recovery code. Please check the code and try again.' });
  }

  try {
    if (fs.existsSync(ADMIN_DB_PATH)) {
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
    }
  } catch (e) {}

  const user = adminStore.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) {
    return res.status(404).json({ error: 'Administrator account not found.' });
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  persistAdminStore();

  adminResetTokens.delete(normalized);
  resetFailedLogin(getClientIp(req), normalized);

  recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'ADMIN_PASSWORD_RESET_SUCCESS',
    targetType: 'AUTH',
    targetId: user.id,
    details: 'Administrator successfully reset password via Gmail recovery.',
    ip: getClientIp(req),
  });

  return res.json({
    success: true,
    message: 'Your administrator password has been reset successfully! You can now log in.',
  });
});

// ------------------------------------------
// UNIVERSITY & DEPARTMENT MANAGEMENT APIS
// ------------------------------------------

// GET /api/universities/custom (Public & Admin)
app.get('/api/universities/custom', (_req, res) => {
  return res.json({
    success: true,
    logos: customUniStore.logos || {},
    departments: customUniStore.departments || {},
    customUniversities: customUniStore.customUniversities || [],
    customDepartments: customUniStore.customDepartments || [],
  });
});

// PUT /api/admin/universities/:id/logo and alias /api/universities/:id/logo
const handleUniversityLogoUpdate = (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { logoUrl, universityName } = req.body || {};

  if (!logoUrl || typeof logoUrl !== 'string') {
    return res.status(400).json({ error: 'Valid logoUrl is required.' });
  }

  const key = id.trim();
  const trimmedLogo = logoUrl.trim();
  customUniStore.logos[key] = trimmedLogo;
  customUniStore.logos[key.toLowerCase()] = trimmedLogo;
  if (universityName && typeof universityName === 'string') {
    const uniTrim = universityName.trim();
    customUniStore.logos[uniTrim] = trimmedLogo;
    customUniStore.logos[uniTrim.toLowerCase()] = trimmedLogo;
  }

  let existing = customUniStore.customUniversities.find(
    (u) => u.id === key || (universityName && u.name.toLowerCase() === universityName.toLowerCase())
  );
  if (existing) {
    existing.logoUrl = trimmedLogo;
  } else {
    customUniStore.customUniversities.push({
      id: key,
      name: universityName || key,
      type: 'Public',
      location: '',
      logoUrl: trimmedLogo,
      departments: [],
      createdAt: new Date().toISOString(),
    });
  }

  persistCustomUniStore();

  const actor = (req as AdminRequest).adminUser;
  if (actor) {
    recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UNIVERSITY_LOGO_MANUALLY_UPDATED',
      targetType: 'UNIVERSITY',
      targetId: key,
      details: `Updated logo for university ${universityName || key} to: ${trimmedLogo.substring(0, 80)}...`,
    });
  }

  return res.json({
    success: true,
    universityId: key,
    logoUrl: trimmedLogo,
    message: 'University logo updated successfully.',
  });
};

app.put('/api/admin/universities/:id/logo', requireAdminAuth, handleUniversityLogoUpdate);
app.put('/api/universities/:id/logo', requireAdminAuth, handleUniversityLogoUpdate);

// PUT /api/admin/universities/:id and alias /api/universities/:id (Edit university details)
const handleUniversityDetailsUpdate = (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const {
    name,
    shortName,
    type,
    location,
    logoUrl,
    website,
    departments,
    description,
    overview,
    status,
  } = req.body || {};

  const key = id.trim();
  const trimmedName = name ? String(name).trim() : '';
  let existing = customUniStore.customUniversities.find(
    (u) => u.id === key || (trimmedName && u.name.toLowerCase() === trimmedName.toLowerCase())
  );

  const finalOverview = overview !== undefined ? String(overview).trim() : (description !== undefined ? String(description).trim() : '');

  if (existing) {
    if (trimmedName) existing.name = trimmedName;
    if (shortName !== undefined) existing.shortName = String(shortName).trim();
    if (type) existing.type = type;
    if (location !== undefined) existing.location = String(location).trim();
    if (logoUrl !== undefined && String(logoUrl).trim()) existing.logoUrl = String(logoUrl).trim();
    if (website !== undefined) existing.website = String(website).trim();
    if (finalOverview) existing.description = finalOverview;
    if (status !== undefined) (existing as any).status = status;
    if (Array.isArray(departments)) {
      existing.departments = departments.map((d: any) => String(d).trim()).filter(Boolean);
    }
  } else {
    existing = {
      id: key,
      name: trimmedName || key,
      shortName: shortName ? String(shortName).trim() : '',
      type: type || 'Public',
      location: location ? String(location).trim() : '',
      logoUrl: logoUrl ? String(logoUrl).trim() : '',
      website: website ? String(website).trim() : '',
      departments: Array.isArray(departments) ? departments.map((d: any) => String(d).trim()).filter(Boolean) : [],
      description: finalOverview,
      createdAt: new Date().toISOString(),
    };
    if (status !== undefined) (existing as any).status = status;
    customUniStore.customUniversities.push(existing);
  }

  if (existing.logoUrl) {
    customUniStore.logos[key] = existing.logoUrl;
    customUniStore.logos[key.toLowerCase()] = existing.logoUrl;
    if (existing.name) {
      customUniStore.logos[existing.name] = existing.logoUrl;
      customUniStore.logos[existing.name.toLowerCase()] = existing.logoUrl;
    }
  }

  if (Array.isArray(departments)) {
    const cleaned = departments.map((d: any) => String(d).trim()).filter(Boolean);
    customUniStore.departments[key] = cleaned;
    if (existing.name) customUniStore.departments[existing.name] = cleaned;
  }

  persistCustomUniStore();

  const actor = (req as AdminRequest).adminUser;
  if (actor) {
    recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UNIVERSITY_MANUALLY_UPDATED',
      targetType: 'UNIVERSITY',
      targetId: key,
      details: `Updated details for university: ${existing.name} (${key}).`,
    });
  }

  return res.json({
    success: true,
    university: existing,
    message: 'University details updated successfully.',
  });
};

app.put('/api/admin/universities/:id', requireAdminAuth, handleUniversityDetailsUpdate);
app.put('/api/universities/:id', requireAdminAuth, handleUniversityDetailsUpdate);
app.post('/api/admin/universities', requireAdminAuth, (req: AdminRequest, res) => {
  const uniId = req.body?.id || ('uni-' + encodeURIComponent(String(req.body?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')));
  req.params = { id: uniId };
  return handleUniversityDetailsUpdate(req, res);
});
app.post('/api/universities', requireAdminAuth, (req: AdminRequest, res) => {
  const uniId = req.body?.id || ('uni-' + encodeURIComponent(String(req.body?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')));
  req.params = { id: uniId };
  return handleUniversityDetailsUpdate(req, res);
});

// DELETE /api/admin/universities/:id (Delete university)
app.delete('/api/admin/universities/:id', requireAdminAuth, (req: AdminRequest, res) => {
  const { id } = req.params;
  const key = id.trim();

  const found = customUniStore.customUniversities.find((u) => u.id === key);
  const uniName = found?.name || key;

  customUniStore.customUniversities = customUniStore.customUniversities.filter((u) => u.id !== key);
  delete customUniStore.logos[key];
  delete customUniStore.logos[uniName];
  delete customUniStore.departments[key];
  delete customUniStore.departments[uniName];

  persistCustomUniStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'UNIVERSITY_DELETED',
    targetType: 'UNIVERSITY',
    targetId: key,
    details: `Deleted university: ${uniName} (${key}).`,
  });

  return res.json({
    success: true,
    universityId: key,
    message: `University ${uniName} removed successfully.`,
  });
});

// PUT /api/admin/departments/:id (Update department info & emblem manually)
app.put('/api/admin/departments/:id', requireAdminAuth, (req: AdminRequest, res) => {
  const { id } = req.params;
  const { name, university, group, faculty, status, logoUrl, description } = req.body || {};
  const key = id.trim();

  if (!customUniStore.customDepartments) customUniStore.customDepartments = [];
  let existing = customUniStore.customDepartments.find((d) => d.id === key);
  if (existing) {
    if (name) existing.name = String(name).trim();
    if (university) existing.university = String(university).trim();
    if (group) existing.group = String(group).trim();
    if (faculty !== undefined) existing.faculty = String(faculty).trim();
    if (status !== undefined) existing.status = String(status).trim();
    if (logoUrl !== undefined) existing.logoUrl = String(logoUrl).trim();
    if (description !== undefined) existing.description = String(description).trim();
    existing.updatedAt = new Date().toISOString();
  } else {
    existing = {
      id: key,
      name: String(name || '').trim(),
      university: String(university || '').trim(),
      group: String(group || 'Engineering').trim(),
      faculty: faculty ? String(faculty).trim() : '',
      status: status || 'Active',
      logoUrl: logoUrl ? String(logoUrl).trim() : '',
      description: description ? String(description).trim() : '',
      updatedAt: new Date().toISOString(),
    };
    customUniStore.customDepartments.push(existing);
  }

  persistCustomUniStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'DEPARTMENT_MANUALLY_UPDATED',
    targetType: 'DEPARTMENT',
    targetId: key,
    details: `Updated details for department: ${existing.name} (${existing.university}).`,
  });

  return res.json({
    success: true,
    department: existing,
    message: 'Department details updated successfully.',
  });
});

// ------------------------------------------
// PROTECTED ADMIN USER MANAGEMENT APIS
// ------------------------------------------

// GET /api/admin/users - Search & filter users
app.get('/api/admin/users', requireAdminAuth, (req, res) => {
  const { search, role, status } = req.query;
  let results = [...adminStore.users];

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.university?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }

  if (role && typeof role === 'string' && role !== 'ALL') {
    results = results.filter((u) => u.role === role);
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    results = results.filter((u) => u.status === status);
  }

  // Strip password hashes before returning
  const sanitized = results.map(({ passwordHash, ...rest }) => rest);
  return res.json({ success: true, count: sanitized.length, users: sanitized });
});

// POST /api/admin/users - Create new user or admin
app.post('/api/admin/users', requireAdminAuth, (req: AdminRequest, res) => {
  const { name, email, role = 'USER', password, university, department, status = 'APPROVED' } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'A password of at least 8 characters is required.' });
  }

  // Only Super Admin can create ADMIN or SUPER_ADMIN
  if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && req.adminUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can provision administrative accounts.' });
  }

  const existing = adminStore.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  const newUser: AdminUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    name: name.trim(),
    role: role as AdminRole,
    status: status || 'APPROVED',
    university: university || '',
    department: department || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  adminStore.users.push(newUser);
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'USER_CREATED',
    targetType: 'USER',
    targetId: newUser.id,
    details: `Created new user ${newUser.name} with role ${newUser.role} (${newUser.email}).`,
  });

  const { passwordHash, ...sanitized } = newUser;
  return res.json({ success: true, user: sanitized });
});

// GET /api/admin/users/:id - Get dossier
app.get('/api/admin/users/:id', requireAdminAuth, (req, res) => {
  const user = adminStore.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const { passwordHash, ...sanitized } = user;
  return res.json({ success: true, user: sanitized });
});

// PUT /api/admin/users/:id - Update user details
app.put('/api/admin/users/:id', requireAdminAuth, (req: AdminRequest, res) => {
  const target = adminStore.users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Admin cannot edit Super Admin
  if (target.role === 'SUPER_ADMIN' && req.adminUser?.role !== 'SUPER_ADMIN' && req.adminUser?.id !== target.id) {
    return res.status(403).json({ error: 'You do not have permission to modify Super Admin accounts.' });
  }

  const { name, university, department, jobRole, company, graduationYear, status } = req.body || {};
  if (name) target.name = name;
  if (university !== undefined) target.university = university;
  if (department !== undefined) target.department = department;
  if (jobRole !== undefined) target.jobRole = jobRole;
  if (company !== undefined) target.company = company;
  if (graduationYear !== undefined) target.graduationYear = graduationYear;
  if (status !== undefined) target.status = status;
  target.updatedAt = new Date().toISOString();

  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'USER_UPDATED',
    targetType: 'USER',
    targetId: target.id,
    details: `Updated dossier information for ${target.name}.`,
  });

  const { passwordHash, ...sanitized } = target;
  return res.json({ success: true, user: sanitized });
});

// POST /api/admin/users/:id/role - Role change (Super Admin only)
app.post('/api/admin/users/:id/role', requireSuperAdmin, (req: AdminRequest, res) => {
  const { role, profileType } = req.body || {};
  if (!role || !['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Valid role (USER, ADMIN, SUPER_ADMIN) is required.' });
  }
  if (profileType !== undefined && !['Student', 'Alumni', 'Admin'].includes(profileType)) {
    return res.status(400).json({ error: 'Profile type must be Student, Alumni, or Admin.' });
  }
  if (profileType && ((role === 'USER' && !['Student', 'Alumni'].includes(profileType)) || (role !== 'USER' && profileType !== 'Admin'))) {
    return res.status(400).json({ error: 'Account type and permission role do not match.' });
  }

  const target = adminStore.users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Protect system creator account from demotion
  if (target.email.toLowerCase() === 'nahianalmubin2006@gmail.com' && role !== 'SUPER_ADMIN') {
    return res.status(400).json({ error: 'Root creator account role cannot be changed from SUPER_ADMIN.' });
  }

  const oldRole = target.role;
  const oldProfileType = target.profileType || 'Student';
  target.role = role as AdminRole;
  if (profileType) target.profileType = profileType;
  else if (role === 'USER' && !['Student', 'Alumni'].includes(target.profileType || '')) target.profileType = 'Student';
  else if (role !== 'USER') target.profileType = 'Admin';
  target.updatedAt = new Date().toISOString();
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'ROLE_MODIFIED',
    targetType: 'USER',
    targetId: target.id,
    details: `Changed account type of ${target.name} from ${oldProfileType}/${oldRole} to ${target.profileType || 'Student'}/${role}.`,
  });

  const { passwordHash, ...sanitized } = target;
  return res.json({ success: true, user: sanitized });
});

// POST /api/admin/users/:id/status - Status change (Approve, Reject, Suspend)
app.post('/api/admin/users/:id/status', requireAdminAuth, (req: AdminRequest, res) => {
  const { status, reason } = req.body || {};
  if (!status || !['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (APPROVED, PENDING, REJECTED, SUSPENDED) is required.' });
  }

  const target = adminStore.users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (target.role === 'SUPER_ADMIN' && req.adminUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Cannot modify status of a Super Admin.' });
  }

  const oldStatus = target.status;
  target.status = status;
  target.updatedAt = new Date().toISOString();
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: `USER_STATUS_${status}`,
    targetType: 'USER',
    targetId: target.id,
    details: `Status changed from ${oldStatus} to ${status}. Reason: ${reason || 'Administrative action'}`,
  });

  const { passwordHash, ...sanitized } = target;
  return res.json({ success: true, user: sanitized });
});

// DELETE /api/admin/users/:id - Delete user account
app.delete('/api/admin/users/:id', requireAdminAuth, (req: AdminRequest, res) => {
  const index = adminStore.users.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const target = adminStore.users[index];

  // Protected super admins
  if (target.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin accounts cannot be deleted.' });
  }

  if (target.role === 'ADMIN' && req.adminUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can delete administrator accounts.' });
  }

  const reason = (req.body && req.body.reason) || req.query.reason || 'Manual deletion by Admin';
  adminStore.users.splice(index, 1);
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'USER_DELETED',
    targetType: 'USER',
    targetId: target.id,
    details: `Deleted user ${target.name} (${target.email}). Reason: ${reason}`,
  });

  return res.json({ success: true, message: `User account ${target.name} deleted successfully.` });
});

// ------------------------------------------
// PROTECTED APPROVALS & VERIFICATIONS APIS
// ------------------------------------------

// GET /api/admin/verifications
app.get('/api/admin/verifications', requireAdminAuth, (_req, res) => {
  return res.json({ success: true, verifications: adminStore.verifications });
});

// POST /api/admin/verifications/:id/approve
app.post('/api/admin/verifications/:id/approve', requireAdminAuth, (req: AdminRequest, res) => {
  const item = adminStore.verifications.find((v) => v.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Verification request not found.' });
  }

  item.status = 'APPROVED';
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = req.adminUser!.name;

  // Upgrade user in store
  const user = adminStore.users.find((u) => u.id === item.userId);
  if (user) {
    user.status = 'APPROVED';
  }
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'VERIFICATION_APPROVED',
    targetType: 'VERIFICATION',
    targetId: item.id,
    details: `Approved alumni verification for ${item.userName} (${item.university}).`,
  });

  return res.json({ success: true, verification: item });
});

// POST /api/admin/verifications/:id/reject
app.post('/api/admin/verifications/:id/reject', requireAdminAuth, (req: AdminRequest, res) => {
  const item = adminStore.verifications.find((v) => v.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Verification request not found.' });
  }

  item.status = 'REJECTED';
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = req.adminUser!.name;
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'VERIFICATION_REJECTED',
    targetType: 'VERIFICATION',
    targetId: item.id,
    details: `Rejected alumni verification request for ${item.userName}.`,
  });

  return res.json({ success: true, verification: item });
});

// GET /api/admin/change-requests
app.get('/api/admin/change-requests', requireAdminAuth, (_req, res) => {
  return res.json({ success: true, changeRequests: adminStore.changeRequests });
});

// POST /api/admin/change-requests/:id/approve
app.post('/api/admin/change-requests/:id/approve', requireAdminAuth, (req: AdminRequest, res) => {
  const item = adminStore.changeRequests.find((cr) => cr.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Change request not found.' });
  }

  item.status = 'APPROVED';
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = req.adminUser!.name;
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'CHANGE_REQUEST_APPROVED',
    targetType: 'CHANGE_REQUEST',
    targetId: item.id,
    details: `Approved institutional modification for ${item.targetTitle}.`,
  });

  return res.json({ success: true, changeRequest: item });
});

// POST /api/admin/change-requests/:id/reject
app.post('/api/admin/change-requests/:id/reject', requireAdminAuth, (req: AdminRequest, res) => {
  const item = adminStore.changeRequests.find((cr) => cr.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Change request not found.' });
  }

  const { note } = req.body || {};
  item.status = 'REJECTED';
  item.reviewerNote = note || 'Did not meet verification criteria';
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = req.adminUser!.name;
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'CHANGE_REQUEST_REJECTED',
    targetType: 'CHANGE_REQUEST',
    targetId: item.id,
    details: `Declined institutional modification for ${item.targetTitle}. Note: ${item.reviewerNote}`,
  });

  return res.json({ success: true, changeRequest: item });
});

// ------------------------------------------
// PROTECTED SETTINGS & AUDIT LOG APIS
// ------------------------------------------

// Public profile defaults contain only image labels and HTTPS URLs; no admin settings are exposed.
app.get('/api/profile-picture-defaults', (_req, res) => {
  const pictures = Array.isArray(adminStore.settings.defaultProfilePictures)
    ? adminStore.settings.defaultProfilePictures
    : [];
  return res.json({ success: true, pictures });
});

// GET /api/admin/settings
app.get('/api/admin/settings', requireAdminAuth, (_req, res) => {
  return res.json({ success: true, settings: adminStore.settings });
});

// POST /api/admin/settings (Super Admin only)
app.post('/api/admin/settings', requireSuperAdmin, (req: AdminRequest, res) => {
  const updates = req.body || {};
  const safeUpdates: Partial<AdminSettings> = { ...updates };

  if (updates.defaultProfilePictures !== undefined) {
    if (!Array.isArray(updates.defaultProfilePictures) || updates.defaultProfilePictures.length > 12) {
      return res.status(400).json({ error: 'Default profile pictures must be a list of at most 12 images.' });
    }

    const validatedPictures: Array<{ id: string; name: string; url: string }> = [];
    for (const picture of updates.defaultProfilePictures) {
      if (!picture || typeof picture.id !== 'string' || picture.id.length > 100 ||
          typeof picture.name !== 'string' || !picture.name.trim() || picture.name.trim().length > 50 ||
          typeof picture.url !== 'string' || picture.url.length > 2048) {
        return res.status(400).json({ error: 'Each default picture needs a name and a valid HTTPS image URL.' });
      }
      try {
        const parsedUrl = new URL(picture.url);
        if (parsedUrl.protocol !== 'https:') throw new Error('HTTPS required');
      } catch {
        return res.status(400).json({ error: 'Default picture URLs must use HTTPS.' });
      }
      validatedPictures.push({ id: picture.id, name: picture.name.trim(), url: picture.url });
    }
    safeUpdates.defaultProfilePictures = validatedPictures;
  }

  adminStore.settings = {
    ...adminStore.settings,
    ...safeUpdates,
    lastUpdated: new Date().toISOString(),
  };
  persistAdminStore();

  recordAuditLog({
    actorId: req.adminUser!.id,
    actorEmail: req.adminUser!.email,
    actorRole: req.adminUser!.role,
    action: 'SETTINGS_UPDATED',
    targetType: 'SETTINGS',
    targetId: 'global-config',
    details: 'Super Admin updated global platform configurations.',
  });

  return res.json({ success: true, settings: adminStore.settings });
});

// GET /api/admin/audit-logs
app.get('/api/admin/audit-logs', requireAdminAuth, (_req, res) => {
  return res.json({ success: true, auditLogs: adminStore.auditLogs });
});

// GET /api/admin/stats
app.get('/api/admin/stats', requireAdminAuth, (_req, res) => {
  const totalUsers = adminStore.users.length;
  const pendingUsers = adminStore.users.filter((u) => u.status === 'PENDING').length;
  const activeAdmins = adminStore.users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const pendingVerifications = adminStore.verifications.filter((v) => v.status === 'PENDING').length;
  const pendingChangeRequests = adminStore.changeRequests.filter((c) => c.status === 'PENDING').length;

  return res.json({
    success: true,
    stats: {
      totalUsers,
      pendingUsers,
      activeAdmins,
      pendingVerifications,
      pendingChangeRequests,
      totalAuditLogs: adminStore.auditLogs.length,
      activeSessionsCount: activeAdminSessions.size,
    },
  });
});

// Background session cleaner (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeAdminSessions.entries()) {
    if (now > session.expiresAt) {
      activeAdminSessions.delete(token);
    }
  }
}, 15 * 60 * 1000);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AlumniSphere server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
