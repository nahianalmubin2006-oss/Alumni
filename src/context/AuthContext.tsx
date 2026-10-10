import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Role, UserStatus, ProfileType, AlumniRecord, StudentRecord } from '../types';
import { INITIAL_ALUMNI } from '../data/initialData';

// Cache to hold pre-registration form data across onAuthStateChanged trigger
const pendingRegistrationCache = new Map<string, RegisterUserData>();

interface RegisterUserData {
  name: string;
  email: string;
  password?: string;
  profileType: ProfileType;
  university: string;
  department: string;
  studentId?: string;
  educationLevel?: string;
  studentYear?: string;
  expectedGraduation?: string;
  graduationYear?: string;
  jobRole?: string;
  company?: string;
  country?: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
  linkedin?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  effectiveRole: Role;
  isSuperAdmin: boolean;
  isUniversityAdmin: boolean;
  isDepartmentAdmin: boolean;
  simulatedRole: Role | null;
  setSimulatedRole: (role: Role | null) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerUser: (data: RegisterUserData) => Promise<void>;
  loginWithGoogle: (prefilledData?: Partial<RegisterUserData>) => Promise<void>;
  logout: () => Promise<void>;
  resetPasswordWithEmail: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Super admin email constants
export const SUPER_ADMIN_EMAILS = [
  'nahianalmubin2006@gmail.com',
  'nahianalmubin212528@gmail.com',
  'nahianalmubin2@gmail.com',
];

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email.toLowerCase());
};

// Client-side Super Admin UI requires a verified Firebase email identity.
// Firestore Rules and the server independently enforce the same trust boundary.
const isTrustedSuperAdmin = (user: User | null | undefined): boolean =>
  Boolean(user?.emailVerified && isSuperAdminEmail(user.email));

export const SUPER_ADMIN_EMAIL = 'nahianalmubin2006@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);
  const isRegisteringRef = useRef<boolean>(false);

  const fetchOrCreateUserProfile = async (user: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', user.uid);
    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const isMasterAdmin = isTrustedSuperAdmin(user);

    // Look up if this user matches any alumni in INITIAL_ALUMNI or Firestore directory
    let matchedDirectoryRecord: any = null;
    let matchedRecordKind: 'ALUMNI' | 'STUDENT' = 'ALUMNI';

    const matchedInitial = INITIAL_ALUMNI.find(
      (a) => a.email && a.email.toLowerCase().trim() === normalizedEmail
    );
    if (matchedInitial) {
      matchedDirectoryRecord = matchedInitial;
      matchedRecordKind = 'ALUMNI';
    } else if (normalizedEmail) {
      try {
        const alumniSnap = await getDocs(query(collection(db, 'alumni'), where('email', '==', normalizedEmail)));
        if (!alumniSnap.empty) {
          matchedDirectoryRecord = alumniSnap.docs[0].data();
          matchedRecordKind = 'ALUMNI';
        } else {
          const studentSnap = await getDocs(query(collection(db, 'students'), where('email', '==', normalizedEmail)));
          if (!studentSnap.empty) {
            matchedDirectoryRecord = studentSnap.docs[0].data();
            matchedRecordKind = 'STUDENT';
          }
        }
      } catch (e) {}
    }

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const localPhoto = typeof window !== 'undefined' ? localStorage.getItem(`alumni_photo_${user.uid}`) : null;
        if (!data.photoUrl && localPhoto) data.photoUrl = localPhoto;

        // Auto-heal missing fields if existing directory record is found
        if ((!data.university || !data.department) && matchedDirectoryRecord) {
          data.university = data.university || matchedDirectoryRecord.university || '';
          data.department = data.department || matchedDirectoryRecord.department || '';
          data.graduationYear = data.graduationYear || matchedDirectoryRecord.graduationYear || matchedDirectoryRecord.batch || '';
          data.studentId = data.studentId || matchedDirectoryRecord.studentId || '';
          data.educationLevel = data.educationLevel || matchedDirectoryRecord.educationLevel || 'Undergraduate';
          data.jobRole = data.jobRole || matchedDirectoryRecord.jobRole || '';
          data.company = data.company || matchedDirectoryRecord.company || '';
          data.country = data.country || matchedDirectoryRecord.country || 'Bangladesh';
          data.city = data.city || matchedDirectoryRecord.city || '';
          data.bio = data.bio || matchedDirectoryRecord.bio || '';
          data.photoUrl = data.photoUrl || matchedDirectoryRecord.photoUrl || '';
          data.linkedin = data.linkedin || matchedDirectoryRecord.linkedin || '';
          if (matchedRecordKind === 'ALUMNI') {
            data.profileType = 'Alumni';
            data.role = 'ALUMNI';
          } else {
            data.profileType = 'Student';
            data.role = 'STUDENT';
            data.studentYear = data.studentYear || matchedDirectoryRecord.studentYear || '2nd year, Semester 4';
            data.expectedGraduation = data.expectedGraduation || matchedDirectoryRecord.expectedGraduation || '2028';
          }
          updateDoc(userDocRef, {
            university: data.university,
            department: data.department,
            graduationYear: data.graduationYear || '',
            studentId: data.studentId || '',
            educationLevel: data.educationLevel || 'Undergraduate',
            studentYear: data.studentYear || '',
            expectedGraduation: data.expectedGraduation || '',
            jobRole: data.jobRole || '',
            company: data.company || '',
            country: data.country || 'Bangladesh',
            city: data.city || '',
            bio: data.bio || '',
            linkedin: data.linkedin || '',
            profileType: data.profileType,
            role: data.role,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        // Ensure student and alumni profiles never require manual review to become active
        if ((data.profileType === 'Student' || data.profileType === 'Alumni') && data.status === 'PENDING') {
          data.status = 'APPROVED';
          updateDoc(userDocRef, { status: 'APPROVED', updatedAt: new Date().toISOString() }).catch(() => {});
        }
        if (isMasterAdmin) {
          const updated = {
            ...data,
            role: 'SUPER_ADMIN' as Role,
            status: 'APPROVED' as UserStatus,
            profileType: (data.profileType || 'Admin') as ProfileType,
            isVerifiedAlumni: true,
          };
          return updated;
        }
        return data;
      } else {
        // Create initial profile for new auth user - check pending registration cache first!
        let pending = pendingRegistrationCache.get(normalizedEmail) || pendingRegistrationCache.get(user.uid);
        if (!pending && typeof window !== 'undefined') {
          try {
            const cachedReg =
              sessionStorage.getItem(`alumni_pending_reg_${normalizedEmail}`) ||
              sessionStorage.getItem('alumni_pending_google') ||
              localStorage.getItem('alumni_pending_signup');
            if (cachedReg) {
              pending = JSON.parse(cachedReg);
            }
          } catch (e) {}
        }

        let initialProfile: UserProfile;

        if (pending) {
          const role: Role = isMasterAdmin ? 'SUPER_ADMIN' : pending.profileType === 'Alumni' ? 'ALUMNI' : 'STUDENT';
          initialProfile = {
            id: user.uid,
            uid: user.uid,
            email: user.email || pending.email,
            name: pending.name || user.displayName || 'Member',
            role,
            status: 'APPROVED',
            profileType: pending.profileType,
            university: pending.university,
            department: pending.department,
            studentId: pending.studentId || '',
            educationLevel: pending.educationLevel || 'Undergraduate',
            studentYear: pending.studentYear || '',
            expectedGraduation: pending.expectedGraduation || '',
            graduationYear: pending.graduationYear || '',
            jobRole: pending.jobRole || '',
            company: pending.company || '',
            country: pending.country || 'Bangladesh',
            city: pending.city || 'Dhaka',
            bio: pending.bio || '',
            photoUrl: pending.photoUrl || user.photoURL || '',
            linkedin: pending.linkedin || '',
            isVerifiedAlumni: isMasterAdmin,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else if (matchedDirectoryRecord) {
          // Pre-populate directly from known directory record
          const isAlum = matchedRecordKind === 'ALUMNI';
          initialProfile = {
            id: user.uid,
            uid: user.uid,
            email: user.email || matchedDirectoryRecord.email,
            name: user.displayName || matchedDirectoryRecord.name,
            role: isMasterAdmin ? 'SUPER_ADMIN' : (isAlum ? 'ALUMNI' : 'STUDENT'),
            status: 'APPROVED',
            profileType: isMasterAdmin ? 'Admin' : (isAlum ? 'Alumni' : 'Student'),
            university: matchedDirectoryRecord.university || (isMasterAdmin ? 'University of Dhaka' : ''),
            department: matchedDirectoryRecord.department || (isMasterAdmin ? 'Computer Science & Engineering' : ''),
            studentId: matchedDirectoryRecord.studentId || '',
            educationLevel: matchedDirectoryRecord.educationLevel || 'Undergraduate',
            studentYear: matchedDirectoryRecord.studentYear || (isAlum ? '' : '2nd year, Semester 4'),
            expectedGraduation: matchedDirectoryRecord.expectedGraduation || (isAlum ? '' : '2028'),
            graduationYear: matchedDirectoryRecord.graduationYear || matchedDirectoryRecord.batch || (isAlum ? '2024' : ''),
            jobRole: matchedDirectoryRecord.jobRole || '',
            company: matchedDirectoryRecord.company || '',
            country: matchedDirectoryRecord.country || 'Bangladesh',
            city: matchedDirectoryRecord.city || 'Dhaka',
            bio: matchedDirectoryRecord.bio || '',
            photoUrl: user.photoURL || matchedDirectoryRecord.photoUrl || '',
            linkedin: matchedDirectoryRecord.linkedin || '',
            isVerifiedAlumni: Boolean(matchedDirectoryRecord.isVerified || isMasterAdmin),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else {
          initialProfile = {
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || (isMasterAdmin ? 'Nahian Al Mubin' : user.email?.split('@')[0]) || 'Member',
            role: isMasterAdmin ? 'SUPER_ADMIN' : 'STUDENT',
            status: 'APPROVED',
            profileType: isMasterAdmin ? 'Admin' : 'Student',
            university: isMasterAdmin ? 'University of Dhaka' : '',
            department: isMasterAdmin ? 'Computer Science & Engineering' : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bio: isMasterAdmin ? 'Platform Creator & Lead Architect' : '',
            isVerifiedAlumni: isMasterAdmin,
          };
        }

        await setDoc(userDocRef, initialProfile);

        // Also ensure directory record exists if university is specified
        if (initialProfile.university && initialProfile.department) {
          if (initialProfile.profileType === 'Alumni') {
            await setDoc(doc(db, 'alumni', user.uid), {
              id: user.uid,
              userId: user.uid,
              name: initialProfile.name,
              email: initialProfile.email,
              university: initialProfile.university,
              department: initialProfile.department,
              batch: initialProfile.graduationYear || '2024',
              graduationYear: initialProfile.graduationYear || '2024',
              studentId: initialProfile.studentId || '',
              educationLevel: initialProfile.educationLevel || 'Undergraduate',
              jobRole: initialProfile.jobRole || '',
              company: initialProfile.company || '',
              country: initialProfile.country || 'Bangladesh',
              city: initialProfile.city || '',
              bio: initialProfile.bio || '',
              photoUrl: initialProfile.photoUrl || '',
              linkedin: initialProfile.linkedin || '',
              isVerified: initialProfile.isVerifiedAlumni,
              status: 'APPROVED',
              createdAt: initialProfile.createdAt,
              updatedAt: initialProfile.updatedAt,
            }, { merge: true }).catch(() => {});
          } else if (initialProfile.profileType === 'Student') {
            await setDoc(doc(db, 'students', user.uid), {
              id: user.uid,
              userId: user.uid,
              name: initialProfile.name,
              email: initialProfile.email,
              university: initialProfile.university,
              department: initialProfile.department,
              studentId: initialProfile.studentId || '',
              educationLevel: initialProfile.educationLevel || 'Undergraduate',
              studentYear: initialProfile.studentYear || '',
              expectedGraduation: initialProfile.expectedGraduation || '',
              bio: initialProfile.bio || '',
              photoUrl: initialProfile.photoUrl || '',
              status: 'APPROVED',
              createdAt: initialProfile.createdAt,
              updatedAt: initialProfile.updatedAt,
            }, { merge: true }).catch(() => {});
          }
        }

        // Record Audit log
        try {
          await addDoc(collection(db, 'auditLogs'), {
            actorId: user.uid,
            actorName: initialProfile.name,
            actorEmail: initialProfile.email,
            actorRole: initialProfile.role,
            action: 'USER_REGISTERED',
            targetType: 'USER',
            targetId: user.uid,
            details: `Registered as ${initialProfile.profileType} (${initialProfile.role})`,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Failed to record registration audit log', e);
        }

        return initialProfile;
      }
    } catch (error) {
      console.warn('Notice: Remote user profile fetch issue, using fallback profile:', error);
      // Fallback local representation to avoid hard crash
      const fallback: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'AlumniSphere User',
        role: isMasterAdmin ? 'SUPER_ADMIN' : 'STUDENT',
        status: 'APPROVED',
        profileType: isMasterAdmin ? 'Admin' : 'Student',
        university: '',
        department: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return fallback;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isRegisteringRef.current) return;
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await fetchOrCreateUserProfile(user);
          setUserProfile(profile);
        } catch (err) {
          console.warn('Auth state change notice:', err);
        }
        setLoading(false);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      const p = await fetchOrCreateUserProfile(currentUser);
      setUserProfile(p);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await fetchOrCreateUserProfile(cred.user);
    setCurrentUser(cred.user);
    setUserProfile(profile);
  };

  const registerUser = async (data: RegisterUserData) => {
    try {
      isRegisteringRef.current = true;
      const normalizedEmail = data.email.toLowerCase().trim();
      pendingRegistrationCache.set(normalizedEmail, data);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`alumni_pending_reg_${normalizedEmail}`, JSON.stringify(data));
          localStorage.setItem('alumni_pending_signup', JSON.stringify(data));
        } catch (e) {}
      }

      let user = currentUser;
      if (!user && data.password) {
        const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
        user = cred.user;
        if (data.name) {
          await updateProfile(user, { displayName: data.name.trim() });
        }
      }

      if (!user) {
        throw new Error('User authentication could not be established.');
      }

      pendingRegistrationCache.set(user.uid, data);

      const isMasterAdmin = isTrustedSuperAdmin(user);
      const initialRole: Role = isMasterAdmin
        ? 'SUPER_ADMIN'
        : data.profileType === 'Alumni'
        ? 'ALUMNI'
        : 'STUDENT';

      // No admin review is needed to become a student or alumni - status is immediately APPROVED
      const newProfile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: data.email.trim(),
        name: data.name.trim(),
        role: initialRole,
        status: 'APPROVED',
        profileType: data.profileType,
        university: data.university.trim(),
        department: data.department.trim(),
        studentId: data.studentId?.trim() || '',
        educationLevel: data.educationLevel || 'Undergraduate',
        studentYear: data.studentYear?.trim() || '',
        expectedGraduation: data.expectedGraduation?.trim() || '',
        graduationYear: data.graduationYear?.trim() || '2024',
        jobRole: data.jobRole?.trim() || '',
        company: data.company?.trim() || '',
        country: data.country?.trim() || 'Bangladesh',
        city: data.city?.trim() || 'Dhaka',
        bio: data.bio?.trim() || '',
        photoUrl: data.photoUrl || '',
        linkedin: data.linkedin?.trim() || '',
        isVerifiedAlumni: isMasterAdmin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, newProfile);
      setUserProfile(newProfile);

      // Create matching student/alumni record immediately active in directory
      if (data.profileType === 'Alumni') {
        const alumniDocRef = doc(db, 'alumni', user.uid);
        await setDoc(alumniDocRef, {
          id: user.uid,
          userId: user.uid,
          name: newProfile.name,
          email: newProfile.email,
          university: newProfile.university,
          department: newProfile.department,
          batch: newProfile.graduationYear || '2024',
          studentId: newProfile.studentId || '',
          educationLevel: newProfile.educationLevel || 'Undergraduate',
          graduationYear: newProfile.graduationYear || '2024',
          jobRole: newProfile.jobRole || '',
          company: newProfile.company || '',
          country: newProfile.country || 'Bangladesh',
          city: newProfile.city || '',
          bio: newProfile.bio || '',
          photoUrl: newProfile.photoUrl || '',
          linkedin: newProfile.linkedin || '',
          isVerified: isMasterAdmin,
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (data.profileType === 'Student') {
        const studentDocRef = doc(db, 'students', user.uid);
        await setDoc(studentDocRef, {
          id: user.uid,
          userId: user.uid,
          name: newProfile.name,
          email: newProfile.email,
          university: newProfile.university,
          department: newProfile.department,
          studentId: newProfile.studentId || '',
          educationLevel: newProfile.educationLevel || 'Undergraduate',
          studentYear: newProfile.studentYear || '',
          expectedGraduation: newProfile.expectedGraduation || '',
          bio: newProfile.bio || '',
          photoUrl: newProfile.photoUrl || '',
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      pendingRegistrationCache.delete(normalizedEmail);
      pendingRegistrationCache.delete(user.uid);
      isRegisteringRef.current = false;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('alumni-profile-updated', { detail: newProfile }));
        window.dispatchEvent(new CustomEvent('alumni-directory-updated', { detail: newProfile }));
        if (newProfile.university) {
          window.dispatchEvent(new CustomEvent('university-updated', { detail: { name: newProfile.university } }));
        }
      }

      // Add notification for admin so administrators can see the new student/alumni
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'ADMIN',
        recipientRole: 'SUPER_ADMIN',
        title: `New ${data.profileType} Joined`,
        message: `${data.name} joined as a ${data.profileType} for ${data.university} (${data.department}). Profile is immediately active in directory.`,
        type: 'ACCOUNT',
        read: false,
        actionUrl: '/admin',
        createdAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      isRegisteringRef.current = false;
      console.error('Registration error:', err);
      throw err;
    }
  };

  const loginWithGoogle = async (prefilledData?: Partial<RegisterUserData>) => {
    if (prefilledData) {
      if (prefilledData.email) {
        pendingRegistrationCache.set(prefilledData.email.toLowerCase().trim(), prefilledData as RegisterUserData);
      }
      try {
        sessionStorage.setItem('alumni_pending_google', JSON.stringify(prefilledData));
        localStorage.setItem('alumni_pending_signup', JSON.stringify(prefilledData));
      } catch (e) {}
    }
    const res = await signInWithPopup(auth, googleProvider);
    if (prefilledData) {
      pendingRegistrationCache.set(res.user.uid, prefilledData as RegisterUserData);
      if (res.user.email) {
        pendingRegistrationCache.set(res.user.email.toLowerCase().trim(), prefilledData as RegisterUserData);
      }
    }
    const profile = await fetchOrCreateUserProfile(res.user);
    setCurrentUser(res.user);
    setUserProfile(profile);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alumni-profile-updated', { detail: profile }));
      window.dispatchEvent(new CustomEvent('alumni-directory-updated', { detail: profile }));
      if (profile.university) {
        window.dispatchEvent(new CustomEvent('university-updated', { detail: { name: profile.university } }));
      }
    }
  };

  const logout = async () => {
    localStorage.removeItem('alumniSphereSyntheticSession');
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    setUserProfile(null);
    setSimulatedRole(null);
  };

  const resetPasswordWithEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    const now = new Date().toISOString();
    const userDocRef = doc(db, 'users', currentUser.uid);

    const safeUpdates: Partial<UserProfile> = { ...data, updatedAt: now };
    delete safeUpdates.id;
    delete safeUpdates.uid;
    delete safeUpdates.email;
    delete safeUpdates.status;
    delete safeUpdates.isVerifiedAlumni;
    delete safeUpdates.assignedUniversity;
    delete safeUpdates.assignedDepartment;
    delete safeUpdates.createdAt;

    // Support profileType and role transitions between Student and Alumni
    if (data.profileType) {
      if (data.profileType === 'Alumni') {
        safeUpdates.profileType = 'Alumni';
        safeUpdates.role = 'ALUMNI';
      } else if (data.profileType === 'Student') {
        safeUpdates.profileType = 'Student';
        safeUpdates.role = 'STUDENT';
      }
    }

    const updated: UserProfile = {
      ...userProfile,
      ...safeUpdates,
      updatedAt: now,
    };

    if (safeUpdates.photoUrl && typeof window !== 'undefined') {
      try { localStorage.setItem(`alumni_photo_${currentUser.uid}`, safeUpdates.photoUrl); } catch (e) {}
    }

    // 1. Update the user's canonical account document in Firestore
    await updateDoc(userDocRef, safeUpdates);

    // 2. Synchronize to public directory collections (alumni or students)
    if (updated.profileType === 'Alumni') {
      const alumniDocRef = doc(db, 'alumni', currentUser.uid);
      const fullAlumniData: Record<string, any> = {
        id: currentUser.uid,
        userId: currentUser.uid,
        name: updated.name || '',
        email: updated.email || currentUser.email || '',
        university: updated.university || '',
        department: updated.department || '',
        batch: updated.graduationYear || userProfile.graduationYear || '2024',
        studentId: updated.studentId || '',
        educationLevel: updated.educationLevel || 'Undergraduate',
        graduationYear: updated.graduationYear || userProfile.graduationYear || '2024',
        jobRole: updated.jobRole || '',
        company: updated.company || '',
        country: updated.country || 'Bangladesh',
        city: updated.city || '',
        bio: updated.bio || '',
        photoUrl: updated.photoUrl || '',
        linkedin: updated.linkedin || '',
        isVerified: Boolean(updated.isVerifiedAlumni),
        status: 'APPROVED',
        updatedAt: now,
      };

      await setDoc(alumniDocRef, fullAlumniData, { merge: true }).catch((err) => {
        console.warn('Set alumni document note:', err);
      });

      // Also update any claimed legacy alumni records where userId == currentUser.uid
      try {
        const alumniSnap = await getDocs(query(collection(db, 'alumni'), where('userId', '==', currentUser.uid)));
        for (const item of alumniSnap.docs) {
          if (item.id !== currentUser.uid) {
            await updateDoc(doc(db, 'alumni', item.id), fullAlumniData).catch(() => {});
          }
        }
      } catch (e) {}
    } else if (updated.profileType === 'Student') {
      const studentDocRef = doc(db, 'students', currentUser.uid);
      const fullStudentData: Record<string, any> = {
        id: currentUser.uid,
        userId: currentUser.uid,
        name: updated.name || '',
        email: updated.email || currentUser.email || '',
        university: updated.university || '',
        department: updated.department || '',
        studentId: updated.studentId || '',
        educationLevel: updated.educationLevel || 'Undergraduate',
        studentYear: updated.studentYear || '',
        expectedGraduation: updated.expectedGraduation || '',
        bio: updated.bio || '',
        photoUrl: updated.photoUrl || '',
        status: 'APPROVED',
        updatedAt: now,
      };

      await setDoc(studentDocRef, fullStudentData, { merge: true }).catch((err) => {
        console.warn('Set student document note:', err);
      });

      // Also update any matching student records where userId == currentUser.uid
      try {
        const studentSnap = await getDocs(query(collection(db, 'students'), where('userId', '==', currentUser.uid)));
        for (const item of studentSnap.docs) {
          if (item.id !== currentUser.uid) {
            await updateDoc(doc(db, 'students', item.id), fullStudentData).catch(() => {});
          }
        }
      } catch (e) {}
    }

    // 3. Update author info on user's posts
    try {
      const postsSnap = await getDocs(query(collection(db, 'posts'), where('userId', '==', currentUser.uid)));
      for (const p of postsSnap.docs) {
        await updateDoc(doc(db, 'posts', p.id), {
          authorName: updated.name,
          authorPhotoUrl: updated.photoUrl || '',
          authorUniversity: updated.university || '',
          authorDepartment: updated.department || '',
          updatedAt: now,
        }).catch(() => {});
      }
    } catch (e) {}

    // 4. Dispatch browser custom events for instant zero-latency updates on all open views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alumni-profile-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('alumni-directory-updated', { detail: updated }));
      if (updated.university) {
        window.dispatchEvent(new CustomEvent('university-updated', { detail: { name: updated.university } }));
      }
    }

    setUserProfile(updated);
  };

  // Public website role: public members operate as regular students or alumni
  const effectiveRole: Role = userProfile?.role || 'STUDENT';

  // Role calculations
  const isSuperAdmin = isTrustedSuperAdmin(currentUser);
  const isUniversityAdmin = isSuperAdmin || userProfile?.role === 'UNIVERSITY_ADMIN';
  const isDepartmentAdmin = isSuperAdmin || userProfile?.role === 'DEPARTMENT_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        effectiveRole,
        isSuperAdmin,
        isUniversityAdmin,
        isDepartmentAdmin,
        simulatedRole,
        setSimulatedRole,
        loginWithEmail,
        registerUser,
        loginWithGoogle,
        logout,
        resetPasswordWithEmail,
        updateProfileData,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
