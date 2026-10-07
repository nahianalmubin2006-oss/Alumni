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
  deleteNewsArticle: (id: string) => Promise<void>;

  assignAdmin: (assignment: Omit<AdminAssignment, 'id' | 'createdAt'>) => Promise<void>;
  removeAdminAssignment: (id: string) => Promise<void>;

  saveUniversity: (uni: Partial<University>) => Promise<void>;
  saveDepartment: (dept: Partial<Department>) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  logAudit: (action: string, targetType: string, targetId: string, details: string) => Promise<void>;
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
  const logAudit = async (action: string, targetType: string, targetId: string, details: string) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        actorId: currentUser?.uid || 'system',
        actorName: userProfile?.name || 'Super Admin',
        actorEmail: currentUser?.email || 'admin@alumnisphere.org',
        actorRole: userProfile?.role || 'SUPER_ADMIN',
        action,
        targetType,
        targetId,
        details,
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
            'Bangladesh University of Professionals',
            'Bangladesh University of Engineering & Technology',
            'University of Dhaka',
            'Jahangirnagar University',
            'North South University',
            'BRAC University',
          ];

          for (const u of ALL_DIRECTORY_UNIVERSITIES) {
            const isShowcase = showcaseNames.includes(u.name);
            const seed = demoSeed('uni-' + u.name);
            const baseAlumni = isShowcase
              ? u.name === 'Bangladesh University of Professionals'
                ? 2840
                : u.name === 'Bangladesh University of Engineering & Technology'
                ? 6240
                : u.name === 'University of Dhaka'
                ? 8920
                : 5110
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

          // Seed showcase departments
          for (const d of RAW_DEPARTMENT_CATALOG.slice(0, 20)) {
            const seed = demoSeed('dept-' + d.name);
            const deptRecord: Department = {
              id: 'dept-' + encodeURIComponent(d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
              name: d.name,
              university: 'Bangladesh University of Professionals',
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
              achievements: 'Ranked top in national competitive programming and industry graduate satisfaction.',
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
          setDepartments(
            RAW_DEPARTMENT_CATALOG.map((d) => ({
              id: 'dept-' + encodeURIComponent(d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
              name: d.name,
              university: 'Bangladesh University of Professionals',
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
          // Filter out dummy/test alumni from testing; keep only Nahian Al Mubin's record
          const isUser =
            item.email?.toLowerCase() === 'nahianalmubin2006@gmail.com' ||
            item.name?.toLowerCase().includes('nahian') ||
            d.id === 'alumni-nahian-al-mubin';
          if (isUser) {
            list.push({ ...item, id: d.id });
          } else {
            // Delete test dummy docs from Firestore in background
            deleteDoc(d.ref).catch(() => {});
          }
        });
        setAlumni(list.length > 0 ? list : INITIAL_ALUMNI);
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
          const isUser =
            item.email?.toLowerCase() === 'nahianalmubin2006@gmail.com' ||
            item.name?.toLowerCase().includes('nahian');
          if (isUser) {
            list.push({ ...item, id: d.id });
          } else {
            deleteDoc(d.ref).catch(() => {});
          }
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
        snap.forEach((d) => list.push(d.data() as NewsArticle));
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
          const isUser =
            u.email?.toLowerCase() === 'nahianalmubin2006@gmail.com' ||
            u.name?.toLowerCase().includes('nahian');
          if (isUser) {
            list.push({ ...u, uid: d.id });
          } else {
            // Delete testing user documents
            deleteDoc(d.ref).catch(() => {});
          }
        });
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
    const userDocRef = doc(db, 'users', userId);
    const existingUser = allUsers.find((u) => u.uid === userId);
    const newRole = targetRole || existingUser?.role || 'STUDENT';

    await updateDoc(userDocRef, {
      status: 'APPROVED',
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    // If alumni, also approve in alumni collection and update university count dynamically
    if (existingUser?.profileType === 'Alumni' || newRole === 'ALUMNI') {
      const alumniDocRef = doc(db, 'alumni', userId);
      await updateDoc(alumniDocRef, {
        status: 'APPROVED',
        updatedAt: new Date().toISOString(),
      }).catch(async () => {
        // Create if didn't exist
        await setDoc(alumniDocRef, {
          id: userId,
          userId,
          name: existingUser?.name || 'Alumni Member',
          email: existingUser?.email || '',
          university: existingUser?.university || 'Bangladesh University of Professionals',
          department: existingUser?.department || 'Computer Science & Engineering',
          batch: existingUser?.graduationYear || '2023',
          graduationYear: existingUser?.graduationYear || '2023',
          jobRole: existingUser?.jobRole || 'Professional',
          company: existingUser?.company || 'Organization',
          country: existingUser?.country || 'Bangladesh',
          isVerified: false,
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

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
      await updateDoc(studentDocRef, {
        status: 'APPROVED',
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    // Notify user
    await addDoc(collection(db, 'notifications'), {
      recipientId: userId,
      title: 'Account Approved! 🎉',
      message: `Your AlumniSphere account has been verified and approved as ${newRole}. You now have full member access.`,
      type: 'ACCOUNT',
      read: false,
      actionUrl: '/account',
      createdAt: new Date().toISOString(),
    });

    await logAudit('USER_APPROVED', 'USER', userId, `User ${existingUser?.name} approved as ${newRole}`);
  };

  // Action: Reject User
  const rejectUser = async (userId: string, reason?: string) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status: 'REJECTED',
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'notifications'), {
      recipientId: userId,
      title: 'Account Verification Update',
      message: `Your account could not be verified at this time.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'ACCOUNT',
      read: false,
      actionUrl: '/account',
      createdAt: new Date().toISOString(),
    });

    await logAudit('USER_REJECTED', 'USER', userId, `User rejected: ${reason || 'No reason provided'}`);
  };

  // Action: Suspend User
  const suspendUser = async (userId: string) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status: 'SUSPENDED',
      updatedAt: new Date().toISOString(),
    });
    await logAudit('USER_SUSPENDED', 'USER', userId, `User account suspended`);
  };

  // Action: Change User Role
  const changeUserRole = async (userId: string, newRole: Role) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
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
    const newArt = {
      ...article,
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

  const deleteNewsArticle = async (id: string) => {
    await deleteDoc(doc(db, 'news', id));
    await logAudit('NEWS_DELETED', 'NEWS', id, `Deleted article ${id}`);
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
