import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import {
  University,
  Department,
  Batch,
  AlumniRecord,
  StudentRecord,
  NewsArticle,
  ChangeRequest,
  VerificationRequest,
  ProfileClaimRequest,
  AppNotification,
  AuditLog,
  AdminAssignment,
  PlatformSetting,
  Role,
  UserProfile,
  UserPost,
  PostReactionType,
  ConnectionRequest,
  ConnectionStatus,
  MentorshipRequest,
  MentorshipStatus,
  MentorshipTopic,
} from '../types';
import {
  ALL_DIRECTORY_UNIVERSITIES,
  RAW_DEPARTMENT_CATALOG,
  INITIAL_ALUMNI,
  INITIAL_NEWS,
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_POSTS,
  INITIAL_BATCHES,
  normalizeDepartmentName,
  getUniversityLogo,
  setCustomLogo,
} from '../data/initialData';
import { VERIFIED_DEPARTMENT_SEEDS } from '../data/verifiedDepartments';

interface DataContextType {
  universities: University[];
  departments: Department[];
  batches: Batch[];
  alumni: AlumniRecord[];
  students: StudentRecord[];
  news: NewsArticle[];
  posts: UserPost[];
  changeRequests: ChangeRequest[];
  verificationRequests: VerificationRequest[];
  profileClaims: ProfileClaimRequest[];
  canReviewProfileClaims: boolean;
  submitProfileClaim: (claim: Omit<ProfileClaimRequest, 'id' | 'requesterId' | 'requesterName' | 'requesterEmail' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  approveProfileClaim: (id: string, comment?: string) => Promise<void>;
  rejectProfileClaim: (id: string, comment?: string) => Promise<void>;
  notifications: AppNotification[];
  connectionRequests: ConnectionRequest[];
  mentorshipRequests: MentorshipRequest[];
  sendConnectionRequest: (target: {
    recipientId: string;
    recipientName: string;
    recipientEmail?: string;
    recipientRole?: Role;
    recipientPhotoUrl?: string;
    recipientUniversity?: string;
    recipientDepartment?: string;
    recipientJobRole?: string;
    recipientCompany?: string;
    recipientAlumniId?: string;
    message?: string;
  }) => Promise<void>;
  respondConnectionRequest: (requestId: string, status: 'ACCEPTED' | 'DECLINED') => Promise<void>;
  cancelConnectionRequest: (requestId: string) => Promise<void>;
  disconnectConnection: (requestId: string) => Promise<void>;
  sendMentorshipRequest: (target: {
    mentorId: string;
    mentorName: string;
    mentorRole?: Role;
    mentorPhotoUrl?: string;
    mentorUniversity?: string;
    mentorDepartment?: string;
    mentorJobRole?: string;
    mentorCompany?: string;
    mentorAlumniId?: string;
    topic: MentorshipTopic;
    message: string;
    preferredSchedule?: string;
  }) => Promise<void>;
  respondMentorshipRequest: (requestId: string, status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED', feedback?: string) => Promise<void>;
  cancelMentorshipRequest: (requestId: string) => Promise<void>;
  completeMentorshipRequest: (requestId: string) => Promise<void>;
  getConnectionStatusWith: (targetIdOrAlumniId: string) => {
    status: ConnectionStatus | 'NONE';
    request?: ConnectionRequest;
    isOutgoing: boolean;
  };
  getMentorshipStatusWith: (targetIdOrAlumniId: string) => {
    status: MentorshipStatus | 'NONE';
    request?: MentorshipRequest;
    isOutgoing: boolean;
  };
  auditLogs: AuditLog[];
  adminAssignments: AdminAssignment[];
  platformSettings: PlatformSetting;
  allUsers: UserProfile[];
  loadingData: boolean;

  // Interconnected dynamic statistics
  stats: {
    totalAlumni: number;
    totalStudents: number;
    totalUniversities: number;
    totalDepartments: number;
    totalCountries: number;
    totalCompanies: number;
    pendingApprovalsCount: number;
    pendingNewsCount: number;
    pendingVerificationsCount: number;
  };

  // Actions
  createPost: (post: Omit<UserPost, 'id' | 'createdAt' | 'reactions'>) => Promise<void>;
  reactToPost: (postId: string, reactionType: PostReactionType) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleFollowUniversity: (uniName: string) => Promise<void>;
  isFollowingUniversity: (uniName: string) => boolean;

  approveUser: (userId: string, targetRole?: Role) => Promise<void>;
  rejectUser: (userId: string, reason?: string) => Promise<void>;
  unapproveUser: (userId: string, reason?: string) => Promise<void>;
  suspendUser: (userId: string) => Promise<void>;
  changeUserRole: (userId: string, newRole: Role) => Promise<void>;

  verifyAlumni: (alumniId: string, isVerified: boolean) => Promise<void>;
  submitVerificationRequest: (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  approveVerificationRequest: (id: string, comment?: string) => Promise<void>;
  rejectVerificationRequest: (id: string, comment?: string) => Promise<void>;

  submitChangeRequest: (req: Omit<ChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  approveChangeRequest: (id: string, comment?: string) => Promise<void>;
  rejectChangeRequest: (id: string, comment?: string) => Promise<void>;

  createNewsArticle: (article: Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNewsArticle: (id: string, updates: Partial<NewsArticle>) => Promise<void>;
  deleteNewsArticle: (id: string, reason?: string) => Promise<void>;
  makeNewsPermanent: (id: string, actor?: { uid: string; name: string; role: Role }) => Promise<void>;
  removeNewsPermanent: (id: string) => Promise<void>;
  canUserManageArticle: (article: NewsArticle) => boolean;
  triggerAINewsBotScan: (options?: {
    focusType?: string;
    university?: string;
    department?: string;
    forceHotTopic?: boolean;
    count?: number;
  }) => Promise<NewsArticle[]>;
  trigger24HourRotationCycle: () => Promise<NewsArticle[]>;
  cleanupExpiredNews: () => Promise<number>;
  botStatus: {
    active: boolean;
    lastScanAt: string;
    nextRotationAt: string;
    cycleCount: number;
    totalGenerated: number;
  };
  deleteUser: (userId: string, reason?: string) => Promise<void>;
  deleteAlumni: (alumniId: string, reason?: string) => Promise<void>;

  assignAdmin: (assignment: Omit<AdminAssignment, 'id' | 'createdAt'>) => Promise<void>;
  removeAdminAssignment: (id: string) => Promise<void>;

  saveUniversity: (uni: Partial<University>) => Promise<void>;
  deleteUniversity: (uniId: string) => Promise<void>;
  updateUniversityLogo: (uniIdOrName: string, logoUrl: string) => Promise<void>;
  saveDepartment: (dept: Partial<Department>) => Promise<void>;
  updateUniversityDepartments: (uniName: string, deptNames: string[]) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  logAudit: (
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    options?: {
      severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
      targetName?: string;
      metadata?: Record<string, any>;
    }
  ) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isSuperAdmin, updateProfileData } = useAuth();

  // Directory metadata is non-factual until verified; all metrics start at zero.
  const [universities, setUniversities] = useState<University[]>(() => {
    const baseline: University[] = ALL_DIRECTORY_UNIVERSITIES.map((u) => ({
      id: 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      name: u.name,
      type: u.type,
      location: '',
      verified: false,
      alumniCount: 0,
      studentCount: 0,
      followersCount: 0,
      departmentCount: 0,
      employmentRate: 0,
      higherStudiesRate: 0,
      countriesCount: 0,
      companiesCount: 0,
      website: '',
    }));

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alumni_custom_universities');
        if (raw) {
          const customList: University[] = JSON.parse(raw);
          if (Array.isArray(customList) && customList.length > 0) {
            const map = new Map<string, University>();
            baseline.forEach((b) => map.set(b.id, b));
            customList.forEach((c) => {
              const existing =
                map.get(c.id) ||
                Array.from(map.values()).find((b) => b.name.toLowerCase() === c.name.toLowerCase());
              const finalId =
                c.id ||
                existing?.id ||
                'uni-' + encodeURIComponent(c.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
              map.set(finalId, {
                ...existing,
                ...c,
                id: finalId,
                logoUrl: c.logoUrl || existing?.logoUrl || getUniversityLogo(c.name) || '',
              });
            });
            return Array.from(map.values());
          }
        }
      } catch (e) {}
    }

    return baseline;
  });
  const [departments, setDepartments] = useState<Department[]>(() => {
    return VERIFIED_DEPARTMENT_SEEDS.map((s, idx) => ({
      id: `dept-seed-${idx}-${s.university.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: s.name,
      university: s.university,
      group: s.group,
      faculty: s.group,
      status: 'Active',
      verified: true,
      alumniCount: 0,
      studentCount: 0,
      employmentRate: 0,
      higherStudiesRate: 0,
      countriesCount: 0,
      companiesCount: 0,
      sourceUrl: s.sourceUrl,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
  });

  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [alumni, setAlumni] = useState<AlumniRecord[]>(INITIAL_ALUMNI);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [news, setNews] = useState<NewsArticle[]>(INITIAL_NEWS);
  const [posts, setPosts] = useState<UserPost[]>(INITIAL_POSTS);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [profileClaims, setProfileClaims] = useState<ProfileClaimRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>(() => {
    try {
      const saved = localStorage.getItem('alumnisphere_connections_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>(() => {
    try {
      const saved = localStorage.getItem('alumnisphere_mentorship_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting>(INITIAL_PLATFORM_SETTINGS);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Helper to log audit events
  const logAudit = async (
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    options?: {
      severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
      targetName?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      // Determine automatic severity if not specified
      let computedSeverity: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' = options?.severity || 'INFO';
      if (!options?.severity) {
        if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('SUSPENDED')) {
          computedSeverity = action.includes('DELETED') ? 'DANGER' : 'WARNING';
        } else if (action.includes('APPROVED') || action.includes('VERIFIED')) {
          computedSeverity = 'SUCCESS';
        }
      }

      await addDoc(collection(db, 'auditLogs'), {
        actorId: currentUser?.uid || 'system',
        actorName: userProfile?.name || 'Super Admin',
        actorEmail: currentUser?.email || 'admin@alumnisphere.org',
        actorRole: userProfile?.role || 'SUPER_ADMIN',
        action,
        targetType,
        targetId,
        targetName: options?.targetName || '',
        details,
        severity: computedSeverity,
        metadata: options?.metadata || {},
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not record audit log', e);
    }
  };

  // Super Admin synchronizes verified directory metadata once without overwriting existing data
  useEffect(() => {
    const initializeDatabase = async () => {
      if (!isSuperAdmin) return;
      try {
        const uniSnap = await getDocs(collection(db, 'universities'));
        const existingIds = new Set(uniSnap.docs.map((d) => d.id));
        const existingNames = new Set(
          uniSnap.docs.map((d) => ((d.data() as any).name || '').toLowerCase())
        );

        for (const u of ALL_DIRECTORY_UNIVERSITIES) {
          const id = 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
          // Only create baseline document if it does NOT already exist in Firestore
          if (!existingIds.has(id) && !existingNames.has(u.name.toLowerCase())) {
            const logo = getUniversityLogo(u.name) || '';
            await setDoc(doc(db, 'universities', id), {
              id,
              name: u.name,
              type: u.type,
              location: '',
              verified: false,
              logoUrl: logo,
              alumniCount: 0,
              studentCount: 0,
              departmentCount: 0,
              employmentRate: 0,
              higherStudiesRate: 0,
              countriesCount: 0,
              companiesCount: 0,
              website: '',
              updatedAt: new Date().toISOString(),
            });
          }
        }

        const deptSnap = await getDocs(collection(db, 'departments'));
        for (const seed of VERIFIED_DEPARTMENT_SEEDS) {
          const id = 'dept-' + encodeURIComponent((seed.university + '-' + seed.name).toLowerCase().replace(/[^a-z0-9]/g, '-'));
          if (!deptSnap.docs.some((d) => d.id === id)) {
            await setDoc(doc(db, 'departments', id), {
              id, name: seed.name, university: seed.university, group: seed.group,
              alumniCount: 0, studentCount: 0, employmentRate: 0, higherStudiesRate: 0,
              countriesCount: 0, companiesCount: 0, verified: true, sourceUrl: seed.sourceUrl,
              verifiedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('Directory synchronization note:', err);
      }
    };
    initializeDatabase();
  }, [isSuperAdmin]);

  // Set up real-time listeners for public Firestore collections
  useEffect(() => {
    // Hydrate server custom universities & logos
    fetch('/api/universities/custom')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.logos) {
          for (const [k, v] of Object.entries(data.logos)) {
            setCustomLogo(k, v as string);
          }
        }
        if (Array.isArray(data.customUniversities) && data.customUniversities.length > 0) {
          setUniversities((prev) => {
            const map = new Map<string, University>();
            for (const u of prev) map.set(u.id, u);
            for (const cu of data.customUniversities) {
              const existing =
                map.get(cu.id) ||
                Array.from(map.values()).find(
                  (u) => u.name.toLowerCase() === (cu.name || '').toLowerCase()
                );
              const finalId =
                cu.id ||
                existing?.id ||
                'uni-' + encodeURIComponent((cu.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'));

              const finalLogo = cu.logoUrl || existing?.logoUrl || getUniversityLogo(cu.name) || '';
              if (finalLogo) {
                setCustomLogo(finalId, finalLogo);
                setCustomLogo(cu.name, finalLogo);
              }

              map.set(finalId, {
                ...existing,
                ...cu,
                id: finalId,
                name: cu.name || existing?.name || '',
                shortName: cu.shortName || existing?.shortName || '',
                type: (cu.type || existing?.type || 'Public') as any,
                location: cu.location !== undefined ? cu.location : (existing?.location || ''),
                logoUrl: finalLogo,
                website: cu.website !== undefined ? cu.website : (existing?.website || ''),
                alumniCount: existing?.alumniCount || 0,
                studentCount: existing?.studentCount || 0,
                departmentCount: cu.departments?.length || existing?.departmentCount || 0,
                employmentRate: existing?.employmentRate || 0,
                overview: cu.description || cu.overview || existing?.overview || '',
                status: (cu.status || existing?.status || 'Active') as any,
              });
            }
            return Array.from(map.values());
          });
        }
        if (Array.isArray(data.customDepartments) && data.customDepartments.length > 0) {
          setDepartments((prev) => {
            const map = new Map<string, Department>();
            for (const d of prev) map.set(d.id, d);
            for (const cd of data.customDepartments) {
              map.set(cd.id, {
                id: cd.id,
                name: cd.name,
                university: cd.university,
                group: (cd.group || 'Engineering') as any,
                faculty: cd.faculty || cd.group || 'General',
                status: (cd.status || 'Active') as any,
                logoUrl: cd.logoUrl || '',
                description: cd.description || '',
                verified: true,
                alumniCount: 0,
                studentCount: 0,
                employmentRate: 0,
                higherStudiesRate: 0,
                countriesCount: 0,
                companiesCount: 0,
                createdAt: cd.createdAt || new Date().toISOString(),
                updatedAt: cd.updatedAt || new Date().toISOString(),
              });
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    const unsubUniversities = onSnapshot(
      collection(db, 'universities'),
      (snap) => {
        const dbUnis: University[] = [];
        snap.forEach((d) => {
          const item = d.data() as University;
          const uniId = d.id || item.id;
          const logo = item.logoUrl || getUniversityLogo(item.name) || '';
          if (logo) {
            setCustomLogo(uniId, logo);
            if (item.name) setCustomLogo(item.name, logo);
          }
          dbUnis.push({ ...item, id: uniId, logoUrl: logo });
        });
        if (dbUnis.length > 0) {
          setUniversities((prev) => {
            const map = new Map<string, University>();
            for (const u of prev) map.set(u.id, u);
            for (const du of dbUnis) {
              const prevItem = map.get(du.id);
              map.set(du.id, {
                ...prevItem,
                ...du,
                logoUrl: du.logoUrl || prevItem?.logoUrl || '',
                location: du.location !== undefined && du.location !== '' ? du.location : (prevItem?.location || ''),
                website: du.website !== undefined && du.website !== '' ? du.website : (prevItem?.website || ''),
                overview: du.overview !== undefined && du.overview !== '' ? du.overview : (prevItem?.overview || ''),
              });
            }
            return Array.from(map.values());
          });
        }
      },
      (error) => {
        console.warn('Universities listener warning:', error.message);
      }
    );

    const unsubDepartments = onSnapshot(
      collection(db, 'departments'),
      (snap) => {
        const dbDepts: Department[] = [];
        snap.forEach((d) => {
          const item = d.data() as Department;
          dbDepts.push({
            ...item,
            id: d.id || item.id,
            verified: item.verified ?? true,
            status: item.status || 'Active',
          });
        });
        if (dbDepts.length > 0) {
          setDepartments((prev) => {
            const map = new Map<string, Department>();
            for (const d of prev) map.set(d.id, d);
            for (const dd of dbDepts) {
              map.set(dd.id, { ...map.get(dd.id), ...dd });
            }
            return Array.from(map.values());
          });
        }
      },
      (error) => {
        console.warn('Departments listener warning:', error.message);
      }
    );

    const unsubAlumni = onSnapshot(
      collection(db, 'alumni'),
      (snap) => {
        const map = new Map<string, AlumniRecord>();
        // 1. Baseline directory seeds
        INITIAL_ALUMNI.forEach((a) => map.set(a.id, a));
        // 2. Real-time Firestore records override or add
        snap.forEach((d) => {
          const item = d.data() as AlumniRecord;
          map.set(d.id, { ...item, id: d.id });
        });
        setAlumni(Array.from(map.values()));
      },
      (error) => {
        console.warn('Alumni listener warning:', error.message);
      }
    );

    const unsubBatches = onSnapshot(
      collection(db, 'batches'),
      (snap) => {
        const map = new Map<string, Batch>();
        INITIAL_BATCHES.forEach((b) => map.set(b.id, b));
        snap.forEach((d) => {
          const item = d.data() as Batch;
          map.set(d.id, { ...item, id: d.id });
        });
        setBatches(Array.from(map.values()));
      },
      (error) => {
        console.warn('Batches listener warning:', error.message);
      }
    );

    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snap) => {
        const list: StudentRecord[] = [];
        snap.forEach((d) => {
          const item = d.data() as StudentRecord;
          list.push({ ...item, id: d.id });
        });
        setStudents(list);
      },
      (error) => {
        console.warn('Students listener warning:', error.message);
      }
    );

    const unsubNews = onSnapshot(
      collection(db, 'news'),
      (snap) => {
        const list: NewsArticle[] = [];
        const seenIds = new Set<string>();
        snap.forEach((d) => {
          const item = d.data() as NewsArticle;
          const articleId = d.id || item.id || `news-${Math.random().toString(36).substring(2, 9)}`;
          if (!seenIds.has(articleId)) {
            seenIds.add(articleId);
            list.push({
              ...item,
              id: articleId,
            });
          }
        });
        setNews(list.length > 0 ? list : INITIAL_NEWS);
      },
      (error) => {
        console.warn('News listener warning:', error.message);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'platformSettings', 'global-settings'),
      (snap) => {
        if (snap.exists()) {
          setPlatformSettings(snap.data() as PlatformSetting);
        }
      },
      (error) => {
        console.warn('Settings listener warning:', error.message);
      }
    );

    const unsubPosts = onSnapshot(
      collection(db, 'posts'),
      (snap) => {
        const list: UserPost[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as UserPost), id: d.id }));
        if (list.length > 0) {
          setPosts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      },
      (error) => {
        console.warn('Posts listener note:', error.message);
      }
    );

    // Instant local synchronization listeners across all pages
    const handleProfileUpdateEvent = (e: Event) => {
      const p = (e as CustomEvent<UserProfile>).detail;
      if (!p) return;
      const targetUid = p.uid || p.id;
      const normEmail = (p.email || '').toLowerCase().trim();

      if (p.profileType === 'Alumni') {
        // 1. Add / update in alumni
        setAlumni((prev) => {
          const map = new Map<string, AlumniRecord>();
          prev.forEach((a) => map.set(a.id, a));
          const existing =
            map.get(targetUid) ||
            Array.from(map.values()).find(
              (a) => a.userId === targetUid || (a.email && normEmail && a.email.toLowerCase().trim() === normEmail)
            );
          const id = existing?.id || targetUid;
          map.set(id, {
            ...existing,
            id,
            userId: targetUid,
            name: p.name,
            email: p.email,
            university: p.university || existing?.university || '',
            department: p.department || existing?.department || '',
            batch: p.graduationYear || existing?.batch || '2024',
            graduationYear: p.graduationYear || existing?.graduationYear || '2024',
            studentId: p.studentId || existing?.studentId || '',
            educationLevel: p.educationLevel || existing?.educationLevel || 'Undergraduate',
            jobRole: p.jobRole || existing?.jobRole || '',
            company: p.company || existing?.company || '',
            country: p.country || existing?.country || 'Bangladesh',
            city: p.city || existing?.city || '',
            bio: p.bio || existing?.bio || '',
            photoUrl: p.photoUrl || existing?.photoUrl || '',
            linkedin: p.linkedin || existing?.linkedin || '',
            isVerified: Boolean(p.isVerifiedAlumni),
            status: 'APPROVED',
            createdAt: existing?.createdAt || p.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          return Array.from(map.values());
        });
        // 2. Remove from students if transitioned
        setStudents((prev) =>
          prev.filter(
            (s) =>
              s.id !== targetUid &&
              s.userId !== targetUid &&
              (!s.email || !normEmail || s.email.toLowerCase().trim() !== normEmail)
          )
        );
      } else if (p.profileType === 'Student') {
        // 1. Add / update in students
        setStudents((prev) => {
          const map = new Map<string, StudentRecord>();
          prev.forEach((s) => map.set(s.id, s));
          const existing =
            map.get(targetUid) ||
            Array.from(map.values()).find(
              (s) => s.userId === targetUid || (s.email && normEmail && s.email.toLowerCase().trim() === normEmail)
            );
          const id = existing?.id || targetUid;
          map.set(id, {
            ...existing,
            id,
            userId: targetUid,
            name: p.name,
            email: p.email,
            university: p.university || existing?.university || '',
            department: p.department || existing?.department || '',
            studentId: p.studentId || existing?.studentId || '',
            educationLevel: p.educationLevel || existing?.educationLevel || 'Undergraduate',
            studentYear: p.studentYear || existing?.studentYear || '',
            expectedGraduation: p.expectedGraduation || existing?.expectedGraduation || '',
            bio: p.bio || existing?.bio || '',
            photoUrl: p.photoUrl || existing?.photoUrl || '',
            status: 'APPROVED',
            createdAt: existing?.createdAt || p.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          return Array.from(map.values());
        });
        // 2. Remove from alumni if transitioned
        setAlumni((prev) =>
          prev.filter(
            (a) =>
              a.id !== targetUid &&
              a.userId !== targetUid &&
              (!a.email || !normEmail || a.email.toLowerCase().trim() !== normEmail)
          )
        );
      }

      // 3. Immediately update allUsers state so all admin and directory displays update live
      setAllUsers((prev) => {
        const map = new Map<string, UserProfile>();
        prev.forEach((u) => map.set(u.uid || u.id, u));
        map.set(targetUid, {
          ...(map.get(targetUid) || {}),
          ...p,
          id: targetUid,
          uid: targetUid,
          updatedAt: new Date().toISOString(),
        });
        return Array.from(map.values());
      });

      // 4. Immediately update user's posts
      setPosts((prev) =>
        prev.map((post) =>
          post.userId === targetUid
            ? {
                ...post,
                authorName: p.name || post.authorName,
                authorPhotoUrl: p.photoUrl !== undefined ? p.photoUrl : post.authorPhotoUrl,
                authorUniversity: p.university || post.authorUniversity,
                authorDepartment: p.department || post.authorDepartment,
              }
            : post
        )
      );

      // 5. Ensure university is present in universities state
      if (p.university) {
        const uniName = p.university;
        setUniversities((prev) => {
          const map = new Map<string, University>();
          prev.forEach((u) => map.set(u.name.toLowerCase().trim(), u));
          const key = uniName.toLowerCase().trim();
          if (!map.has(key)) {
            const newUni: University = {
              id: 'uni-' + encodeURIComponent(key.replace(/[^a-z0-9]/g, '-')),
              name: uniName,
              type: 'Public',
              location: p.country ? `${p.city ? p.city + ', ' : ''}${p.country}` : 'Bangladesh',
              verified: false,
              alumniCount: p.profileType === 'Alumni' ? 1 : 0,
              studentCount: p.profileType === 'Student' ? 1 : 0,
              departmentCount: 1,
              followersCount: 1,
              employmentRate: 85,
              higherStudiesRate: 10,
              countriesCount: 1,
              companiesCount: p.company ? 1 : 0,
              logoUrl: getUniversityLogo(uniName) || '',
              website: '',
            };
            return [...prev, newUni];
          }
          return prev;
        });
      }
    };

    const handleUniUpdateEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; oldUniversity?: string }>).detail;
      if (!detail?.name) return;
      const key = detail.name.toLowerCase().trim();
      setUniversities((prev) => {
        if (!prev.some((u) => u.name.toLowerCase().trim() === key)) {
          const newUni: University = {
            id: 'uni-' + encodeURIComponent(key.replace(/[^a-z0-9]/g, '-')),
            name: detail.name,
            type: 'Public',
            location: 'Bangladesh',
            verified: false,
            alumniCount: 0,
            studentCount: 0,
            departmentCount: 1,
            followersCount: 1,
            employmentRate: 85,
            higherStudiesRate: 10,
            countriesCount: 1,
            companiesCount: 0,
            logoUrl: getUniversityLogo(detail.name) || '',
            website: '',
          };
          return [...prev, newUni];
        }
        return prev;
      });
    };

    window.addEventListener('alumni-profile-updated', handleProfileUpdateEvent);
    window.addEventListener('alumni-directory-updated', handleProfileUpdateEvent);
    window.addEventListener('university-updated', handleUniUpdateEvent);

    return () => {
      window.removeEventListener('alumni-profile-updated', handleProfileUpdateEvent);
      window.removeEventListener('alumni-directory-updated', handleProfileUpdateEvent);
      window.removeEventListener('university-updated', handleUniUpdateEvent);
      unsubUniversities();
      unsubDepartments();
      unsubAlumni();
      unsubBatches();
      unsubStudents();
      unsubNews();
      unsubSettings();
      unsubPosts();
    };
  }, []);

  // Set up listeners for authenticated and admin collections ONLY when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setChangeRequests([]);
      setVerificationRequests([]);
      setProfileClaims([]);
      setNotifications([]);
      setAuditLogs([]);
      setAdminAssignments([]);
      setRawUsers([]);
      setLoadingData(false);
      return;
    }

    const changeRequestsQuery = isSuperAdmin
      ? collection(db, 'changeRequests')
      : query(collection(db, 'changeRequests'), where('requesterId', '==', currentUser.uid));
    const unsubChangeRequests = onSnapshot(
      changeRequestsQuery,
      (snap) => {
        const list: ChangeRequest[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as ChangeRequest), id: d.id }));
        setChangeRequests(list);
      },
      (error) => {
        console.warn('ChangeRequests listener note:', error.message);
      }
    );

    const verificationRequestsQuery = isSuperAdmin
      ? collection(db, 'verificationRequests')
      : query(collection(db, 'verificationRequests'), where('userId', '==', currentUser.uid));
    const unsubVerificationRequests = onSnapshot(
      verificationRequestsQuery,
      (snap) => {
        const list: VerificationRequest[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as VerificationRequest), id: d.id }));
        setVerificationRequests(list);
      },
      (error) => {
        console.warn('VerificationRequests listener note:', error.message);
      }
    );

    const claimsQuery = isSuperAdmin
      ? collection(db, 'profileClaims')
      : query(collection(db, 'profileClaims'), where('requesterId', '==', currentUser.uid));
    const unsubProfileClaims = onSnapshot(
      claimsQuery,
      (snap) => {
        const list: ProfileClaimRequest[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as ProfileClaimRequest), id: d.id }));
        setProfileClaims(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      },
      (error) => {
        console.warn('Profile claims listener note:', error.message);
      }
    );

    const notificationsQuery = isSuperAdmin
      ? collection(db, 'notifications')
      : query(collection(db, 'notifications'), where('recipientId', '==', currentUser.uid));
    const unsubNotifications = onSnapshot(
      notificationsQuery,
      (snap) => {
        const list: AppNotification[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AppNotification));
        setNotifications(list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
      },
      (error) => {
        console.warn('Notifications listener note:', error.message);
      }
    );

    const unsubAuditLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snap) => {
        const list: AuditLog[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AuditLog));
        setAuditLogs(list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
      },
      (error) => {
        console.warn('AuditLogs listener note:', error.message);
      }
    );

    const adminAssignmentsQuery = isSuperAdmin
      ? collection(db, 'adminAssignments')
      : query(collection(db, 'adminAssignments'), where('userId', '==', currentUser.uid));
    const unsubAdminAssignments = onSnapshot(
      adminAssignmentsQuery,
      (snap) => {
        const list: AdminAssignment[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AdminAssignment));
        setAdminAssignments(list);
      },
      (error) => {
        console.warn('AdminAssignments listener note:', error.message);
      }
    );

    const usersQuery = isSuperAdmin
      ? collection(db, 'users')
      : query(collection(db, 'users'), where('uid', '==', currentUser.uid));
    const unsubUsers = onSnapshot(
      usersQuery,
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          list.push({ ...u, uid: d.id, id: u.id || d.id });
        });

        // Sort so newly added members appear first!
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRawUsers(list);
        setLoadingData(false);
      },
      (error) => {
        console.warn('Users listener note:', error.message);
        setLoadingData(false);
      }
    );

    // -------------------------------------------------------------
    // Real Connection Requests Listeners
    // -------------------------------------------------------------
    let unsubConnSender = () => {};
    let unsubConnRecipient = () => {};
    let unsubConnAll = () => {};

    if (isSuperAdmin) {
      unsubConnAll = onSnapshot(
        collection(db, 'connectionRequests'),
        (snap) => {
          const list: ConnectionRequest[] = [];
          snap.forEach((d) => list.push({ ...d.data(), id: d.id } as ConnectionRequest));
          setConnectionRequests(list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
        },
        (err) => console.warn('Connection requests all listener note:', err.message)
      );
    } else {
      const senderMap = new Map<string, ConnectionRequest>();
      const recipientMap = new Map<string, ConnectionRequest>();

      const syncMerged = () => {
        const merged = new Map<string, ConnectionRequest>();
        senderMap.forEach((v, k) => merged.set(k, v));
        recipientMap.forEach((v, k) => merged.set(k, v));
        const list = Array.from(merged.values()).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        setConnectionRequests(list);
        try {
          localStorage.setItem('alumnisphere_connections_cache', JSON.stringify(list));
        } catch {}
      };

      unsubConnSender = onSnapshot(
        query(collection(db, 'connectionRequests'), where('senderId', '==', currentUser.uid)),
        (snap) => {
          senderMap.clear();
          snap.forEach((d) => senderMap.set(d.id, { ...d.data(), id: d.id } as ConnectionRequest));
          syncMerged();
        },
        (err) => console.warn('Conn sender listener note:', err.message)
      );

      unsubConnRecipient = onSnapshot(
        query(collection(db, 'connectionRequests'), where('recipientId', '==', currentUser.uid)),
        (snap) => {
          recipientMap.clear();
          snap.forEach((d) => recipientMap.set(d.id, { ...d.data(), id: d.id } as ConnectionRequest));
          syncMerged();
        },
        (err) => console.warn('Conn recipient listener note:', err.message)
      );
    }

    // -------------------------------------------------------------
    // Real Mentorship Requests Listeners
    // -------------------------------------------------------------
    let unsubMentorStudent = () => {};
    let unsubMentorTarget = () => {};
    let unsubMentorAll = () => {};

    if (isSuperAdmin) {
      unsubMentorAll = onSnapshot(
        collection(db, 'mentorshipRequests'),
        (snap) => {
          const list: MentorshipRequest[] = [];
          snap.forEach((d) => list.push({ ...d.data(), id: d.id } as MentorshipRequest));
          setMentorshipRequests(list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
        },
        (err) => console.warn('Mentorship requests all listener note:', err.message)
      );
    } else {
      const studentMap = new Map<string, MentorshipRequest>();
      const mentorMap = new Map<string, MentorshipRequest>();

      const syncMentorMerged = () => {
        const merged = new Map<string, MentorshipRequest>();
        studentMap.forEach((v, k) => merged.set(k, v));
        mentorMap.forEach((v, k) => merged.set(k, v));
        const list = Array.from(merged.values()).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        setMentorshipRequests(list);
        try {
          localStorage.setItem('alumnisphere_mentorship_cache', JSON.stringify(list));
        } catch {}
      };

      unsubMentorStudent = onSnapshot(
        query(collection(db, 'mentorshipRequests'), where('studentId', '==', currentUser.uid)),
        (snap) => {
          studentMap.clear();
          snap.forEach((d) => studentMap.set(d.id, { ...d.data(), id: d.id } as MentorshipRequest));
          syncMentorMerged();
        },
        (err) => console.warn('Mentor student listener note:', err.message)
      );

      unsubMentorTarget = onSnapshot(
        query(collection(db, 'mentorshipRequests'), where('mentorId', '==', currentUser.uid)),
        (snap) => {
          mentorMap.clear();
          snap.forEach((d) => mentorMap.set(d.id, { ...d.data(), id: d.id } as MentorshipRequest));
          syncMentorMerged();
        },
        (err) => console.warn('Mentor target listener note:', err.message)
      );
    }

    return () => {
      unsubChangeRequests();
      unsubVerificationRequests();
      unsubProfileClaims();
      unsubNotifications();
      unsubAuditLogs();
      unsubAdminAssignments();
      unsubUsers();
      unsubConnSender();
      unsubConnRecipient();
      unsubConnAll();
      unsubMentorStudent();
      unsubMentorTarget();
      unsubMentorAll();
    };
  }, [currentUser, isSuperAdmin]);

  // Interconnected member unification: ensure all students and alumni are always visible in all admin panels
  // and have APPROVED status with zero admin review required.
  useEffect(() => {
    const userMap = new Map<string, UserProfile>();

    // 1. Database users from users collection
    rawUsers.forEach((u) => {
      const isStudentOrAlumni = u.profileType === 'Student' || u.profileType === 'Alumni' || u.role === 'STUDENT' || u.role === 'ALUMNI';
      userMap.set(u.uid || u.id, {
        ...u,
        status: isStudentOrAlumni ? 'APPROVED' : u.status,
      });
    });

    // 2. All campus alumni records (approved by default)
    alumni.forEach((a) => {
      const key = a.userId || a.id;
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: a.id,
          uid: key,
          name: a.name,
          email: a.email || `${a.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@alumni.ac.bd`,
          role: 'ALUMNI',
          status: 'APPROVED',
          profileType: 'Alumni',
          university: a.university,
          department: a.department,
          studentId: a.studentId || '',
          graduationYear: a.graduationYear || a.batch || '',
          jobRole: a.jobRole || '',
          company: a.company || '',
          country: a.country || 'Bangladesh',
          city: a.city || '',
          bio: a.bio || '',
          photoUrl: a.photoUrl || '',
          linkedin: a.linkedin || '',
          isVerifiedAlumni: a.isVerified || false,
          createdAt: a.createdAt || new Date().toISOString(),
          updatedAt: a.updatedAt || new Date().toISOString(),
        });
      }
    });

    // 3. All registered campus students (approved by default)
    students.forEach((s) => {
      const key = s.userId || s.id;
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: s.id,
          uid: key,
          name: s.name,
          email: s.email || `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@campus.ac.bd`,
          role: 'STUDENT',
          status: 'APPROVED',
          profileType: 'Student',
          university: s.university,
          department: s.department,
          studentId: s.studentId || '',
          studentYear: s.studentYear || 'Current Student',
          educationLevel: s.educationLevel || 'Undergraduate',
          expectedGraduation: s.expectedGraduation || '',
          bio: s.bio || '',
          photoUrl: s.photoUrl || '',
          isVerifiedAlumni: false,
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString(),
        });
      }
    });

    const unified = Array.from(userMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    setAllUsers(unified);
  }, [rawUsers, alumni, students]);

  // Dynamic synchronization of university statistics across all pages:
  useEffect(() => {
    setUniversities((prev) => {
      let changed = false;
      const next = prev.map((u) => {
        const uName = (u.name || '').toLowerCase().trim();
        const liveAlumni = alumni.filter(
          (a) => (!a.status || a.status.toUpperCase() === 'APPROVED') && (a.university || '').toLowerCase().trim() === uName
        ).length;
        const liveStudents = students.filter(
          (s) => (!s.status || s.status.toUpperCase() === 'APPROVED') && (s.university || '').toLowerCase().trim() === uName
        ).length;
        const matchingDepts = new Set(
          departments.filter((d) => (d.university || '').toLowerCase().trim() === uName && d.status !== 'Inactive').map((d) => d.name)
        );
        alumni.forEach((a) => {
          if ((a.university || '').toLowerCase().trim() === uName && a.department) matchingDepts.add(a.department);
        });
        students.forEach((s) => {
          if ((s.university || '').toLowerCase().trim() === uName && s.department) matchingDepts.add(s.department);
        });

        const matchingAlumni = alumni.filter(
          (a) => (!a.status || a.status.toUpperCase() === 'APPROVED') && (a.university || '').toLowerCase().trim() === uName
        );
        const liveCountries = new Set(matchingAlumni.map((a) => a.country).filter(Boolean)).size;
        const liveCompanies = new Set(matchingAlumni.map((a) => a.company).filter(Boolean)).size;

        if (
          u.alumniCount !== liveAlumni ||
          u.studentCount !== liveStudents ||
          u.departmentCount !== matchingDepts.size ||
          u.countriesCount !== liveCountries ||
          u.companiesCount !== liveCompanies
        ) {
          changed = true;
          return {
            ...u,
            alumniCount: liveAlumni,
            studentCount: liveStudents,
            departmentCount: matchingDepts.size || u.departmentCount || 1,
            countriesCount: liveCountries || u.countriesCount || 0,
            companiesCount: liveCompanies || u.companiesCount || 0,
          };
        }
        return u;
      });
      return changed ? next : prev;
    });
  }, [alumni, students, departments]);

  // Interconnected dynamic statistics
  const stats = useMemo(() => {
    // Exclude legacy records linked to current Student profiles from alumni totals.
    const approvedAlumni = alumni.filter((a) => {
      if (a.status && a.status !== 'APPROVED') return false;
      const linkedUserId = a.userId || a.id;
      const linkedProfile = allUsers.find((user) => user.uid === linkedUserId || user.id === linkedUserId);
      return linkedProfile?.profileType !== 'Student';
    });
    // Calculate total base alumni across universities + individual dynamic approved alumni additions
    const totalAlumni = approvedAlumni.length;

    const approvedStudents = students.filter((s) => !s.status || s.status === 'APPROVED');
    const totalStudents = approvedStudents.length;

    const countries = new Set<string>();
    const companies = new Set<string>();

    approvedAlumni.forEach((a) => {
      if (a.country) countries.add(a.country);
      if (a.company) companies.add(a.company);
    });

    // Students and alumni join directly without review. Only pending administrative changes require review.
    const pendingApprovals = allUsers.filter((u) => u.status === 'PENDING' && u.profileType !== 'Student' && u.profileType !== 'Alumni').length + changeRequests.filter((c) => c.status === 'PENDING').length;
    const pendingNews = news.filter((n) => n.status === 'PENDING_APPROVAL').length;
    const pendingVerifications = verificationRequests.filter((v) => v.status === 'PENDING').length;

    return {
      totalAlumni,
      totalStudents,
      totalUniversities: universities.length,
      totalDepartments: departments.length,
      totalCountries: countries.size,
      totalCompanies: companies.size,
      pendingApprovalsCount: pendingApprovals,
      pendingNewsCount: pendingNews,
      pendingVerificationsCount: pendingVerifications,
    };
  }, [universities, departments, alumni, students, allUsers, changeRequests, news, verificationRequests]);

  // Action: Approve User
  const approveUser = async (userId: string, targetRole?: Role) => {
    const existingUser = allUsers.find((u) => u.uid === userId);
    // A Student profile must never be promoted into the alumni directory by an
    // approval dropdown or a stale role value. Profile type is the source of truth.
    const newRole = existingUser?.profileType === 'Student'
      ? 'STUDENT'
      : targetRole || existingUser?.role || (existingUser?.profileType === 'Alumni' ? 'ALUMNI' : 'STUDENT');

    // 1. Instant optimistic update so UI is lightning fast
    setAllUsers((prev) =>
      prev.map((u) =>
        u.uid === userId
          ? { ...u, status: 'APPROVED', role: newRole, updatedAt: new Date().toISOString() }
          : u
      )
    );

    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        status: 'APPROVED',
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore updateDoc user note:', err);
    }

    // If alumni, also approve in alumni collection and update university count dynamically
    if (existingUser?.profileType === 'Alumni') {
      const alumniDocRef = doc(db, 'alumni', userId);
      try {
        await updateDoc(alumniDocRef, {
          status: 'APPROVED',
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Create if didn't exist with user's genuine university and department
        await setDoc(alumniDocRef, {
          id: userId,
          userId,
          name: existingUser?.name || 'Alumni Member',
          email: existingUser?.email || '',
          university: existingUser?.university || '',
          department: existingUser?.department || '',
          batch: existingUser?.graduationYear || '2023',
          graduationYear: existingUser?.graduationYear || '2023',
          jobRole: existingUser?.jobRole || '',
          company: existingUser?.company || '',
          country: existingUser?.country || 'Bangladesh',
          city: existingUser?.city || '',
          bio: existingUser?.bio || '',
          linkedin: existingUser?.linkedin || '',
          isVerified: false,
          status: 'APPROVED',
          createdAt: existingUser?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }

      // Interconnection: Increment university alumni count
      if (existingUser?.university) {
        const uni = universities.find((u) => u.name === existingUser.university);
        if (uni) {
          await updateDoc(doc(db, 'universities', uni.id), {
            alumniCount: (uni.alumniCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }
    } else {
      const studentDocRef = doc(db, 'students', userId);
      try {
        await updateDoc(studentDocRef, {
          status: 'APPROVED',
          updatedAt: new Date().toISOString(),
        });
      } catch {
        await setDoc(studentDocRef, {
          id: userId,
          userId,
          name: existingUser?.name || 'Student Member',
          email: existingUser?.email || '',
          university: existingUser?.university || '',
          department: existingUser?.department || '',
          studentId: existingUser?.studentId || '',
          educationLevel: existingUser?.educationLevel || 'Undergraduate',
          studentYear: existingUser?.studentYear || '',
          expectedGraduation: existingUser?.expectedGraduation || '',
          bio: existingUser?.bio || '',
          status: 'APPROVED',
          createdAt: existingUser?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    // Notify user
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: userId,
        title: 'Account Approved! 🎉',
        message: `Your AlumniSphere account has been verified and approved as ${newRole}. You now have full member access.`,
        type: 'ACCOUNT',
        read: false,
        actionUrl: '/account',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}

    await logAudit('USER_APPROVED', 'USER', userId, `User ${existingUser?.name} approved as ${newRole}`);
  };

  // Action: Reject User
  const rejectUser = async (userId: string, reason?: string) => {
    // 1. Instant optimistic update
    setAllUsers((prev) =>
      prev.map((u) =>
        u.uid === userId
          ? { ...u, status: 'REJECTED', updatedAt: new Date().toISOString() }
          : u
      )
    );

    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        status: 'REJECTED',
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'alumni', userId), { status: 'REJECTED' }).catch(() => {});
      await updateDoc(doc(db, 'students', userId), { status: 'REJECTED' }).catch(() => {});
    } catch (err) {
      console.warn('Firestore rejectUser note:', err);
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: userId,
        title: 'Account Registration Status',
        message: `Your account could not be verified at this time.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'ACCOUNT',
        read: false,
        actionUrl: '/account',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}

    await logAudit('USER_REJECTED', 'USER', userId, `User rejected: ${reason || 'No reason provided'}`);
  };

  // Action: Unapprove User (Revert to PENDING)
  const unapproveUser = async (userId: string, reason?: string) => {
    // 1. Instant optimistic update
    setAllUsers((prev) =>
      prev.map((u) =>
        u.uid === userId
          ? { ...u, status: 'PENDING', updatedAt: new Date().toISOString() }
          : u
      )
    );

    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'alumni', userId), { status: 'PENDING' }).catch(() => {});
      await updateDoc(doc(db, 'students', userId), { status: 'PENDING' }).catch(() => {});
    } catch (err) {
      console.warn('Firestore unapproveUser note:', err);
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: userId,
        title: 'Account Approval Status Updated',
        message: `Your account verification has been placed back in review (Pending).${reason ? ` Note: ${reason}` : ''}`,
        type: 'ACCOUNT',
        read: false,
        actionUrl: '/account',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}

    await logAudit('USER_UNAPPROVED', 'USER', userId, `User status reverted to PENDING: ${reason || 'Revoked by admin'}`);
  };

  // Action: Suspend User
  const suspendUser = async (userId: string) => {
    setAllUsers((prev) =>
      prev.map((u) =>
        u.uid === userId
          ? { ...u, status: 'SUSPENDED', updatedAt: new Date().toISOString() }
          : u
      )
    );
    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        status: 'SUSPENDED',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore suspendUser note:', err);
    }
    await logAudit('USER_SUSPENDED', 'USER', userId, `User account suspended`);
  };

  // Action: Change User Role
  const changeUserRole = async (userId: string, newRole: Role) => {
    setAllUsers((prev) =>
      prev.map((u) =>
        u.uid === userId
          ? { ...u, role: newRole, updatedAt: new Date().toISOString() }
          : u
      )
    );
    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore changeUserRole note:', err);
    }
    await logAudit('ROLE_UPDATED', 'USER', userId, `Role changed to ${newRole}`);
  };

  // Action: Verify Alumni
  const verifyAlumni = async (alumniId: string, isVerified: boolean) => {
    const record = alumni.find((item) => item.id === alumniId || item.userId === alumniId);
    const alumniDocId = record?.id || alumniId;
    const ownerUid = record?.userId || (record ? record.id : alumniId);
    const now = new Date().toISOString();
    const alumniDocRef = doc(db, 'alumni', alumniDocId);
    await updateDoc(alumniDocRef, {
      isVerified,
      updatedAt: now,
    });

    // Claimed legacy records may have a document ID different from the owner's UID.
    const userDocRef = doc(db, 'users', ownerUid);
    await updateDoc(userDocRef, {
      isVerifiedAlumni: isVerified,
      updatedAt: now,
    }).catch(() => {});

    await addDoc(collection(db, 'notifications'), {
      recipientId: ownerUid,
      title: isVerified ? 'Alumni Verified! ✓' : 'Verification Revoked',
      message: isVerified
        ? 'Congratulations! Your alumni credentials have been verified. The Verified badge is now visible on your public profile.'
        : 'Your alumni verification badge has been removed.',
      type: 'VERIFICATION',
      read: false,
      actionUrl: '/account',
      createdAt: new Date().toISOString(),
    });

    await logAudit(isVerified ? 'ALUMNI_VERIFIED' : 'ALUMNI_UNVERIFIED', 'ALUMNI', alumniId, `Verification state set to ${isVerified}`);
  };

  const submitProfileClaim = async (
    claim: Omit<ProfileClaimRequest, 'id' | 'requesterId' | 'requesterName' | 'requesterEmail' | 'status' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser || !userProfile) throw new Error('Sign in before requesting a profile claim.');
    if (!claim.proofUrl || !/^https:\/\//i.test(claim.proofUrl)) {
      throw new Error('Provide an HTTPS evidence link before submitting a claim.');
    }
    const target = alumni.find((item) => item.id === claim.targetAlumniId);
    if (!target) throw new Error('The selected alumni record is no longer available.');
    if (target.userId && target.userId !== currentUser.uid) {
      throw new Error('This alumni record is already linked to another account.');
    }
    if (target.userId === currentUser.uid) throw new Error('This alumni record is already linked to your account.');
    const duplicate = profileClaims.some((item) =>
      item.requesterId === currentUser.uid &&
      item.targetAlumniId === claim.targetAlumniId &&
      item.status === 'PENDING'
    );
    if (duplicate) throw new Error('You already have a pending claim for this record.');
    const now = new Date().toISOString();
    await addDoc(collection(db, 'profileClaims'), {
      ...claim,
      requesterId: currentUser.uid,
      requesterName: userProfile.name,
      requesterEmail: currentUser.email || userProfile.email,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
    await logAudit('PROFILE_CLAIM_SUBMITTED', 'ALUMNI', claim.targetAlumniId, 'Submitted an alumni profile claim for review.');
  };

  const approveProfileClaim = async (id: string, comment?: string) => {
    if (!isSuperAdmin) throw new Error('Only a trusted Super Admin can approve profile claims.');
    const claim = profileClaims.find((item) => item.id === id);
    if (!claim || claim.status !== 'PENDING') throw new Error('Pending profile claim not found.');
    const target = alumni.find((item) => item.id === claim.targetAlumniId);
    if (!target) throw new Error('The target alumni record no longer exists.');
    if (target.userId && target.userId !== claim.requesterId) {
      throw new Error('The target record has already been claimed by another account.');
    }
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'alumni', claim.targetAlumniId), {
      userId: claim.requesterId,
      updatedAt: now,
    });
    await updateDoc(doc(db, 'users', claim.requesterId), {
      profileType: 'Alumni',
      role: 'ALUMNI',
      status: 'APPROVED',
      name: target.name,
      university: target.university,
      department: target.department,
      studentId: target.studentId || '',
      educationLevel: target.educationLevel || '',
      graduationYear: target.graduationYear || target.batch || '',
      jobRole: target.jobRole || '',
      company: target.company || '',
      country: target.country || '',
      city: target.city || '',
      bio: target.bio || '',
      photoUrl: target.photoUrl || '',
      linkedin: target.linkedin || '',
      isVerifiedAlumni: target.isVerified === true,
      updatedAt: now,
    });
    await updateDoc(doc(db, 'profileClaims', id), {
      status: 'APPROVED',
      reviewedBy: userProfile?.name || currentUser?.email || 'Super Admin',
      reviewerComment: comment || 'Profile ownership confirmed.',
      updatedAt: now,
    });
    await addDoc(collection(db, 'notifications'), {
      recipientId: claim.requesterId,
      title: 'Alumni profile claim approved',
      message: 'Your claim has been approved and your account is now linked to the alumni record.',
      type: 'PROFILE_CLAIM',
      read: false,
      actionUrl: '/account',
      createdAt: now,
    });
    await logAudit('PROFILE_CLAIM_APPROVED', 'ALUMNI', claim.targetAlumniId, 'Approved profile claim for ' + claim.requesterEmail);
  };

  const rejectProfileClaim = async (id: string, comment?: string) => {
    if (!isSuperAdmin) throw new Error('Only a trusted Super Admin can reject profile claims.');
    const claim = profileClaims.find((item) => item.id === id);
    if (!claim || claim.status !== 'PENDING') throw new Error('Pending profile claim not found.');
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'profileClaims', id), {
      status: 'REJECTED',
      reviewedBy: userProfile?.name || currentUser?.email || 'Super Admin',
      reviewerComment: comment || 'The provided evidence was insufficient to confirm ownership.',
      updatedAt: now,
    });
    await addDoc(collection(db, 'notifications'), {
      recipientId: claim.requesterId,
      title: 'Alumni profile claim not approved',
      message: comment || 'Your claim could not be approved. Please check your details and contact support if needed.',
      type: 'PROFILE_CLAIM',
      read: false,
      actionUrl: '/account',
      createdAt: now,
    });
    await logAudit('PROFILE_CLAIM_REJECTED', 'ALUMNI', claim.targetAlumniId, 'Rejected profile claim for ' + claim.requesterEmail);
  };

  // Action: Submit Verification Request
  const submitVerificationRequest = async (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newReq = {
      ...req,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const res = await addDoc(collection(db, 'verificationRequests'), newReq);

    // Notify admins
    await addDoc(collection(db, 'notifications'), {
      recipientId: 'ADMIN',
      recipientRole: 'SUPER_ADMIN',
      title: 'New Alumni Verification Request',
      message: `${req.userName} has submitted verification details for ${req.university} (${req.department}).`,
      type: 'VERIFICATION',
      read: false,
      actionUrl: '/admin',
      createdAt: new Date().toISOString(),
    });

    await logAudit('VERIFICATION_REQUESTED', 'VERIFICATION_REQUEST', res.id, `Submitted by ${req.userName}`);
  };

  const approveVerificationRequest = async (id: string, comment?: string) => {
    const req = verificationRequests.find((v) => v.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'verificationRequests', id), {
      status: 'APPROVED',
      reviewedBy: userProfile?.name || 'Super Admin',
      reviewerComment: comment || 'Verified against institutional records',
      updatedAt: new Date().toISOString(),
    });

    await verifyAlumni(req.userId, true);
    await logAudit('VERIFICATION_REQUEST_APPROVED', 'VERIFICATION_REQUEST', id, `Approved for ${req.userName}`);
  };

  const rejectVerificationRequest = async (id: string, comment?: string) => {
    const req = verificationRequests.find((v) => v.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'verificationRequests', id), {
      status: 'REJECTED',
      reviewedBy: userProfile?.name || 'Super Admin',
      reviewerComment: comment || 'Insufficient documentation provided',
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'notifications'), {
      recipientId: req.userId,
      title: 'Verification Request Update',
      message: `Your verification request was not approved.${comment ? ` Note: ${comment}` : ''}`,
      type: 'VERIFICATION',
      read: false,
      actionUrl: '/account',
      createdAt: new Date().toISOString(),
    });

    await logAudit('VERIFICATION_REQUEST_REJECTED', 'VERIFICATION_REQUEST', id, `Rejected: ${comment}`);
  };

  // Action: Submit Change Request
  const submitChangeRequest = async (req: Omit<ChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newReq = {
      ...req,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const res = await addDoc(collection(db, 'changeRequests'), newReq);

    await addDoc(collection(db, 'notifications'), {
      recipientId: 'ADMIN',
      recipientRole: 'SUPER_ADMIN',
      title: `Change Request: ${req.targetTitle}`,
      message: `${req.requesterName} submitted changes for ${req.targetType} (${req.university || ''}).`,
      type: 'CHANGE_REQUEST',
      read: false,
      actionUrl: '/admin',
      createdAt: new Date().toISOString(),
    });

    await logAudit('CHANGE_REQUEST_SUBMITTED', 'CHANGE_REQUEST', res.id, `${req.targetType} change by ${req.requesterName}`);
  };

  const approveChangeRequest = async (id: string, comment?: string) => {
    const req = changeRequests.find((c) => c.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'changeRequests', id), {
      status: 'APPROVED',
      reviewedBy: userProfile?.name || 'Super Admin',
      reviewerComment: comment || 'Changes approved for public platform',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Apply the changes to the target
    try {
      if (req.targetType === 'UNIVERSITY' && req.targetId) {
        const parsed = JSON.parse(req.newValue);
        await updateDoc(doc(db, 'universities', req.targetId), {
          ...parsed,
          updatedAt: new Date().toISOString(),
        });
      } else if (req.targetType === 'DEPARTMENT' && req.targetId) {
        const parsed = JSON.parse(req.newValue);
        await updateDoc(doc(db, 'departments', req.targetId), {
          ...parsed,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Could not automatically apply parsed change request fields', err);
    }

    await addDoc(collection(db, 'notifications'), {
      recipientId: req.requesterId,
      title: 'Change Request Approved ✓',
      message: `Your changes for "${req.targetTitle}" have been approved and published.`,
      type: 'CHANGE_REQUEST',
      read: false,
      actionUrl: '/account',
      createdAt: new Date().toISOString(),
    });

    await logAudit('CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST', id, `Approved: ${req.targetTitle}`);
  };

  const rejectChangeRequest = async (id: string, comment?: string) => {
    const req = changeRequests.find((c) => c.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'changeRequests', id), {
      status: 'REJECTED',
      reviewedBy: userProfile?.name || 'Super Admin',
      reviewerComment: comment || 'Changes did not meet platform guidelines',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'notifications'), {
      recipientId: req.requesterId,
      title: 'Change Request Rejected',
      message: `Your proposed changes for "${req.targetTitle}" were declined.${comment ? ` Reviewer note: ${comment}` : ''}`,
      type: 'CHANGE_REQUEST',
      read: false,
      actionUrl: '/account',
      createdAt: new Date().toISOString(),
    });

    await logAudit('CHANGE_REQUEST_REJECTED', 'CHANGE_REQUEST', id, `Rejected: ${req.targetTitle}`);
  };

  // Live News Actions
  const createNewsArticle = async (article: Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docId = `news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newArt = {
      ...article,
      id: docId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: article.status === 'PUBLISHED' ? new Date().toISOString() : undefined,
    };
    const res = await addDoc(collection(db, 'news'), newArt);

    if (article.status === 'PENDING_APPROVAL') {
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'ADMIN',
        recipientRole: 'SUPER_ADMIN',
        title: 'News Article Submitted for Approval',
        message: `"${article.title}" by ${article.authorName} is waiting for review.`,
        type: 'NEWS',
        read: false,
        actionUrl: '/admin',
        createdAt: new Date().toISOString(),
      });
    }

    await logAudit('NEWS_CREATED', 'NEWS', res.id, `Article: ${article.title}`);
  };

  const updateNewsArticle = async (id: string, updates: Partial<NewsArticle>) => {
    const artDoc = doc(db, 'news', id);
    await updateDoc(artDoc, {
      ...updates,
      updatedAt: new Date().toISOString(),
      ...(updates.status === 'PUBLISHED' && !updates.publishedAt ? { publishedAt: new Date().toISOString() } : {}),
    });
    await logAudit('NEWS_UPDATED', 'NEWS', id, `Updated article ${id}`);
  };

  const deleteNewsArticle = async (id: string, reason?: string) => {
    const targetArticle = news.find((n) => n.id === id);
    await deleteDoc(doc(db, 'news', id));
    await logAudit(
      'DATA_DELETED',
      'NEWS',
      id,
      `Permanently deleted publication: "${targetArticle?.title || id}". ${reason ? `Reason: ${reason}` : ''}`,
      {
        severity: 'DANGER',
        targetName: targetArticle?.title || id,
        metadata: { category: targetArticle?.category, authorName: targetArticle?.authorName, reason }
      }
    );
  };

  // AI News Bot & Multi-Admin Permanence Lifecycle
  const [botStatus, setBotStatus] = useState({
    active: true,
    lastScanAt: new Date().toISOString(),
    nextRotationAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    cycleCount: 1,
    totalGenerated: 0,
  });

  useEffect(() => {
    fetch('/api/ai-news-bot/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.active !== undefined) {
          setBotStatus({
            active: data.active,
            lastScanAt: data.lastScanAt || new Date().toISOString(),
            nextRotationAt: data.nextRotationAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            cycleCount: data.cycleCount || 1,
            totalGenerated: data.totalGenerated || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const makeNewsPermanent = async (
    id: string,
    actor?: { uid: string; name: string; role: Role }
  ) => {
    const artDoc = doc(db, 'news', id);
    const targetArticle = news.find((n) => n.id === id);
    const adminUser = actor || {
      uid: currentUser?.uid || 'admin',
      name: userProfile?.name || 'Authorized Admin',
      role: (userProfile?.role as Role) || 'SUPER_ADMIN',
    };

    await updateDoc(artDoc, {
      isPermanent: true,
      expiresAt: null as any,
      permanentBy: {
        userId: adminUser.uid,
        userName: adminUser.name,
        role: adminUser.role,
        at: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    await logAudit(
      'NEWS_MADE_PERMANENT',
      'NEWS',
      id,
      `Article "${targetArticle?.title || id}" designated as PERMANENT by ${adminUser.role} ${adminUser.name}. 10-day expiration timer cancelled.`,
      {
        severity: 'SUCCESS',
        targetName: targetArticle?.title || id,
        metadata: {
          adminRole: adminUser.role,
          university: targetArticle?.university,
          department: targetArticle?.department,
        },
      }
    );
  };

  const removeNewsPermanent = async (id: string) => {
    const artDoc = doc(db, 'news', id);
    const targetArticle = news.find((n) => n.id === id);
    const tenDaysLater = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    await updateDoc(artDoc, {
      isPermanent: false,
      expiresAt: tenDaysLater,
      permanentBy: null as any,
      updatedAt: new Date().toISOString(),
    });

    await logAudit(
      'NEWS_PERMANENCE_REVOKED',
      'NEWS',
      id,
      `Permanence status removed for "${targetArticle?.title || id}". Reverted to standard 10-day TTL lifecycle.`,
      {
        severity: 'WARNING',
        targetName: targetArticle?.title || id,
      }
    );
  };

  const cleanupExpiredNews = async (): Promise<number> => {
    const now = Date.now();
    let cleanedCount = 0;
    const expiredList = news.filter(
      (n) => !n.isPermanent && n.expiresAt && new Date(n.expiresAt).getTime() < now
    );

    for (const item of expiredList) {
      try {
        await deleteDoc(doc(db, 'news', item.id));
        cleanedCount++;
        await logAudit(
          'EXPIRED_NEWS_AUTO_DELETED',
          'NEWS',
          item.id,
          `AI bot routine auto-purged expired temporary news story: "${item.title}" (exceeded 10-day lifecycle without permanent admin lock).`,
          {
            severity: 'INFO',
            targetName: item.title,
            metadata: {
              university: item.university,
              department: item.department,
              createdAt: item.createdAt,
              expiresAt: item.expiresAt,
            },
          }
        );
      } catch (err) {
        console.warn('Failed to delete expired news doc:', item.id, err);
      }
    }
    return cleanedCount;
  };

  const triggerAINewsBotScan = async (options?: {
    focusType?: string;
    university?: string;
    department?: string;
    forceHotTopic?: boolean;
    count?: number;
  }): Promise<NewsArticle[]> => {
    try {
      const resp = await fetch('/api/ai-news-bot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!resp.ok) {
        throw new Error(`Bot API returned status ${resp.status}`);
      }

      const data = await resp.json();
      const articles = data.articles || [];
      const savedArticles: NewsArticle[] = [];

      for (const item of articles) {
        const initialId = item.id || `ai-news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const payload = { ...item, id: initialId };
        const docRef = await addDoc(collection(db, 'news'), payload);
        savedArticles.push({ ...payload, id: docRef.id || initialId });

        if (item.isHotTopic) {
          await logAudit(
            'AI_HOT_TOPIC_DETECTED',
            'NEWS',
            docRef.id,
            `🔥 Instant Hot Topic flagged: "${item.title}" (${item.hotTopicReason || 'High-impact breakthrough'}). Added immediately to live wire.`,
            {
              severity: 'WARNING',
              targetName: item.title,
              metadata: {
                university: item.university,
                department: item.department,
                hotTopicReason: item.hotTopicReason,
                sourceUrl: item.sourceUrl,
              },
            }
          );
        } else {
          await logAudit(
            'AI_NEWS_INDEXED',
            'NEWS',
            docRef.id,
            `AI Bot indexed daily 24h wire story: "${item.title}" for ${item.university || 'Institutions'} · ${item.department || 'Departments'} (10-day temporary retention).`,
            {
              severity: 'INFO',
              targetName: item.title,
            }
          );
        }
      }

      if (data.botState) {
        setBotStatus((prev) => ({ ...prev, ...data.botState }));
      }

      // Run automatic expired news cleanup
      await cleanupExpiredNews();

      return savedArticles;
    } catch (err) {
      console.error('Error triggering AI News Bot scan:', err);
      throw err;
    }
  };

  // Permission helper: 3 types of admins can make news permanent or delete
  const canUserManageArticle = (article: NewsArticle): boolean => {
    if (isSuperAdmin || userProfile?.role === 'SUPER_ADMIN') return true;
    if (!userProfile) return false;
    if (userProfile.role === 'UNIVERSITY_ADMIN') {
      const assignedUni = userProfile.assignedUniversity || userProfile.university;
      return Boolean(
        assignedUni &&
          (!article.university || article.university.toLowerCase() === assignedUni.toLowerCase())
      );
    }
    if (userProfile.role === 'DEPARTMENT_ADMIN') {
      const assignedUni = userProfile.assignedUniversity || userProfile.university;
      const assignedDept = userProfile.assignedDepartment || userProfile.department;
      const uniMatch = Boolean(
        assignedUni &&
          (!article.university || article.university.toLowerCase() === assignedUni.toLowerCase())
      );
      const deptMatch = Boolean(
        assignedDept &&
          (!article.department || article.department.toLowerCase() === assignedDept.toLowerCase())
      );
      return uniMatch && deptMatch;
    }
    return false;
  };

  const trigger24HourRotationCycle = async (): Promise<NewsArticle[]> => {
    try {
      const resp = await fetch('/api/ai-news-bot/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) {
        throw new Error(`Rotation API status ${resp.status}`);
      }
      const data = await resp.json();
      const articles = data.articles || [];
      const savedArticles: NewsArticle[] = [];

      for (const item of articles) {
        const docRef = await addDoc(collection(db, 'news'), item);
        savedArticles.push({ ...item, id: docRef.id });

        if (item.isHotTopic) {
          await logAudit(
            'AI_HOT_TOPIC_DETECTED',
            'NEWS',
            docRef.id,
            `🔥 [24h Cycle #${data.cycleCount}] Instant Hot Topic Flagged: "${item.title}" (${item.hotTopicReason || 'Milestone achievement'}). Added instantly to live wire.`,
            {
              severity: 'WARNING',
              targetName: item.title,
              metadata: {
                university: item.university,
                department: item.department,
                hotTopicReason: item.hotTopicReason,
                sourceUrl: item.sourceUrl,
                cycleCount: data.cycleCount,
              },
            }
          );
        } else {
          await logAudit(
            'AI_NEWS_ROTATION_INDEXED',
            'NEWS',
            docRef.id,
            `[24h Cycle #${data.cycleCount}] Rotating news story indexed: "${item.title}" for ${item.university} (${item.department}). 10-day retention countdown started.`,
            {
              severity: 'INFO',
              targetName: item.title,
              metadata: { cycleCount: data.cycleCount },
            }
          );
        }
      }

      if (data.botState) {
        setBotStatus((prev) => ({ ...prev, ...data.botState }));
      }

      await cleanupExpiredNews();
      return savedArticles;
    } catch (err) {
      console.error('Error triggering 24h rotation cycle:', err);
      throw err;
    }
  };

  // Automated 24h Rotation and 10-day TTL cleanup monitor
  useEffect(() => {
    const checkRotation = async () => {
      const nextTime = new Date(botStatus.nextRotationAt).getTime();
      if (Date.now() >= nextTime) {
        console.log('[DataContext] 24-hour cycle timer expired. Commencing automated rotation...');
        try {
          await trigger24HourRotationCycle();
        } catch (e) {
          console.warn('[DataContext] Rotation check caught error:', e);
        }
      }
      cleanupExpiredNews().catch(() => {});
    };

    checkRotation();
    const interval = setInterval(checkRotation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [botStatus.nextRotationAt]);

  const deleteUser = async (userId: string, reason?: string) => {
    const targetUser = allUsers.find((u) => u.uid === userId || u.id === userId);
    const targetName = targetUser?.name || 'User';
    const targetEmail = targetUser?.email || '';
    const targetRole = targetUser?.role || 'STUDENT';
    const targetUni = targetUser?.university || '';

    await deleteDoc(doc(db, 'users', userId));

    // Also remove from alumni collection if exists
    const alumniMatch = alumni.find((a) => a.userId === userId || a.id === userId);
    if (alumniMatch) {
      await deleteDoc(doc(db, 'alumni', alumniMatch.id)).catch(() => {});
    }

    await logAudit(
      'DATA_DELETED',
      'USER',
      userId,
      `Permanently deleted member account: "${targetName}" (${targetEmail}, Role: ${targetRole}, Uni: ${targetUni || 'Unset'}). ${
        reason ? `Reason: ${reason}` : ''
      }`,
      {
        severity: 'DANGER',
        targetName,
        metadata: { email: targetEmail, role: targetRole, university: targetUni, reason }
      }
    );
  };

  const deleteAlumni = async (alumniId: string, reason?: string) => {
    const target = alumni.find((a) => a.id === alumniId);
    await deleteDoc(doc(db, 'alumni', alumniId));
    await logAudit(
      'DATA_DELETED',
      'ALUMNI',
      alumniId,
      `Permanently deleted alumni directory record: "${target?.name || alumniId}" (${target?.university || 'University'}). ${
        reason ? `Reason: ${reason}` : ''
      }`,
      {
        severity: 'DANGER',
        targetName: target?.name || alumniId,
        metadata: { university: target?.university, department: target?.department, reason }
      }
    );
  };

  // Admin Assignments
  const assignAdmin = async (assignment: Omit<AdminAssignment, 'id' | 'createdAt'>) => {
    const newAssign = {
      ...assignment,
      createdAt: new Date().toISOString(),
    };
    const res = await addDoc(collection(db, 'adminAssignments'), newAssign);

    // Update user profile with assigned university/department and role
    const userDocRef = doc(db, 'users', assignment.userId);
    await updateDoc(userDocRef, {
      role: assignment.role,
      assignedUniversity: assignment.university,
      assignedDepartment: assignment.department || '',
      updatedAt: new Date().toISOString(),
    });

    // Notify user
    await addDoc(collection(db, 'notifications'), {
      recipientId: assignment.userId,
      title: 'Administrator Assignment',
      message: `You have been assigned as ${assignment.role.replace('_', ' ')} for ${assignment.university}${
        assignment.department ? ` - ${assignment.department}` : ''
      }.`,
      type: 'ADMIN_ASSIGNMENT',
      read: false,
      actionUrl: assignment.role === 'UNIVERSITY_ADMIN' ? '/university-admin' : '/department-admin',
      createdAt: new Date().toISOString(),
    });

    await logAudit('ADMIN_ASSIGNED', 'ADMIN_ASSIGNMENT', res.id, `${assignment.userName} assigned to ${assignment.role}`);
  };

  const removeAdminAssignment = async (id: string) => {
    const assignment = adminAssignments.find((a) => a.id === id);
    if (!assignment) return;

    await deleteDoc(doc(db, 'adminAssignments', id));

    // Reset user role back to Alumni or Student
    const userDocRef = doc(db, 'users', assignment.userId);
    const existing = allUsers.find((u) => u.uid === assignment.userId);
    const fallbackRole: Role = existing?.profileType === 'Alumni' ? 'ALUMNI' : 'STUDENT';

    await updateDoc(userDocRef, {
      role: fallbackRole,
      assignedUniversity: '',
      assignedDepartment: '',
      updatedAt: new Date().toISOString(),
    });

    await logAudit('ADMIN_REMOVED', 'ADMIN_ASSIGNMENT', id, `Revoked admin role for ${assignment.userName}`);
  };

  // University & Department management
  const saveUniversity = async (uni: Partial<University>) => {
    const trimmedName = (uni.name || '').trim();
    const id = uni.id || 'uni-' + encodeURIComponent(trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    const existingUni = universities.find(
      (u) => u.id === id || (trimmedName && u.name.toLowerCase() === trimmedName.toLowerCase())
    );

    const fullUni: University = {
      id,
      name: trimmedName || existingUni?.name || id,
      shortName: uni.shortName !== undefined ? String(uni.shortName).trim() : (existingUni?.shortName || ''),
      code: uni.code !== undefined ? String(uni.code).trim() : (existingUni?.code || existingUni?.shortName || ''),
      type: (uni.type || existingUni?.type || 'Public') as 'Public' | 'Private' | 'International',
      location: uni.location !== undefined ? String(uni.location).trim() : (existingUni?.location || ''),
      logoUrl: uni.logoUrl || existingUni?.logoUrl || getUniversityLogo(trimmedName || existingUni?.name || '') || '',
      status: uni.status || existingUni?.status || 'Active',
      verified: uni.verified ?? existingUni?.verified ?? false,
      alumniCount: uni.alumniCount ?? existingUni?.alumniCount ?? 0,
      studentCount: uni.studentCount ?? existingUni?.studentCount ?? 0,
      followersCount: uni.followersCount ?? existingUni?.followersCount ?? 0,
      departmentCount: uni.departmentCount ?? existingUni?.departmentCount ?? 0,
      employmentRate: uni.employmentRate ?? existingUni?.employmentRate ?? 0,
      higherStudiesRate: uni.higherStudiesRate ?? existingUni?.higherStudiesRate ?? 0,
      countriesCount: uni.countriesCount ?? existingUni?.countriesCount ?? 0,
      companiesCount: uni.companiesCount ?? existingUni?.companiesCount ?? 0,
      overview: uni.overview !== undefined ? String(uni.overview).trim() : (existingUni?.overview || ''),
      website: uni.website !== undefined ? String(uni.website).trim() : (existingUni?.website || ''),
      updatedAt: new Date().toISOString(),
      createdAt: existingUni?.createdAt || uni.createdAt || new Date().toISOString(),
    };

    // 1. Immediately store in LocalStorage for 100% resilient client persistence
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alumni_custom_universities');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(list)
          ? list.filter((item: any) => item.id !== id && item.name?.toLowerCase() !== fullUni.name.toLowerCase())
          : [];
        filtered.push(fullUni);
        localStorage.setItem('alumni_custom_universities', JSON.stringify(filtered));
      } catch (e) {}

      if (fullUni.logoUrl) {
        setCustomLogo(id, fullUni.logoUrl);
        setCustomLogo(fullUni.name, fullUni.logoUrl);
        setCustomLogo(id.toLowerCase(), fullUni.logoUrl);
        setCustomLogo(fullUni.name.toLowerCase(), fullUni.logoUrl);
      }
    }

    // 2. Immediately update in-memory React state so UI reflects it with ZERO lag
    setUniversities((prev) => {
      const exists = prev.some((u) => u.id === id || u.name.toLowerCase() === fullUni.name.toLowerCase());
      if (exists) {
        return prev.map((u) =>
          u.id === id || u.name.toLowerCase() === fullUni.name.toLowerCase() ? { ...u, ...fullUni } : u
        );
      }
      return [fullUni, ...prev];
    });

    // 3. Dispatch broadcast events so active views, cards, and logos refresh right now
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alumni-custom-logos-changed', {
          detail: { nameOrId: id, name: fullUni.name, logoUrl: fullUni.logoUrl },
        })
      );
      window.dispatchEvent(
        new CustomEvent('alumni-university-updated', {
          detail: fullUni,
        })
      );
    }

    // 4. Save to Firestore
    try {
      await setDoc(doc(db, 'universities', id), fullUni, { merge: true });
    } catch (e) {
      console.warn('Firestore university save note:', e);
    }

    // 5. Save to Server Disk Storage (/api/admin/universities and fallback /api/universities)
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('alumniSphereAdminToken') : null;
    const adminHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) adminHeaders['Authorization'] = `Bearer ${token}`;

    try {
      await fetch(`/api/admin/universities/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify(fullUni),
      });
    } catch (e) {
      try {
        await fetch(`/api/universities/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullUni),
        });
      } catch (err) {}
    }

    await logAudit('UNIVERSITY_SAVED', 'UNIVERSITY', id, `Saved university ${fullUni.name}`);
  };

  const saveDepartment = async (dept: Partial<Department>) => {
    const uniName = (dept.university || '').trim();
    const deptName = (dept.name || '').trim();
    const id = dept.id || 'dept-' + encodeURIComponent((uniName + '-' + deptName).toLowerCase().replace(/[^a-z0-9]/g, '-'));
    const existingDept = departments.find((d) => d.id === id);
    const fullDept: Department = {
      id,
      name: deptName,
      university: uniName,
      faculty: dept.faculty || dept.group || 'General',
      group: (dept.group || 'Engineering') as any,
      status: dept.status || 'Active',
      verified: dept.verified ?? existingDept?.verified ?? false,
      logoUrl: dept.logoUrl !== undefined ? String(dept.logoUrl).trim() : (existingDept?.logoUrl || ''),
      description: dept.description !== undefined ? String(dept.description).trim() : (existingDept?.description || ''),
      alumniCount: dept.alumniCount ?? 0,
      studentCount: dept.studentCount ?? 0,
      employmentRate: dept.employmentRate ?? 0,
      higherStudiesRate: dept.higherStudiesRate ?? 0,
      countriesCount: dept.countriesCount ?? 0,
      companiesCount: dept.companiesCount ?? 0,
      updatedAt: new Date().toISOString(),
      createdAt: dept.createdAt || new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'departments', id), fullDept, { merge: true });
    } catch (e) {
      console.warn('Firestore department save note:', e);
    }

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('alumniSphereAdminToken') : null;
    const adminHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) adminHeaders['Authorization'] = `Bearer ${token}`;

    try {
      await fetch(`/api/admin/departments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify(fullDept),
      });
    } catch (e) {}

    setDepartments((prev) => {
      const exists = prev.some((d) => d.id === id);
      if (exists) {
        return prev.map((d) => (d.id === id ? { ...d, ...fullDept } : d));
      }
      return [fullDept, ...prev];
    });

    await logAudit('DEPARTMENT_SAVED', 'DEPARTMENT', id, `Saved department ${deptName} under ${uniName}`);
  };

  const updateUniversityLogo = async (uniIdOrName: string, logoUrl: string) => {
    const trimmedUrl = logoUrl.trim();
    const found = universities.find(
      (u) => u.id === uniIdOrName || u.name.toLowerCase() === uniIdOrName.toLowerCase()
    );
    const id = found?.id || 'uni-' + encodeURIComponent(uniIdOrName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    const name = found?.name || uniIdOrName;

    // 1. Immediately update custom logo in cache and LocalStorage
    setCustomLogo(uniIdOrName, trimmedUrl);
    setCustomLogo(id, trimmedUrl);
    setCustomLogo(name, trimmedUrl);
    setCustomLogo(id.toLowerCase(), trimmedUrl);
    setCustomLogo(name.toLowerCase(), trimmedUrl);

    // 2. Immediately update LocalStorage custom universities cache
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alumni_custom_universities');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(list)
          ? list.filter((item: any) => item.id !== id && item.name?.toLowerCase() !== name.toLowerCase())
          : [];
        const mergedUni = found ? { ...found, logoUrl: trimmedUrl } : { id, name, logoUrl: trimmedUrl };
        filtered.push(mergedUni);
        localStorage.setItem('alumni_custom_universities', JSON.stringify(filtered));
      } catch (e) {}
    }

    // 3. Immediately update React state so all user pages and cards re-render right now
    setUniversities((prev) =>
      prev.map((u) => (u.id === id || u.name.toLowerCase() === name.toLowerCase() ? { ...u, logoUrl: trimmedUrl } : u))
    );

    // 4. Dispatch events to notify all active views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alumni-custom-logos-changed', { detail: { nameOrId: id, logoUrl: trimmedUrl } }));
      window.dispatchEvent(
        new CustomEvent('alumni-university-updated', {
          detail: { id, name, logoUrl: trimmedUrl },
        })
      );
    }

    // 5. Save to Firestore
    try {
      await setDoc(
        doc(db, 'universities', id),
        {
          id,
          name,
          logoUrl: trimmedUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore university logo update warning:', e);
    }

    // 6. Save to Server Disk Storage (/api/admin/universities/:id/logo and fallback /api/universities/:id/logo)
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('alumniSphereAdminToken') : null;
    const adminHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) adminHeaders['Authorization'] = `Bearer ${token}`;

    try {
      await fetch(`/api/admin/universities/${encodeURIComponent(id)}/logo`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ logoUrl: trimmedUrl, universityName: name }),
      });
    } catch (e) {
      try {
        await fetch(`/api/universities/${encodeURIComponent(id)}/logo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoUrl: trimmedUrl, universityName: name }),
        });
      } catch (err) {}
    }

    await logAudit('UNIVERSITY_LOGO_UPDATED', 'UNIVERSITY', id, `Updated logo for ${name}`);
  };

  const updateUniversityDepartments = async (uniName: string, deptNames: string[]) => {
    const trimmedUni = uniName.trim();
    for (const dName of deptNames) {
      const dTrimmed = dName.trim();
      if (!dTrimmed) continue;
      const deptId = 'dept-' + encodeURIComponent((trimmedUni + '-' + dTrimmed).toLowerCase().replace(/[^a-z0-9]/g, '-'));
      try {
        await setDoc(
          doc(db, 'departments', deptId),
          {
            id: deptId,
            name: dTrimmed,
            university: trimmedUni,
            group: 'Engineering',
            verified: departments.some(
              (d) =>
                d.id === deptId &&
                d.university.toLowerCase().trim() === trimmedUni.toLowerCase() &&
                d.verified === true
            ),
            alumniCount: 0,
            studentCount: 0,
            employmentRate: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {}
    }

    try {
      const uniId = 'uni-' + encodeURIComponent(trimmedUni.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('alumniSphereAdminToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/admin/universities/${encodeURIComponent(uniId)}/departments`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ departments: deptNames, universityName: trimmedUni }),
      });
    } catch (e) {}

    setDepartments((prev) => {
      const others = prev.filter((d) => d.university.toLowerCase() !== trimmedUni.toLowerCase());
      const newEntries: Department[] = deptNames.map((dName) => {
        const existing = prev.find(
          (d) => d.university.toLowerCase() === trimmedUni.toLowerCase() && d.name.toLowerCase() === dName.toLowerCase()
        );
        return existing || {
          id: 'dept-' + encodeURIComponent((trimmedUni + '-' + dName).toLowerCase().replace(/[^a-z0-9]/g, '-')),
          name: dName.trim(),
          university: trimmedUni,
          group: 'Engineering',
          alumniCount: 0,
          employmentRate: 0,
        };
      });
      return [...others, ...newEntries];
    });

    await logAudit(
      'UNIVERSITY_DEPARTMENTS_UPDATED',
      'UNIVERSITY',
      trimmedUni,
      `Updated department catalogue for ${trimmedUni} (${deptNames.length} departments)`
    );
  };

  const deleteDepartment = async (deptId: string) => {
    try {
      await deleteDoc(doc(db, 'departments', deptId));
    } catch (e) {
      console.warn('Firestore delete doc warning:', e);
    }
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    await logAudit('DEPARTMENT_DELETED', 'DEPARTMENT', deptId, `Deleted department ${deptId}`);
  };

  const deleteUniversity = async (uniId: string) => {
    try {
      await deleteDoc(doc(db, 'universities', uniId));
    } catch (e) {
      console.warn('Firestore delete university doc warning:', e);
    }
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('alumniSphereAdminToken') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/admin/universities/${encodeURIComponent(uniId)}`, {
        method: 'DELETE',
        headers,
      });
    } catch (e) {}
    setUniversities((prev) => prev.filter((u) => u.id !== uniId));
    await logAudit('UNIVERSITY_DELETED', 'UNIVERSITY', uniId, `Deleted university ${uniId}`);
  };

  const markNotificationRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const clearNotifications = async () => {
    const userNotifs = notifications.filter(
      (n) => n.recipientId === currentUser?.uid || (isSuperAdmin && n.recipientId === 'ADMIN')
    );
    for (const n of userNotifs) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  // Post creation and community interaction
  const createPost = async (postData: Omit<UserPost, 'id' | 'createdAt' | 'reactions'>) => {
    const tempId = 'post-' + Date.now();
    const newPost: UserPost = {
      ...postData,
      id: tempId,
      createdAt: new Date().toISOString(),
      reactions: {
        like: [],
        love: [],
        scholar: [],
        insightful: [],
        celebrate: [],
      },
    };

    setPosts((prev) => [newPost, ...prev]);

    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        userId: newPost.userId,
        authorName: newPost.authorName,
        authorEmail: newPost.authorEmail,
        authorRole: newPost.authorRole,
        authorUniversity: newPost.authorUniversity || '',
        authorDepartment: newPost.authorDepartment || '',
        authorPhotoUrl: newPost.authorPhotoUrl || '',
        content: newPost.content,
        imageUrl: newPost.imageUrl || '',
        createdAt: newPost.createdAt,
        reactions: newPost.reactions,
      });
      setPosts((prev) => prev.map((p) => (p.id === tempId ? { ...p, id: docRef.id } : p)));
    } catch (err) {
      console.warn('Post created locally, remote sync pending:', err);
    }
  };

  const reactToPost = async (postId: string, reactionType: PostReactionType) => {
    const userId = currentUser?.uid || (userProfile?.email ? 'usr-' + userProfile.email : 'guest-user');

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentList = p.reactions?.[reactionType] || [];
        const hasReacted = currentList.includes(userId);
        const updatedList = hasReacted
          ? currentList.filter((id) => id !== userId)
          : [...currentList, userId];

        return {
          ...p,
          reactions: {
            ...p.reactions,
            [reactionType]: updatedList,
          },
        };
      })
    );

    try {
      const targetPost = posts.find((p) => p.id === postId);
      if (!targetPost) return;
      const currentList = targetPost.reactions?.[reactionType] || [];
      const hasReacted = currentList.includes(userId);
      const updatedList = hasReacted
        ? currentList.filter((id) => id !== userId)
        : [...currentList, userId];

      const postDocRef = doc(db, 'posts', postId);
      await updateDoc(postDocRef, {
        [`reactions.${reactionType}`]: updatedList,
      });
    } catch (err) {
      console.warn('Reaction saved locally:', err);
    }
  };

  const deletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.warn('Post deleted locally:', err);
    }
  };

  const isFollowingUniversity = (uniName: string): boolean => {
    if (!userProfile?.followedUniversities) return false;
    return userProfile.followedUniversities.some(
      (u) => u.toLowerCase() === uniName.toLowerCase()
    );
  };

  const toggleFollowUniversity = async (uniName: string) => {
    if (!currentUser || !userProfile) return;
    const currentList = userProfile.followedUniversities || [];
    const isFollowing = currentList.some((u) => u.toLowerCase() === uniName.toLowerCase());

    const updatedList = isFollowing
      ? currentList.filter((u) => u.toLowerCase() !== uniName.toLowerCase())
      : [...currentList, uniName];

    // Optimistically update university followersCount
    setUniversities((prev) =>
      prev.map((u) => {
        if (u.name.toLowerCase() === uniName.toLowerCase()) {
          const currentCount = u.followersCount || 1200;
          return {
            ...u,
            followersCount: isFollowing ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
        }
        return u;
      })
    );

    try {
      await updateProfileData({ followedUniversities: updatedList });
    } catch (err) {
      console.warn('Follow state updated locally:', err);
    }
  };

  // --------------------------------------------------------------------------
  // Real Alumni Networking & Mentorship Engine
  // --------------------------------------------------------------------------

  const getConnectionStatusWith = (targetIdOrAlumniId: string) => {
    if (!currentUser || !targetIdOrAlumniId) {
      return { status: 'NONE' as const, request: undefined, isOutgoing: false };
    }
    const cleanTarget = targetIdOrAlumniId.trim().toLowerCase();
    const req = connectionRequests.find((r) => {
      const isSender = r.senderId.toLowerCase() === currentUser.uid.toLowerCase();
      const isRecipient = r.recipientId.toLowerCase() === currentUser.uid.toLowerCase();
      if (!isSender && !isRecipient) return false;

      const otherId = isSender ? r.recipientId : r.senderId;
      const otherAlumniId = isSender ? r.recipientAlumniId : r.senderAlumniId;

      return (
        (otherId && otherId.toLowerCase() === cleanTarget) ||
        (otherAlumniId && otherAlumniId.toLowerCase() === cleanTarget)
      );
    });

    if (!req || req.status === 'CANCELLED') {
      return { status: 'NONE' as const, request: undefined, isOutgoing: false };
    }

    return {
      status: req.status,
      request: req,
      isOutgoing: req.senderId.toLowerCase() === currentUser.uid.toLowerCase(),
    };
  };

  const getMentorshipStatusWith = (targetIdOrAlumniId: string) => {
    if (!currentUser || !targetIdOrAlumniId) {
      return { status: 'NONE' as const, request: undefined, isOutgoing: false };
    }
    const cleanTarget = targetIdOrAlumniId.trim().toLowerCase();
    const req = mentorshipRequests.find((r) => {
      const isStudent = r.studentId.toLowerCase() === currentUser.uid.toLowerCase();
      const isMentor = r.mentorId.toLowerCase() === currentUser.uid.toLowerCase();
      if (!isStudent && !isMentor) return false;

      const otherId = isStudent ? r.mentorId : r.studentId;
      const otherAlumniId = r.mentorAlumniId;

      return (
        (otherId && otherId.toLowerCase() === cleanTarget) ||
        (otherAlumniId && otherAlumniId.toLowerCase() === cleanTarget)
      );
    });

    if (!req || req.status === 'CANCELLED') {
      return { status: 'NONE' as const, request: undefined, isOutgoing: false };
    }

    return {
      status: req.status,
      request: req,
      isOutgoing: req.studentId.toLowerCase() === currentUser.uid.toLowerCase(),
    };
  };

  const sendConnectionRequest = async (target: {
    recipientId: string;
    recipientName: string;
    recipientEmail?: string;
    recipientRole?: Role;
    recipientPhotoUrl?: string;
    recipientUniversity?: string;
    recipientDepartment?: string;
    recipientJobRole?: string;
    recipientCompany?: string;
    recipientAlumniId?: string;
    message?: string;
  }) => {
    if (!currentUser) throw new Error('Authentication required to send connection request.');
    if (
      currentUser.uid.toLowerCase() === target.recipientId.toLowerCase() ||
      (userProfile?.id && userProfile.id.toLowerCase() === target.recipientId.toLowerCase())
    ) {
      throw new Error('You cannot send a connection request to yourself.');
    }

    // Check duplicate
    const existing = connectionRequests.find(
      (r) =>
        ((r.senderId.toLowerCase() === currentUser.uid.toLowerCase() && r.recipientId.toLowerCase() === target.recipientId.toLowerCase()) ||
          (r.recipientId.toLowerCase() === currentUser.uid.toLowerCase() && r.senderId.toLowerCase() === target.recipientId.toLowerCase())) &&
        (r.status === 'PENDING' || r.status === 'ACCEPTED')
    );
    if (existing) {
      throw new Error(
        existing.status === 'ACCEPTED'
          ? 'You are already connected with this member.'
          : 'A connection request between you and this member is already pending.'
      );
    }

    const docId = `conn_${currentUser.uid}_${target.recipientId}`;
    const now = new Date().toISOString();
    const newReq: ConnectionRequest = {
      id: docId,
      senderId: currentUser.uid,
      senderName: userProfile?.name || currentUser.displayName || 'AlumniSphere Member',
      senderEmail: userProfile?.email || currentUser.email || '',
      senderRole: userProfile?.role || 'STUDENT',
      senderPhotoUrl: userProfile?.photoUrl,
      senderUniversity: userProfile?.university,
      senderDepartment: userProfile?.department,
      senderJobRole: userProfile?.jobRole,
      senderCompany: userProfile?.company,
      recipientId: target.recipientId,
      recipientName: target.recipientName,
      recipientEmail: target.recipientEmail,
      recipientRole: target.recipientRole,
      recipientPhotoUrl: target.recipientPhotoUrl,
      recipientUniversity: target.recipientUniversity,
      recipientDepartment: target.recipientDepartment,
      recipientJobRole: target.recipientJobRole,
      recipientCompany: target.recipientCompany,
      recipientAlumniId: target.recipientAlumniId,
      status: 'PENDING',
      message: (target.message || '').slice(0, 300).trim(),
      createdAt: now,
      updatedAt: now,
    };

    // Optimistically update
    setConnectionRequests((prev) => [newReq, ...prev.filter((r) => r.id !== docId)]);

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'connectionRequests', docId), newReq);
      // Dispatch notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: target.recipientId,
        title: 'New Connection Request',
        message: `${newReq.senderName} would like to connect with you.`,
        type: 'CONNECTION',
        read: false,
        actionUrl: 'network',
        createdAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore connection request note:', err.message);
    }

    // Call server API mirror if available
    try {
      await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
        body: JSON.stringify(target),
      });
    } catch {}
  };

  const respondConnectionRequest = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    if (!currentUser) throw new Error('Authentication required.');
    const req = connectionRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Connection request not found.');

    const isRecipient =
      req.recipientId.toLowerCase() === currentUser.uid.toLowerCase() ||
      (userProfile?.email && req.recipientEmail?.toLowerCase() === userProfile.email.toLowerCase()) ||
      isSuperAdmin;

    if (!isRecipient) {
      throw new Error('Unauthorized: only the recipient can accept or decline this request.');
    }

    if (req.status !== 'PENDING') {
      throw new Error(`Cannot respond to a request with status ${req.status}.`);
    }

    const now = new Date().toISOString();
    const updated: ConnectionRequest = {
      ...req,
      status,
      updatedAt: now,
      respondedAt: now,
    };

    setConnectionRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));

    try {
      await updateDoc(doc(db, 'connectionRequests', requestId), {
        status,
        updatedAt: now,
        respondedAt: now,
      });
      // Send notification to sender
      await addDoc(collection(db, 'notifications'), {
        recipientId: req.senderId,
        title: status === 'ACCEPTED' ? 'Connection Request Accepted' : 'Connection Request Update',
        message: `${req.recipientName} ${status === 'ACCEPTED' ? 'accepted your connection request!' : 'declined your connection request.'}`,
        type: 'CONNECTION',
        read: false,
        actionUrl: 'network',
        createdAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore connection response note:', err.message);
    }

    try {
      await fetch(`/api/connections/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const cancelConnectionRequest = async (requestId: string) => {
    if (!currentUser) throw new Error('Authentication required.');
    const req = connectionRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Connection request not found.');

    const isSender =
      req.senderId.toLowerCase() === currentUser.uid.toLowerCase() ||
      (userProfile?.email && req.senderEmail?.toLowerCase() === userProfile.email.toLowerCase()) ||
      isSuperAdmin;

    if (!isSender) {
      throw new Error('Unauthorized: only the sender can cancel this request.');
    }

    const now = new Date().toISOString();
    setConnectionRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED', updatedAt: now } : r)));

    try {
      await updateDoc(doc(db, 'connectionRequests', requestId), {
        status: 'CANCELLED',
        updatedAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore cancel connection note:', err.message);
    }

    try {
      await fetch(`/api/connections/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
      });
    } catch {}
  };

  const disconnectConnection = async (requestId: string) => {
    if (!currentUser) throw new Error('Authentication required.');
    const req = connectionRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Connection not found.');

    const isParty =
      req.senderId.toLowerCase() === currentUser.uid.toLowerCase() ||
      req.recipientId.toLowerCase() === currentUser.uid.toLowerCase() ||
      isSuperAdmin;

    if (!isParty) {
      throw new Error('Unauthorized: you are not a party to this connection.');
    }

    const now = new Date().toISOString();
    setConnectionRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED', updatedAt: now } : r)));

    try {
      await updateDoc(doc(db, 'connectionRequests', requestId), {
        status: 'CANCELLED',
        updatedAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore disconnect note:', err.message);
    }

    try {
      await fetch(`/api/connections/${requestId}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
      });
    } catch {}
  };

  const sendMentorshipRequest = async (target: {
    mentorId: string;
    mentorName: string;
    mentorRole?: Role;
    mentorPhotoUrl?: string;
    mentorUniversity?: string;
    mentorDepartment?: string;
    mentorJobRole?: string;
    mentorCompany?: string;
    mentorAlumniId?: string;
    topic: MentorshipTopic;
    message: string;
    preferredSchedule?: string;
  }) => {
    if (!currentUser) throw new Error('Authentication required.');
    if (
      currentUser.uid.toLowerCase() === target.mentorId.toLowerCase() ||
      (userProfile?.id && userProfile.id.toLowerCase() === target.mentorId.toLowerCase())
    ) {
      throw new Error('You cannot request mentorship from yourself.');
    }

    if (!target.message || target.message.trim().length < 20) {
      throw new Error('Please provide a clear purpose or message of at least 20 characters.');
    }

    const existingPending = mentorshipRequests.find(
      (r) =>
        r.studentId.toLowerCase() === currentUser.uid.toLowerCase() &&
        r.mentorId.toLowerCase() === target.mentorId.toLowerCase() &&
        r.status === 'PENDING'
    );
    if (existingPending) {
      throw new Error('You already have a pending mentorship request to this mentor. Please wait for their response.');
    }

    const docId = `mentor_${currentUser.uid}_${target.mentorId}_${Date.now()}`;
    const now = new Date().toISOString();
    const newReq: MentorshipRequest = {
      id: docId,
      studentId: currentUser.uid,
      studentName: userProfile?.name || currentUser.displayName || 'Student Mentee',
      studentEmail: userProfile?.email || currentUser.email || '',
      studentRole: userProfile?.role || 'STUDENT',
      studentPhotoUrl: userProfile?.photoUrl,
      studentUniversity: userProfile?.university,
      studentDepartment: userProfile?.department,
      studentGraduation: userProfile?.graduationYear || userProfile?.expectedGraduation,
      studentBio: userProfile?.bio,
      mentorId: target.mentorId,
      mentorName: target.mentorName,
      mentorRole: target.mentorRole,
      mentorPhotoUrl: target.mentorPhotoUrl,
      mentorUniversity: target.mentorUniversity,
      mentorDepartment: target.mentorDepartment,
      mentorJobRole: target.mentorJobRole,
      mentorCompany: target.mentorCompany,
      mentorAlumniId: target.mentorAlumniId,
      topic: target.topic,
      message: target.message.trim().slice(0, 1000),
      preferredSchedule: target.preferredSchedule,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    setMentorshipRequests((prev) => [newReq, ...prev]);

    try {
      await setDoc(doc(db, 'mentorshipRequests', docId), newReq);
      await addDoc(collection(db, 'notifications'), {
        recipientId: target.mentorId,
        title: 'New Mentorship Request',
        message: `${newReq.studentName} requested mentorship on "${newReq.topic}".`,
        type: 'MENTORSHIP',
        read: false,
        actionUrl: 'network',
        createdAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore mentorship request note:', err.message);
    }

    try {
      await fetch('/api/mentorship/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
        body: JSON.stringify(target),
      });
    } catch {}
  };

  const respondMentorshipRequest = async (
    requestId: string,
    status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED',
    feedback?: string
  ) => {
    if (!currentUser) throw new Error('Authentication required.');
    const req = mentorshipRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Mentorship request not found.');

    const isMentor =
      req.mentorId.toLowerCase() === currentUser.uid.toLowerCase() ||
      isSuperAdmin;

    if (!isMentor) {
      throw new Error('Unauthorized: only the mentor can respond to this request.');
    }

    const now = new Date().toISOString();
    const updated: MentorshipRequest = {
      ...req,
      status,
      feedback: feedback ? feedback.trim().slice(0, 1000) : req.feedback,
      updatedAt: now,
      respondedAt: now,
    };

    setMentorshipRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));

    try {
      await updateDoc(doc(db, 'mentorshipRequests', requestId), {
        status,
        feedback: updated.feedback || '',
        updatedAt: now,
        respondedAt: now,
      });
      await addDoc(collection(db, 'notifications'), {
        recipientId: req.studentId,
        title: status === 'ACCEPTED' ? 'Mentorship Request Accepted!' : status === 'COMPLETED' ? 'Mentorship Completed' : 'Mentorship Request Update',
        message: `${req.mentorName} ${status === 'ACCEPTED' ? 'accepted your mentorship request!' : status === 'COMPLETED' ? 'marked your mentorship as completed!' : 'declined your mentorship request.'}${feedback ? ` Note: "${feedback}"` : ''}`,
        type: 'MENTORSHIP',
        read: false,
        actionUrl: 'network',
        createdAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore mentorship response note:', err.message);
    }

    try {
      await fetch(`/api/mentorship/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
        body: JSON.stringify({ status, feedback }),
      });
    } catch {}
  };

  const cancelMentorshipRequest = async (requestId: string) => {
    if (!currentUser) throw new Error('Authentication required.');
    const req = mentorshipRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Mentorship request not found.');

    const isStudent =
      req.studentId.toLowerCase() === currentUser.uid.toLowerCase() ||
      (userProfile?.email && req.studentEmail?.toLowerCase() === userProfile.email.toLowerCase()) ||
      isSuperAdmin;

    if (!isStudent) {
      throw new Error('Unauthorized: only the student can cancel this request.');
    }

    const now = new Date().toISOString();
    setMentorshipRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED', updatedAt: now } : r)));

    try {
      await updateDoc(doc(db, 'mentorshipRequests', requestId), {
        status: 'CANCELLED',
        updatedAt: now,
      });
    } catch (err: any) {
      console.warn('Firestore cancel mentorship note:', err.message);
    }

    try {
      await fetch(`/api/mentorship/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.uid },
      });
    } catch {}
  };

  const completeMentorshipRequest = async (requestId: string) => {
    return respondMentorshipRequest(requestId, 'COMPLETED');
  };

  return (
    <DataContext.Provider
      value={{
        universities,
        departments,
        batches,
        alumni,
        students,
        news,
        posts,
        changeRequests,
        verificationRequests,
        profileClaims,
        canReviewProfileClaims: Boolean(currentUser && isSuperAdmin),
        submitProfileClaim,
        approveProfileClaim,
        rejectProfileClaim,
        notifications,
        connectionRequests,
        mentorshipRequests,
        sendConnectionRequest,
        respondConnectionRequest,
        cancelConnectionRequest,
        disconnectConnection,
        sendMentorshipRequest,
        respondMentorshipRequest,
        cancelMentorshipRequest,
        completeMentorshipRequest,
        getConnectionStatusWith,
        getMentorshipStatusWith,
        auditLogs,
        adminAssignments,
        platformSettings,
        allUsers,
        loadingData,
        stats,
        createPost,
        reactToPost,
        deletePost,
        toggleFollowUniversity,
        isFollowingUniversity,
        approveUser,
        rejectUser,
        unapproveUser,
        suspendUser,
        changeUserRole,
        verifyAlumni,
        submitVerificationRequest,
        approveVerificationRequest,
        rejectVerificationRequest,
        submitChangeRequest,
        approveChangeRequest,
        rejectChangeRequest,
        createNewsArticle,
        updateNewsArticle,
        deleteNewsArticle,
        makeNewsPermanent,
        removeNewsPermanent,
        canUserManageArticle,
        triggerAINewsBotScan,
        trigger24HourRotationCycle,
        cleanupExpiredNews,
        botStatus,
        deleteUser,
        deleteAlumni,
        assignAdmin,
        removeAdminAssignment,
        saveUniversity,
        deleteUniversity,
        updateUniversityLogo,
        saveDepartment,
        updateUniversityDepartments,
        deleteDepartment,
        markNotificationRead,
        clearNotifications,
        logAudit,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
