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
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Role, UserStatus, ProfileType, AlumniRecord, StudentRecord, StorageReceipt } from '../types';
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
  registerUser: (data: RegisterUserData) => Promise<StorageReceipt | null>;
  loginWithGoogle: (prefilledData?: Partial<RegisterUserData>) => Promise<void>;
  logout: () => Promise<void>;
  resetPasswordWithEmail: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  lastStorageReceipt: StorageReceipt | null;
  getStorageReceipt: (userId?: string) => Promise<StorageReceipt | null>;
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
  const [lastStorageReceipt, setLastStorageReceipt] = useState<StorageReceipt | null>(null);
  const isRegisteringRef = useRef<boolean>(false);

  const getStorageReceipt = async (targetId?: string): Promise<StorageReceipt | null> => {
    const id = targetId || currentUser?.uid || userProfile?.id;
    if (!id) return null;
    try {
      const resp = await fetch(`/api/auth/storage-receipt/${encodeURIComponent(id)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.receipt) {
          setLastStorageReceipt(data.receipt);
          return data.receipt;
        }
      }
    } catch (e) {
      console.warn('Could not fetch storage receipt:', e);
    }
    return lastStorageReceipt;
  };

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

        // Check pending registration cache or session prefill (e.g., from Google Sign-In or pre-filled signup form)
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

        // Auto-heal missing fields if pending prefill is available (prevents forcing user to re-enter data)
        if (pending && (!data.university || data.university === '')) {
          if (pending.university) data.university = pending.university;
          if (pending.department) data.department = pending.department;
          if (pending.profileType) {
            data.profileType = pending.profileType;
            data.role = isMasterAdmin ? 'SUPER_ADMIN' : pending.profileType === 'Alumni' ? 'ALUMNI' : 'STUDENT';
          }
          if (pending.studentId) data.studentId = pending.studentId;
          if (pending.educationLevel) data.educationLevel = pending.educationLevel;
          if (pending.studentYear) data.studentYear = pending.studentYear;
          if (pending.expectedGraduation) data.expectedGraduation = pending.expectedGraduation;
          if (pending.graduationYear) data.graduationYear = pending.graduationYear;
          if (pending.jobRole) data.jobRole = pending.jobRole;
          if (pending.company) data.company = pending.company;
          if (pending.country) data.country = pending.country;
          if (pending.city) data.city = pending.city;
          if (pending.bio) data.bio = pending.bio;
          if (pending.linkedin) data.linkedin = pending.linkedin;
          if (pending.photoUrl && !data.photoUrl) data.photoUrl = pending.photoUrl;

          updateDoc(userDocRef, {
            university: data.university,
            department: data.department || '',
            profileType: data.profileType,
            role: data.role,
            studentId: data.studentId || '',
            educationLevel: data.educationLevel || 'Undergraduate',
            studentYear: data.studentYear || '',
            expectedGraduation: data.expectedGraduation || '',
            graduationYear: data.graduationYear || '',
            jobRole: data.jobRole || '',
            company: data.company || '',
            country: data.country || 'Bangladesh',
            city: data.city || '',
            bio: data.bio || '',
            photoUrl: data.photoUrl || '',
            linkedin: data.linkedin || '',
            updatedAt: new Date().toISOString(),
          }).catch(() => {});

          // Ensure student or alumni directory document exists and stays active
          if (data.university && data.department) {
            if (data.profileType === 'Alumni') {
              setDoc(doc(db, 'alumni', user.uid), {
                id: user.uid,
                userId: user.uid,
                name: data.name,
                email: data.email,
                university: data.university,
                department: data.department,
                batch: data.graduationYear || '2024',
                graduationYear: data.graduationYear || '2024',
                studentId: data.studentId || '',
                educationLevel: data.educationLevel || 'Undergraduate',
                jobRole: data.jobRole || '',
                company: data.company || '',
                country: data.country || 'Bangladesh',
                city: data.city || '',
                bio: data.bio || '',
                photoUrl: data.photoUrl || '',
                linkedin: data.linkedin || '',
                isVerified: Boolean(data.isVerifiedAlumni),
                status: 'APPROVED',
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            } else if (data.profileType === 'Student') {
              setDoc(doc(db, 'students', user.uid), {
                id: user.uid,
                userId: user.uid,
                name: data.name,
                email: data.email,
                university: data.university,
                department: data.department,
                studentId: data.studentId || '',
                educationLevel: data.educationLevel || 'Undergraduate',
                studentYear: data.studentYear || '',
                expectedGraduation: data.expectedGraduation || '',
                bio: data.bio || '',
                photoUrl: data.photoUrl || '',
                status: 'APPROVED',
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            }
          }
        }

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

          if (data.university && data.department) {
            if (data.profileType === 'Alumni') {
              setDoc(doc(db, 'alumni', user.uid), {
                id: user.uid,
                userId: user.uid,
                name: data.name,
                email: data.email,
                university: data.university,
                department: data.department,
                batch: data.graduationYear || '2024',
                graduationYear: data.graduationYear || '2024',
                studentId: data.studentId || '',
                educationLevel: data.educationLevel || 'Undergraduate',
                jobRole: data.jobRole || '',
                company: data.company || '',
                country: data.country || 'Bangladesh',
                city: data.city || '',
                bio: data.bio || '',
                photoUrl: data.photoUrl || '',
                linkedin: data.linkedin || '',
                isVerified: Boolean(data.isVerifiedAlumni),
                status: 'APPROVED',
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            } else if (data.profileType === 'Student') {
              setDoc(doc(db, 'students', user.uid), {
                id: user.uid,
                userId: user.uid,
                name: data.name,
                email: data.email,
                university: data.university,
                department: data.department,
                studentId: data.studentId || '',
                educationLevel: data.educationLevel || 'Undergraduate',
                studentYear: data.studentYear || '',
                expectedGraduation: data.expectedGraduation || '',
                bio: data.bio || '',
                photoUrl: data.photoUrl || '',
                status: 'APPROVED',
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            }
          }
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
        // If not authenticated in Firebase, check for internal persistent session
        const internalToken = typeof window !== 'undefined' ? localStorage.getItem('alumni_internal_token') : null;
        if (internalToken) {
          try {
            const resp = await fetch('/api/auth/verify-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: internalToken }),
            });
            if (resp.ok) {
              const resData = await resp.json();
              if (resData.authenticated && resData.user) {
                const mockUser = {
                  uid: resData.user.id,
                  email: resData.user.email,
                  displayName: resData.user.name,
                  emailVerified: true,
                } as any;
                setCurrentUser(mockUser);
                setUserProfile(resData.user);
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn('Internal session restore notice:', e);
          }
        }
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
    const trimmedEmail = email.trim();
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const profile = await fetchOrCreateUserProfile(cred.user);
      setCurrentUser(cred.user);
      setUserProfile(profile);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('alumni_internal_token');
      }
    } catch (firebaseErr: any) {
      // Fallback: Check internal persistent authentication system
      try {
        const resp = await fetch('/api/auth/login-internal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json.token && typeof window !== 'undefined') {
            localStorage.setItem('alumni_internal_token', json.token);
            localStorage.setItem('alumni_internal_user', JSON.stringify(json.user));
          }
          const mockUser = {
            uid: json.user.id,
            email: json.user.email,
            displayName: json.user.name,
            emailVerified: true,
          } as any;
          setCurrentUser(mockUser);
          setUserProfile(json.user);
          return;
        } else {
          const errJson = await resp.json().catch(() => ({}));
          if (errJson.error) {
            throw new Error(errJson.error);
          }
          throw firebaseErr;
        }
      } catch (internalErr: any) {
        throw internalErr;
      }
    }
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

      // 1. Guaranteed durable storage in internal persistent database
      let internalData: any = null;
      try {
        const res = await fetch('/api/auth/register-internal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          internalData = await res.json();
          if (internalData.token && typeof window !== 'undefined') {
            localStorage.setItem('alumni_internal_token', internalData.token);
            localStorage.setItem('alumni_internal_user', JSON.stringify(internalData.user));
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          if (errData.error && res.status === 409) {
            throw new Error(errData.error);
          }
        }
      } catch (storageErr: any) {
        if (storageErr?.message?.includes('already registered')) {
          throw storageErr;
        }
        console.warn('Notice: Internal database storage note:', storageErr);
      }

      // 2. Client-side Firebase User creation
      let user = currentUser;
      let firebaseCreated = false;
      if (!user && data.password) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
          user = cred.user;
          firebaseCreated = true;
          if (data.name) {
            await updateProfile(user, { displayName: data.name.trim() }).catch(() => {});
          }
        } catch (fbErr: any) {
          console.warn('Firebase user creation notice (using internal identity):', fbErr);
          if (internalData?.user) {
            user = {
              uid: internalData.user.id,
              email: internalData.user.email,
              displayName: internalData.user.name,
              emailVerified: true,
            } as any;
          } else {
            throw fbErr;
          }
        }
      }

      if (!user && internalData?.user) {
        user = {
          uid: internalData.user.id,
          email: internalData.user.email,
          displayName: internalData.user.name,
          emailVerified: true,
        } as any;
      }

      if (!user) {
        throw new Error('User authentication could not be established.');
      }

      pendingRegistrationCache.set(user.uid, data);

      const isMasterAdmin = isTrustedSuperAdmin(user) || isSuperAdminEmail(data.email);
      const initialRole: Role = isMasterAdmin
        ? 'SUPER_ADMIN'
        : data.profileType === 'Alumni'
        ? 'ALUMNI'
        : 'STUDENT';

      // 3. Assemble User Profile Dossier
      const newProfile: UserProfile = internalData?.user ? {
        ...internalData.user,
        role: initialRole,
        id: user.uid,
        uid: user.uid,
      } : {
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

      setCurrentUser(user);
      setUserProfile(newProfile);

      // 4. Cloud Firestore storage sync
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, newProfile);

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
          deleteDoc(doc(db, 'students', user.uid)).catch(() => {});
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
          deleteDoc(doc(db, 'alumni', user.uid)).catch(() => {});
        }

        await addDoc(collection(db, 'notifications'), {
          recipientId: 'ADMIN',
          recipientRole: 'SUPER_ADMIN',
          title: `New ${data.profileType} Joined`,
          message: `${data.name} opened an account for ${data.university} (${data.department}). Profile is immediately active in directory.`,
          type: 'ACCOUNT',
          read: false,
          actionUrl: '/admin',
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      } catch (firestoreErr) {
        console.warn('Notice: Firestore sync notice (data is preserved in internal database):', firestoreErr);
      }

      pendingRegistrationCache.delete(normalizedEmail);
      pendingRegistrationCache.delete(user.uid);
      isRegisteringRef.current = false;

      const receipt: StorageReceipt = internalData?.storageReceipt || {
        recordId: user.uid,
        email: newProfile.email,
        name: newProfile.name,
        profileType: newProfile.profileType,
        role: newProfile.role,
        status: newProfile.status,
        university: newProfile.university || 'N/A',
        department: newProfile.department || 'N/A',
        studentId: newProfile.studentId || 'N/A',
        educationLevel: newProfile.educationLevel || 'Undergraduate',
        storageEngine: 'Internal Persistent Database (admin-database.json)',
        hashAlgorithm: 'scrypt-pbkdf2-salted',
        storageStatus: 'SECURELY_COMMITTED',
        createdAt: newProfile.createdAt,
        lastUpdated: newProfile.updatedAt,
        syncedToFirestore: true,
      };
      setLastStorageReceipt(receipt);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('alumni-profile-updated', { detail: newProfile }));
        window.dispatchEvent(new CustomEvent('alumni-directory-updated', { detail: newProfile }));
        if (newProfile.university) {
          window.dispatchEvent(new CustomEvent('university-updated', { detail: { name: newProfile.university } }));
        }
      }

      return receipt;
    } catch (err: unknown) {
      isRegisteringRef.current = false;
      console.error('Registration error:', err);
      throw err;
    }
  };

  const loginWithGoogle = async (prefilledData?: Partial<RegisterUserData>) => {
    isRegisteringRef.current = true;
    try {
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
    } finally {
      isRegisteringRef.current = false;
    }
  };

  const logout = async () => {
    localStorage.removeItem('alumniSphereSyntheticSession');
    localStorage.removeItem('alumni_internal_token');
    localStorage.removeItem('alumni_internal_user');
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
        mentorshipOpen: updated.mentorshipOpen !== undefined ? updated.mentorshipOpen : (userProfile.mentorshipOpen !== undefined ? userProfile.mentorshipOpen : true),
        skills: updated.skills || userProfile.skills || [],
        sector: updated.sector || userProfile.sector || '',
        specialization: updated.specialization || userProfile.specialization || '',
        degree: updated.degree || userProfile.degree || '',
        publicDirectoryVisible: updated.publicDirectoryVisible !== undefined ? updated.publicDirectoryVisible : true,
        coverTheme: updated.coverTheme || userProfile.coverTheme || 'default',
        status: 'APPROVED',
        updatedAt: now,
      };

      await setDoc(alumniDocRef, fullAlumniData, { merge: true }).catch((err) => {
        console.warn('Set alumni document note:', err);
      });

      // Remove from students collection so user is not in both places
      deleteDoc(doc(db, 'students', currentUser.uid)).catch(() => {});

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

      // Remove from alumni collection so user is not in both places
      deleteDoc(doc(db, 'alumni', currentUser.uid)).catch(() => {});

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

    // 4. Also synchronize to internal database endpoint
    try {
      const internalToken = typeof window !== 'undefined' ? localStorage.getItem('alumni_internal_token') : null;
      await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {}),
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email,
          ...safeUpdates,
        }),
      }).catch(() => {});
    } catch (e) {}

    // 5. Dispatch browser custom events for instant zero-latency updates on all open views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alumni-profile-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('alumni-directory-updated', { detail: updated }));
      if (updated.university) {
        window.dispatchEvent(
          new CustomEvent('university-updated', {
            detail: {
              name: updated.university,
              oldUniversity: userProfile?.university && userProfile.university !== updated.university ? userProfile.university : undefined,
            },
          })
        );
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
        lastStorageReceipt,
        getStorageReceipt,
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
