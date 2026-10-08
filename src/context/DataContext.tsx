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
  AppNotification,
  AuditLog,
  AdminAssignment,
  PlatformSetting,
  Role,
  UserProfile,
  UserPost,
  PostReactionType,
} from '../types';
import {
  ALL_DIRECTORY_UNIVERSITIES,
  RAW_DEPARTMENT_CATALOG,
  INITIAL_ALUMNI,
  INITIAL_NEWS,
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_POSTS,
  demoSeed,
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
  const { currentUser, userProfile, isSuperAdmin, updateProfileData } = useAuth();

  // Initialize with rich static directory data for instant offline-first rendering
  const [universities, setUniversities] = useState<University[]>(() =>
    ALL_DIRECTORY_UNIVERSITIES.map((u) => ({
      id: 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      name: u.name, type: u.type, location: '', verified: false,
      alumniCount: 0, studentCount: 0, followersCount: 0, departmentCount: 0,
      employmentRate: 0, higherStudiesRate: 0, countriesCount: 0, companiesCount: 0, website: '',
    }))
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [posts, setPosts] = useState<UserPost[]>(INITIAL_POSTS);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting>(INITIAL_PLATFORM_SETTINGS);
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

  // Seed only source-verified department records; never seed fabricated metrics.
  useEffect(() => {
    const initializeDatabase = async () => {
      if (!isSuperAdmin) return;
      try {
        const uniSnap = await getDocs(collection(db, 'universities'));
        if (uniSnap.empty) {
          for (const u of ALL_DIRECTORY_UNIVERSITIES) {
            const id = 'uni-' + encodeURIComponent(u.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
            await setDoc(doc(db, 'universities', id), {
              id, name: u.name, type: u.type, location: '', verified: false,
              alumniCount: 0, studentCount: 0, departmentCount: 0, employmentRate: 0,
              higherStudiesRate: 0, countriesCount: 0, companiesCount: 0, website: '',
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
          }
        }
        const deptSnap = await getDocs(collection(db, 'departments'));
        if (deptSnap.empty) {
          for (const seed of VERIFIED_DEPARTMENT_SEEDS) {
            const id = 'dept-' + encodeURIComponent((seed.university + '-' + seed.name).toLowerCase().replace(/[^a-z0-9]/g, '-'));
            await setDoc(doc(db, 'departments', id), {
              id, name: seed.name, university: seed.university, group: seed.group,
              alumniCount: 0, studentCount: 0, employmentRate: 0, higherStudiesRate: 0,
              countriesCount: 0, companiesCount: 0, verified: true, sourceUrl: seed.sourceUrl,
              verifiedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) { console.warn('Verified directory initialization note:', err); }
    };
    initializeDatabase();
  }, [isSuperAdmin]);

  // Set up real-time listeners for public Firestore collections
  useEffect(() => {
    const unsubUniversities = onSnapshot(
      collection(db, 'universities'),
      (snap) => {
        const list: University[] = [];
        snap.forEach((d) => list.push(d.data() as University));
        if (list.length > 0) setUniversities(list);
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
        verified: dept.verified === true,
        sourceUrl: dept.sourceUrl || '',
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
        notifications,
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
