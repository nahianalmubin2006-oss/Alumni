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
  AppNotification,
  AuditLog,
  AdminAssignment,
  PlatformSetting,
  Role,
  UserProfile,
} from '../types';
import {
  ALL_DIRECTORY_UNIVERSITIES,
  RAW_DEPARTMENT_CATALOG,
  INITIAL_ALUMNI,
  INITIAL_NEWS,
  INITIAL_PLATFORM_SETTINGS,
  demoSeed,
} from '../data/initialData';

interface DataContextType {
  universities: University[];
  departments: Department[];
  batches: Batch[];
  alumni: AlumniRecord[];
  students: StudentRecord[];
  news: NewsArticle[];
  changeRequests: ChangeRequest[];
  verificationRequests: VerificationRequest[];
  notifications: AppNotification[];
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
  saveDepartment: (dept: Partial<Department>) => Promise<void>;

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
  const { currentUser, userProfile, isSuperAdmin } = useAuth();

  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting>(INITIAL_PLATFORM_SETTINGS);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

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

  // Initial database check & seeding to ensure live Firestore persistence
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Check universities collection
        const uniSnap = await getDocs(collection(db, 'universities'));
        if (uniSnap.empty) {
          console.log('Seeding initial universities & departments into Firestore...');
          // Seed top showcase universities first for speed
          const showcaseNames = [
            'University of Dhaka',
            'Bangladesh University of Engineering & Technology',
            'North South University',
            'Jahangirnagar University',
            'BRAC University',
            'Bangladesh University of Professionals',
          ];

          for (const u of ALL_DIRECTORY_UNIVERSITIES) {
            const isShowcase = showcaseNames.includes(u.name);
            const seed = demoSeed('uni-' + u.name);
            const baseAlumni = isShowcase
              ? u.name === 'University of Dhaka'
                ? 8920
                : u.name === 'Bangladesh University of Engineering & Technology'
                ? 6240
                : u.name === 'North South University'
                ? 5800
                : u.name === 'Jahangirnagar University'
                ? 5110
                : u.name === 'BRAC University'
                ? 4600
                : 2840
              : 800 + (seed % 3500);

            const uniRecord: University = {
              id: 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
              name: u.name,
              type: u.type,
              location: u.name.includes('Savar')
                ? 'Savar, Bangladesh'
                : u.name.includes('Chittagong')
                ? 'Chittagong, Bangladesh'
                : 'Dhaka, Bangladesh',
              verified: true,
              alumniCount: baseAlumni,
              studentCount: Math.round(baseAlumni * 1.4),
              departmentCount: 30 + (seed % 25),
              employmentRate: 78 + (seed % 17),
              higherStudiesRate: 8 + (seed % 12),
              countriesCount: 15 + (seed % 20),
              companiesCount: 120 + (seed % 400),
              overview: `${u.name} is a premier higher education institution in Bangladesh dedicated to research, innovation, and global leadership.`,
              website: 'https://ugc.gov.bd',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'universities', uniRecord.id), uniRecord);
          }

          // Seed showcase departments distributed neutrally across major universities
          const majorUnis = [
            'University of Dhaka',
            'Bangladesh University of Engineering & Technology',
            'Jahangirnagar University',
            'North South University',
            'BRAC University',
            'University of Rajshahi',
            'University of Chittagong',
            'Bangladesh Agricultural University',
            'Shahjalal University of Science & Technology',
            'Khulna University',
          ];

          for (let i = 0; i < RAW_DEPARTMENT_CATALOG.slice(0, 20).length; i++) {
            const d = RAW_DEPARTMENT_CATALOG[i];
            const assignedUni = majorUnis[i % majorUnis.length];
            const seed = demoSeed('dept-' + d.name + '-' + assignedUni);
            const deptRecord: Department = {
              id: 'dept-' + encodeURIComponent(d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
              name: d.name,
              university: assignedUni,
              group: d.group,
              alumniCount: 842 + (seed % 400),
              studentCount: 1100 + (seed % 500),
              employmentRate: 82 + (seed % 14),
              higherStudiesRate: 11 + (seed % 8),
              countriesCount: 22 + (seed % 10),
              companiesCount: 180 + (seed % 200),
              careerScores: {
                career: 86,
                research: 74,
                industry: 88,
              },
              achievements: 'Ranked top in competitive academic standing and graduate satisfaction.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'departments', deptRecord.id), deptRecord);
          }

          // Seed initial alumni (only user info: Nahian Al Mubin)
          for (const a of INITIAL_ALUMNI) {
            await setDoc(doc(db, 'alumni', a.id), a);
          }

          // Seed initial news
          for (const n of INITIAL_NEWS) {
            await setDoc(doc(db, 'news', n.id), n);
          }

          // Seed settings
          await setDoc(doc(db, 'platformSettings', 'global-settings'), INITIAL_PLATFORM_SETTINGS);
        }

        // Active cleanup: ensure old testing dummy records are purged from Firestore & local storage
        try {
          localStorage.removeItem('alumniSphereLocalUsers');
        } catch (e) {}

        try {
          // Clean legacy test alumni documents
          const testAlumniDocIds = ['alumni-1', 'alumni-2', 'alumni-3', 'alumni-4', 'alumni-5', 'alumni-6'];
          for (const id of testAlumniDocIds) {
            try {
              await deleteDoc(doc(db, 'alumni', id));
            } catch (err) {}
          }

          // Check if Nahian Al Mubin is present in alumni collection
          const userAlumni = INITIAL_ALUMNI[0];
          await setDoc(doc(db, 'alumni', userAlumni.id), userAlumni);
        } catch (cleanupErr) {
          console.warn('Test data purge warning:', cleanupErr);
        }
      } catch (err) {
        console.warn('Seeding check encountered an issue (rules or existing records):', err);
      }
    };

    initializeDatabase();
  }, []);

  // Set up real-time listeners for public Firestore collections
  useEffect(() => {
    const unsubUniversities = onSnapshot(
      collection(db, 'universities'),
      (snap) => {
        const list: University[] = [];
        snap.forEach((d) => list.push(d.data() as University));
        if (list.length > 0) setUniversities(list);
        else {
          setUniversities(
            ALL_DIRECTORY_UNIVERSITIES.map((u) => ({
              id: 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
              name: u.name,
              type: u.type,
              location: 'Dhaka, Bangladesh',
              alumniCount: (demoSeed(u.name) % 4000) + 500,
              departmentCount: 35,
              employmentRate: 84,
            }))
          );
        }
      },
      (error) => {
        console.warn('Universities listener warning:', error.message);
      }
    );

    const unsubDepartments = onSnapshot(
      collection(db, 'departments'),
      (snap) => {
        const list: Department[] = [];
        snap.forEach((d) => list.push(d.data() as Department));
        if (list.length > 0) setDepartments(list);
        else {
          const fallbackUnis = [
            'University of Dhaka',
            'Bangladesh University of Engineering & Technology',
            'Jahangirnagar University',
            'North South University',
            'BRAC University',
            'University of Rajshahi',
            'University of Chittagong',
          ];
          setDepartments(
            RAW_DEPARTMENT_CATALOG.map((d, idx) => ({
              id: 'dept-' + encodeURIComponent(d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
              name: d.name,
              university: fallbackUnis[idx % fallbackUnis.length],
              group: d.group,
              alumniCount: 842,
              employmentRate: 84,
            }))
          );
        }
      },
      (error) => {
        console.warn('Departments listener warning:', error.message);
      }
    );

    const unsubAlumni = onSnapshot(
      collection(db, 'alumni'),
      (snap) => {
        const list: AlumniRecord[] = [];
        snap.forEach((d) => {
          const item = d.data() as AlumniRecord;
          list.push({ ...item, id: d.id });
        });
        // Merge initial verified alumni if not already in list
        const existingIds = new Set(list.map((a) => a.id));
        INITIAL_ALUMNI.forEach((initAlum) => {
          if (!existingIds.has(initAlum.id)) {
            list.push(initAlum);
          }
        });
        setAlumni(list);
      },
      (error) => {
        console.warn('Alumni listener warning:', error.message);
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

    return () => {
      unsubUniversities();
      unsubDepartments();
      unsubAlumni();
      unsubStudents();
      unsubNews();
      unsubSettings();
    };
  }, []);

  // Set up listeners for authenticated and admin collections ONLY when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setChangeRequests([]);
      setVerificationRequests([]);
      setNotifications([]);
      setAuditLogs([]);
      setAdminAssignments([]);
      setAllUsers([]);
      setLoadingData(false);
      return;
    }

    const unsubChangeRequests = onSnapshot(
      collection(db, 'changeRequests'),
      (snap) => {
        const list: ChangeRequest[] = [];
        snap.forEach((d) => list.push(d.data() as ChangeRequest));
        setChangeRequests(list);
      },
      (error) => {
        console.warn('ChangeRequests listener note:', error.message);
      }
    );

    const unsubVerificationRequests = onSnapshot(
      collection(db, 'verificationRequests'),
      (snap) => {
        const list: VerificationRequest[] = [];
        snap.forEach((d) => list.push(d.data() as VerificationRequest));
        setVerificationRequests(list);
      },
      (error) => {
        console.warn('VerificationRequests listener note:', error.message);
      }
    );

    const unsubNotifications = onSnapshot(
      collection(db, 'notifications'),
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

    const unsubAdminAssignments = onSnapshot(
      collection(db, 'adminAssignments'),
      (snap) => {
        const list: AdminAssignment[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as AdminAssignment));
        setAdminAssignments(list);
      },
      (error) => {
        console.warn('AdminAssignments listener note:', error.message);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          list.push({ ...u, uid: d.id, id: u.id || d.id });
        });

        // Merge any locally registered session accounts if not already in Firestore
        try {
          const localUsers = JSON.parse(localStorage.getItem('alumniSphereLocalUsers') || '[]');
          const existingUids = new Set(list.map((x) => x.uid));
          localUsers.forEach((loc: any) => {
            if (loc.uid && !existingUids.has(loc.uid)) {
              list.push({
                id: loc.uid,
                uid: loc.uid,
                name: loc.name || 'Member',
                email: loc.email,
                role: 'STUDENT',
                status: 'PENDING',
                profileType: 'Student',
                university: loc.university || '',
                department: loc.department || '',
                createdAt: loc.createdAt || new Date().toISOString(),
                updatedAt: loc.updatedAt || new Date().toISOString(),
              });
            }
          });
        } catch (e) {}

        // Sort so newly added members appear first!
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAllUsers(list);
        setLoadingData(false);
      },
      (error) => {
        console.warn('Users listener note:', error.message);
        setLoadingData(false);
      }
    );

    return () => {
      unsubChangeRequests();
      unsubVerificationRequests();
      unsubNotifications();
      unsubAuditLogs();
      unsubAdminAssignments();
      unsubUsers();
    };
  }, [currentUser]);

  // Interconnected dynamic statistics
  const stats = useMemo(() => {
    // Approved alumni count from database
    const approvedAlumni = alumni.filter((a) => a.status === 'APPROVED');
    // Calculate total base alumni across universities + individual dynamic approved alumni additions
    const totalBaseAlumni = universities.reduce((sum, u) => sum + (u.alumniCount || 0), 0);
    const totalAlumni = Math.max(totalBaseAlumni, approvedAlumni.length);

    const approvedStudents = students.filter((s) => s.status === 'APPROVED');
    const totalStudents = approvedStudents.length;

    const countries = new Set<string>();
    const companies = new Set<string>();

    approvedAlumni.forEach((a) => {
      if (a.country) countries.add(a.country);
      if (a.company) companies.add(a.company);
    });

    const pendingApprovals = allUsers.filter((u) => u.status === 'PENDING').length + changeRequests.filter((c) => c.status === 'PENDING').length;
    const pendingNews = news.filter((n) => n.status === 'PENDING_APPROVAL').length;
    const pendingVerifications = verificationRequests.filter((v) => v.status === 'PENDING').length;

    return {
      totalAlumni,
      totalStudents,
      totalUniversities: universities.length,
      totalDepartments: departments.length,
      totalCountries: Math.max(countries.size, 32),
      totalCompanies: Math.max(companies.size, 510),
      pendingApprovalsCount: pendingApprovals,
      pendingNewsCount: pendingNews,
      pendingVerificationsCount: pendingVerifications,
    };
  }, [universities, departments, alumni, students, allUsers, changeRequests, news, verificationRequests]);

  // Action: Approve User
  const approveUser = async (userId: string, targetRole?: Role) => {
    const existingUser = allUsers.find((u) => u.uid === userId);
    const newRole = targetRole || existingUser?.role || (existingUser?.profileType === 'Alumni' ? 'ALUMNI' : 'STUDENT');

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
    if (existingUser?.profileType === 'Alumni' || newRole === 'ALUMNI') {
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
    const alumniDocRef = doc(db, 'alumni', alumniId);
    await updateDoc(alumniDocRef, {
      isVerified,
      updatedAt: new Date().toISOString(),
    });

    // Also update users collection if matches
    const userDocRef = doc(db, 'users', alumniId);
    await updateDoc(userDocRef, {
      isVerifiedAlumni: isVerified,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    await addDoc(collection(db, 'notifications'), {
      recipientId: alumniId,
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
    const id = uni.id || 'uni-' + encodeURIComponent((uni.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'));
    await setDoc(
      doc(db, 'universities', id),
      {
        ...uni,
        id,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await logAudit('UNIVERSITY_SAVED', 'UNIVERSITY', id, `Saved university ${uni.name}`);
  };

  const saveDepartment = async (dept: Partial<Department>) => {
    const id = dept.id || 'dept-' + encodeURIComponent((dept.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'));
    await setDoc(
      doc(db, 'departments', id),
      {
        ...dept,
        id,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await logAudit('DEPARTMENT_SAVED', 'DEPARTMENT', id, `Saved department ${dept.name}`);
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

  return (
    <DataContext.Provider
      value={{
        universities,
        departments,
        batches,
        alumni,
        students,
        news,
        changeRequests,
        verificationRequests,
        notifications,
        auditLogs,
        adminAssignments,
        platformSettings,
        allUsers,
        loadingData,
        stats,
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
        saveDepartment,
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
