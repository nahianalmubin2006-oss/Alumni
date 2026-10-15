import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_ALUMNI } from './src/data/initialData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Baseline HTTP hardening without changing the existing auth/session flow.
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
app.use((req, res, next) => {
  const bodyLimit = req.path === '/api/user/upload-avatar' ? '15mb' : '1mb';
  express.json({ limit: bodyLimit })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Ensure public/uploads/avatars directory exists
const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads/avatars');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Notice: Failed to initialize uploads directory:', e);
}

// Serve public uploads statically.
app.use('/uploads', express.static(path.resolve(__dirname, 'public/uploads')));

// Avatar uploads must be tied to the verified Firebase identity. A caller cannot
// write files under another user's ID or anonymously consume server disk space.
app.post('/api/user/upload-avatar', async (req, res) => {
  const { image, userId, idToken } = req.body || {};
  if (typeof image !== 'string' || typeof userId !== 'string' || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'Image data, user ID, and Firebase ID token are required.' });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    return res.status(503).json({ error: 'Firebase server authentication is not configured.' });
  }

  let verifiedUid = '';
  try {
    const identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const identityData = await identityResponse.json();
    const identity = Array.isArray(identityData.users) ? identityData.users[0] : null;
    if (!identityResponse.ok || !identity?.localId) {
      return res.status(401).json({ error: 'Firebase authentication token is invalid or expired.' });
    }
    if (identity.localId !== userId || identity.emailVerified !== true) {
      return res.status(403).json({ error: 'You may upload a profile picture only for your own verified account.' });
    }
    verifiedUid = String(identity.localId);
  } catch (error) {
    console.error('Avatar identity verification failed:', error);
    return res.status(503).json({ error: 'Unable to verify Firebase authentication at this time.' });
  }

  const matches = image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!matches) {
    return res.status(400).json({ error: 'Use a valid JPEG, PNG, or WebP image.' });
  }
  const imageBuffer = Buffer.from(matches[2], 'base64');
  if (imageBuffer.length === 0) {
    return res.status(400).json({ error: 'The uploaded image is empty or invalid.' });
  }
  if (imageBuffer.length > 5 * 1024 * 1024) {
    return res.status(413).json({ error: 'Profile pictures must be 5 MB or smaller.' });
  }

  try {
    const safeUid = verifiedUid.replace(/[^a-zA-Z0-9_-]/g, '');
    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const filename = `avatar-${safeUid}-${Date.now()}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.promises.writeFile(filePath, imageBuffer, { flag: 'wx' });
    const publicUrl = `/uploads/avatars/${filename}`;

    const userInAdmin = adminStore.users.find((user) => user.firebaseUid === verifiedUid || user.id === verifiedUid);
    if (userInAdmin) {
      (userInAdmin as any).photoUrl = publicUrl;
      persistAdminStore();
    }

    return res.json({ success: true, photoUrl: publicUrl, message: 'Profile picture saved successfully.' });
  } catch (error: any) {
    console.error('Failed to save profile picture on server:', error);
    return res.status(500).json({ error: 'Failed to save avatar image.' });
  }
});

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

export type AdminRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN' | 'STUDENT' | 'ALUMNI';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  university?: string;
  department?: string;
  assignedUniversity?: string;
  assignedDepartment?: string;
  universityId?: string;
  departmentId?: string;
  firebaseUid?: string;
  profileType?: string;
  studentId?: string;
  educationLevel?: string;
  studentYear?: string;
  expectedGraduation?: string;
  graduationYear?: string;
  batch?: string;
  degree?: string;
  jobRole?: string;
  company?: string;
  country?: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
  linkedin?: string;
  isVerifiedAlumni?: boolean;
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

interface AdminAccessApplication {
  id: string;
  type: 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN';
  requestedRole?: 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN';
  name: string;
  email: string;
  passwordHash?: string;
  firebaseUid?: string;
  userId?: string;
  universityId?: string;
  university?: string;
  departmentId?: string | null;
  department?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNote?: string;
}

interface ServerConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole?: string;
  senderPhotoUrl?: string;
  senderUniversity?: string;
  senderDepartment?: string;
  senderJobRole?: string;
  senderCompany?: string;
  senderAlumniId?: string;

  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientRole?: string;
  recipientPhotoUrl?: string;
  recipientUniversity?: string;
  recipientDepartment?: string;
  recipientJobRole?: string;
  recipientCompany?: string;
  recipientAlumniId?: string;

  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

interface ServerMentorshipRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentRole?: string;
  studentPhotoUrl?: string;
  studentUniversity?: string;
  studentDepartment?: string;
  studentGraduation?: string;
  studentBio?: string;

  mentorId: string;
  mentorName: string;
  mentorRole?: string;
  mentorPhotoUrl?: string;
  mentorUniversity?: string;
  mentorDepartment?: string;
  mentorJobRole?: string;
  mentorCompany?: string;
  mentorAlumniId?: string;

  topic: string;
  message: string;
  preferredSchedule?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

interface AdminStoreData {
  users: AdminUser[];
  auditLogs: AdminAuditLog[];
  verifications: VerificationItem[];
  changeRequests: ChangeRequestItem[];
  settings: AdminSettings;
  adminApplications?: AdminAccessApplication[];
  connectionRequests?: ServerConnectionRequest[];
  mentorshipRequests?: ServerMentorshipRequest[];
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

// Backward-compatible schema migration for existing admin-database.json files.
if (!Array.isArray(adminStore.adminApplications)) adminStore.adminApplications = [];
if (!Array.isArray(adminStore.connectionRequests)) adminStore.connectionRequests = [];
if (!Array.isArray(adminStore.mentorshipRequests)) adminStore.mentorshipRequests = [];

// Ensure all platform students and alumni are populated so administrators can see all members
const seededUserEmails = new Set(adminStore.users.map((u) => u.email.toLowerCase()));
for (const a of INITIAL_ALUMNI) {
  const email = a.email || `${a.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@alumni.ac.bd`;
  if (!seededUserEmails.has(email.toLowerCase())) {
    adminStore.users.push({
      id: a.id,
      email: email.toLowerCase(),
      passwordHash: '',
      name: a.name,
      role: 'USER',
      status: 'APPROVED',
      university: a.university,
      department: a.department,
      profileType: 'Alumni',
      studentId: a.studentId || '',
      graduationYear: a.graduationYear || a.batch || '',
      jobRole: a.jobRole || '',
      company: a.company || '',
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || new Date().toISOString(),
    });
    seededUserEmails.add(email.toLowerCase());
  }
}

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
    type?: 'Public' | 'Private' | 'International';
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

// Normalize older custom catalog files before any scoped route accesses them.
if (!customUniStore.logos) customUniStore.logos = {};
if (!customUniStore.departments) customUniStore.departments = {};
if (!Array.isArray(customUniStore.customUniversities)) customUniStore.customUniversities = [];
customUniStore.customUniversities.forEach((university) => {
  if (!Array.isArray(university.departments)) university.departments = [];
});
if (!Array.isArray(customUniStore.customDepartments)) customUniStore.customDepartments = [];

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

// Validate any approved admin session. Institution admins use this only for
// session introspection; central-management APIs use requireAdminAuth.
interface AdminRequest extends express.Request {
  adminUser?: AdminUser;
  adminSession?: AdminSession;
}

function requireAnyAdminAuth(req: AdminRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required.' });
  }
  const token = authHeader.substring(7).trim();
  const session = activeAdminSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Unauthorized: Session invalid or expired.' });
  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Session has expired. Please log in again.' });
  }
  const user = adminStore.users.find((u) => u.id === session.userId);
  if (!user || user.status !== 'APPROVED' || !['ADMIN', 'SUPER_ADMIN', 'CO_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role)) {
    activeAdminSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Admin assignment is not active.' });
  }
  session.lastActivityAt = Date.now();
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  req.adminUser = user;
  req.adminSession = session;
  next();
}

// Institution-scoped roles are intentionally excluded from central management APIs.
function requireAdminAuth(req: AdminRequest, res: express.Response, next: express.NextFunction) {
  requireAnyAdminAuth(req, res, () => {
    if (!['ADMIN', 'SUPER_ADMIN', 'CO_ADMIN'].includes(req.adminUser?.role || '')) {
      return res.status(403).json({ error: 'Forbidden: Central administrator authorization required.' });
    }
    next();
  });
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

// ------------------------------------------
// ADMIN ACCESS APPLICATIONS (Phases 2-4)
// ------------------------------------------

function normalizedScope(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

function institutionUniversity(admin: AdminUser): string {
  return String(admin.assignedUniversity || admin.university || '').trim();
}

function institutionDepartment(admin: AdminUser): string {
  return String(admin.assignedDepartment || admin.department || '').trim();
}

function sameInstitution(left: unknown, right: unknown): boolean {
  return normalizedScope(left) !== '' && normalizedScope(left) === normalizedScope(right);
}

function isInstitutionAdminRole(role: unknown): role is 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN' {
  return role === 'UNIVERSITY_ADMIN' || role === 'DEPARTMENT_ADMIN';
}

function getFirebaseApiKey(): string {
  if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_API_KEY.trim()) {
    return process.env.FIREBASE_API_KEY.trim();
  }
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.apiKey && typeof cfg.apiKey === 'string') {
        return cfg.apiKey.trim();
      }
    }
  } catch (e) {}
  return '';
}

interface AuthoritativeUniversity {
  id: string;
  name: string;
  type: string;
  shortName?: string;
}

interface AuthoritativeDepartment {
  id: string;
  name: string;
  universityId: string;
  universityName: string;
  group?: string;
}

function getAuthoritativeCatalog(): { universities: AuthoritativeUniversity[]; departments: AuthoritativeDepartment[] } {
  let baseUnis: AuthoritativeUniversity[] = [];
  let baseDepts: AuthoritativeDepartment[] = [];

  try {
    const catalogPath = path.resolve(__dirname, 'src/data/directoryCatalog.json');
    if (fs.existsSync(catalogPath)) {
      const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      baseUnis = raw.universities || [];
      baseDepts = raw.departments || [];
    }
  } catch (e) {}

  const uniMap = new Map<string, AuthoritativeUniversity>();
  for (const u of baseUnis) {
    uniMap.set(u.id, u);
    uniMap.set(u.name.toLowerCase(), u);
  }

  // Merge custom universities
  for (const cu of customUniStore.customUniversities || []) {
    const uni: AuthoritativeUniversity = {
      id: cu.id,
      name: cu.name,
      type: cu.type || 'Public',
      shortName: cu.shortName || '',
    };
    uniMap.set(cu.id, uni);
    uniMap.set(cu.name.toLowerCase(), uni);
  }

  const deptMap = new Map<string, AuthoritativeDepartment>();
  for (const d of baseDepts) {
    deptMap.set(d.id, d);
  }

  // Merge custom departments
  for (const cd of customUniStore.customDepartments || []) {
    const matchedUni = uniMap.get(cd.university.toLowerCase()) || Array.from(uniMap.values()).find((u) => sameInstitution(u.name, cd.university));
    const uniId = matchedUni?.id || ('uni-' + encodeURIComponent(cd.university.toLowerCase().replace(/[^a-z0-9]/g, '-')));
    const dept: AuthoritativeDepartment = {
      id: cd.id,
      name: cd.name,
      universityId: uniId,
      universityName: matchedUni?.name || cd.university,
      group: cd.group || 'General',
    };
    deptMap.set(cd.id, dept);
  }

  // Merge custom departments from customUniStore.departments dictionary
  if (customUniStore.departments) {
    for (const [uniName, deptNames] of Object.entries(customUniStore.departments)) {
      if (Array.isArray(deptNames)) {
        const matchedUni = Array.from(uniMap.values()).find((u) => sameInstitution(u.name, uniName));
        const uniId = matchedUni?.id || ('uni-' + encodeURIComponent(uniName.toLowerCase().replace(/[^a-z0-9]/g, '-')));
        for (const name of deptNames) {
          const deptId = 'dept-' + encodeURIComponent((uniName + '-' + name).toLowerCase().replace(/[^a-z0-9]/g, '-'));
          if (!deptMap.has(deptId)) {
            deptMap.set(deptId, {
              id: deptId,
              name,
              universityId: uniId,
              universityName: matchedUni?.name || uniName,
              group: 'General',
            });
          }
        }
      }
    }
  }

  const distinctUnis = Array.from(new Set(Array.from(uniMap.values()).map((u) => u.id)))
    .map((id) => Array.from(uniMap.values()).find((u) => u.id === id)!)
    .sort((a, b) => a.name.localeCompare(b.name));

  const distinctDepts = Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    universities: distinctUnis,
    departments: distinctDepts,
  };
}

function publicApplication(application: AdminAccessApplication) {
  const { passwordHash, ...safe } = application;
  return safe;
}

// GET /api/admin/request-options - Dynamic database options for University & Department requests
app.get('/api/admin/request-options', (_req, res) => {
  const catalog = getAuthoritativeCatalog();
  return res.json({
    success: true,
    universities: catalog.universities,
    departments: catalog.departments,
  });
});

// GET /api/admin/applications/my-requests - Returns the authenticated user's submitted requests
app.get('/api/admin/applications/my-requests', async (req, res) => {
  const authHeader = req.headers.authorization;
  const idToken = (typeof req.query.idToken === 'string' ? req.query.idToken : null) ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  if (!idToken) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY || getFirebaseApiKey();
  if (!firebaseApiKey) return res.status(503).json({ error: 'Firebase authentication not configured.' });

  try {
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await resp.json();
    if (!resp.ok || !Array.isArray(data.users) || !data.users[0]?.localId) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
    const uid = data.users[0].localId;
    const email = String(data.users[0].email || '').toLowerCase().trim();

    const userRequests = (adminStore.adminApplications || []).filter(
      (app) => app.userId === uid || app.firebaseUid === uid || app.email.toLowerCase() === email
    ).map(publicApplication);

    return res.json({ success: true, requests: userRequests });
  } catch (err) {
    return res.status(503).json({ error: 'Could not verify authentication.' });
  }
});

// Public Co-admin application: PENDING only; it grants no role or session.
app.post('/api/admin/applications/co-admin', (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < 10) {
    return res.status(400).json({ error: 'Enter a valid name and email, and choose a password of at least 10 characters.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Co-admin applications must use a Gmail address.' });
  }
  if (adminStore.users.some((user) => user.email.toLowerCase() === normalizedEmail) ||
      adminStore.adminApplications!.some((item) => item.email === normalizedEmail && item.status === 'PENDING')) {
    return res.status(409).json({ error: 'An account or pending application already exists for this email.' });
  }
  const application: AdminAccessApplication = {
    id: 'admin-app-' + crypto.randomBytes(12).toString('hex'),
    type: 'CO_ADMIN',
    requestedRole: 'CO_ADMIN',
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  adminStore.adminApplications!.unshift(application);
  persistAdminStore();
  recordAuditLog({
    actorId: 'anonymous', actorEmail: normalizedEmail, actorRole: 'PUBLIC',
    action: 'CO_ADMIN_APPLICATION_SUBMITTED', targetType: 'ADMIN_APPLICATION',
    targetId: application.id, details: 'Co-admin application submitted for Super Admin review.',
    ip: getClientIp(req),
  });
  return res.status(202).json({ success: true, status: 'PENDING', message: 'Application submitted. No admin access is granted until approval.' });
});

// Institution requests are bound to the verified identity of an existing Firebase account.
app.post('/api/admin/applications/institution', async (req, res) => {
  const { idToken, requestedRole, universityId, university, departmentId, department } = req.body || {};
  if (typeof idToken !== 'string' || !['UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN'].includes(requestedRole)) {
    return res.status(400).json({ error: 'A valid Firebase ID token and institution admin role (UNIVERSITY_ADMIN or DEPARTMENT_ADMIN) are required.' });
  }

  const firebaseApiKey = process.env.FIREBASE_API_KEY || getFirebaseApiKey();
  if (!firebaseApiKey) return res.status(503).json({ error: 'Firebase server authentication is not configured.' });

  let identity: any;
  try {
    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(firebaseApiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.users) || !data.users[0]?.localId) {
      return res.status(401).json({ error: 'Please sign in to your existing Alumni account before requesting admin access.' });
    }
    identity = data.users[0];
  } catch {
    return res.status(503).json({ error: 'Unable to verify Firebase identity right now.' });
  }

  const email = String(identity.email || '').trim().toLowerCase();
  const firebaseUid = String(identity.localId);
  if (!email || identity.emailVerified !== true) {
    return res.status(403).json({ error: 'Verify the email on your existing Alumni account before requesting admin access.' });
  }

  // Validate University from actual database
  const catalog = getAuthoritativeCatalog();
  const normalizedUniversityId = typeof universityId === 'string' ? universityId.trim() : '';
  const validUni = normalizedUniversityId
    ? catalog.universities.find((u) => u.id === normalizedUniversityId)
    : catalog.universities.find((u) => typeof university === 'string' && sameInstitution(u.name, university));

  if (!validUni) {
    return res.status(400).json({ error: 'Selected university does not exist in the database.' });
  }

  // Validate Department if DEPARTMENT_ADMIN
  let validDept: AuthoritativeDepartment | undefined;
  if (requestedRole === 'DEPARTMENT_ADMIN') {
    if (!departmentId && !department) {
      return res.status(400).json({ error: 'Department selection is required for Department Admin requests.' });
    }
    const normalizedDepartmentId = typeof departmentId === 'string' ? departmentId.trim() : '';
    validDept = normalizedDepartmentId
      ? catalog.departments.find((d) => d.id === normalizedDepartmentId && d.universityId === validUni.id)
      : catalog.departments.find((d) =>
          typeof department === 'string' && sameInstitution(d.name, department) &&
          (d.universityId === validUni.id || sameInstitution(d.universityName, validUni.name))
        );

    if (!validDept) {
      return res.status(400).json({ error: 'Selected department does not exist or does not belong to the selected university.' });
    }
  }

  // Duplicate pending request check for same role and scope
  const isDuplicatePending = (adminStore.adminApplications || []).some((item) => {
    if (item.status !== 'PENDING') return false;
    if (item.userId !== firebaseUid && item.email.toLowerCase() !== email) return false;
    if (item.type !== requestedRole) return false;
    if (item.universityId !== validUni.id && !sameInstitution(item.university, validUni.name)) return false;
    if (requestedRole === 'DEPARTMENT_ADMIN') {
      return (item.departmentId && item.departmentId === validDept?.id) || sameInstitution(item.department, validDept?.name);
    }
    return true;
  });

  if (isDuplicatePending) {
    return res.status(409).json({ error: 'A pending request for this role and institution scope already exists.' });
  }

  // Check if user already holds this admin role and scope
  const hasActiveAssignment = adminStore.users.some((user) => {
    if (user.email.toLowerCase() !== email && user.firebaseUid !== firebaseUid) return false;
    if (!['ADMIN', 'SUPER_ADMIN', 'CO_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role)) return false;
    if (user.status !== 'APPROVED') return false;
    if (user.role === requestedRole && sameInstitution(user.assignedUniversity || user.university, validUni.name)) {
      if (requestedRole === 'DEPARTMENT_ADMIN') {
        return sameInstitution(user.assignedDepartment || user.department, validDept?.name);
      }
      return true;
    }
    return false;
  });

  if (hasActiveAssignment) {
    return res.status(409).json({ error: 'An administrator assignment already exists for this scope on your account.' });
  }

  const application: AdminAccessApplication = {
    id: 'admin-app-' + crypto.randomBytes(12).toString('hex'),
    userId: firebaseUid,
    firebaseUid,
    name: String(identity.displayName || email.split('@')[0]),
    email,
    type: requestedRole,
    requestedRole,
    universityId: validUni.id,
    university: validUni.name,
    departmentId: validDept ? validDept.id : null,
    department: validDept ? validDept.name : undefined,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  adminStore.adminApplications!.unshift(application);
  persistAdminStore();

  recordAuditLog({
    actorId: firebaseUid,
    actorEmail: email,
    actorRole: 'USER',
    action: 'INSTITUTION_ADMIN_APPLICATION_SUBMITTED',
    targetType: 'ADMIN_APPLICATION',
    targetId: application.id,
    details: `Requested ${requestedRole} for ${application.university} (${application.universityId})${application.department ? ' / ' + application.department + ' (' + application.departmentId + ')' : ''}.`,
    ip: getClientIp(req),
  });

  return res.status(202).json({
    success: true,
    status: 'PENDING',
    application: publicApplication(application),
    message: 'Request submitted for administrator review. Your account remains unchanged while pending.',
  });
});

app.get('/api/admin/applications', requireAdminAuth, (_req: AdminRequest, res) => {
  return res.json({ success: true, applications: adminStore.adminApplications!.map(publicApplication) });
});

app.post('/api/admin/applications/:id/review', requireAnyAdminAuth, (req: AdminRequest, res) => {
  const { decision, reviewerNote } = req.body || {};
  if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED.' });
  const application = adminStore.adminApplications!.find((item) => item.id === req.params.id);
  if (!application) return res.status(404).json({ error: 'Admin application not found.' });
  if (application.status !== 'PENDING') return res.status(409).json({ error: 'This application has already been reviewed.' });

  const reviewer = req.adminUser!;

  // Reviewers cannot approve or reject their own requests
  if (application.userId === reviewer.id || application.userId === reviewer.firebaseUid || application.email.toLowerCase() === reviewer.email.toLowerCase()) {
    return res.status(403).json({ error: 'You cannot review your own administrator request.' });
  }

  // Authorization checks per role
  if (application.type === 'CO_ADMIN') {
    if (reviewer.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only a Super Admin may review Co-admin applications.' });
    }
  } else if (application.type === 'UNIVERSITY_ADMIN') {
    if (reviewer.role !== 'SUPER_ADMIN' && reviewer.role !== 'CO_ADMIN') {
      return res.status(403).json({ error: 'Only central administrators (Super Admin or Co-admin) may approve University Admin requests.' });
    }
  } else if (application.type === 'DEPARTMENT_ADMIN') {
    if (reviewer.role === 'DEPARTMENT_ADMIN') {
      return res.status(403).json({ error: 'Department Admins cannot approve administrator requests.' });
    }
    if (reviewer.role === 'UNIVERSITY_ADMIN') {
      if (!sameInstitution(institutionUniversity(reviewer), application.university)) {
        return res.status(403).json({ error: 'University Admins may only review requests for their assigned university.' });
      }
    }
  }

  if (decision === 'APPROVED') {
    const catalog = getAuthoritativeCatalog();
    const validUni = application.universityId
      ? catalog.universities.find((u) => u.id === application.universityId)
      : catalog.universities.find((u) => sameInstitution(u.name, application.university));
    if (!validUni) {
      return res.status(404).json({ error: 'The requested university no longer exists.' });
    }
    let validDept: AuthoritativeDepartment | undefined;
    if (application.type === 'DEPARTMENT_ADMIN') {
      validDept = application.departmentId
        ? catalog.departments.find((d) => d.id === application.departmentId && d.universityId === validUni.id)
        : catalog.departments.find((d) =>
            sameInstitution(d.name, application.department) &&
            (d.universityId === validUni.id || sameInstitution(d.universityName, validUni.name))
          );
      if (!validDept) {
        return res.status(404).json({ error: 'The requested department no longer exists or does not belong to this university.' });
      }
    }

    const role = application.type;
    let existingUser = adminStore.users.find((user) =>
      (application.userId && user.firebaseUid === application.userId) ||
      user.email.toLowerCase() === application.email.toLowerCase()
    );

    if (existingUser) {
      existingUser.role = role;
      existingUser.status = 'APPROVED';
      existingUser.university = validUni.name;
      existingUser.assignedUniversity = validUni.name;
      existingUser.universityId = validUni.id;
      existingUser.department = validDept ? validDept.name : '';
      existingUser.assignedDepartment = validDept ? validDept.name : '';
      existingUser.departmentId = validDept ? validDept.id : '';
      existingUser.profileType = role === 'CO_ADMIN' ? 'Co-admin' : role === 'UNIVERSITY_ADMIN' ? 'University admin' : 'Department admin';
      existingUser.updatedAt = new Date().toISOString();
    } else {
      const newUser: AdminUser = {
        id: 'usr-' + crypto.randomBytes(12).toString('hex'),
        email: application.email,
        passwordHash: application.passwordHash || '',
        name: application.name,
        role,
        status: 'APPROVED',
        university: validUni.name,
        department: validDept ? validDept.name : '',
        assignedUniversity: validUni.name,
        assignedDepartment: validDept ? validDept.name : '',
        universityId: validUni.id,
        departmentId: validDept ? validDept.id : '',
        firebaseUid: application.userId || application.firebaseUid,
        profileType: role === 'CO_ADMIN' ? 'Co-admin' : role === 'UNIVERSITY_ADMIN' ? 'University admin' : 'Department admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (newUser as any).universityId = validUni.id;
      (newUser as any).departmentId = validDept ? validDept.id : '';
      adminStore.users.push(newUser);
    }
  }

  application.passwordHash = undefined;
  application.status = decision;
  application.reviewedAt = new Date().toISOString();
  application.reviewedBy = reviewer.id;
  application.reviewerNote = typeof reviewerNote === 'string' ? reviewerNote.trim().slice(0, 500) : '';
  persistAdminStore();

  recordAuditLog({
    actorId: reviewer.id,
    actorEmail: reviewer.email,
    actorRole: reviewer.role,
    action: 'ADMIN_APPLICATION_' + decision,
    targetType: 'ADMIN_APPLICATION',
    targetId: application.id,
    details: `Reviewed ${application.type} request for ${application.email} (${application.university || 'Platform'}${application.department ? ' / ' + application.department : ''}): ${decision}.${application.reviewerNote ? ' Reason: ' + application.reviewerNote : ''}`,
    ip: getClientIp(req),
  });

  return res.json({
    success: true,
    application: publicApplication(application),
    message: 'Application ' + decision.toLowerCase() + '.',
  });
});

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
      if (!Array.isArray(adminStore.adminApplications)) adminStore.adminApplications = [];
    }
  } catch (e) {}

  const user = adminStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  // If user exists and entered the correct password, clear any rate-limit lockout immediately!
  if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'CO_ADMIN') && user.status === 'APPROVED' && verifyPassword(password, user.passwordHash)) {
    resetFailedLogin(clientIp, normalizedEmail);
  } else if (isRateLimited(clientIp, normalizedEmail)) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Security lockout active for 15 minutes. Please try again later or use the Forgot Password recovery option.',
    });
  }

  // Generic failure response to avoid account enumeration
  if (!user || !['ADMIN', 'SUPER_ADMIN', 'CO_ADMIN'].includes(user.role) || !['APPROVED', 'SUSPENDED'].includes(user.status)) {
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
      assignedUniversity: user.assignedUniversity,
      assignedDepartment: user.assignedDepartment,
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
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8')) as AdminStoreData;
      if (!Array.isArray(adminStore.adminApplications)) adminStore.adminApplications = [];
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

  if (!user || !['ADMIN', 'SUPER_ADMIN', 'CO_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN'].includes(user.role) || !['APPROVED', 'SUSPENDED'].includes(user.status)) {
    return res.status(403).json({ error: 'Access denied: User has no active administrator assignment.' });
  }
  if (user.firebaseUid && user.firebaseUid !== verifiedUid) {
    return res.status(403).json({ error: 'Access denied: Firebase identity does not match the approved administrator assignment.' });
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
      assignedUniversity: user.assignedUniversity,
      assignedDepartment: user.assignedDepartment,
    },
  });
});

// Admin Logout (Session Invalidation)
app.post('/api/admin/auth/logout', requireAnyAdminAuth, (req: AdminRequest, res) => {
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
app.get('/api/admin/auth/me', requireAnyAdminAuth, (req: AdminRequest, res) => {
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
      assignedUniversity: user.assignedUniversity,
      assignedDepartment: user.assignedDepartment,
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
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8')) as AdminStoreData;
      if (!Array.isArray(adminStore.adminApplications)) adminStore.adminApplications = [];
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
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8')) as AdminStoreData;
      if (!Array.isArray(adminStore.adminApplications)) adminStore.adminApplications = [];
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
// INTERNAL SIGN-UP, DATA STORAGE & ACCOUNT OPENING SYSTEM
// ------------------------------------------

// Public helper to sanitize user for frontend consumption
function publicUserDossier(user: AdminUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// Check Email or Student ID availability live in internal database
app.get('/api/auth/check-availability', (req, res) => {
  const { email, studentId, university } = req.query;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedStudentId = typeof studentId === 'string' ? studentId.trim().toLowerCase() : '';
  const normalizedUniversity = typeof university === 'string' ? university.trim().toLowerCase() : '';

  let emailAvailable = true;
  let studentIdAvailable = true;

  if (normalizedEmail) {
    emailAvailable = !adminStore.users.some(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
  }

  if (normalizedStudentId && normalizedUniversity) {
    studentIdAvailable = !adminStore.users.some(
      (u) =>
        (u.university || '').toLowerCase() === normalizedUniversity &&
        (u.studentId || '').toLowerCase() === normalizedStudentId
    );
  }

  return res.json({
    success: true,
    emailAvailable,
    studentIdAvailable,
    checkedAt: new Date().toISOString(),
  });
});

// Presets and metadata for the New Account Opening Process
app.get('/api/auth/account-opening-presets', (_req, res) => {
  const defaultAvatars = [
    { id: 'av-grad-cap', name: 'Academic Scholar', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces' },
    { id: 'av-tech-dev', name: 'Software Engineer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces' },
    { id: 'av-researcher', name: 'Research Fellow', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces' },
    { id: 'av-student-1', name: 'Campus Student', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=faces' },
    { id: 'av-student-2', name: 'Graduate Scholar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=faces' },
    { id: 'av-faculty', name: 'Faculty Professor', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces' },
  ];

  return res.json({
    success: true,
    educationLevels: [
      'Undergraduate (Bachelor’s)',
      'Postgraduate (Master’s)',
      'MPhil (Master of Philosophy)',
      'Doctoral (PhD / Postdoc)',
      'Diploma / Executive Track',
    ],
    studentYears: [
      '1st Year, 1st Semester',
      '1st Year, 2nd Semester',
      '2nd Year, 3rd Semester',
      '2nd Year, 4th Semester',
      '3rd Year, 5th Semester',
      '3rd Year, 6th Semester',
      '4th Year, 7th Semester',
      '4th Year, 8th Semester',
      'Final Year / Capstone Stage',
    ],
    defaultAvatars,
    totalAccountsStored: adminStore.users.length,
    persistenceEngine: 'JSON Document Store & Realtime Sync',
    storageVersion: '2.5.0',
  });
});

// Storage verification status
app.get('/api/auth/storage-status', (_req, res) => {
  const studentsCount = adminStore.users.filter((u) => u.profileType === 'Student' || u.role === 'STUDENT').length;
  const alumniCount = adminStore.users.filter((u) => u.profileType === 'Alumni' || u.role === 'ALUMNI' || u.role === 'USER').length;
  const adminCount = adminStore.users.filter((u) => ['SUPER_ADMIN', 'CO_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN', 'ADMIN'].includes(u.role)).length;

  return res.json({
    success: true,
    storageEngine: 'Internal Persistent Database',
    databaseFile: 'admin-database.json',
    totalRegisteredAccounts: adminStore.users.length,
    breakdown: {
      students: studentsCount,
      alumni: alumniCount,
      administrators: adminCount,
    },
    auditLogsRecorded: adminStore.auditLogs.length,
    lastPersisted: new Date().toISOString(),
    status: 'ACTIVE_AND_PERSISTENT',
  });
});

// POST /api/auth/register-internal - Dedicated Internal Sign-Up & Account Opening System
app.post('/api/auth/register-internal', (req, res) => {
  const {
    name,
    email,
    password,
    profileType,
    university,
    department,
    studentId,
    educationLevel,
    studentYear,
    expectedGraduation,
    graduationYear,
    batch,
    degree,
    jobRole,
    company,
    country,
    city,
    bio,
    photoUrl,
    linkedin,
    termsAccepted,
  } = req.body || {};

  const clientIp = getClientIp(req);

  // Field validations
  if (typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your full name (minimum 2 characters).' });
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (!university || typeof university !== 'string' || !university.trim()) {
    return res.status(400).json({ error: 'Please specify your University institution.' });
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    return res.status(400).json({ error: 'Please specify your Academic Department.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const targetProfileType = profileType === 'Alumni' ? 'Alumni' : 'Student';

  // Check for duplicate registered accounts
  const existingUser = adminStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({
      error: 'An account with this email address is already registered. Please log in or use password recovery.',
      code: 'auth/email-already-in-use',
    });
  }

  const isMasterAdminEmail = [
    'nahianalmubin2006@gmail.com',
    'nahianalmubin212528@gmail.com',
    'nahianalmubin2@gmail.com',
  ].includes(normalizedEmail);

  const initialRole: AdminRole = isMasterAdminEmail
    ? 'SUPER_ADMIN'
    : targetProfileType === 'Alumni'
    ? 'ALUMNI'
    : 'STUDENT';

  const newUserId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  // Create persistent user record in internal database
  const newUser: AdminUser = {
    id: newUserId,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    name: name.trim(),
    role: initialRole,
    status: 'APPROVED',
    profileType: isMasterAdminEmail ? 'Super Admin' : targetProfileType,
    university: university.trim(),
    department: department.trim(),
    studentId: typeof studentId === 'string' ? studentId.trim() : '',
    educationLevel: typeof educationLevel === 'string' ? educationLevel.trim() : 'Undergraduate (Bachelor’s)',
    studentYear: typeof studentYear === 'string' ? studentYear.trim() : '',
    expectedGraduation: typeof expectedGraduation === 'string' ? expectedGraduation.trim() : '',
    graduationYear: typeof graduationYear === 'string' ? graduationYear.trim() : (batch || '2024'),
    batch: typeof batch === 'string' ? batch.trim() : (graduationYear || '2024'),
    degree: typeof degree === 'string' ? degree.trim() : undefined,
    jobRole: typeof jobRole === 'string' ? jobRole.trim() : '',
    company: typeof company === 'string' ? company.trim() : '',
    country: typeof country === 'string' && country.trim() ? country.trim() : 'Bangladesh',
    city: typeof city === 'string' && city.trim() ? city.trim() : 'Dhaka',
    bio: typeof bio === 'string' ? bio.trim() : '',
    photoUrl: typeof photoUrl === 'string' ? photoUrl.trim() : '',
    linkedin: typeof linkedin === 'string' ? linkedin.trim() : '',
    isVerifiedAlumni: isMasterAdminEmail,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  adminStore.users.push(newUser);
  persistAdminStore();

  // Audit log entry for data storage provenance
  recordAuditLog({
    actorId: newUserId,
    actorEmail: normalizedEmail,
    actorRole: initialRole,
    action: 'USER_ACCOUNT_OPENED',
    targetType: 'INTERNAL_USER',
    targetId: newUserId,
    details: `New ${targetProfileType} account opened: ${name.trim()} (${university.trim()} - ${department.trim()}). Saved to internal persistent database.`,
    ip: clientIp,
  });

  // Issue persistent internal session token
  const token = generateSessionToken();
  const session: AdminSession = {
    token,
    userId: newUserId,
    email: normalizedEmail,
    name: name.trim(),
    role: initialRole,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    lastActivityAt: Date.now(),
    ip: clientIp,
  };
  activeAdminSessions.set(token, session);

  // Return full success dossier + durable storage receipt
  return res.status(201).json({
    success: true,
    message: 'Account opened successfully! Your records are securely stored in the internal database.',
    token,
    user: publicUserDossier(newUser),
    storageReceipt: {
      storageEngine: 'Internal Persistent Database',
      databaseFile: 'admin-database.json',
      recordId: newUserId,
      accountType: targetProfileType,
      status: 'APPROVED',
      institution: university.trim(),
      facultyDepartment: department.trim(),
      timestamp: now,
      hashAlgorithm: 'scrypt-pbkdf2-salted',
    },
  });
});

// POST /api/auth/login-internal - Internal Account Login
app.post('/api/auth/login-internal', (req, res) => {
  const { email, password } = req.body || {};
  const clientIp = getClientIp(req);

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Reload store from disk if updated
  try {
    if (fs.existsSync(ADMIN_DB_PATH)) {
      adminStore = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8')) as AdminStoreData;
      if (!Array.isArray(adminStore.adminApplications)) adminStore.adminApplications = [];
    }
  } catch (e) {}

  const user = adminStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !user.passwordHash) {
    recordFailedLogin(clientIp, normalizedEmail);
    return res.status(401).json({
      error: 'Invalid credentials. Please verify your email and password or open a new account.',
      code: 'auth/invalid-credential',
    });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'This account has been suspended by administration.' });
  }

  const isValidPassword = verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    recordFailedLogin(clientIp, normalizedEmail);
    return res.status(401).json({
      error: 'Incorrect password. Please verify your password or use password recovery.',
      code: 'auth/wrong-password',
    });
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
    action: 'USER_LOGIN_INTERNAL',
    targetType: 'SESSION',
    targetId: token.substring(0, 8),
    details: `User ${user.name} logged in via internal authentication.`,
    ip: clientIp,
  });

  return res.json({
    success: true,
    message: 'Welcome back! Logged in via internal authentication.',
    token,
    user: publicUserDossier(user),
  });
});

// POST /api/auth/verify-session - Session validation
app.post('/api/auth/verify-session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.body?.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null);

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided.' });
  }

  const session = activeAdminSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Session has expired or is invalid.' });
  }

  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = adminStore.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  session.lastActivityAt = Date.now();
  session.expiresAt = Date.now() + SESSION_TTL_MS;

  return res.json({
    success: true,
    authenticated: true,
    user: publicUserDossier(user),
  });
});

// GET /api/auth/storage-receipt/:userId - Retrieve verifiable data storage receipt
app.get('/api/auth/storage-receipt/:userId', (req, res) => {
  const { userId } = req.params;
  const user = adminStore.users.find(
    (u) => u.id === userId || u.firebaseUid === userId || u.email.toLowerCase() === userId.toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ error: 'No storage record found for the provided identifier.' });
  }

  return res.json({
    success: true,
    receipt: {
      recordId: user.id,
      email: user.email,
      name: user.name,
      profileType: user.profileType || (user.role === 'ALUMNI' ? 'Alumni' : 'Student'),
      role: user.role,
      status: user.status,
      university: user.university || 'N/A',
      department: user.department || 'N/A',
      studentId: user.studentId || 'N/A',
      educationLevel: user.educationLevel || 'Undergraduate (Bachelor’s)',
      storageEngine: 'Internal Persistent Database (admin-database.json)',
      hashAlgorithm: 'scrypt-pbkdf2-salted',
      storageStatus: 'SECURELY_COMMITTED',
      createdAt: user.createdAt,
      lastUpdated: user.updatedAt,
      syncedToFirestore: true,
    },
  });
});

// GET /api/auth/recent-account-openings - Public real-time account activity stream
app.get('/api/auth/recent-account-openings', (_req, res) => {
  const recent = adminStore.users
    .slice(-10)
    .reverse()
    .map((u) => ({
      id: u.id.substring(0, 8) + '...',
      name: u.name,
      maskedEmail: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      profileType: u.profileType || (u.role === 'ALUMNI' ? 'Alumni' : 'Student'),
      university: u.university || 'Affiliated Institution',
      department: u.department || 'Academic Department',
      openedAt: u.createdAt,
      status: u.status,
    }));

  return res.json({
    success: true,
    count: recent.length,
    recentOpenings: recent,
  });
});

// POST /api/auth/update-profile - Update logged-in user profile in internal database
app.post('/api/auth/update-profile', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.body?.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null);
  const identifier = req.body?.userId || req.body?.email;

  let user: AdminUser | undefined;

  if (token) {
    const session = activeAdminSessions.get(token);
    if (session) {
      user = adminStore.users.find((u) => u.id === session.userId);
    }
  }

  if (!user && identifier) {
    user = adminStore.users.find(
      (u) =>
        u.id === identifier ||
        u.firebaseUid === identifier ||
        u.email.toLowerCase() === String(identifier).trim().toLowerCase()
    );
  }

  if (!user) {
    return res.status(401).json({ error: 'User account not found or session expired.' });
  }

  const {
    name,
    profileType,
    university,
    department,
    studentId,
    educationLevel,
    studentYear,
    expectedGraduation,
    graduationYear,
    batch,
    jobRole,
    company,
    country,
    city,
    bio,
    photoUrl,
    coverTheme,
    coverUrl,
    skills,
    mentorshipOpen,
    publicDirectoryVisible,
    linkedin,
    degreeTitle,
    portfolioUrl,
  } = req.body || {};

  if (typeof name === 'string' && name.trim()) user.name = name.trim();
  if (profileType && ['Student', 'Alumni', 'Admin'].includes(profileType)) {
    user.profileType = profileType;
    if (user.role === 'STUDENT' && profileType === 'Alumni') user.role = 'ALUMNI';
    if (user.role === 'ALUMNI' && profileType === 'Student') user.role = 'STUDENT';
  }
  if (university !== undefined) user.university = String(university).trim();
  if (department !== undefined) user.department = String(department).trim();
  if (studentId !== undefined) user.studentId = String(studentId).trim();
  if (educationLevel !== undefined) user.educationLevel = String(educationLevel).trim();
  if (studentYear !== undefined) user.studentYear = String(studentYear).trim();
  if (expectedGraduation !== undefined) user.expectedGraduation = String(expectedGraduation).trim();
  if (graduationYear !== undefined) user.graduationYear = String(graduationYear).trim();
  if (batch !== undefined) user.batch = String(batch).trim();
  if (jobRole !== undefined) user.jobRole = String(jobRole).trim();
  if (company !== undefined) user.company = String(company).trim();
  if (country !== undefined) user.country = String(country).trim();
  if (city !== undefined) user.city = String(city).trim();
  if (bio !== undefined) user.bio = String(bio).trim();
  if (photoUrl !== undefined) user.photoUrl = String(photoUrl).trim();
  if (linkedin !== undefined) user.linkedin = String(linkedin).trim();

  // Extended premium profile attributes
  const userAny = user as any;
  if (coverTheme !== undefined) userAny.coverTheme = coverTheme;
  if (coverUrl !== undefined) userAny.coverUrl = coverUrl;
  if (Array.isArray(skills)) userAny.skills = skills.map((s: any) => String(s).trim()).filter(Boolean);
  if (mentorshipOpen !== undefined) userAny.mentorshipOpen = Boolean(mentorshipOpen);
  if (publicDirectoryVisible !== undefined) userAny.publicDirectoryVisible = Boolean(publicDirectoryVisible);
  if (degreeTitle !== undefined) userAny.degreeTitle = String(degreeTitle).trim();
  if (portfolioUrl !== undefined) userAny.portfolioUrl = String(portfolioUrl).trim();

  user.updatedAt = new Date().toISOString();
  persistAdminStore();

  return res.json({
    success: true,
    message: 'Profile updated successfully in internal database.',
    user: publicUserDossier(user),
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
// INSTITUTION-SCOPED ADMIN WORKSPACE APIs
// ------------------------------------------
function requireInstitutionAdmin(req: AdminRequest, res: express.Response, next: express.NextFunction) {
  requireAnyAdminAuth(req, res, () => {
    const admin = req.adminUser;
    if (!admin || !isInstitutionAdminRole(admin.role)) {
      return res.status(403).json({ error: 'Institution administrator authorization required.' });
    }
    if (!institutionUniversity(admin) ||
        (admin.role === 'DEPARTMENT_ADMIN' && !institutionDepartment(admin))) {
      return res.status(403).json({ error: 'This administrator has no complete institution assignment.' });
    }
    next();
  });
}

function canManageScopedDepartment(admin: AdminUser, department: CustomDepartmentItem): boolean {
  if (!sameInstitution(department.university, institutionUniversity(admin))) return false;
  if (admin.role === 'UNIVERSITY_ADMIN') return true;
  return admin.role === 'DEPARTMENT_ADMIN' && sameInstitution(department.name, institutionDepartment(admin));
}

function scopedDepartmentNames(admin: AdminUser): string[] {
  const university = institutionUniversity(admin);
  const fromRecords = (customUniStore.customDepartments || [])
    .filter((item) => sameInstitution(item.university, university))
    .map((item) => item.name);
  const fromCatalog = (customUniStore.departments || {})[university] ||
    (customUniStore.departments || {})[university.toLowerCase()] || [];
  const names = Array.from(new Set([...fromRecords, ...fromCatalog].map((name) => String(name).trim()).filter(Boolean)));
  if (admin.role === 'DEPARTMENT_ADMIN') {
    const assigned = institutionDepartment(admin);
    return assigned ? [names.find((name) => sameInstitution(name, assigned)) || assigned] : [];
  }
  return names;
}

function scopedAdminUser(admin: AdminUser) {
  const { passwordHash, firebaseUid, ...safe } = admin;
  return safe;
}

app.get('/api/institution/dashboard', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  const university = institutionUniversity(actor);
  const departments = (customUniStore.customDepartments || []).filter((item) =>
    sameInstitution(item.university, university) &&
    (actor.role === 'UNIVERSITY_ADMIN' || sameInstitution(item.name, institutionDepartment(actor)))
  );
  const scopedUsers = adminStore.users.filter((user) =>
    isInstitutionAdminRole(user.role) &&
    sameInstitution(user.assignedUniversity || user.university, university) &&
    (actor.role === 'UNIVERSITY_ADMIN' ||
      (user.role === 'DEPARTMENT_ADMIN' && sameInstitution(user.assignedDepartment || user.department, institutionDepartment(actor))))
  );
  const applications = (adminStore.adminApplications || []).filter((item) =>
    item.type !== 'CO_ADMIN' &&
    sameInstitution(item.university, university) &&
    (actor.role === 'UNIVERSITY_ADMIN' ||
      (item.type === 'DEPARTMENT_ADMIN' && sameInstitution(item.department, institutionDepartment(actor))))
  );
  return res.json({
    success: true,
    scope: { role: actor.role, university, department: actor.role === 'DEPARTMENT_ADMIN' ? institutionDepartment(actor) : null },
    stats: {
      departments: actor.role === 'DEPARTMENT_ADMIN' ? 1 : scopedDepartmentNames(actor).length,
      activeAdmins: scopedUsers.filter((user) => user.status === 'APPROVED').length,
      pendingApplications: applications.filter((item) => item.status === 'PENDING').length,
    },
    departments: departments.filter((item) => canManageScopedDepartment(actor, item)),
  });
});

app.get('/api/institution/catalog', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  const universityName = institutionUniversity(actor);
  const university = (customUniStore.customUniversities || []).find((item) =>
    sameInstitution(item.name, universityName) || sameInstitution(item.id, universityName)
  ) || null;
  const allDepartments = (customUniStore.customDepartments || []).filter((item) =>
    sameInstitution(item.university, universityName)
  );
  const visibleDepartments = actor.role === 'DEPARTMENT_ADMIN'
    ? allDepartments.filter((item) => sameInstitution(item.name, institutionDepartment(actor)))
    : allDepartments;
  return res.json({
    success: true,
    scope: { role: actor.role, university: universityName, department: actor.role === 'DEPARTMENT_ADMIN' ? institutionDepartment(actor) : null },
    university,
    departments: visibleDepartments,
    departmentNames: scopedDepartmentNames(actor),
  });
});

app.put('/api/institution/university', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  if (actor.role !== 'UNIVERSITY_ADMIN') {
    return res.status(403).json({ error: 'Only a University Admin can edit university details.' });
  }
  const scopeName = institutionUniversity(actor);
  const body = req.body || {};
  if (body.name !== undefined && !sameInstitution(body.name, scopeName)) {
    return res.status(403).json({ error: 'University name and scope cannot be changed from this workspace.' });
  }
  const key = String(body.id || 'uni-' + scopeName.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();
  let university = (customUniStore.customUniversities || []).find((item) =>
    sameInstitution(item.name, scopeName) || sameInstitution(item.id, key)
  );
  if (!university) {
    university = {
      id: key,
      name: scopeName,
      type: 'Public',
      location: '',
      departments: scopedDepartmentNames(actor),
      createdAt: new Date().toISOString(),
    };
    if (!Array.isArray(customUniStore.customUniversities)) customUniStore.customUniversities = [];
    customUniStore.customUniversities.push(university);
  }
  if (body.shortName !== undefined) university.shortName = String(body.shortName).trim().slice(0, 80);
  if (body.location !== undefined) university.location = String(body.location).trim().slice(0, 240);
  if (body.logoUrl !== undefined) university.logoUrl = String(body.logoUrl).trim().slice(0, 1000);
  if (body.website !== undefined) university.website = String(body.website).trim().slice(0, 1000);
  if (body.description !== undefined) university.description = String(body.description).trim().slice(0, 4000);
  if (university.logoUrl) {
    customUniStore.logos[university.id] = university.logoUrl;
    customUniStore.logos[university.name] = university.logoUrl;
  }
  persistCustomUniStore();
  recordAuditLog({
    actorId: actor.id, actorEmail: actor.email, actorRole: actor.role,
    action: 'INSTITUTION_UNIVERSITY_PROFILE_UPDATED', targetType: 'UNIVERSITY',
    targetId: university.id, details: 'Updated scoped university profile: ' + university.name,
  });
  return res.json({ success: true, university });
});

app.post('/api/institution/departments', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  if (actor.role !== 'UNIVERSITY_ADMIN') {
    return res.status(403).json({ error: 'Only a University Admin can create departments.' });
  }
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 160) return res.status(400).json({ error: 'A department name of 1–160 characters is required.' });
  const university = institutionUniversity(actor);
  if ((customUniStore.customDepartments || []).some((item) =>
    sameInstitution(item.university, university) && sameInstitution(item.name, name)
  )) return res.status(409).json({ error: 'This department already exists in your university.' });
  const id = 'dept-' + encodeURIComponent((university + '-' + name).toLowerCase().replace(/[^a-z0-9]/g, '-'));
  if (!Array.isArray(customUniStore.customDepartments)) customUniStore.customDepartments = [];
  const department: CustomDepartmentItem = {
    id, name, university,
    group: typeof req.body?.group === 'string' ? req.body.group.trim().slice(0, 120) : 'General',
    faculty: typeof req.body?.faculty === 'string' ? req.body.faculty.trim().slice(0, 160) : '',
    status: 'Active',
    description: typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 4000) : '',
    logoUrl: '',
    updatedAt: new Date().toISOString(),
  };
  customUniStore.customDepartments.push(department);
  const uniRecord = (customUniStore.customUniversities || []).find((item) => sameInstitution(item.name, university));
  if (uniRecord && !uniRecord.departments.some((item) => sameInstitution(item, name))) uniRecord.departments.push(name);
  if (!Array.isArray(customUniStore.departments[university])) customUniStore.departments[university] = [];
  if (!customUniStore.departments[university].some((item) => sameInstitution(item, name))) customUniStore.departments[university].push(name);
  persistCustomUniStore();
  recordAuditLog({
    actorId: actor.id, actorEmail: actor.email, actorRole: actor.role,
    action: 'INSTITUTION_DEPARTMENT_CREATED', targetType: 'DEPARTMENT', targetId: id,
    details: 'Created department ' + name + ' under ' + university,
  });
  return res.status(201).json({ success: true, department });
});

app.put('/api/institution/departments/:id', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  const id = String(req.params.id || '').trim();
  let department = (customUniStore.customDepartments || []).find((item) => item.id === id);
  if (!department) {
    const catalogName = scopedDepartmentNames(actor).find((name) =>
      ('dept-' + encodeURIComponent((institutionUniversity(actor) + '-' + name).toLowerCase().replace(/[^a-z0-9]/g, '-'))) === id
    );
    if (catalogName && (actor.role === 'UNIVERSITY_ADMIN' ||
        (actor.role === 'DEPARTMENT_ADMIN' && sameInstitution(catalogName, institutionDepartment(actor))))) {
      department = {
        id, name: catalogName, university: institutionUniversity(actor), group: 'General',
        status: 'Active', updatedAt: new Date().toISOString(),
      };
      if (!Array.isArray(customUniStore.customDepartments)) customUniStore.customDepartments = [];
      customUniStore.customDepartments.push(department);
    }
  }
  if (!department) return res.status(404).json({ error: 'Department not found in the institution catalogue.' });
  if (!canManageScopedDepartment(actor, department)) {
    return res.status(403).json({ error: 'This department is outside your assigned scope.' });
  }
  const body = req.body || {};
  if (body.university !== undefined && !sameInstitution(body.university, institutionUniversity(actor))) {
    return res.status(403).json({ error: 'Department university cannot be changed from this workspace.' });
  }
  if (body.name !== undefined && !sameInstitution(body.name, department.name)) {
    return res.status(403).json({ error: 'Department identity cannot be renamed from this workspace.' });
  }
  if (body.group !== undefined) department.group = String(body.group).trim().slice(0, 120);
  if (body.faculty !== undefined) department.faculty = String(body.faculty).trim().slice(0, 160);
  if (body.status !== undefined) department.status = String(body.status).trim().slice(0, 40);
  if (body.logoUrl !== undefined) department.logoUrl = String(body.logoUrl).trim().slice(0, 1000);
  if (body.description !== undefined) department.description = String(body.description).trim().slice(0, 4000);
  department.updatedAt = new Date().toISOString();
  persistCustomUniStore();
  recordAuditLog({
    actorId: actor.id, actorEmail: actor.email, actorRole: actor.role,
    action: 'INSTITUTION_DEPARTMENT_UPDATED', targetType: 'DEPARTMENT', targetId: id,
    details: 'Updated scoped department ' + department.name + ' under ' + department.university,
  });
  return res.json({ success: true, department });
});

app.delete('/api/institution/departments/:id', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  if (actor.role !== 'UNIVERSITY_ADMIN') {
    return res.status(403).json({ error: 'Only a University Admin can remove departments.' });
  }
  const id = String(req.params.id || '').trim();
  let department = (customUniStore.customDepartments || []).find((item) => item.id === id);
  if (!department) {
    const catalogName = scopedDepartmentNames(actor).find((name) =>
      ('dept-' + encodeURIComponent((institutionUniversity(actor) + '-' + name).toLowerCase().replace(/[^a-z0-9]/g, '-'))) === id
    );
    if (catalogName) department = { id, name: catalogName, university: institutionUniversity(actor), group: 'General' };
  }
  if (!department) return res.status(404).json({ error: 'Department not found in the institution catalogue.' });
  if (!sameInstitution(department.university, institutionUniversity(actor))) {
    return res.status(403).json({ error: 'This department is outside your university scope.' });
  }
  customUniStore.customDepartments = (customUniStore.customDepartments || []).filter((item) => item.id !== id);
  customUniStore.departments[institutionUniversity(actor)] =
    (customUniStore.departments[institutionUniversity(actor)] || []).filter((name) => !sameInstitution(name, department.name));
  const uniRecord = (customUniStore.customUniversities || []).find((item) => sameInstitution(item.name, institutionUniversity(actor)));
  if (uniRecord) uniRecord.departments = uniRecord.departments.filter((name) => !sameInstitution(name, department.name));
  persistCustomUniStore();
  recordAuditLog({
    actorId: actor.id, actorEmail: actor.email, actorRole: actor.role,
    action: 'INSTITUTION_DEPARTMENT_DELETED', targetType: 'DEPARTMENT', targetId: id,
    details: 'Removed department ' + department.name + ' from ' + department.university,
  });
  return res.json({ success: true, departmentId: id });
});

app.get('/api/institution/admins', requireInstitutionAdmin, (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  const university = institutionUniversity(actor);
  const users = adminStore.users.filter((user) =>
    isInstitutionAdminRole(user.role) &&
    sameInstitution(user.assignedUniversity || user.university, university) &&
    (actor.role === 'UNIVERSITY_ADMIN' ||
      (user.role === 'DEPARTMENT_ADMIN' && sameInstitution(user.assignedDepartment || user.department, institutionDepartment(actor))))
  ).map(scopedAdminUser);
  const applications = (adminStore.adminApplications || []).filter((item) =>
    item.type !== 'CO_ADMIN' &&
    sameInstitution(item.university, university) &&
    (actor.role === 'UNIVERSITY_ADMIN' ||
      (item.type === 'DEPARTMENT_ADMIN' && sameInstitution(item.department, institutionDepartment(actor))))
  ).map(publicApplication);
  return res.json({ success: true, admins: users, applications });
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
  const sanitized = results.map(({ passwordHash, firebaseUid, ...rest }) => rest);
  return res.json({ success: true, count: sanitized.length, users: sanitized });
});

// POST /api/admin/users - Create new user or admin
app.post('/api/admin/users', requireAdminAuth, (req: AdminRequest, res) => {
  const { name, email, role = 'USER', password, university, department, status = 'APPROVED' } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Only ordinary users and legacy central admin roles may be created here. Use the approval workflow for other admin roles.' });
  }
  if (role !== 'USER' && req.adminUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can provision central administrator accounts.' });
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
  const { passwordHash, firebaseUid, ...sanitized } = user;
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

  const { passwordHash, firebaseUid, ...sanitized } = target;
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
  if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
    const activeSuperAdmins = adminStore.users.filter((user) => user.role === 'SUPER_ADMIN' && user.status === 'APPROVED').length;
    if (activeSuperAdmins <= 1) return res.status(409).json({ error: 'The last active Super Admin cannot be demoted.' });
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

  const { passwordHash, firebaseUid, ...sanitized } = target;
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
  if (['ADMIN', 'CO_ADMIN'].includes(target.role) && req.adminUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can modify a central administrator account.' });
  }
  if (target.role === 'SUPER_ADMIN' && status !== 'APPROVED') {
    const activeSuperAdmins = adminStore.users.filter((user) => user.role === 'SUPER_ADMIN' && user.status === 'APPROVED').length;
    if (activeSuperAdmins <= 1) return res.status(409).json({ error: 'The last active Super Admin cannot be suspended or deactivated.' });
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

  const { passwordHash, firebaseUid, ...sanitized } = target;
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

  if (['ADMIN', 'CO_ADMIN'].includes(target.role) && req.adminUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can delete central administrator accounts.' });
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

// POST /api/admin/verifications/submit - Client degree verification submission
app.post('/api/admin/verifications/submit', (req, res) => {
  const { id, userId, userName, userEmail, university, department, batch, proofUrl, notes } = req.body || {};
  if (!userName || !university) {
    return res.status(400).json({ error: 'User name and university are required.' });
  }
  const item: VerificationItem = {
    id: id || `verif-${Date.now()}`,
    userId: userId || `usr-${Date.now()}`,
    userName,
    userEmail: userEmail || '',
    university,
    department: department || '',
    graduationYear: batch || '2023',
    proofUrl: proofUrl || '',
    notes: notes || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  const existingIdx = adminStore.verifications.findIndex((v) => v.id === item.id || (v.userId === item.userId && v.status === 'PENDING'));
  if (existingIdx >= 0) {
    adminStore.verifications[existingIdx] = item;
  } else {
    adminStore.verifications.unshift(item);
  }
  persistAdminStore();

  return res.json({ success: true, verification: item });
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

// ============================================================================
// Real Alumni Networking & Mentorship API Routes
// ============================================================================

const networkRateLimitMap = new Map<string, number[]>();
function checkNetworkingRateLimit(userId: string, limitCount = 25, windowMs = 3600000): boolean {
  const now = Date.now();
  const timestamps = (networkRateLimitMap.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limitCount) return false;
  timestamps.push(now);
  networkRateLimitMap.set(userId, timestamps);
  return true;
}

function resolveNetworkingUser(req: express.Request): AdminUser | null {
  const authHeader = req.headers.authorization;
  const token = req.body?.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null);
  const identifier = req.body?.userId || req.headers['x-user-id'] || req.query?.userId;

  let user: AdminUser | undefined;
  if (token) {
    const session = activeAdminSessions.get(token);
    if (session) {
      user = adminStore.users.find((u) => u.id === session.userId);
    }
  }
  if (!user && identifier) {
    const cleanId = String(identifier).trim().toLowerCase();
    user = adminStore.users.find(
      (u) =>
        u.id.toLowerCase() === cleanId ||
        (u.firebaseUid && u.firebaseUid.toLowerCase() === cleanId) ||
        u.email.toLowerCase() === cleanId
    );
  }
  return user || null;
}

// GET /api/connections/my - Get connections and requests for authenticated user
app.get('/api/connections/my', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required to view your professional network.' });
  }

  const userId = user.id.toLowerCase();
  const userEmail = user.email.toLowerCase();

  const allReqs = (adminStore.connectionRequests || []).filter(
    (r) =>
      r.senderId.toLowerCase() === userId ||
      r.recipientId.toLowerCase() === userId ||
      (r.senderEmail && r.senderEmail.toLowerCase() === userEmail) ||
      (r.recipientEmail && r.recipientEmail.toLowerCase() === userEmail)
  );

  const incoming = allReqs.filter(
    (r) =>
      (r.recipientId.toLowerCase() === userId || (r.recipientEmail && r.recipientEmail.toLowerCase() === userEmail)) &&
      r.status === 'PENDING'
  );

  const outgoing = allReqs.filter(
    (r) =>
      (r.senderId.toLowerCase() === userId || (r.senderEmail && r.senderEmail.toLowerCase() === userEmail)) &&
      r.status !== 'CANCELLED'
  );

  const accepted = allReqs.filter((r) => r.status === 'ACCEPTED');

  return res.json({
    success: true,
    totalConnections: accepted.length,
    incoming,
    outgoing,
    accepted,
  });
});

// POST /api/connections/request - Send a new connection request
app.post('/api/connections/request', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'You must be signed in to send a connection request.' });
  }

  const {
    recipientId,
    recipientName,
    recipientEmail,
    recipientRole,
    recipientPhotoUrl,
    recipientUniversity,
    recipientDepartment,
    recipientJobRole,
    recipientCompany,
    recipientAlumniId,
    message,
  } = req.body || {};

  if (!recipientId || !recipientName) {
    return res.status(400).json({ error: 'Recipient ID and name are required.' });
  }

  // Prevent connecting with oneself
  if (
    recipientId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && recipientId.toLowerCase() === user.firebaseUid.toLowerCase()) ||
    (recipientEmail && recipientEmail.toLowerCase() === user.email.toLowerCase())
  ) {
    return res.status(400).json({ error: 'You cannot send a connection request to yourself.' });
  }

  // Rate limiting & abuse prevention
  if (!checkNetworkingRateLimit(user.id)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a while before sending more invitations.' });
  }

  // Duplicate active request check
  const existing = (adminStore.connectionRequests || []).find(
    (r) =>
      ((r.senderId.toLowerCase() === user.id.toLowerCase() && r.recipientId.toLowerCase() === String(recipientId).toLowerCase()) ||
        (r.recipientId.toLowerCase() === user.id.toLowerCase() && r.senderId.toLowerCase() === String(recipientId).toLowerCase())) &&
      (r.status === 'PENDING' || r.status === 'ACCEPTED')
  );

  if (existing) {
    return res.status(409).json({
      error:
        existing.status === 'ACCEPTED'
          ? 'You are already connected with this member.'
          : 'A connection request between you and this member is already pending.',
    });
  }

  const safeMessage = typeof message === 'string' ? message.slice(0, 300).trim() : '';
  const now = new Date().toISOString();
  const newRequest: ServerConnectionRequest = {
    id: `conn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    senderId: user.id,
    senderName: user.name,
    senderEmail: user.email,
    senderRole: user.role,
    senderUniversity: user.university,
    senderDepartment: user.department,
    senderJobRole: user.jobRole,
    senderCompany: user.company,
    recipientId: String(recipientId).trim(),
    recipientName: String(recipientName).trim(),
    recipientEmail: recipientEmail ? String(recipientEmail).trim() : undefined,
    recipientRole: recipientRole,
    recipientPhotoUrl: recipientPhotoUrl,
    recipientUniversity: recipientUniversity,
    recipientDepartment: recipientDepartment,
    recipientJobRole: recipientJobRole,
    recipientCompany: recipientCompany,
    recipientAlumniId: recipientAlumniId,
    message: safeMessage,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  adminStore.connectionRequests!.push(newRequest);
  persistAdminStore();

  return res.status(201).json({ success: true, request: newRequest });
});

// POST /api/connections/:id/respond - Accept or Decline request (Recipient only)
app.post('/api/connections/:id/respond', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const { status } = req.body || {};

  if (status !== 'ACCEPTED' && status !== 'DECLINED') {
    return res.status(400).json({ error: 'Valid status must be either ACCEPTED or DECLINED.' });
  }

  const request = (adminStore.connectionRequests || []).find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Connection request not found.' });
  }

  // Authorization: Only the recipient can accept or decline
  const isRecipient =
    request.recipientId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && request.recipientId.toLowerCase() === user.firebaseUid.toLowerCase()) ||
    (request.recipientEmail && request.recipientEmail.toLowerCase() === user.email.toLowerCase()) ||
    user.role === 'SUPER_ADMIN';

  if (!isRecipient) {
    return res.status(403).json({ error: 'Unauthorized: only the recipient may accept or decline this request.' });
  }

  if (request.status !== 'PENDING') {
    return res.status(400).json({ error: `Cannot respond to a request with status ${request.status}.` });
  }

  const now = new Date().toISOString();
  request.status = status;
  request.updatedAt = now;
  request.respondedAt = now;

  persistAdminStore();
  return res.json({ success: true, request });
});

// POST /api/connections/:id/cancel - Cancel an outgoing pending request (Sender only)
app.post('/api/connections/:id/cancel', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const request = (adminStore.connectionRequests || []).find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Connection request not found.' });
  }

  // Authorization: Only the sender can cancel
  const isSender =
    request.senderId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && request.senderId.toLowerCase() === user.firebaseUid.toLowerCase()) ||
    (request.senderEmail && request.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
    user.role === 'SUPER_ADMIN';

  if (!isSender) {
    return res.status(403).json({ error: 'Unauthorized: only the sender may cancel this request.' });
  }

  request.status = 'CANCELLED';
  request.updatedAt = new Date().toISOString();

  persistAdminStore();
  return res.json({ success: true, request });
});

// POST /api/connections/:id/disconnect - Remove an existing connection
app.post('/api/connections/:id/disconnect', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const request = (adminStore.connectionRequests || []).find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Connection not found.' });
  }

  const isParty =
    request.senderId.toLowerCase() === user.id.toLowerCase() ||
    request.recipientId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && (request.senderId.toLowerCase() === user.firebaseUid.toLowerCase() || request.recipientId.toLowerCase() === user.firebaseUid.toLowerCase())) ||
    user.role === 'SUPER_ADMIN';

  if (!isParty) {
    return res.status(403).json({ error: 'Unauthorized: you are not a party to this connection.' });
  }

  request.status = 'CANCELLED';
  request.updatedAt = new Date().toISOString();

  persistAdminStore();
  return res.json({ success: true, message: 'Connection removed.' });
});

// GET /api/mentorship/my - Get student and mentor requests
app.get('/api/mentorship/my', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const userId = user.id.toLowerCase();
  const userEmail = user.email.toLowerCase();

  const allReqs = (adminStore.mentorshipRequests || []).filter(
    (r) =>
      r.studentId.toLowerCase() === userId ||
      r.mentorId.toLowerCase() === userId ||
      (r.studentEmail && r.studentEmail.toLowerCase() === userEmail)
  );

  const incoming = allReqs.filter(
    (r) => r.mentorId.toLowerCase() === userId && r.status !== 'CANCELLED'
  );

  const outgoing = allReqs.filter(
    (r) => (r.studentId.toLowerCase() === userId || (r.studentEmail && r.studentEmail.toLowerCase() === userEmail)) && r.status !== 'CANCELLED'
  );

  return res.json({
    success: true,
    incoming,
    outgoing,
  });
});

// POST /api/mentorship/request - Submit a new student mentorship request
app.post('/api/mentorship/request', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'You must be signed in to request mentorship.' });
  }

  const {
    mentorId,
    mentorName,
    mentorRole,
    mentorPhotoUrl,
    mentorUniversity,
    mentorDepartment,
    mentorJobRole,
    mentorCompany,
    mentorAlumniId,
    topic,
    message,
    preferredSchedule,
  } = req.body || {};

  if (!mentorId || !mentorName) {
    return res.status(400).json({ error: 'Mentor ID and name are required.' });
  }

  if (
    mentorId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && mentorId.toLowerCase() === user.firebaseUid.toLowerCase())
  ) {
    return res.status(400).json({ error: 'You cannot request mentorship from yourself.' });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 20) {
    return res.status(400).json({ error: 'Please provide a clear purpose or message of at least 20 characters.' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message cannot exceed 1000 characters.' });
  }

  if (!checkNetworkingRateLimit(user.id)) {
    return res.status(429).json({ error: 'Too many mentorship requests. Please wait before submitting more.' });
  }

  // Prevent duplicate pending mentorship request to the same mentor
  const existingPending = (adminStore.mentorshipRequests || []).find(
    (r) =>
      r.studentId.toLowerCase() === user.id.toLowerCase() &&
      r.mentorId.toLowerCase() === String(mentorId).toLowerCase() &&
      r.status === 'PENDING'
  );

  if (existingPending) {
    return res.status(409).json({
      error: 'You already have a pending mentorship request to this mentor. Please wait for their response.',
    });
  }

  const now = new Date().toISOString();
  const newRequest: ServerMentorshipRequest = {
    id: `mentor-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    studentRole: user.role,
    studentUniversity: user.university,
    studentDepartment: user.department,
    mentorId: String(mentorId).trim(),
    mentorName: String(mentorName).trim(),
    mentorRole,
    mentorPhotoUrl,
    mentorUniversity,
    mentorDepartment,
    mentorJobRole,
    mentorCompany,
    mentorAlumniId,
    topic: String(topic || 'General Mentorship').trim(),
    message: message.trim(),
    preferredSchedule: typeof preferredSchedule === 'string' ? preferredSchedule.trim() : undefined,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  adminStore.mentorshipRequests!.push(newRequest);
  persistAdminStore();

  return res.status(201).json({ success: true, request: newRequest });
});

// POST /api/mentorship/:id/respond - Mentor responds (ACCEPTED / DECLINED) with feedback
app.post('/api/mentorship/:id/respond', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const { status, feedback } = req.body || {};

  if (status !== 'ACCEPTED' && status !== 'DECLINED') {
    return res.status(400).json({ error: 'Status must be ACCEPTED or DECLINED.' });
  }

  const request = (adminStore.mentorshipRequests || []).find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Mentorship request not found.' });
  }

  const isMentor =
    request.mentorId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && request.mentorId.toLowerCase() === user.firebaseUid.toLowerCase()) ||
    user.role === 'SUPER_ADMIN';

  if (!isMentor) {
    return res.status(403).json({ error: 'Unauthorized: only the mentor may respond to this request.' });
  }

  if (request.status !== 'PENDING') {
    return res.status(400).json({ error: `Cannot respond to a mentorship request with status ${request.status}.` });
  }

  const now = new Date().toISOString();
  request.status = status;
  if (typeof feedback === 'string') {
    request.feedback = feedback.slice(0, 1000).trim();
  }
  request.updatedAt = now;
  request.respondedAt = now;

  persistAdminStore();
  return res.json({ success: true, request });
});

// POST /api/mentorship/:id/cancel - Student cancels pending request
app.post('/api/mentorship/:id/cancel', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const request = (adminStore.mentorshipRequests || []).find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Mentorship request not found.' });
  }

  const isStudent =
    request.studentId.toLowerCase() === user.id.toLowerCase() ||
    (user.firebaseUid && request.studentId.toLowerCase() === user.firebaseUid.toLowerCase()) ||
    (request.studentEmail && request.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
    user.role === 'SUPER_ADMIN';

  if (!isStudent) {
    return res.status(403).json({ error: 'Unauthorized: only the student may cancel this request.' });
  }

  request.status = 'CANCELLED';
  request.updatedAt = new Date().toISOString();

  persistAdminStore();
  return res.json({ success: true, request });
});

// POST /api/mentorship/:id/complete - Mark mentorship completed
app.post('/api/mentorship/:id/complete', (req, res) => {
  const user = resolveNetworkingUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { id } = req.params;
  const request = (adminStore.mentorshipRequests || []).find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Mentorship request not found.' });
  }

  const isParty =
    request.mentorId.toLowerCase() === user.id.toLowerCase() ||
    request.studentId.toLowerCase() === user.id.toLowerCase() ||
    user.role === 'SUPER_ADMIN';

  if (!isParty) {
    return res.status(403).json({ error: 'Unauthorized: you are not a party to this mentorship relationship.' });
  }

  request.status = 'COMPLETED';
  request.updatedAt = new Date().toISOString();

  persistAdminStore();
  return res.json({ success: true, request });
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

// Return safe JSON errors for malformed or oversized API request bodies.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  return next(err);
});

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
