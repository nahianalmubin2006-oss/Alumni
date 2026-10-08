import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Role, UserStatus, ProfileType } from '../types';

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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Super admin email constants
export const SUPER_ADMIN_EMAILS = ['nahianalmubin2006@gmail.com'];

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email.toLowerCase());
};

export const SUPER_ADMIN_EMAIL = 'nahianalmubin2006@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);

  const fetchOrCreateUserProfile = async (user: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // On public website, user behaves as a normal verified member
        if (isSuperAdminEmail(user.email)) {
          const updated = {
            ...data,
            profileType: (data.profileType === 'Admin' ? 'Alumni' : data.profileType) as ProfileType,
            role: (data.role === 'SUPER_ADMIN' ? 'ALUMNI' : data.role) as Role,
            status: 'APPROVED' as UserStatus,
            isVerifiedAlumni: true,
          };
          return updated;
        }
        return data;
      } else {
        // Create initial profile for new auth user
        const isMasterAdmin = isSuperAdminEmail(user.email);
        const initialProfile: UserProfile = {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || (isMasterAdmin ? 'Nahian Al Mubin' : user.email?.split('@')[0]) || 'Member',
          role: isMasterAdmin ? 'ALUMNI' : 'STUDENT',
          status: isMasterAdmin ? 'APPROVED' : 'PENDING',
          profileType: isMasterAdmin ? 'Alumni' : 'Student',
          university: isMasterAdmin ? 'University of Dhaka' : '',
          department: isMasterAdmin ? 'Computer Science & Engineering' : '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          bio: isMasterAdmin ? 'Platform Creator & DU CSE Alumnus' : '',
          isVerifiedAlumni: isMasterAdmin,
        };
        await setDoc(userDocRef, initialProfile);

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
        role: isSuperAdminEmail(user.email) ? 'SUPER_ADMIN' : 'STUDENT',
        status: isSuperAdminEmail(user.email) ? 'APPROVED' : 'PENDING',
        profileType: isSuperAdminEmail(user.email) ? 'Admin' : 'Student',
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
      let user = currentUser;
      if (!user && data.password) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
          user = cred.user;
          if (data.name) {
            await updateProfile(user, { displayName: data.name });
          }
        } catch (authErr: any) {
          throw authErr;
        }}
      }

      if (!user) {
        throw new Error('User authentication could not be established.');
      }

      const isMasterAdmin = isSuperAdminEmail(data.email);
      const initialRole: Role = isMasterAdmin
        ? 'SUPER_ADMIN'
        : data.profileType === 'Alumni'
        ? 'ALUMNI'
        : 'STUDENT';

      const newProfile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: data.email,
        name: data.name,
        role: initialRole,
        status: isMasterAdmin ? 'APPROVED' : 'PENDING',
        profileType: data.profileType,
        university: data.university,
        department: data.department,
        studentId: data.studentId || '',
        educationLevel: data.educationLevel || '',
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
        isVerifiedAlumni: isMasterAdmin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, newProfile);
      setUserProfile(newProfile);

      // Create matching student/alumni record in pending state
      if (data.profileType === 'Alumni') {
        const alumniDocRef = doc(db, 'alumni', user.uid);
        await setDoc(alumniDocRef, {
          id: user.uid,
          userId: user.uid,
          name: data.name,
          email: data.email,
          university: data.university,
          department: data.department,
          batch: data.graduationYear || '2023',
          studentId: data.studentId || '',
          educationLevel: data.educationLevel || '',
          graduationYear: data.graduationYear || '2023',
          jobRole: data.jobRole || '',
          company: data.company || '',
          country: data.country || 'Bangladesh',
          city: data.city || '',
          bio: data.bio || '',
          linkedin: data.linkedin || '',
          isVerified: isMasterAdmin,
          status: isMasterAdmin ? 'APPROVED' : 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if (data.profileType === 'Student') {
        const studentDocRef = doc(db, 'students', user.uid);
        await setDoc(studentDocRef, {
          id: user.uid,
          userId: user.uid,
          name: data.name,
          email: data.email,
          university: data.university,
          department: data.department,
          studentId: data.studentId || '',
          educationLevel: data.educationLevel || '',
          studentYear: data.studentYear || '',
          expectedGraduation: data.expectedGraduation || '',
          bio: data.bio || '',
          status: isMasterAdmin ? 'APPROVED' : 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Add notification for admin
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'ADMIN',
        recipientRole: 'SUPER_ADMIN',
        title: `New ${data.profileType} Registration`,
        message: `${data.name} registered for ${data.university} (${data.department}) and is awaiting approval.`,
        type: 'ACCOUNT',
        read: false,
        actionUrl: '/admin',
        createdAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('Registration error:', err);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    const profile = await fetchOrCreateUserProfile(res.user);
    setCurrentUser(res.user);
    setUserProfile(profile);
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

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updated = {
      ...userProfile,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    setUserProfile(updated);
  };

  // Public website role: public members operate as regular students or alumni
  const effectiveRole: Role = userProfile?.role || 'STUDENT';

  // Admin access is strictly separated to the dedicated server-authenticated admin panel
  const isSuperAdmin = false;
  const isUniversityAdmin = false;
  const isDepartmentAdmin = false;

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
