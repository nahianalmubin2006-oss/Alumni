import React, { useEffect, useState } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG, getUniversityLogo, universityInitials } from '../data/initialData';
import { ProfileType, PostReactionType, StorageReceipt, AccountOpeningPresets } from '../types';
import { DigitalIDCard } from '../components/DigitalIDCard';
import oxfordGothicBanner from '../assets/images/campus_oxford_gothic_1791743675787.jpg';
import techQuadBanner from '../assets/images/campus_tech_quad_1791743699365.jpg';
import goldCrestMedallion from '../assets/images/academic_crest_gold_1791743732343.jpg';
import emeraldHeritageBanner from '../assets/images/campus_heritage_emerald_1791744473729.jpg';
import crimsonQuadBanner from '../assets/images/campus_crimson_quad_1791744501154.jpg';
import nightSapphireBanner from '../assets/images/campus_night_sapphire_1791744524534.jpg';
import {
  Image as ImageIcon,
  Heart,
  ThumbsUp,
  Sparkles,
  Send,
  Trash2,
  Camera,
  Building2,
  Users,
  GraduationCap,
  MapPin,
  Briefcase,
  ExternalLink,
  Globe,
  CheckCircle2,
  MessageSquare,
  Plus,
  X,
  Upload,
  Link2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Database,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Copy,
  Lock,
  UserCheck,
  AlertCircle,
  RefreshCw,
  FileText,
  BadgeCheck,
  Award,
  BookOpen,
  Share2,
  QrCode,
  Download,
  Compass,
  Printer,
  CreditCard,
  Palette,
  Sliders,
  Layers,
  Flame,
} from 'lucide-react';

interface AccountViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
  pageParams?: Record<string, string>;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigate, onBack, pageParams }) => {
  const {
    currentUser,
    userProfile,
    loginWithEmail,
    registerUser,
    loginWithGoogle,
    logout,
    resetPasswordWithEmail,
    updateProfileData,
    lastStorageReceipt,
    getStorageReceipt,
  } = useAuth();

  const {
    submitVerificationRequest,
    alumni,
    profileClaims,
    submitProfileClaim,
    posts,
    createPost,
    reactToPost,
    deletePost,
    toggleFollowUniversity,
    isFollowingUniversity,
    universities,
  } = useData();

  // Mode: 'signedOut', 'login', 'signupChoice', 'signupStudent', 'signupAlumni', 'edit', 'forgot'
  const [viewState, setViewState] = useState<'default' | 'login' | 'choice' | 'form' | 'edit' | 'forgot'>('default');
  
  // High-level segmented authentication mode for logged-out interface
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'wizard' | 'storageStatus' | 'forgot'>('login');
  
  // New Account Opening Process wizard stages (1: Identity, 2: Academic, 3: Career/Goals, 4: Persona, 5: Receipt)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Password confirmation and toggle
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Live real-time availability checking
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [studentIdChecking, setStudentIdChecking] = useState(false);
  const [studentIdAvailable, setStudentIdAvailable] = useState<boolean | null>(null);

  // Data storage process pipeline state (0: idle, 1: Hashing, 2: Database Commit, 3: Directory Sync, 4: Complete)
  const [storagePipelineStep, setStoragePipelineStep] = useState<number>(0);
  const [activeReceipt, setActiveReceipt] = useState<StorageReceipt | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Presets and storage metrics
  const [presetsData, setPresetsData] = useState<AccountOpeningPresets | null>(null);
  const [serverStorageMetrics, setServerStorageMetrics] = useState<any | null>(null);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);

  // Filter searches
  const [uniSearch, setUniSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  const [profileType, setProfileType] = useState<ProfileType>('Student');
  const [photoUrl, setPhotoUrl] = useState('');
  const [defaultProfilePictures, setDefaultProfilePictures] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile-picture-defaults')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.pictures)) {
          setDefaultProfilePictures(data.pictures.filter((picture: any) => picture?.url));
        }
      })
      .catch(() => {});

    fetch('/api/auth/account-opening-presets')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success) setPresetsData(d);
      })
      .catch(() => {});

    fetch('/api/auth/storage-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success) setServerStorageMetrics(d);
      })
      .catch(() => {});

    fetch('/api/auth/recent-account-openings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success && Array.isArray(d.recentOpenings)) setRecentSignups(d.recentOpenings);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (pageParams?.mode) {
      const mode = pageParams.mode.toLowerCase();
      if (mode === 'signup' || mode === 'wizard' || mode === 'storagestatus' || mode === 'login' || mode === 'forgot') {
        if (mode === 'storagestatus') setAuthMode('storageStatus');
        else setAuthMode(mode as any);
      }
    }
    if (pageParams?.step) {
      const stepNum = parseInt(pageParams.step, 10);
      if (stepNum >= 1 && stepNum <= 5) {
        setWizardStep(stepNum as any);
      }
    }
    if (pageParams?.tab) {
      const tab = pageParams.tab.toLowerCase();
      if (
        tab === 'overview' ||
        tab === 'academic' ||
        tab === 'skills' ||
        tab === 'network' ||
        tab === 'posts' ||
        tab === 'digitalid' ||
        tab === 'storage'
      ) {
        setProfileTab(tab as any);
      } else if (tab === 'dossier') {
        setProfileTab('overview');
      } else if (tab === 'idcard') {
        setProfileTab('digitalid');
      } else if (tab === 'followed' || tab === 'peers') {
        setProfileTab('network');
      }
    }
  }, [pageParams]);

  // Live availability checker for email
  const checkEmailLive = async (targetEmail: string) => {
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim())) {
      setEmailAvailable(null);
      return;
    }
    setEmailChecking(true);
    try {
      const resp = await fetch(`/api/auth/check-availability?email=${encodeURIComponent(targetEmail.trim())}`);
      if (resp.ok) {
        const data = await resp.json();
        setEmailAvailable(Boolean(data.emailAvailable));
      }
    } catch {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  // Live availability checker for student ID
  const checkStudentIdLive = async (targetId: string, targetUni: string) => {
    if (!targetId.trim() || !targetUni.trim()) {
      setStudentIdAvailable(null);
      return;
    }
    setStudentIdChecking(true);
    try {
      const resp = await fetch(
        `/api/auth/check-availability?studentId=${encodeURIComponent(targetId.trim())}&university=${encodeURIComponent(targetUni.trim())}`
      );
      if (resp.ok) {
        const data = await resp.json();
        setStudentIdAvailable(Boolean(data.studentIdAvailable));
      }
    } catch {
      setStudentIdAvailable(null);
    } finally {
      setStudentIdChecking(false);
    }
  };

  // Profile tabs: 'overview' | 'academic' | 'skills' | 'network' | 'posts' | 'digitalid' | 'storage'
  const [profileTab, setProfileTab] = useState<
    'overview' | 'academic' | 'skills' | 'network' | 'posts' | 'digitalid' | 'storage'
  >('overview');

  // Executive profile decoration and customization states
  const [coverTheme, setCoverTheme] = useState<'classic' | 'modern' | 'sapphire' | 'emerald' | 'royal' | 'midnight' | 'crimson' | 'aurora' | 'cyber'>('sapphire');
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [mentorshipOpen, setMentorshipOpen] = useState(true);
  const [publicDirectoryVisible, setPublicDirectoryVisible] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState(false);
  const [idCardFlipped, setIdCardFlipped] = useState(false);
  const [degreeTitle, setDegreeTitle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [editTab, setEditTab] = useState<'visuals' | 'academic' | 'career' | 'skills' | 'bio'>('visuals');

  // Post creation states
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [newPostImageInputType, setNewPostImageInputType] = useState<'upload' | 'url'>('upload');
  const [isPosting, setIsPosting] = useState(false);
  const [postFilter, setPostFilter] = useState<'all' | 'mine'>('all');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [educationLevel, setEducationLevel] = useState('Undergraduate');
  const [studentYear, setStudentYear] = useState('');
  const [expectedGraduation, setExpectedGraduation] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [city, setCity] = useState('Dhaka');
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Verification request modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [claimProofUrl, setClaimProofUrl] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Continuous auto-sync with userProfile so fields are never blank when opening edit mode
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setProfileType(userProfile.profileType || 'Student');
      if (userProfile.photoUrl) setPhotoUrl(userProfile.photoUrl);
      setStudentId(userProfile.studentId || '');
      setEducationLevel(userProfile.educationLevel || 'Undergraduate');
      setStudentYear(userProfile.studentYear || '');
      setExpectedGraduation(userProfile.expectedGraduation || '');
      setGraduationYear(userProfile.graduationYear || '');
      setJobRole(userProfile.jobRole || '');
      setCompany(userProfile.company || '');
      setCountry(userProfile.country || 'Bangladesh');
      setCity(userProfile.city || 'Dhaka');
      setBio(userProfile.bio || '');
      setLinkedin(userProfile.linkedin || '');
      setCoverTheme(userProfile.coverTheme || 'sapphire');
      setMentorshipOpen(userProfile.mentorshipOpen !== false);
      setPublicDirectoryVisible(userProfile.publicDirectoryVisible !== false);
      setSkills(Array.isArray(userProfile.skills) ? userProfile.skills : []);
      setDegreeTitle(userProfile.degreeTitle || '');
      setPortfolioUrl(userProfile.portfolioUrl || '');

      const currentUni = userProfile.university || '';
      const currentDept = userProfile.department || '';
      const hasUniInList = ALL_DIRECTORY_UNIVERSITIES.some((u) => u.name === currentUni);
      const hasDeptInList = RAW_DEPARTMENT_CATALOG.some((d) => d.name === currentDept);

      if (currentUni && !hasUniInList) {
        setUniversity('OTHER');
        setCustomUniversity(currentUni);
      } else {
        setUniversity(currentUni);
        setCustomUniversity('');
      }

      if (currentDept && !hasDeptInList) {
        setDepartment('OTHER');
        setCustomDepartment(currentDept);
      } else {
        setDepartment(currentDept);
        setCustomDepartment('');
      }
    }
  }, [userProfile]);

  const COVER_THEMES = [
    {
      id: 'classic' as const,
      name: 'Collegiate Oxford Gothic Quad',
      desc: 'Grand stone colonnades, twilight library spires & manicured lawn',
      imageUrl: oxfordGothicBanner,
      gradient: 'from-amber-950/85 via-slate-900/90 to-blue-950/95',
      accent: '#f59e0b',
      ring: 'ring-amber-500/50',
      badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    },
    {
      id: 'modern' as const,
      name: 'Institute of Science & Technology',
      desc: 'Contemporary architectural glass facade & sunset reflecting pool',
      imageUrl: techQuadBanner,
      gradient: 'from-blue-950/90 via-slate-900/90 to-indigo-950/95',
      accent: '#38bdf8',
      ring: 'ring-sky-500/50',
      badge: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
    },
    {
      id: 'sapphire' as const,
      name: 'Midnight Royal Sapphire',
      desc: 'Deep cosmic collegiate mesh with silver accents & starry Guilloche',
      imageUrl: nightSapphireBanner,
      gradient: 'from-slate-950 via-blue-950 to-indigo-950',
      accent: '#38bdf8',
      ring: 'ring-blue-500/50',
      badge: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    },
    {
      id: 'royal' as const,
      name: 'Imperial Convocation Gold',
      desc: 'Noble convocation robe gold with cobalt radiance & embossed seal',
      imageUrl: oxfordGothicBanner,
      gradient: 'from-blue-950/90 via-slate-900/90 to-amber-950/90',
      accent: '#fbbf24',
      ring: 'ring-amber-500/50',
      badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    },
    {
      id: 'emerald' as const,
      name: 'Archival Heritage Emerald',
      desc: 'Historic academic botanical gardens & prestige',
      imageUrl: emeraldHeritageBanner,
      gradient: 'from-slate-950 via-emerald-950 to-teal-950',
      accent: '#34d399',
      ring: 'ring-emerald-500/50',
      badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    },
    {
      id: 'crimson' as const,
      name: 'Oxford Crimson & Nobel Ruby',
      desc: 'Imperial velvet crest & golden collegiate trim',
      imageUrl: crimsonQuadBanner,
      gradient: 'from-stone-950 via-rose-950 to-slate-950',
      accent: '#fb7185',
      ring: 'ring-rose-500/50',
      badge: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
    },
    {
      id: 'midnight' as const,
      name: 'Obsidian Cyber Quad',
      desc: 'Modern tech quad with laser mesh & cyan luminescence',
      imageUrl: techQuadBanner,
      gradient: 'from-zinc-950 via-neutral-900 to-slate-950',
      accent: '#22d3ee',
      ring: 'ring-cyan-500/50',
      badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
    },
    {
      id: 'aurora' as const,
      name: 'Borealis Celestial Luminescence',
      desc: 'Ethereal turquoise, violet & cosmic starlight',
      imageUrl: nightSapphireBanner,
      gradient: 'from-teal-950 via-indigo-950 to-purple-950',
      accent: '#a78bfa',
      ring: 'ring-purple-500/50',
      badge: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    },
    {
      id: 'cyber' as const,
      name: 'Metropolitan High-Tech Quad',
      desc: 'Reflective water facade, glass architecture & evening twilight',
      imageUrl: techQuadBanner,
      gradient: 'from-slate-950 via-cyan-950/80 to-blue-950',
      accent: '#06b6d4',
      ring: 'ring-cyan-500/50',
      badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
    },
  ];

  const currentCoverTheme = COVER_THEMES.find((t) => t.id === coverTheme) || COVER_THEMES[0];

  const cohortPeers = React.useMemo(() => {
    if (!userProfile?.university) return [];
    const myUni = userProfile.university.toLowerCase().trim();
    const myDept = (userProfile.department || '').toLowerCase().trim();
    const myUid = currentUser?.uid || userProfile.id;
    return alumni.filter((record) => {
      const recUid = record.userId || record.id;
      if (recUid === myUid) return false;
      const rUni = (record.university || '').toLowerCase().trim();
      const rDept = (record.department || '').toLowerCase().trim();
      if (rUni !== myUni) return false;
      if (myDept && rDept && rDept !== myDept) return false;
      return true;
    });
  }, [alumni, userProfile, currentUser]);

  const profileCompletionScore = React.useMemo(() => {
    if (!userProfile) return 0;
    let score = 20; // baseline
    if (userProfile.photoUrl) score += 20;
    if (userProfile.university && userProfile.department) score += 25;
    if (userProfile.bio && userProfile.bio.trim().length > 10) score += 15;
    if (userProfile.jobRole || userProfile.studentYear) score += 10;
    if (userProfile.linkedin || userProfile.studentId) score += 10;
    return Math.min(100, score);
  }, [userProfile]);

  const isAlumni = userProfile?.profileType === 'Alumni';

  const handleToggleMentorship = async () => {
    const nextVal = !mentorshipOpen;
    setMentorshipOpen(nextVal);
    try {
      await updateProfileData({ mentorshipOpen: nextVal });
      setSuccessMsg(nextVal ? 'You are now marked as available to mentor students!' : 'Mentorship status updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setErrorMsg('Could not update mentorship status.');
    }
  };

  const handleToggleDirectoryVisibility = async () => {
    const nextVal = !publicDirectoryVisible;
    setPublicDirectoryVisible(nextVal);
    try {
      await updateProfileData({ publicDirectoryVisible: nextVal });
      setSuccessMsg(nextVal ? 'Profile is publicly discoverable in the directory.' : 'Profile visibility set to private.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setErrorMsg('Could not update directory visibility.');
    }
  };

  const handleSelectCoverTheme = async (themeId: 'classic' | 'modern' | 'sapphire' | 'emerald' | 'royal' | 'midnight' | 'crimson' | 'aurora' | 'cyber') => {
    setCoverTheme(themeId);
    setShowCoverSelector(false);
    try {
      await updateProfileData({ coverTheme: themeId });
      setSuccessMsg('Campus cover theme updated successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e: any) {
      setErrorMsg('Could not update cover theme.');
    }
  };

  const handleAddSkill = async () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    const nextSkills = [...skills, trimmed];
    setSkills(nextSkills);
    setNewSkillInput('');
    try {
      await updateProfileData({ skills: nextSkills });
    } catch (e) {}
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const nextSkills = skills.filter((s) => s !== skillToRemove);
    setSkills(nextSkills);
    try {
      await updateProfileData({ skills: nextSkills });
    } catch (e) {}
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      let fallbackPrefill: any = {};
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('alumni_pending_signup') || sessionStorage.getItem('alumni_pending_google');
          if (cached) fallbackPrefill = JSON.parse(cached);
        } catch (e) {}
      }

      const finalUniversity = (university === 'OTHER' ? customUniversity : university).trim() || fallbackPrefill.university;
      const finalDepartment = (department === 'OTHER' ? customDepartment : department).trim() || fallbackPrefill.department;
      const prefilled: any = {
        name: name.trim() || fallbackPrefill.name || undefined,
        email: email.trim() || fallbackPrefill.email || undefined,
        profileType: profileType || fallbackPrefill.profileType || 'Student',
        university: finalUniversity || undefined,
        department: finalDepartment || undefined,
        studentId: studentId.trim() || fallbackPrefill.studentId || undefined,
        educationLevel: educationLevel || fallbackPrefill.educationLevel || undefined,
        studentYear: studentYear.trim() || fallbackPrefill.studentYear || undefined,
        expectedGraduation: expectedGraduation.trim() || fallbackPrefill.expectedGraduation || undefined,
        graduationYear: graduationYear.trim() || fallbackPrefill.graduationYear || undefined,
        jobRole: jobRole.trim() || fallbackPrefill.jobRole || undefined,
        company: company.trim() || fallbackPrefill.company || undefined,
        country: country.trim() || fallbackPrefill.country || undefined,
        city: city.trim() || fallbackPrefill.city || undefined,
        bio: bio.trim() || fallbackPrefill.bio || undefined,
        linkedin: linkedin.trim() || fallbackPrefill.linkedin || undefined,
      };
      await loginWithGoogle(prefilled);
      setViewState('default');
      setSuccessMsg('Signed in successfully! Welcome to your campus profile.');
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up was blocked by your browser. Please allow popups or use email/password.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMsg('Google Sign-In is unavailable on this preview domain. Please sign in with email and password.');
      } else if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setErrorMsg('Google Sign-In was not completed. Please log in with email/password.');
      }
    }
  };

  // Robust profile photo processing, storage, and persistence helper
  const handleUploadProfilePhoto = async (file: File) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp|gif|svg\+xml)$/i) && !file.type.startsWith('image/')) {
      setErrorMsg('Please choose a valid JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Profile pictures must be 10 MB or smaller.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsUploadingPhoto(true);

    try {
      // 1. Client-side canvas resize and compression for a crisp, compact avatar (<35KB)
      const compressedDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Failed to parse image file.'));
          img.onload = () => {
            const maxDim = 400;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(reader.result as string);
              return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });

      const uid = currentUser?.uid || userProfile?.id || 'user';
      let savedUrl = compressedDataUrl;

      // 2. Post to server-side static avatar storage
      try {
        const res = await fetch('/api/user/upload-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: compressedDataUrl,
            userId: uid,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.photoUrl) {
            savedUrl = json.photoUrl;
          }
        }
      } catch (serverErr) {
        console.warn('Server avatar upload notice:', serverErr);
      }

      // 3. Fallback/Dual sync with Firebase Storage if available
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const imageRef = ref(storage, `profile-photos/${uid}/${Date.now()}-${safeName}`);
        await uploadBytes(imageRef, file, { contentType: file.type });
        const firebaseUrl = await getDownloadURL(imageRef);
        if (firebaseUrl) {
          savedUrl = firebaseUrl;
        }
      } catch (storageErr) {
        // Handled seamlessly by savedUrl
      }

      // 4. Update profile data and state immediately
      await updateProfileData({ photoUrl: savedUrl });
      setPhotoUrl(savedUrl);

      // Cache locally for instant access across tabs/reloads
      try {
        localStorage.setItem(`alumni_photo_${uid}`, savedUrl);
      } catch (e) {}

      setSuccessMsg('Your profile picture has been saved successfully!');
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      setErrorMsg(err?.message || 'Could not save the profile picture. Please try another image.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Pre-fill for edit mode with optional deep-link tab
  const enterEditMode = (targetTab: 'visuals' | 'academic' | 'career' | 'skills' | 'bio' = 'visuals') => {
    if (!userProfile) return;
    setErrorMsg('');
    setSuccessMsg('');
    setName(userProfile.name || '');
    setProfileType(userProfile.profileType || 'Student');
    setPhotoUrl(userProfile.photoUrl || '');
    const currentUni = userProfile.university || '';
    const currentDept = userProfile.department || '';

    const hasUniInList = ALL_DIRECTORY_UNIVERSITIES.some((u) => u.name === currentUni);
    const hasDeptInList = RAW_DEPARTMENT_CATALOG.some((d) => d.name === currentDept);

    if (currentUni && !hasUniInList) {
      setUniversity('OTHER');
      setCustomUniversity(currentUni);
    } else {
      setUniversity(currentUni);
      setCustomUniversity('');
    }

    if (currentDept && !hasDeptInList) {
      setDepartment('OTHER');
      setCustomDepartment(currentDept);
    } else {
      setDepartment(currentDept);
      setCustomDepartment('');
    }

    setStudentId(userProfile.studentId || '');
    setEducationLevel(userProfile.educationLevel || 'Undergraduate');
    setStudentYear(userProfile.studentYear || '');
    setExpectedGraduation(userProfile.expectedGraduation || '');
    setGraduationYear(userProfile.graduationYear || '');
    setJobRole(userProfile.jobRole || '');
    setCompany(userProfile.company || '');
    setCountry(userProfile.country || 'Bangladesh');
    setCity(userProfile.city || 'Dhaka');
    setBio(userProfile.bio || '');
    setLinkedin(userProfile.linkedin || '');
    setDegreeTitle(userProfile.degreeTitle || '');
    setPortfolioUrl(userProfile.portfolioUrl || '');
    setCoverTheme(userProfile.coverTheme || 'sapphire');
    setMentorshipOpen(userProfile.mentorshipOpen !== false);
    setPublicDirectoryVisible(userProfile.publicDirectoryVisible !== false);
    setSkills(Array.isArray(userProfile.skills) ? userProfile.skills : []);
    setEditTab(targetTab);
    setViewState('edit');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithEmail(email.trim(), password);
      setViewState('default');
    } catch (err: any) {
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        setErrorMsg('Incorrect email or password. Please verify your credentials or create an account.');
      } else {
        setErrorMsg(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered Gmail/email address.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPasswordWithEmail(email.trim());
      setSuccessMsg(`Password reset link sent to ${email.trim()}! Please check your Gmail or email inbox to reset your password.`);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        setErrorMsg('No user account found with this email address.');
      } else if (err?.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else {
        setErrorMsg(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const executeAccountRegistration = async (isWizard = false) => {
    setErrorMsg('');
    setSuccessMsg('');
    const finalUniversity = (university === 'OTHER' ? customUniversity : university).trim();
    const finalDepartment = (department === 'OTHER' ? customDepartment : department).trim();

    if (!name.trim()) {
      setErrorMsg('Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (confirmPassword && confirmPassword !== password) {
      setErrorMsg('Passwords do not match. Please verify your confirm password.');
      return;
    }
    if (!finalUniversity) {
      setErrorMsg('Please select or specify your University institution.');
      return;
    }
    if (!finalDepartment) {
      setErrorMsg('Please select or specify your Academic Department.');
      return;
    }

    setLoading(true);
    setStoragePipelineStep(1); // 1: Cryptographic Salt & Hash

    try {
      await new Promise((r) => setTimeout(r, 260));
      setStoragePipelineStep(2); // 2: Persisting to Internal Database

      const receipt = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        profileType,
        university: finalUniversity,
        department: finalDepartment,
        studentId: studentId.trim(),
        educationLevel,
        studentYear: studentYear.trim(),
        expectedGraduation: expectedGraduation.trim(),
        graduationYear: graduationYear.trim(),
        jobRole: jobRole.trim(),
        company: company.trim(),
        country: country.trim(),
        city: city.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl.trim(),
        linkedin: linkedin.trim(),
      });

      setStoragePipelineStep(3); // 3: Directory Sync & Network Placement
      await new Promise((r) => setTimeout(r, 260));

      setStoragePipelineStep(4); // 4: Storage Receipt Confirmed
      if (receipt) {
        setActiveReceipt(receipt);
      }
      setSuccessMsg('Account opened and data securely stored! Welcome to AlumniSphere.');

      if (isWizard) {
        setWizardStep(5); // Show digital receipt stage
      } else {
        setViewState('default');
      }
    } catch (err: any) {
      setStoragePipelineStep(0);
      if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('already registered')) {
        setErrorMsg('This email address is already registered. Please log in or reset your password.');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMsg('Password must be at least 6 characters long.');
      } else {
        setErrorMsg(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAccountRegistration(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalUniversity = (university === 'OTHER' ? customUniversity : university).trim();
    const finalDepartment = (department === 'OTHER' ? customDepartment : department).trim();

    try {
      await updateProfileData({
        name,
        profileType,
        photoUrl,
        university: finalUniversity,
        department: finalDepartment,
        studentId,
        educationLevel,
        studentYear,
        expectedGraduation,
        graduationYear,
        jobRole,
        company,
        country,
        city,
        bio,
        linkedin,
        degreeTitle,
        portfolioUrl,
        coverTheme,
        skills,
        mentorshipOpen,
        publicDirectoryVisible,
      });
      setSuccessMsg('Profile updated successfully!');
      setViewState('default');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUniversity = (university === 'OTHER' ? customUniversity : university).trim();
    const finalDepartment = (department === 'OTHER' ? customDepartment : department).trim();

    if (!finalUniversity) {
      setErrorMsg('Please select or enter your University.');
      return;
    }
    if (!finalDepartment) {
      setErrorMsg('Please select or enter your Department.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await updateProfileData({
        university: finalUniversity,
        department: finalDepartment,
        profileType: profileType || 'Student',
        studentId: studentId.trim(),
        educationLevel: educationLevel || 'Undergraduate',
        studentYear: studentYear.trim() || (profileType === 'Student' ? 'Active Student' : ''),
        expectedGraduation: expectedGraduation.trim() || (profileType === 'Student' ? '2028' : ''),
        graduationYear: graduationYear.trim() || (profileType === 'Alumni' ? '2024' : ''),
      });
      setSuccessMsg('Your campus profile is now complete and active in the directory!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not complete profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClaimSubmit = async (record: (typeof alumni)[number]) => {
    if (!currentUser || !userProfile) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSubmittingClaim(true);
    try {
      await submitProfileClaim({
        targetAlumniId: record.id,
        university: record.university,
        department: record.department,
        studentId: record.studentId || '',
        graduationYear: record.graduationYear || record.batch || '',
        proofUrl: claimProofUrl.trim(),
        notes: claimNotes.trim(),
      });
      setSuccessMsg('Profile claim submitted. A Super Admin must review the evidence before the record is linked.');
      setClaimProofUrl('');
      setClaimNotes('');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Could not submit your profile claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const claimCandidates = currentUser && userProfile
    ? alumni.filter((record) => {
        const matchesEmail = Boolean(record.email && record.email.toLowerCase() === (currentUser.email || '').toLowerCase());
        const matchesStudentId = Boolean(record.studentId && userProfile.studentId && record.studentId.trim().toLowerCase() === userProfile.studentId.trim().toLowerCase());
        return (matchesEmail || matchesStudentId) && (!record.userId || record.userId === currentUser.uid) && record.userId !== currentUser.uid && record.id !== currentUser.uid;
      })
    : [];

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    try {
      await submitVerificationRequest({
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: currentUser.email || '',
        university: userProfile.university || '',
        department: userProfile.department || '',
        batch: userProfile.graduationYear || '2023',
        studentId: userProfile.studentId || '',
        proofUrl,
        notes: verificationNotes,
      });
      setVerificationModalOpen(false);
      setSuccessMsg('Verification request submitted to Super Admin! Check notifications for updates.');
    } catch (err: any) {
      setErrorMsg('Failed to submit verification request.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Academic Executive Portfolio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-1.5 tracking-tight">
            {currentUser && userProfile ? `Welcome, ${userProfile.name.split(' ')[0]}` : 'Profile & Account'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm max-w-xl">
            {currentUser && userProfile
              ? `Manage your higher education affiliation, verified credentials, and digital presence across university networks.`
              : `Access your verified alumni identity, manage credentials, and join university discovery.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && userProfile && viewState !== 'edit' && (
            <button
              onClick={() => enterEditMode()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
          <button
            onClick={() => (onBack ? onBack() : onNavigate('home'))}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
            title="Back to previous / upper page"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
            <span>← Home</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMsg && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* 1. Logged In View */}
      {currentUser && userProfile && viewState !== 'edit' && (
        <div className="mt-8 space-y-6">
          {/* Top Profile Card with Campus Cover Banner */}
          <div className="card overflow-hidden shadow-2xl border-soft rounded-3xl bg-white">
            {/* Luxury Cover Banner with Ambient Lighting & Watermark */}
            <div className={`h-60 sm:h-72 lg:h-80 relative overflow-hidden transition-all duration-700 bg-slate-950`}>
              {/* Background Campus Image (if available in theme) */}
              {currentCoverTheme.imageUrl ? (
                <img
                  src={currentCoverTheme.imageUrl}
                  alt={currentCoverTheme.name}
                  className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 contrast-105 transition-opacity duration-700"
                />
              ) : null}

              {/* Multi-stop dramatic cinematic scrim */}
              <div
                className={`absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/35 backdrop-blur-[0.5px] transition-all`}
              />

              {/* Dynamic Theme Gradient fallback / ambient tint */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${currentCoverTheme.gradient} opacity-50 mix-blend-overlay`}
              />

              {/* Theme Ambient Radial Glow Orbs */}
              <div
                className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ backgroundColor: currentCoverTheme.accent }}
              />
              <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

              {/* Starlight / Guilloche grid overlay */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

              {/* Gold Crest Medallion Watermark (Decorative Luxury Seal) */}
              <div className="absolute right-6 -bottom-6 opacity-30 hover:opacity-50 transition-opacity duration-500 pointer-events-none select-none hidden sm:block">
                <img
                  src={goldCrestMedallion}
                  alt="Academic Seal"
                  className="w-48 h-48 lg:w-56 lg:h-56 object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] brightness-110"
                />
              </div>

              {/* University Crest / Emblem Watermark */}
              {userProfile.university && (
                <div className="absolute right-48 -bottom-4 opacity-15 pointer-events-none select-none hidden md:block">
                  {getUniversityLogo(userProfile.university) ? (
                    <img
                      src={getUniversityLogo(userProfile.university)}
                      alt=""
                      className="w-36 h-36 object-contain brightness-200 contrast-125"
                    />
                  ) : (
                    <span className="text-8xl font-black text-white/40 tracking-tighter font-serif">
                      {universityInitials(userProfile.university)}
                    </span>
                  )}
                </div>
              )}

              {/* Cover Top Badges */}
              <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-white bg-black/45 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/25 shadow-md flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>{userProfile.profileType === 'Alumni' ? 'Alumni Scholar' : 'Student Scholar'}</span>
                  </span>

                  {userProfile.university && (
                    <span className="text-[11px] font-bold text-emerald-200 bg-emerald-950/65 backdrop-blur-md px-3.5 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1.5 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>UGC Accredited University</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleDirectoryVisibility}
                    className="text-[11px] font-bold text-slate-200 bg-black/45 hover:bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    title="Click to toggle public directory discovery"
                  >
                    <Globe className={`w-3.5 h-3.5 ${publicDirectoryVisible ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{publicDirectoryVisible ? 'Public in Directory' : 'Private Profile'}</span>
                  </button>
                </div>

                {/* Top-Right Cover Toolbar */}
                <div className="flex items-center gap-2 relative">
                  {/* Cover Theme Changer */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCoverSelector((prev) => !prev)}
                      className="text-[11px] font-bold text-white bg-black/50 hover:bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                      title="Customize campus cover banner style"
                    >
                      <Palette className="w-3.5 h-3.5 text-amber-300" />
                      <span>Theme: {currentCoverTheme.name.split(' ')[0]}</span>
                    </button>

                    {showCoverSelector && (
                      <div className="absolute right-0 top-11 w-80 sm:w-96 p-3.5 bg-slate-950/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl z-40 space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-200 font-bold">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Campus Atmosphere & Theme</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCoverSelector(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                          {COVER_THEMES.map((theme) => (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectCoverTheme(theme.id)}
                              className={`w-full text-left p-2 rounded-2xl transition flex items-center justify-between gap-3 cursor-pointer ${
                                coverTheme === theme.id
                                  ? 'bg-white/20 text-white font-bold ring-2 ring-amber-400 shadow-md'
                                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-9 rounded-xl overflow-hidden shrink-0 border border-white/20 bg-slate-900 shadow-xs relative">
                                  {theme.imageUrl ? (
                                    <img src={theme.imageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: theme.accent }} />
                                  )}
                                  <span
                                    className="absolute bottom-1 right-1 w-2 h-2 rounded-full shadow-xs ring-1 ring-white/50"
                                    style={{ backgroundColor: theme.accent }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="truncate text-xs font-bold block text-white">{theme.name}</span>
                                  <span className="text-[10px] text-slate-400 truncate block mt-0.5">{theme.desc}</span>
                                </div>
                              </div>
                              {coverTheme === theme.id ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 text-emerald-300" />
                                </div>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Share Profile button */}
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = window.location.origin + '/account';
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedProfileLink(true);
                      setTimeout(() => setCopiedProfileLink(false), 2200);
                    }}
                    className="text-[11px] font-bold text-white bg-black/50 hover:bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                    title="Copy profile link"
                  >
                    {copiedProfileLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-slate-200" />
                        <span>Share</span>
                      </>
                    )}
                  </button>

                  {/* Fast Pass Toggle */}
                  <button
                    type="button"
                    onClick={() => setProfileTab('idcard')}
                    className="text-[11px] font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-400/50 transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                    title="Open Digital Campus Identity Pass"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-300" />
                    <span>Digital ID</span>
                  </button>
                </div>
              </div>

              {/* Bottom Latin Motto / Campus Accreditation Kicker */}
            </div>

            {/* Profile Avatar & Primary Info Row */}
            <div className="px-6 pb-6 pt-0 sm:px-8 relative bg-white">
              {/* Row 1: Avatar with negative margin + Action Buttons Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-5">
                <div className="relative group shrink-0 ml-2 sm:ml-4">
                  <div
                    className={`w-28 h-28 sm:w-34 sm:h-34 rounded-3xl p-1 shadow-xl transition duration-300 profile-avatar-ring bg-white ${
                      userProfile.isVerifiedAlumni || userProfile.profileType === 'Alumni'
                        ? 'bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600'
                        : 'bg-gradient-to-tr from-blue-600 via-sky-300 to-indigo-600'
                    }`}
                  >
                    <div className="w-full h-full rounded-2xl bg-white overflow-hidden flex items-center justify-center font-black text-3xl sm:text-4xl text-blue-700 bg-gradient-to-tr from-blue-50 to-indigo-50 relative">
                      {isUploadingPhoto ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-blue-600 p-2 text-center">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-bold tracking-tight">Saving…</span>
                        </div>
                      ) : (userProfile.photoUrl || photoUrl || defaultProfilePictures[0]?.url) ? (
                        <img
                          src={userProfile.photoUrl || photoUrl || defaultProfilePictures[0]?.url || ''}
                          alt={userProfile.name}
                          className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        userProfile.name
                          ? userProfile.name
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                          : 'U'
                      )}
                    </div>
                  </div>

                  {/* Verified Alumni Hologram / Shield Badge Overlay */}
                  {userProfile.isVerifiedAlumni && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 border-2 border-white shadow-xl flex items-center justify-center text-amber-950"
                      title="Official Verified Degree Holder"
                    >
                      <BadgeCheck className="w-4 h-4 text-amber-950 fill-amber-300" />
                    </div>
                  )}

                  {/* Online / Active Beacon */}
                  <div
                    className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center"
                    title="Active Member"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>

                  {/* Camera Upload Button */}
                  <label
                    className="absolute -bottom-1 -right-1 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105 transition"
                    title="Upload or change profile picture"
                    aria-label="Upload profile picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={isUploadingPhoto}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (!file) return;
                        await handleUploadProfilePhoto(file);
                      }}
                    />
                  </label>
                </div>

                {/* Profile Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 shrink-0">
                  <button
                    onClick={() => enterEditMode()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
                    aria-label="Edit Profile"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = window.location.origin + '/account';
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedProfileLink(true);
                      setTimeout(() => setCopiedProfileLink(false), 2200);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                    title="Copy profile link"
                  >
                    {copiedProfileLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Share Profile</span>
                      </>
                    )}
                  </button>

                  {userProfile.university && (
                    <button
                      onClick={() => onNavigate('alumniProfile', { id: userProfile.id, name: userProfile.name })}
                      className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition shadow-xs cursor-pointer"
                      title="View how your profile appears to the public in the live directory"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      <span>Live Directory</span>
                    </button>
                  )}

                  <button
                    onClick={logout}
                    className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    title="Sign out of account"
                  >
                    Log Out
                  </button>
                </div>
              </div>

              {/* Row 2: Name, Credentials, and Institutional Info - clean, un-crowded, completely below avatar row */}
              <div className="space-y-2 mt-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold navy tracking-tight">
                    {userProfile.name}
                  </h2>
                  {userProfile.isVerifiedAlumni ? (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-black shadow-xs"
                      title="Verified Alumni Badge"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Verified Alumni</span>
                    </span>
                  ) : isAlumni ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Alumni</span>
                    </span>
                  ) : userProfile.role === 'SUPER_ADMIN' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold shadow-xs">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                      <span>Student</span>
                    </span>
                  )}

                  {/* Mentorship Status Pill */}
                  {isAlumni && (
                    <button
                      type="button"
                      onClick={handleToggleMentorship}
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        mentorshipOpen
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                      }`}
                      title="Click to toggle mentorship availability"
                    >
                      <span className={`w-2 h-2 rounded-full ${mentorshipOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{mentorshipOpen ? '🤝 Open for Mentorship' : 'Mentorship Inactive'}</span>
                    </button>
                  )}

                  {/* Directory Visibility Pill */}
                  <button
                    type="button"
                    onClick={handleToggleDirectoryVisibility}
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      publicDirectoryVisible
                        ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                    title="Click to toggle public directory discovery"
                  >
                    <Globe className={`w-3.5 h-3.5 ${publicDirectoryVisible ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{publicDirectoryVisible ? 'Public in Directory' : 'Private Profile'}</span>
                  </button>
                </div>

                {/* Role & Company or Student Standing */}
                <p className="text-sm sm:text-base text-slate-600 font-semibold leading-snug">
                  {isAlumni ? (
                    userProfile.jobRole ? (
                      <span>
                        <b className="navy">{userProfile.jobRole}</b>
                        {userProfile.company && <span> at <b className="navy">{userProfile.company}</b></span>}
                        {userProfile.department && <span className="text-slate-400 font-normal"> · {userProfile.department}</span>}
                      </span>
                    ) : (
                      <span>
                        <b className="navy">Alumni</b>
                        {userProfile.department && <span> · {userProfile.department}</span>}
                        {userProfile.graduationYear && <span className="text-slate-400 font-normal"> (Class of {userProfile.graduationYear})</span>}
                      </span>
                    )
                  ) : (
                    <span>
                      <b className="navy">{userProfile.studentYear || userProfile.educationLevel || 'Undergraduate Student'}</b>
                      {userProfile.department && <span> · {userProfile.department}</span>}
                      {userProfile.expectedGraduation && <span className="text-slate-400 font-normal"> (Expected {userProfile.expectedGraduation})</span>}
                    </span>
                  )}
                </p>

                {/* University & City & ID Row */}
                <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                  {userProfile.university && (
                    <button
                      type="button"
                      onClick={() => onNavigate('universityDetail', { name: userProfile.university || '' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200/80 transition cursor-pointer shadow-xs"
                      title="Explore institution profile"
                    >
                      {getUniversityLogo(userProfile.university) && (
                        <img
                          src={getUniversityLogo(userProfile.university)}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span>{userProfile.university}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  )}

                  {userProfile.department && (
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>{userProfile.department}</span>
                    </span>
                  )}

                  {(userProfile.city || userProfile.country) && (
                    <span className="text-slate-500 font-medium flex items-center gap-1 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {userProfile.city ? `${userProfile.city}, ` : ''}{userProfile.country || 'Bangladesh'}
                      </span>
                    </span>
                  )}

                  {userProfile.studentId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(userProfile.studentId || '');
                        setCopiedStudentId(true);
                        setTimeout(() => setCopiedStudentId(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold border border-slate-200 transition cursor-pointer"
                      title="Click to copy Student Roll ID"
                    >
                      <span>ID: {userProfile.studentId}</span>
                      {copiedStudentId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Status and Institutional Affiliation Setup (if not complete) */}
              {(!userProfile.university || userProfile.university === '') && (
                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/60 to-white border border-blue-200 text-slate-800 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        🎓
                      </span>
                      <div>
                        <b className="navy text-sm font-black block">Complete Your Campus Profile</b>
                        <p className="text-[11px] text-slate-500">
                          Select your university and faculty discipline once to join the live directory.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                      1-Step Setup
                    </span>
                  </div>

                  <form onSubmit={handleQuickCompleteProfile} className="mt-4 space-y-3.5">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">I am a *</label>
                        <select
                          value={profileType}
                          onChange={(e) => setProfileType(e.target.value as ProfileType)}
                          className="account-input py-1.5 text-xs bg-white"
                        >
                          <option value="Student">Current Student</option>
                          <option value="Alumni">Graduated Alumni</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">University *</label>
                        <select
                          value={university}
                          onChange={(e) => setUniversity(e.target.value)}
                          required
                          className="account-input py-1.5 text-xs bg-white"
                        >
                          <option value="" disabled>-- Select University --</option>
                          {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                            <option key={u.name} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                          <option value="OTHER">Other / Custom University</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Department *</label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                          className="account-input py-1.5 text-xs bg-white"
                        >
                          <option value="" disabled>-- Select Department --</option>
                          {RAW_DEPARTMENT_CATALOG.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                          <option value="OTHER">Other / Custom Department</option>
                        </select>
                      </div>
                    </div>

                    {(university === 'OTHER' || department === 'OTHER') && (
                      <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        {university === 'OTHER' && (
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Custom University Name *</label>
                            <input
                              value={customUniversity}
                              onChange={(e) => setCustomUniversity(e.target.value)}
                              required
                              placeholder="e.g. Bangladesh University of Professionals"
                              className="account-input py-1.5 text-xs"
                            />
                          </div>
                        )}
                        {department === 'OTHER' && (
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Custom Department Name *</label>
                            <input
                              value={customDepartment}
                              onChange={(e) => setCustomDepartment(e.target.value)}
                              required
                              placeholder="e.g. Computer Science & Engineering"
                              className="account-input py-1.5 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Student ID / Roll</label>
                        <input
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. 230204101"
                          className="account-input py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          {profileType === 'Student' ? 'Current Year / Semester' : 'Graduation Batch Year'}
                        </label>
                        <input
                          value={profileType === 'Student' ? studentYear : graduationYear}
                          onChange={(e) =>
                            profileType === 'Student'
                              ? setStudentYear(e.target.value)
                              : setGraduationYear(e.target.value)
                          }
                          placeholder={profileType === 'Student' ? 'e.g. 2nd Year, 4th Semester' : 'e.g. 2024'}
                          className="account-input py-1.5 text-xs"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{loading ? 'Saving...' : 'Save & Join Directory'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Profile Strength & Completion Progress Meter */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/40 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                      <svg className="w-11 h-11 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={profileCompletionScore >= 80 ? 'text-emerald-500' : profileCompletionScore >= 50 ? 'text-blue-600' : 'text-amber-500'}
                          strokeDasharray={`${profileCompletionScore}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black navy">
                        {profileCompletionScore}%
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <b className="navy text-xs font-black">
                          {profileCompletionScore >= 90
                            ? 'Distinguished Academic Profile'
                            : profileCompletionScore >= 70
                            ? 'Strong Campus Standing'
                            : 'Profile Strength In Progress'}
                        </b>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-700">
                          {profileCompletionScore >= 90 ? 'Level 5' : profileCompletionScore >= 70 ? 'Level 4' : 'Level 2'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Complete all verification criteria to elevate your network standing and discovery priority.
                      </p>
                    </div>
                  </div>

                  {/* Checklist Pills (Interactive Jump) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => enterEditMode('academic')}
                      className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
                        userProfile.university
                          ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                      }`}
                      title={userProfile.university ? 'University registered' : 'Click to add University'}
                    >
                      {userProfile.university ? '✓ University' : '+ Add University'}
                    </button>
                    <button
                      type="button"
                      onClick={() => enterEditMode('academic')}
                      className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
                        userProfile.studentId
                          ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                      }`}
                      title={userProfile.studentId ? 'Student Roll ID saved' : 'Click to add Student Roll ID'}
                    >
                      {userProfile.studentId ? '✓ Roll ID' : '+ Add Roll ID'}
                    </button>
                    <button
                      type="button"
                      onClick={() => enterEditMode('skills')}
                      className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
                        skills.length > 0
                          ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                      }`}
                      title={skills.length > 0 ? `${skills.length} skills recorded` : 'Click to add Skills'}
                    >
                      {skills.length > 0 ? `✓ ${skills.length} Skills` : '+ Add Skills'}
                    </button>
                    <button
                      type="button"
                      onClick={() => enterEditMode('bio')}
                      className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
                        userProfile.bio
                          ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                      }`}
                      title={userProfile.bio ? 'Bio completed' : 'Click to add Bio'}
                    >
                      {userProfile.bio ? '✓ Bio' : '+ Add Bio'}
                    </button>
                    <button
                      type="button"
                      onClick={() => enterEditMode('career')}
                      className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
                        userProfile.linkedin
                          ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-300'
                      }`}
                      title={userProfile.linkedin ? 'LinkedIn linked' : 'Click to add LinkedIn'}
                    >
                      {userProfile.linkedin ? '✓ LinkedIn' : '+ Add LinkedIn'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Sticky Tab Navigation Bar */}
          <div className="sticky top-2 z-30 card p-2 shadow-md border-soft flex items-center gap-1.5 overflow-x-auto bg-white/95 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setProfileTab('overview')}
              className={`tab-btn flex items-center gap-1.5 shrink-0 ${profileTab === 'overview' ? 'active' : ''}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('academic')}
              className={`tab-btn flex items-center gap-1.5 shrink-0 ${profileTab === 'academic' ? 'active' : ''}`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Academic / Career</span>
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('skills')}
              className={`tab-btn flex items-center gap-1.5 shrink-0 ${profileTab === 'skills' ? 'active' : ''}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Skills & Links</span>
              {skills.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    profileTab === 'skills' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {skills.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('network')}
              className={`tab-btn flex items-center gap-1.5 shrink-0 ${profileTab === 'network' ? 'active' : ''}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Network</span>
              {cohortPeers.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    profileTab === 'network' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {cohortPeers.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('posts')}
              className={`tab-btn flex items-center gap-1.5 shrink-0 ${profileTab === 'posts' ? 'active' : ''}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Posts</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  profileTab === 'posts' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {posts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('digitalid')}
              className={`tab-btn flex items-center gap-1.5 shrink-0 ${profileTab === 'digitalid' ? 'active' : ''}`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-500" />
              <span>Digital ID</span>
            </button>
          </div>

          {/* TAB: INTERACTIVE DIGITAL CAMPUS PASS (SMART CARD) */}
          {(profileTab === 'digitalid' || profileTab === 'idcard') && (
            <div className="space-y-6">
              <div className="card p-6 sm:p-8 shadow-xl border-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center font-black shadow-xs">
                      <QrCode className="w-6 h-6 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black navy">Official Digital Campus Pass & Credentials</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Interactive cryptographic student/alumni passport. Flip, customize theme, or print pass.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>UGC ACCREDITED ID</span>
                  </span>
                </div>

                <div className="mt-6">
                  <DigitalIDCard userProfile={userProfile} onNavigate={onNavigate} />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: POSTS & CAMPUS FEED (WITH IMAGE & LIVE REACTIONS) */}
          {/* ========================================================= */}
          {profileTab === 'posts' && (
            <div className="space-y-6">
              {/* Create Post Card */}
              <div className="card p-6 shadow-xl border-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {userProfile.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black navy">Share an Update or Campus Memory</h3>
                    <p className="text-[11px] text-slate-400">
                      Post thoughts, research breakthroughs, campus photos, or career milestones with your university network.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newPostContent.trim() && !newPostImage) return;
                    try {
                      setIsPosting(true);
                      await createPost({
                        userId: currentUser.uid,
                        authorName: userProfile.name,
                        authorEmail: userProfile.email,
                        authorRole: userProfile.role,
                        authorUniversity: userProfile.university,
                        authorDepartment: userProfile.department,
                        authorPhotoUrl: userProfile.photoUrl,
                        content: newPostContent.trim(),
                        imageUrl: newPostImage || undefined,
                      });
                      setNewPostContent('');
                      setNewPostImage('');
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsPosting(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <textarea
                    rows={3}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What would you like to share with your university community? (e.g. thesis completed, new role, research paper, campus event...)"
                    className="w-full text-xs sm:text-sm border border-soft rounded-xl p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition resize-none bg-white"
                  />

                  {/* Image Attachment Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-soft">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Attach Image:</span>
                      </span>

                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setNewPostImageInputType('upload')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                            newPostImageInputType === 'upload'
                              ? 'bg-white shadow-xs text-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          <Upload className="w-3 h-3 inline mr-1" />
                          File
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPostImageInputType('url')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                            newPostImageInputType === 'url'
                              ? 'bg-white shadow-xs text-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          <Link2 className="w-3 h-3 inline mr-1" />
                          URL
                        </button>
                      </div>

                      {newPostImageInputType === 'upload' ? (
                        <label className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg font-bold cursor-pointer border border-blue-200">
                          <span>Browse Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 3 * 1024 * 1024) {
                                alert('Image must be under 3MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewPostImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      ) : (
                        <input
                          type="url"
                          placeholder="Paste image URL (https://...)"
                          value={newPostImage}
                          onChange={(e) => setNewPostImage(e.target.value)}
                          className="border border-soft rounded-lg px-2.5 py-1 text-xs outline-none bg-white w-48 sm:w-64"
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPosting || (!newPostContent.trim() && !newPostImage)}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isPosting ? 'Publishing...' : 'Publish Post'}</span>
                    </button>
                  </div>

                  {/* Attached Image Preview */}
                  {newPostImage && (
                    <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-56">
                      <img
                        src={newPostImage}
                        alt="Preview"
                        className="max-h-56 object-contain rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPostImage('')}
                        className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600 transition cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Feed Controls */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 uppercase text-[11px]">View Feed:</span>
                  <button
                    onClick={() => setPostFilter('all')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition ${
                      postFilter === 'all'
                        ? 'bg-navy text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-soft hover:bg-slate-50'
                    }`}
                  >
                    All Community Posts ({posts.length})
                  </button>
                  <button
                    onClick={() => setPostFilter('mine')}
                    className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition ${
                      postFilter === 'mine'
                        ? 'bg-navy text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-soft hover:bg-slate-50'
                    }`}
                  >
                    My Posts ({posts.filter((p) => p.userId === currentUser.uid).length})
                  </button>
                </div>
              </div>

              {/* Posts List */}
              <div className="space-y-4">
                {posts
                  .filter((p) => (postFilter === 'mine' ? p.userId === currentUser.uid : true))
                  .length === 0 ? (
                  <div className="card p-12 text-center text-slate-400">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold navy text-sm">No posts yet in this feed.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Be the first to share a campus achievement, photo, or question above!
                    </p>
                  </div>
                ) : (
                  posts
                    .filter((p) => (postFilter === 'mine' ? p.userId === currentUser.uid : true))
                    .map((post) => {
                      const isOwnPost = post.userId === currentUser.uid;
                      const reactionsDef: {
                        type: PostReactionType;
                        emoji: string;
                        label: string;
                        activeColor: string;
                      }[] = [
                        { type: 'like', emoji: '👍', label: 'Like', activeColor: 'bg-blue-100 text-blue-700 border-blue-300' },
                        { type: 'love', emoji: '❤️', label: 'Love', activeColor: 'bg-rose-100 text-rose-700 border-rose-300' },
                        { type: 'scholar', emoji: '🎓', label: 'Scholar', activeColor: 'bg-purple-100 text-purple-700 border-purple-300' },
                        { type: 'insightful', emoji: '💡', label: 'Insightful', activeColor: 'bg-amber-100 text-amber-700 border-amber-300' },
                        { type: 'celebrate', emoji: '👏', label: 'Celebrate', activeColor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                      ];

                      return (
                        <div key={post.id} className="card p-5 shadow-lg border-soft space-y-3">
                          {/* Post Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-sm shadow-xs overflow-hidden">
                                {post.authorPhotoUrl ? (
                                  <img
                                    src={post.authorPhotoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  post.authorName?.charAt(0) || 'M'
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <b className="navy text-sm">{post.authorName}</b>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                    {post.authorRole}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {post.authorUniversity && (
                                    <span className="font-medium text-slate-500">
                                      {post.authorUniversity}
                                      {post.authorDepartment ? ` · ${post.authorDepartment}` : ''} •{' '}
                                    </span>
                                  )}
                                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Delete Option for Author */}
                            {isOwnPost && (
                              <button
                                onClick={() => deletePost(post.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                                title="Delete post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Content */}
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>

                          {/* Attached Image */}
                          {post.imageUrl && (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-96">
                              <img
                                src={post.imageUrl}
                                alt="Post media"
                                className="w-full max-h-96 object-cover hover:scale-101 transition duration-200"
                              />
                            </div>
                          )}

                          {/* Interactive Reactions Bar */}
                          <div className="pt-2 border-t border-soft flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {reactionsDef.map((r) => {
                                const list = post.reactions?.[r.type] || [];
                                const count = list.length;
                                const hasReacted = list.includes(currentUser.uid);

                                return (
                                  <button
                                    key={r.type}
                                    type="button"
                                    onClick={() => reactToPost(post.id, r.type)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer border ${
                                      hasReacted
                                        ? `${r.activeColor} shadow-xs font-bold scale-105`
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                    title={`${r.label}: ${count} reaction(s)`}
                                  >
                                    <span>{r.emoji}</span>
                                    {count > 0 && (
                                      <span className="text-[11px] font-black">{count}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <span className="text-[11px] text-slate-400">
                              {Object.values(post.reactions || {}).flat().length} total reaction(s)
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: FOLLOWED UNIVERSITIES (WITH DISTINCT METRICS)      */}
          {/* ========================================================= */}
          {profileTab === 'followed' && (
            <div className="space-y-6">
              <div className="card p-6 shadow-xl border-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
                  <div>
                    <h3 className="text-base font-black navy">My Followed Universities</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Institutions you actively track for breakthroughs, research wires, and alumni developments.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('universities')}
                    className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Browse All Universities</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(!userProfile.followedUniversities || userProfile.followedUniversities.length === 0) ? (
                  <div className="py-12 text-center">
                    <Building2 className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                    <h4 className="font-bold navy text-sm">No Universities Followed Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Follow universities to stay informed about their verified alumni outcomes,
                      faculty research, and campus news.
                    </p>

                    {/* Suggestions */}
                    <div className="mt-6 pt-6 border-t border-soft">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                        Suggested to Follow:
                      </span>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['University of Dhaka', 'Bangladesh University of Engineering & Technology', 'North South University', 'Jahangirnagar University'].map(
                          (name) => (
                            <button
                              key={name}
                              onClick={() => toggleFollowUniversity(name)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Follow {name.includes('Dhaka') ? 'Dhaka University (DU)' : name}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    {userProfile.followedUniversities.map((uniName) => {
                      const uniData =
                        universities.find((u) => u.name.toLowerCase() === uniName.toLowerCase()) || {
                          name: uniName,
                          type: 'Public' as const,
                          location: 'Dhaka, Bangladesh',
                          alumniCount: 8920,
                          studentCount: 37500,
                          followersCount: 14200,
                          employmentRate: 85,
                        };

                      const logo = getUniversityLogo(uniName);

                      return (
                        <div
                          key={uniName}
                          className="p-5 rounded-2xl border border-soft bg-white shadow-sm hover:shadow-md transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden p-1 shadow-xs">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt=""
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  universityInitials(uniName)
                                )}
                              </div>
                              <div>
                                <b className="navy text-sm block leading-snug">{uniName}</b>
                                <span className="text-xs text-slate-400 block mt-0.5">
                                  {uniData.location || 'Bangladesh'}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => toggleFollowUniversity(uniName)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
                              title="Unfollow this campus"
                            >
                              Unfollow
                            </button>
                          </div>

                          {/* Distinct Counts: Followers, Alumni, and Students */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-soft">
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Followers
                              </span>
                              <b className="text-blue-600 text-xs block mt-0.5">
                                {uniData.followersCount?.toLocaleString() || '14,200'}
                              </b>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Alumni
                              </span>
                              <b className="navy text-xs block mt-0.5">
                                {uniData.alumniCount?.toLocaleString() || '8,920'}
                              </b>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                Students
                              </span>
                              <b className="text-indigo-600 text-xs block mt-0.5">
                                {uniData.studentCount?.toLocaleString() || '37,500'}
                              </b>
                            </div>
                          </div>

                          <button
                            onClick={() => onNavigate('universityDetail', { name: uniName })}
                            className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Explore Campus Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ACADEMIC CREDENTIALS & INFO DOSSIER                */}
          {/* ========================================================= */}
          {profileTab === 'dossier' && (
            <div className="space-y-6">

              {/* SECTION 1: ACADEMIC CREDENTIALS & CAMPUS STANDING */}
              <div className="card p-6 sm:p-7 shadow-xl border-soft">
                <div className="flex items-center justify-between pb-4 border-b border-soft">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black navy">Academic Identity & Institutional Credentials</h3>
                      <p className="text-[11px] text-slate-400">Verified higher education affiliation & degree records</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{userProfile.profileType === 'Alumni' ? 'Confirmed Graduate' : 'Active Student'}</span>
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                  {/* University */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">University Affiliation</span>
                      <div className="flex items-center gap-2 mt-2">
                        {userProfile.university && getUniversityLogo(userProfile.university) && (
                          <img
                            src={getUniversityLogo(userProfile.university)}
                            alt=""
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        )}
                        <b className="text-sm navy font-black leading-tight">
                          {userProfile.university || <span className="text-slate-400 italic font-normal">Not configured</span>}
                        </b>
                      </div>
                    </div>
                    {userProfile.university && (
                      <button
                        onClick={() => onNavigate('universityDetail', { name: userProfile.university || '' })}
                        className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Campus Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Department */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Faculty / Department</span>
                      <b className="text-sm navy font-black block mt-2 leading-tight">
                        {userProfile.department || <span className="text-slate-400 italic font-normal">Not configured</span>}
                      </b>
                    </div>
                    {userProfile.department && userProfile.university && (
                      <button
                        onClick={() =>
                          onNavigate('departmentProfile', {
                            dept: userProfile.department || '',
                            uni: userProfile.university || '',
                          })
                        }
                        className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Explore Discipline Cohorts</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Degree Level */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Degree / Program Level</span>
                    <b className="text-sm navy font-black block mt-2">
                      {userProfile.educationLevel || 'Undergraduate (Bachelor’s)'}
                    </b>
                    <span className="text-[11px] text-slate-400 mt-1 block">Degree Track</span>
                  </div>

                  {/* Student ID / Roll */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Registration / Student Roll</span>
                    <p className="text-sm font-mono font-bold navy mt-2">
                      {userProfile.studentId || <span className="text-slate-400 font-sans italic text-xs font-normal">Not recorded</span>}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">Campus ID</span>
                  </div>

                  {/* Student Year or Graduation Year */}
                  {userProfile.profileType === 'Student' ? (
                    <>
                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Standing</span>
                        <b className="text-sm navy font-black block mt-2">
                          {userProfile.studentYear || 'Active Student'}
                        </b>
                        <span className="text-[11px] text-slate-400 mt-1 block">Enrolled Semester</span>
                      </div>

                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Expected Graduation</span>
                        <b className="text-sm text-blue-600 font-black block mt-2">
                          {userProfile.expectedGraduation || '2028'}
                        </b>
                        <span className="text-[11px] text-slate-400 mt-1 block">Target Degree Completion</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Graduation Batch</span>
                        <b className="text-sm text-emerald-700 font-black block mt-2">
                          Class of {userProfile.graduationYear || '2024'}
                        </b>
                        <span className="text-[11px] text-slate-400 mt-1 block">Convocated Cohort</span>
                      </div>

                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Directory Status</span>
                        <b className="text-sm text-emerald-700 font-black block mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active Alumni</span>
                        </b>
                        <span className="text-[11px] text-slate-400 mt-1 block">Live in directory searches</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 2: PROFESSIONAL & CAREER TRAJECTORY */}
              <div className="card p-6 sm:p-7 shadow-xl border-soft">
                <div className="flex items-center justify-between pb-4 border-b border-soft">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black navy">Professional Career & Industry Trajectory</h3>
                      <p className="text-[11px] text-slate-400">Current position, global geography, and professional social links</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => enterEditMode('career')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Edit Career
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Role & Position</span>
                    <b className="text-sm navy font-black block mt-2">
                      {userProfile.jobRole || <span className="text-slate-400 italic font-normal">Not specified</span>}
                    </b>
                    <span className="text-[11px] text-slate-400 mt-1 block">Job Title</span>
                  </div>

                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Organization / Employer</span>
                    <b className="text-sm navy font-black block mt-2">
                      {userProfile.company || <span className="text-slate-400 italic font-normal">Not specified</span>}
                    </b>
                    <span className="text-[11px] text-slate-400 mt-1 block">Company</span>
                  </div>

                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>Current Location</span>
                    </span>
                    <b className="text-sm navy font-black block mt-2">
                      {userProfile.city ? `${userProfile.city}, ` : ''}{userProfile.country || 'Bangladesh'}
                    </b>
                    <span className="text-[11px] text-slate-400 mt-1 block">Residence & Market</span>
                  </div>

                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 sm:col-span-2 lg:col-span-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Professional Social Link</span>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {userProfile.linkedin ? (
                          <a
                            href={userProfile.linkedin.startsWith('http') ? userProfile.linkedin : `https://${userProfile.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-mono"
                          >
                            <span>{userProfile.linkedin}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No LinkedIn profile connected yet</span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => enterEditMode('career')}
                        className="text-[11px] font-bold text-blue-600 hover:underline shrink-0 cursor-pointer"
                      >
                        {userProfile.linkedin ? 'Update Link' : '+ Add LinkedIn'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PERSONAL BIOGRAPHY & ACADEMIC PASSIONS */}
              <div className="card p-6 sm:p-7 shadow-xl border-soft">
                <div className="flex items-center justify-between pb-4 border-b border-soft">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black navy">Biography & Academic Focus</h3>
                      <p className="text-[11px] text-slate-400">Research interests, career milestones, or campus background</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => enterEditMode('bio')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Edit Bio
                  </button>
                </div>

                <div className="mt-4">
                  {userProfile.bio ? (
                    <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-sm text-slate-700 leading-relaxed italic relative">
                      <span className="text-3xl text-blue-300 font-serif absolute top-2 left-3 select-none leading-none">“</span>
                      <p className="pl-5 pr-2 pt-1">{userProfile.bio}</p>
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400">You haven't added a personal academic biography yet.</p>
                      <button
                        type="button"
                        onClick={() => enterEditMode('bio')}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Add a bio so campus peers know your interests and journey
                      </button>
                    </div>
                  )}

                  {/* Skills & Technical Competencies Matrix */}
                  <div className="mt-5 pt-5 border-t border-soft">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Academic & Professional Skills Matrix</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">{skills.length} competencies recorded</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-xl bg-blue-50/90 border border-blue-200/80 text-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-blue-400 hover:text-rose-600 transition ml-0.5 cursor-pointer"
                            title="Remove skill"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newSkillInput}
                          onChange={(e) => setNewSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                          placeholder="+ Add competency..."
                          className="px-3 py-1 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition w-32 sm:w-40"
                        />
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          disabled={!newSkillInput.trim()}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* 1-Click Popular Competencies suggestions */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Suggested Campus & Industry Competencies (1-Click Add):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {['Python', 'Machine Learning', 'Data Analysis', 'React', 'TypeScript', 'Cloud Architecture', 'System Design', 'Project Leadership', 'Research', 'FinTech']
                          .filter((pop) => !skills.includes(pop))
                          .slice(0, 8)
                          .map((pop) => (
                            <button
                              key={pop}
                              type="button"
                              onClick={async () => {
                                const next = [...skills, pop];
                                setSkills(next);
                                try {
                                  await updateProfileData({ skills: next });
                                } catch (e) {}
                              }}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                              title={`Add ${pop} to skills`}
                            >
                              <Plus className="w-3 h-3 text-slate-400" />
                              <span>{pop}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3.5: COHORT COLLEAGUES & CAMPUS PEERS */}
              {cohortPeers.length > 0 && (
                <div className="card p-6 sm:p-7 shadow-xl border-soft">
                  <div className="flex items-center justify-between pb-4 border-b border-soft">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-black navy">Campus Cohort & Department Peers</h3>
                        <p className="text-[11px] text-slate-400">Fellow scholars & alumni from {userProfile.university}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('alumni')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore All Peers</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                    {cohortPeers.slice(0, 6).map((peer) => (
                      <div
                        key={peer.id}
                        onClick={() => onNavigate('alumniProfile', { id: peer.id, name: peer.name })}
                        className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition cursor-pointer flex items-center gap-3 group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0 overflow-hidden shadow-xs">
                          {peer.photoUrl ? (
                            <img src={peer.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            peer.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <b className="navy text-xs font-black block truncate group-hover:text-blue-600 transition">
                            {peer.name}
                          </b>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {peer.jobRole || `Class of ${peer.graduationYear || peer.batch || '2024'}`}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {peer.department}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: INSTITUTIONAL VERIFICATION & BADGES */}
              <div className="card p-6 sm:p-7 shadow-xl border-soft space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black navy">Degree Verification & Directory Record</h3>
                      <p className="text-[11px] text-slate-400">Institutional validation badges and claimed directory archives</p>
                    </div>
                  </div>
                </div>

                {userProfile.isVerifiedAlumni ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <b className="text-sm text-emerald-900 block font-black">Official Verified Degree Holder</b>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Your university credentials and graduation proof have been verified by institutional administrators.
                      </p>
                    </div>
                  </div>
                ) : userProfile.profileType === 'Alumni' ? (
                  <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <b className="navy text-sm block">Want an Official Verified Alumni Badge?</b>
                      <p className="text-xs text-slate-500 mt-1">
                        Submit proof of graduation (Certificate, Transcript or LinkedIn) for Super Admin verification.
                      </p>
                    </div>
                    <button
                      onClick={() => setVerificationModalOpen(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shrink-0 cursor-pointer shadow-xs"
                    >
                      Request Degree Badge →
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </span>
                    <span>
                      <b>Active Student Enrollment:</b> As an actively enrolled student, you have full access to campus feeds, mentor outreach, and directory discovery. Degree badge requests become available upon graduation.
                    </span>
                  </div>
                )}

                {/* Claim an existing alumni directory record */}
                {currentUser && claimCandidates.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
                    <div>
                      <b className="block text-sm navy">Claim an existing alumni profile</b>
                      <p className="mt-1 text-xs text-slate-600">
                        We found directory records matching your signed-in email or student ID. Submit evidence; the record will not be linked until a Super Admin reviews it.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {claimCandidates.map((record) => {
                        const pending = profileClaims.some(
                          (claim) => claim.targetAlumniId === record.id && claim.status === 'PENDING'
                        );
                        return (
                          <div
                            key={record.id}
                            className="rounded-xl border border-amber-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div>
                              <p className="font-bold text-sm navy">{record.name}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {record.university} · {record.department} · Batch {record.graduationYear || record.batch}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Student ID: {record.studentId || 'Not recorded'}
                              </p>
                            </div>
                            {pending ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                                Claim pending review
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={submittingClaim || !claimProofUrl.trim()}
                                onClick={() => void handleProfileClaimSubmit(record)}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                              >
                                {submittingClaim ? 'Submitting…' : 'Request to claim'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="text-xs font-bold text-slate-600">
                        Evidence link (HTTPS) *
                        <input
                          required
                          type="url"
                          value={claimProofUrl}
                          onChange={(e) => setClaimProofUrl(e.target.value)}
                          placeholder="https://..."
                          className="account-input mt-1"
                        />
                      </label>
                      <label className="text-xs font-bold text-slate-600">
                        Notes for reviewer
                        <textarea
                          value={claimNotes}
                          onChange={(e) => setClaimNotes(e.target.value)}
                          maxLength={1000}
                          rows={2}
                          placeholder="Explain how this record belongs to you"
                          className="account-input mt-1"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {profileClaims.filter((claim) => claim.requesterId === currentUser?.uid).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <b className="text-sm navy">Your profile claim history</b>
                    <div className="mt-2 space-y-2">
                      {profileClaims
                        .filter((claim) => claim.requesterId === currentUser?.uid)
                        .map((claim) => (
                          <div key={claim.id} className="flex items-center justify-between gap-3 text-xs">
                            <span>
                              {claim.university} · {claim.department}
                            </span>
                            <span
                              className={
                                claim.status === 'APPROVED'
                                  ? 'font-bold text-emerald-700'
                                  : claim.status === 'REJECTED'
                                  ? 'font-bold text-rose-700'
                                  : 'font-bold text-amber-700'
                              }
                            >
                              {claim.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: CAMPUS ATMOSPHERE & BANNER THEME STUDIO */}
              <div className="card p-6 sm:p-7 shadow-xl border-soft rounded-3xl bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-soft">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black navy">Campus Atmosphere & Portfolio Decoration</h3>
                      <p className="text-[11px] text-slate-400">Select an architectural visual aesthetic for your executive portfolio banner</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full self-start sm:self-auto">
                    Active Theme: {currentCoverTheme.name.split(' ')[0]}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
                  {COVER_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectCoverTheme(theme.id)}
                      className={`text-left rounded-2xl overflow-hidden border transition p-3 cursor-pointer group flex flex-col justify-between ${
                        coverTheme === theme.id
                          ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="h-24 w-full rounded-xl overflow-hidden relative mb-2.5 bg-slate-900 border border-black/10">
                        {theme.imageUrl ? (
                          <img
                            src={theme.imageUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${theme.gradient}`} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span
                          className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/20"
                        >
                          {theme.id.toUpperCase()}
                        </span>
                        {coverTheme === theme.id && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <b className="text-xs navy font-black block leading-tight">{theme.name}</b>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{theme.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: DATA STORAGE RECEIPT & SECURITY PROVENANCE        */}
          {/* ========================================================= */}
          {profileTab === 'storage' && (
            <div className="space-y-6">
              <div className="card p-6 sm:p-8 shadow-xl border-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shadow-xs">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black navy">Official Data Storage Receipt</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verifiable record of your identity committed to the internal persistent database.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>PERSISTENT & ACTIVE</span>
                    </span>
                  </div>
                </div>

                {/* Storage Specifications Dossier */}
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Record Identifier</span>
                    <span className="text-sm font-mono font-bold text-slate-800 break-all">{userProfile.id || currentUser.uid}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Primary Database Engine</span>
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span>Internal Persistent Engine (admin-database.json)</span>
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Directory Replication</span>
                    <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Synchronized to Cloud Firestore Directory</span>
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cryptographic Protection</span>
                    <span className="text-sm font-mono font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span>scrypt-pbkdf2-salted (Zero Plaintext)</span>
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Affiliated Institution</span>
                    <span className="text-sm font-bold text-slate-800">{userProfile.university || 'Affiliated University'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faculty / Department</span>
                    <span className="text-sm font-bold text-slate-800">{userProfile.department || 'Academic Department'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Registration Timestamp</span>
                    <span className="text-xs font-mono text-slate-700">{userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Last Modification / Sync</span>
                    <span className="text-xs font-mono text-slate-700">{userProfile.updatedAt ? new Date(userProfile.updatedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-soft flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 max-w-md">
                    Your personal information is stored securely in the internal database and mirrored to the public directory according to your profile visibility preferences.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const receiptText = JSON.stringify({
                        recordId: userProfile.id || currentUser.uid,
                        name: userProfile.name,
                        email: userProfile.email,
                        institution: userProfile.university,
                        department: userProfile.department,
                        storageEngine: 'Internal Persistent Database (admin-database.json)',
                        status: 'SECURELY_COMMITTED',
                        timestamp: userProfile.createdAt,
                      }, null, 2);
                      navigator.clipboard.writeText(receiptText);
                      setCopiedReceipt(true);
                      setTimeout(() => setCopiedReceipt(false), 2500);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-xs cursor-pointer"
                  >
                    {copiedReceipt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>{copiedReceipt ? 'Receipt Copied to Clipboard!' : 'Copy Storage Receipt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. LOGGED OUT AUTHENTICATION & ACCOUNT OPENING SYSTEM     */}
      {/* ========================================================= */}
      {!currentUser && viewState !== 'edit' && (
        <div className="mt-6 space-y-8">
          {/* Top Segmented Navigation Switcher */}
          <div className="card p-2 shadow-md border-soft max-w-2xl mx-auto flex items-center justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setAuthMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('signup');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Quick Sign Up</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('wizard');
                setWizardStep(1);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                authMode === 'wizard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Guided Account Opening</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('storageStatus');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                authMode === 'storageStatus'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data Storage Info</span>
            </button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: LOG IN VIEW                                            */}
          {/* ------------------------------------------------------------- */}
          {authMode === 'login' && (
            <div className="max-w-md mx-auto">
              <div className="card p-7 sm:p-8 shadow-xl border-soft">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black mb-4 shadow-xs">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black navy">Sign In to Your Account</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access your verified campus profile, alumni directory, and network.
                </p>

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="account-input"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600">Password *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="account-input pr-10"
                        placeholder="Your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-navy text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  </button>
                </form>

                {/* 1-Click Instant Test Demo Profiles */}
                <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>1-Click Test Sign-In:</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold">Instant Profiles</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('tanvir.hasan@alumni.ac.bd');
                        setPassword('Alumni@2026');
                      }}
                      className="p-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                    >
                      <b className="navy font-black text-xs block group-hover:text-blue-600 truncate">Alumni Scholar</b>
                      <span className="text-[10px] text-slate-500 block truncate">Tanvir (Google SWE)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('farhana.yasmin@buet.ac.bd');
                        setPassword('Alumni@2026');
                      }}
                      className="p-2 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                    >
                      <b className="navy font-black text-xs block group-hover:text-emerald-700 truncate">Research Fellow</b>
                      <span className="text-[10px] text-slate-500 block truncate">Dr. Farhana (Meta)</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-soft">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Continue with Google</span>
                  </button>
                </div>

                {/* Storage Health Pill */}
                <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Internal Storage Active</span>
                  </span>
                  <button
                    onClick={() => setAuthMode('storageStatus')}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View Status →
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-soft text-center text-xs text-slate-500">
                  <span>Don't have an account yet? </span>
                  <button
                    onClick={() => setAuthMode('signup')}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Open New Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: DEDICATED INTERNAL SIGN-UP SECTION                     */}
          {/* ------------------------------------------------------------- */}
          {authMode === 'signup' && (
            <div className="max-w-3xl mx-auto">
              <div className="card p-6 sm:p-9 shadow-xl border-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-soft gap-4">
                  <div>
                    <span className="pill text-blue-600 font-bold text-xs bg-blue-50 border-blue-200">
                      Internal Sign-Up System
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black navy mt-2">Create New Account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Data is encrypted with scrypt salt and committed to the internal persistent database.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('wizard')}
                      className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Try Step-by-Step Wizard</span>
                    </button>
                  </div>
                </div>

                {/* Role Toggle */}
                <div className="mt-6 p-1.5 rounded-2xl bg-slate-100 grid grid-cols-2 gap-1.5 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => setProfileType('Student')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      profileType === 'Student'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>I am a Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileType('Alumni')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      profileType === 'Alumni'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>I am an Alumni</span>
                  </button>
                </div>

                <form onSubmit={handleRegister} className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Full Name *</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="account-input"
                      placeholder="e.g. Nahian Al Mubin"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600">Email Address *</label>
                      {emailChecking && <span className="text-[10px] text-slate-400">Checking…</span>}
                      {!emailChecking && emailAvailable === true && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Available
                        </span>
                      )}
                      {!emailChecking && emailAvailable === false && (
                        <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Already registered
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        checkEmailLive(e.target.value);
                      }}
                      onBlur={() => checkEmailLive(email)}
                      required
                      className={`account-input ${emailAvailable === false ? 'border-rose-400 focus:border-rose-500' : ''}`}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Password (6+ chars) *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="account-input pr-10"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className={`account-input pr-10 ${confirmPassword && confirmPassword !== password ? 'border-rose-400' : ''}`}
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-[11px] text-rose-600 mt-1">Passwords do not match.</p>
                    )}
                  </div>

                  {/* University selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">University Institution *</label>
                    <select
                      value={university}
                      onChange={(e) => {
                        setUniversity(e.target.value);
                        if (studentId) checkStudentIdLive(studentId, e.target.value);
                      }}
                      required
                      className="account-input bg-white cursor-pointer"
                    >
                      <option value="" disabled>-- Select Your University --</option>
                      {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                        <option key={u.name} value={u.name}>{u.name}</option>
                      ))}
                      <option value="OTHER">Other / Custom University</option>
                    </select>
                    {university === 'OTHER' && (
                      <input
                        value={customUniversity}
                        onChange={(e) => setCustomUniversity(e.target.value)}
                        required
                        className="account-input mt-2"
                        placeholder="Enter your exact University name"
                      />
                    )}
                  </div>

                  {/* Department selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Academic Department *</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      className="account-input bg-white cursor-pointer"
                    >
                      <option value="" disabled>-- Select Your Department --</option>
                      {RAW_DEPARTMENT_CATALOG.map((d) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                      <option value="OTHER">Other / Custom Department</option>
                    </select>
                    {department === 'OTHER' && (
                      <input
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        required
                        className="account-input mt-2"
                        placeholder="Enter your exact Department name"
                      />
                    )}
                  </div>

                  {/* Student ID / Roll */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600">Student ID / Roll Number</label>
                      {studentIdChecking && <span className="text-[10px] text-slate-400">Checking…</span>}
                      {!studentIdChecking && studentIdAvailable === true && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Unique
                        </span>
                      )}
                    </div>
                    <input
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        if (university) checkStudentIdLive(e.target.value, university);
                      }}
                      className="account-input"
                      placeholder="e.g. 230204101"
                    />
                  </div>

                  {/* Education Degree Level */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Education Degree Level *</label>
                    <select
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      className="account-input bg-white cursor-pointer"
                    >
                      {(presetsData?.educationLevels || [
                        'Undergraduate (Bachelor’s)',
                        'Postgraduate (Master’s)',
                        'MPhil (Master of Philosophy)',
                        'Doctoral (PhD / Postdoc)',
                        'Diploma / Executive Track',
                      ]).map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  {/* Student Specific Fields */}
                  {profileType === 'Student' && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Current Academic Semester *</label>
                        <input
                          value={studentYear}
                          onChange={(e) => setStudentYear(e.target.value)}
                          required
                          className="account-input"
                          placeholder="e.g. 2nd Year, 4th Semester"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Expected Graduation Year *</label>
                        <input
                          value={expectedGraduation}
                          onChange={(e) => setExpectedGraduation(e.target.value)}
                          required
                          className="account-input"
                          placeholder="e.g. 2028"
                        />
                      </div>
                    </>
                  )}

                  {/* Alumni Specific Fields */}
                  {profileType === 'Alumni' && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Graduation Batch Year *</label>
                        <input
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          required
                          className="account-input"
                          placeholder="e.g. 2024"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Job Title / Designation</label>
                        <input
                          value={jobRole}
                          onChange={(e) => setJobRole(e.target.value)}
                          className="account-input"
                          placeholder="e.g. Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Company / Organization</label>
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="account-input"
                          placeholder="e.g. Google, Brain Station 23"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">LinkedIn Profile Link</label>
                        <input
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="account-input"
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                    </>
                  )}

                  {/* Data Storage Process Progression Visualizer */}
                  <div className="sm:col-span-2 mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Data Storage & Persistence Pipeline
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className={`p-2.5 rounded-xl border transition ${storagePipelineStep >= 1 ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <div className="font-bold text-[11px]">1. Cryptographic Hash</div>
                        <div className="text-[9px] opacity-80">scrypt salted</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border transition ${storagePipelineStep >= 2 ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <div className="font-bold text-[11px]">2. Internal Database</div>
                        <div className="text-[9px] opacity-80">admin-database.json</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border transition ${storagePipelineStep >= 3 ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <div className="font-bold text-[11px]">3. Directory Sync</div>
                        <div className="text-[9px] opacity-80">Firestore live record</div>
                      </div>
                      <div className={`p-2.5 rounded-xl border transition ${storagePipelineStep >= 4 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <div className="font-bold text-[11px]">4. Storage Receipt</div>
                        <div className="text-[9px] opacity-80">Verifiable identity</div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-soft gap-3">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Already have an account? Log In
                    </button>
                    <button
                      type="submit"
                      disabled={loading || (emailAvailable === false)}
                      className="w-full sm:w-auto bg-blue-600 text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{loading ? 'Executing Data Storage Process…' : 'Open Account & Store Data'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: GUIDED NEW ACCOUNT OPENING PROCESS (5-STAGE WIZARD)    */}
          {/* ------------------------------------------------------------- */}
          {authMode === 'wizard' && (
            <div className="max-w-3xl mx-auto">
              <div className="card p-6 sm:p-9 shadow-xl border-soft">
                {/* Wizard Stage Progress Indicator */}
                <div className="pb-6 border-b border-soft">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                        New Account Opening Wizard
                      </span>
                      <h2 className="text-2xl font-black navy mt-1">
                        {wizardStep === 1 && 'Step 1: Identity & Security Credentials'}
                        {wizardStep === 2 && 'Step 2: Institutional Standing & Faculty'}
                        {wizardStep === 3 && 'Step 3: Career Ambitions & Achievements'}
                        {wizardStep === 4 && 'Step 4: Persona, Avatar & Honor Code'}
                        {wizardStep === 5 && 'Step 5: Account Activated & Storage Receipt'}
                      </h2>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                      Step {wizardStep} of 5
                    </span>
                  </div>

                  {/* Multi-step progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${(wizardStep / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* --- WIZARD STEP 1: IDENTITY & CREDENTIALS --- */}
                {wizardStep === 1 && (
                  <div className="mt-6 space-y-5">
                    {/* Role Choice Cards */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileType('Student')}
                        className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                          profileType === 'Student'
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm mb-2">
                          S
                        </div>
                        <h4 className="font-bold navy text-sm">University Student</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Enrolled student. Track course batches, access senior alumni mentors, and explore university departments.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProfileType('Alumni')}
                        className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                          profileType === 'Alumni'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm mb-2">
                          A
                        </div>
                        <h4 className="font-bold navy text-sm">Graduated Alumni</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          University graduate. Connect with fellow alumni, show professional career outcomes, and mentor juniors.
                        </p>
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Your Full Name *</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="account-input"
                        placeholder="e.g. Nahian Al Mubin"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600">Email Address (Google or University Email) *</label>
                        {emailChecking && <span className="text-[10px] text-slate-400">Verifying…</span>}
                        {!emailChecking && emailAvailable === true && (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Email Available
                          </span>
                        )}
                        {!emailChecking && emailAvailable === false && (
                          <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Already registered
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          checkEmailLive(e.target.value);
                        }}
                        onBlur={() => checkEmailLive(email)}
                        className="account-input"
                        placeholder="name@example.com"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Password *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            className="account-input pr-10"
                            placeholder="At least 6 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Confirm Password *</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength={6}
                            className="account-input pr-10"
                            placeholder="Re-enter password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!name.trim()) { setErrorMsg('Please enter your full name.'); return; }
                          if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrorMsg('Please enter a valid email address.'); return; }
                          if (emailAvailable === false) { setErrorMsg('This email is already registered.'); return; }
                          if (!password || password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
                          if (confirmPassword && confirmPassword !== password) { setErrorMsg('Passwords do not match.'); return; }
                          setErrorMsg('');
                          setWizardStep(2);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <span>Continue to Institutional Standing</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- WIZARD STEP 2: INSTITUTIONAL STANDING --- */}
                {wizardStep === 2 && (
                  <div className="mt-6 space-y-5">
                    {/* Quick Pick Premier Universities */}
                    <div>
                      <span className="text-xs font-bold text-slate-600 block mb-2">Quick Select Popular Institutions:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['University of Dhaka', 'Bangladesh University of Engineering & Technology', 'North South University', 'BRAC University', 'Shahjalal University of Science & Technology'].map((uniName) => (
                          <button
                            key={uniName}
                            type="button"
                            onClick={() => {
                              setUniversity(uniName);
                              if (studentId) checkStudentIdLive(studentId, uniName);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              university === uniName
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                            }`}
                          >
                            {uniName.replace('Bangladesh University of Engineering & Technology', 'BUET').replace('Shahjalal University of Science & Technology', 'SUST')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Select University from Directory *</label>
                      <select
                        value={university}
                        onChange={(e) => {
                          setUniversity(e.target.value);
                          if (studentId) checkStudentIdLive(studentId, e.target.value);
                        }}
                        className="account-input bg-white cursor-pointer"
                      >
                        <option value="" disabled>-- Select University --</option>
                        {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                          <option key={u.name} value={u.name}>{u.name}</option>
                        ))}
                        <option value="OTHER">Other Institution (Manual Entry)</option>
                      </select>
                      {university === 'OTHER' && (
                        <input
                          value={customUniversity}
                          onChange={(e) => setCustomUniversity(e.target.value)}
                          className="account-input mt-2"
                          placeholder="Type your exact institution name"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Academic Department *</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="account-input bg-white cursor-pointer"
                      >
                        <option value="" disabled>-- Select Department --</option>
                        {RAW_DEPARTMENT_CATALOG.map((d) => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                        <option value="OTHER">Other Department (Manual Entry)</option>
                      </select>
                      {department === 'OTHER' && (
                        <input
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          className="account-input mt-2"
                          placeholder="Type your exact department name"
                        />
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-600">Student ID / Roll</label>
                          {studentIdChecking && <span className="text-[10px] text-slate-400">Verifying…</span>}
                          {!studentIdChecking && studentIdAvailable === true && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Unique ID
                            </span>
                          )}
                        </div>
                        <input
                          value={studentId}
                          onChange={(e) => {
                            setStudentId(e.target.value);
                            if (university) checkStudentIdLive(e.target.value, university);
                          }}
                          className="account-input"
                          placeholder="e.g. 230204101"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Education Track *</label>
                        <select
                          value={educationLevel}
                          onChange={(e) => setEducationLevel(e.target.value)}
                          className="account-input bg-white cursor-pointer"
                        >
                          <option value="Undergraduate (Bachelor’s)">Undergraduate (Bachelor’s)</option>
                          <option value="Postgraduate (Master’s)">Postgraduate (Master’s)</option>
                          <option value="MPhil (Master of Philosophy)">MPhil (Master of Philosophy)</option>
                          <option value="Doctoral (PhD / Postdoc)">Doctoral (PhD / Postdoc)</option>
                          <option value="Diploma / Executive Track">Diploma / Executive Track</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-soft">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const finalUni = (university === 'OTHER' ? customUniversity : university).trim();
                          const finalDept = (department === 'OTHER' ? customDepartment : department).trim();
                          if (!finalUni) { setErrorMsg('Please select or specify your university.'); return; }
                          if (!finalDept) { setErrorMsg('Please select or specify your department.'); return; }
                          setErrorMsg('');
                          setWizardStep(3);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <span>Continue to Career & Ambition</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- WIZARD STEP 3: CAREER & GOALS --- */}
                {wizardStep === 3 && (
                  <div className="mt-6 space-y-5">
                    {profileType === 'Student' ? (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Current Academic Semester *</label>
                            <input
                              value={studentYear}
                              onChange={(e) => setStudentYear(e.target.value)}
                              className="account-input"
                              placeholder="e.g. 2nd Year, 4th Semester"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Expected Graduation Year *</label>
                            <input
                              value={expectedGraduation}
                              onChange={(e) => setExpectedGraduation(e.target.value)}
                              className="account-input"
                              placeholder="e.g. 2028"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">Career Goal / Research Ambition</label>
                          <input
                            value={jobRole}
                            onChange={(e) => setJobRole(e.target.value)}
                            className="account-input"
                            placeholder="e.g. Aspiring AI Researcher, Full-Stack Engineer, Civil Consultant"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Graduation Batch Year *</label>
                            <input
                              value={graduationYear}
                              onChange={(e) => setGraduationYear(e.target.value)}
                              className="account-input"
                              placeholder="e.g. 2024"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Current Job Title / Designation</label>
                            <input
                              value={jobRole}
                              onChange={(e) => setJobRole(e.target.value)}
                              className="account-input"
                              placeholder="e.g. Lead Engineer, Senior Auditor, Founder"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Current Organization / Firm</label>
                            <input
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              className="account-input"
                              placeholder="e.g. Google, Brain Station 23, Walton"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">LinkedIn Profile Link</label>
                            <input
                              value={linkedin}
                              onChange={(e) => setLinkedin(e.target.value)}
                              className="account-input"
                              placeholder="https://linkedin.com/in/..."
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Country</label>
                            <input
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              className="account-input"
                              placeholder="e.g. Bangladesh, Germany, USA"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">City</label>
                            <input
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="account-input"
                              placeholder="e.g. Dhaka, Munich, New York"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-4 flex items-center justify-between border-t border-soft">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg('');
                          setWizardStep(4);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <span>Continue to Persona & Verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- WIZARD STEP 4: PERSONA, AVATAR & HONOR CODE --- */}
                {wizardStep === 4 && (
                  <div className="mt-6 space-y-5">
                    {/* Preset Avatars Selection */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">Choose an Instant Professional Avatar:</span>
                      <div className="flex flex-wrap gap-2.5">
                        {(presetsData?.defaultAvatars || [
                          { id: 'av-grad-cap', name: 'Academic Scholar', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces' },
                          { id: 'av-tech-dev', name: 'Software Engineer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces' },
                          { id: 'av-researcher', name: 'Research Fellow', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces' },
                          { id: 'av-student-1', name: 'Campus Student', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=faces' },
                          { id: 'av-student-2', name: 'Graduate Scholar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=faces' },
                        ]).map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setPhotoUrl(av.url)}
                            className={`p-1 rounded-xl border-2 transition cursor-pointer ${
                              photoUrl === av.url ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            title={av.name}
                          >
                            <img src={av.url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Short Profile Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                        className="account-input"
                        placeholder="Tell colleagues and students about your academic interests, focus, and career ambitions..."
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="honorCodeCheck"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded text-indigo-600 cursor-pointer"
                      />
                      <label htmlFor="honorCodeCheck" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                        <b>Honor Code & Data Protection:</b> I confirm that the academic affiliations provided are true and accurate. I agree that my profile record will be committed to the internal persistent database and mirrored to the university alumni directory.
                      </label>
                    </div>

                    {/* Active Storage Pipeline Status */}
                    {storagePipelineStep > 0 && (
                      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                        <span className="text-xs font-bold text-indigo-800 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Executing Data Storage Process…</span>
                        </span>
                        <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                          <span className={storagePipelineStep >= 1 ? 'text-indigo-700' : 'text-slate-400'}>1. Key Salted</span>
                          <span className={storagePipelineStep >= 2 ? 'text-indigo-700' : 'text-slate-400'}>2. Database Store</span>
                          <span className={storagePipelineStep >= 3 ? 'text-indigo-700' : 'text-slate-400'}>3. Directory Sync</span>
                          <span className={storagePipelineStep >= 4 ? 'text-emerald-700' : 'text-slate-400'}>4. Receipt Issued</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between border-t border-soft">
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        disabled={loading || !termsAccepted}
                        onClick={() => executeAccountRegistration(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-8 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>{loading ? 'Committing to Storage…' : 'Finalize & Open Account'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* --- WIZARD STEP 5: DIGITAL MEMBER DOSSIER & RECEIPT --- */}
                {wizardStep === 5 && (
                  <div className="mt-6 space-y-6">
                    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="w-6 h-6 text-emerald-400" />
                          <span className="font-mono text-xs uppercase tracking-widest text-indigo-300">
                            Digital Member Identity Dossier
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                          VERIFIED & ACTIVE
                        </span>
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 p-1 border border-white/20 overflow-hidden flex items-center justify-center font-black text-2xl text-indigo-200">
                          {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{name}</h3>
                          <p className="text-xs text-indigo-200 mt-0.5">
                            {profileType} · {department} · {university}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid sm:grid-cols-2 gap-3 text-xs bg-white/5 p-4 rounded-2xl border border-white/10 font-mono">
                        <div>
                          <span className="text-[10px] text-indigo-300 uppercase block">Record Identifier</span>
                          <span className="font-bold text-white break-all">{activeReceipt?.recordId || 'Stored in DB'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-indigo-300 uppercase block">Storage Engine</span>
                          <span className="font-bold text-white">admin-database.json (Persistent)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-indigo-300 uppercase block">Cryptographic Hash</span>
                          <span className="font-bold text-white">scrypt-pbkdf2-salted</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-indigo-300 uppercase block">Directory Status</span>
                          <span className="font-bold text-emerald-300">Live in University Registry</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const receiptText = JSON.stringify(activeReceipt || { name, email, university, department }, null, 2);
                          navigator.clipboard.writeText(receiptText);
                          setCopiedReceipt(true);
                          setTimeout(() => setCopiedReceipt(false), 2500);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                      >
                        {copiedReceipt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                        <span>{copiedReceipt ? 'Receipt Copied!' : 'Copy Storage Receipt'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate('alumni')}
                          className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Explore Alumni Directory</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: DATA STORAGE ARCHITECTURE & STATUS                     */}
          {/* ------------------------------------------------------------- */}
          {authMode === 'storageStatus' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="card p-6 sm:p-8 shadow-xl border-soft">
                <div className="flex items-center justify-between pb-4 border-b border-soft">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shadow-xs">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black navy">Internal Data Storage Architecture</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Transparency into how your sign-up data is stored, hashed, and replicated across sessions.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                    Active & Persistent
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-center">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Stored</span>
                    <b className="text-2xl font-black navy block mt-1">
                      {serverStorageMetrics?.totalRegisteredAccounts || presetsData?.totalAccountsStored || 32}
                    </b>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Students</span>
                    <b className="text-2xl font-black text-indigo-600 block mt-1">
                      {serverStorageMetrics?.breakdown?.students || 14}
                    </b>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Alumni</span>
                    <b className="text-2xl font-black text-emerald-600 block mt-1">
                      {serverStorageMetrics?.breakdown?.alumni || 17}
                    </b>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Admins</span>
                    <b className="text-2xl font-black text-blue-600 block mt-1">
                      {serverStorageMetrics?.breakdown?.administrators || 1}
                    </b>
                  </div>
                </div>

                {/* Storage Features List */}
                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <b className="navy block">Cryptographic Key Derivation (scrypt + random salt)</b>
                      No passwords are ever saved in plaintext. Each account credential generates a 64-byte derivation with a unique 16-byte cryptographic salt.
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <b className="navy block">Dual-Engine Persistence Guarantee</b>
                      Accounts are committed to the disk-backed JSON document store (`admin-database.json`) and synchronized to Cloud Firestore Enterprise for real-time live university discovery.
                    </div>
                  </div>
                </div>

                {/* Recent Account Openings stream */}
                {recentSignups.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-soft">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
                      Recent Account Openings Stream:
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {recentSignups.map((s, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                          <div>
                            <b className="navy">{s.name}</b>
                            <span className="text-slate-500 ml-2">({s.profileType})</span>
                            <div className="text-[11px] text-slate-400">{s.university} · {s.department}</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                            Stored in DB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 5: FORGOT PASSWORD RECOVERY                               */}
          {/* ------------------------------------------------------------- */}
          {authMode === 'forgot' && (
            <div className="max-w-md mx-auto">
              <div className="card p-7 shadow-xl border-soft">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-800 transition mb-3 cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Log In</span>
                </button>
                <h2 className="text-2xl font-black navy">Reset Password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your registered Gmail or email address. We will dispatch an official reset link.
                </p>

                <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="account-input"
                      placeholder="name@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-navy text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? 'Sending Recovery Link…' : 'Send Password Reset Link'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Edit Profile Form - Executive Tabbed Studio */}
      {currentUser && viewState === 'edit' && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="card p-6 sm:p-9 shadow-2xl border-soft rounded-3xl bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-soft">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Profile Customization Studio</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black navy mt-1 tracking-tight">Edit Academic Profile</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Customize your credentials, campus aesthetic, and career milestones.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewState('default')}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Segmented Sub-Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl mt-5 mb-6 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setEditTab('visuals')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  editTab === 'visuals' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>1. Visuals & Themes</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('academic')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  editTab === 'academic' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>2. Academic Identity</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('career')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  editTab === 'career' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>3. Career & Social</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('skills')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  editTab === 'skills' || editTab === 'bio' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>4. Bio & Skills</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* TAB 1: VISUALS, AVATAR & CAMPUS THEMES */}
              {editTab === 'visuals' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Avatar Section */}
                  <div className="rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/70 via-indigo-50/30 to-white p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                      <div className="relative group shrink-0 self-start sm:self-auto">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-white flex items-center justify-center text-2xl font-black text-blue-700">
                          {isUploadingPhoto ? (
                            <div className="flex flex-col items-center gap-1 text-xs text-blue-600">
                              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </div>
                          ) : photoUrl || defaultProfilePictures[0]?.url ? (
                            <img
                              src={photoUrl || defaultProfilePictures[0]?.url || ''}
                              alt="Profile preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            name.split(' ').map((p) => p[0]).join('').slice(0, 2) || 'U'
                          )}
                        </div>
                        <label
                          className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg cursor-pointer transition flex items-center justify-center border-2 border-white"
                          title="Upload image"
                        >
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={isUploadingPhoto}
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (!file) return;
                              await handleUploadProfilePhoto(file);
                            }}
                          />
                        </label>
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <h3 className="text-sm font-black text-slate-800">Profile Portrait & Persona</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Upload a personal photograph or select one of the university platform defaults below.
                          </p>
                        </div>

                        {photoUrl && (
                          <button
                            type="button"
                            onClick={() => setPhotoUrl('')}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                          >
                            Remove selected picture
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Presets Grid */}
                    {defaultProfilePictures.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-blue-100/80">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                          Instant Academic Avatars:
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {defaultProfilePictures.map((picture) => (
                            <button
                              key={picture.id}
                              type="button"
                              onClick={() => {
                                setPhotoUrl(picture.url);
                                setErrorMsg('');
                              }}
                              className={`p-1 rounded-2xl border transition cursor-pointer flex items-center gap-2 ${
                                photoUrl === picture.url
                                  ? 'border-blue-600 bg-white ring-2 ring-blue-300 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                              title={`Use ${picture.name}`}
                            >
                              <img src={picture.url} alt={picture.name} className="w-10 h-10 object-cover rounded-xl" />
                              <span className="text-xs font-bold text-slate-700 pr-2">{picture.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Campus Cover Theme Gallery */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <b className="text-sm font-black navy block">Campus Cover Banner Aesthetic</b>
                        <p className="text-xs text-slate-500 mt-0.5">Choose your background architectural backdrop</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                        Theme: {currentCoverTheme.name.split(' ')[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {COVER_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setCoverTheme(theme.id)}
                          className={`text-left p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between group ${
                            coverTheme === theme.id
                              ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="h-20 w-full rounded-xl overflow-hidden relative mb-2 bg-slate-900 border border-black/10">
                            {theme.imageUrl ? (
                              <img
                                src={theme.imageUrl}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${theme.gradient}`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/20">
                              {theme.id.toUpperCase()}
                            </span>
                            {coverTheme === theme.id && (
                              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div>
                            <b className="text-xs navy font-black block leading-tight">{theme.name}</b>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{theme.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Privacy & Discovery Toggles */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <b className="text-xs font-black navy uppercase tracking-wider block">Network Discovery Preferences</b>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publicDirectoryVisible}
                          onChange={(e) => setPublicDirectoryVisible(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <div>
                          <b className="navy block">Show Profile in Public Directory</b>
                          <span className="text-[11px] text-slate-500">Allow students & faculty to discover you</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mentorshipOpen}
                          onChange={(e) => setMentorshipOpen(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <div>
                          <b className="navy block">Open for Student Mentorship</b>
                          <span className="text-[11px] text-slate-500">Show mentorship badge on your profile</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACADEMIC CREDENTIALS */}
              {editTab === 'academic' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Full Legal / Scholar Name *</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="account-input"
                        placeholder="e.g. Dr. Tanvir Hasan"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Profile Classification *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setProfileType('Student')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            profileType === 'Student'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Current Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileType('Alumni')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            profileType === 'Alumni'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Graduated Alumni
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">University *</label>
                      <select
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        required
                        className="account-input bg-white cursor-pointer"
                      >
                        <option value="" disabled>-- Select University --</option>
                        {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                          <option key={u.name} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                        <option value="OTHER">Other / Custom University</option>
                      </select>
                      {university === 'OTHER' && (
                        <input
                          value={customUniversity}
                          onChange={(e) => setCustomUniversity(e.target.value)}
                          required
                          className="account-input mt-2"
                          placeholder="Enter your exact University name"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Faculty / Department *</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                        className="account-input bg-white cursor-pointer"
                      >
                        <option value="" disabled>-- Select Department --</option>
                        {RAW_DEPARTMENT_CATALOG.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                        <option value="OTHER">Other / Custom Department</option>
                      </select>
                      {department === 'OTHER' && (
                        <input
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          required
                          className="account-input mt-2"
                          placeholder="Enter your exact Department name"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Degree Program Level *</label>
                      <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="account-input bg-white cursor-pointer"
                      >
                        <option value="Undergraduate">Bachelor's / Undergraduate</option>
                        <option value="Master's">Master's / Postgraduate</option>
                        <option value="PhD">PhD / Doctorate</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Degree Specialization Title</label>
                      <input
                        value={degreeTitle}
                        onChange={(e) => setDegreeTitle(e.target.value)}
                        className="account-input"
                        placeholder="e.g. B.Sc. in Computer Science"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Student ID / Roll Registration</label>
                      <input
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="account-input font-mono"
                        placeholder="e.g. 230204101"
                      />
                    </div>
                  </div>

                  {profileType === 'Student' ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Current Year / Semester</label>
                        <input
                          value={studentYear}
                          onChange={(e) => setStudentYear(e.target.value)}
                          className="account-input"
                          placeholder="e.g. 3rd Year, 5th Semester"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Expected Graduation Year</label>
                        <input
                          value={expectedGraduation}
                          onChange={(e) => setExpectedGraduation(e.target.value)}
                          className="account-input"
                          placeholder="e.g. 2027"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Graduation Batch Year</label>
                        <input
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          className="account-input"
                          placeholder="e.g. 2024"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Alumni Directory Status</label>
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active in University Alumni Archives</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CAREER & SOCIAL TRAJECTORY */}
              {editTab === 'career' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Current Job Title / Designation</label>
                      <input
                        value={jobRole}
                        onChange={(e) => setJobRole(e.target.value)}
                        className="account-input"
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Organization / Employer / Firm</label>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="account-input"
                        placeholder="e.g. Google, Walton, Brain Station 23"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">City / Region</label>
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="account-input"
                        placeholder="e.g. Dhaka, Munich, New York"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Country</label>
                      <input
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="account-input"
                        placeholder="e.g. Bangladesh, Germany, United States"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">LinkedIn Profile URL</label>
                      <input
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className="account-input font-mono text-xs"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Portfolio or Research Website URL</label>
                      <input
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="account-input font-mono text-xs"
                        placeholder="https://yourportfolio.dev"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BIO & SKILLS MATRIX */}
              {(editTab === 'skills' || editTab === 'bio') && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-600">Personal Biography & Academic Statement</label>
                      <span className="text-[10px] text-slate-400">{bio.length} characters</span>
                    </div>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="account-input text-xs"
                      placeholder="Share your academic interests, engineering background, research breakthroughs, and career trajectory..."
                    />
                  </div>

                  {/* Skills Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <b className="text-xs font-black navy uppercase tracking-wider block">Academic & Technical Skills Matrix</b>
                      <span className="text-[11px] text-slate-400">{skills.length} skills</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-blue-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newSkillInput}
                          onChange={(e) => setNewSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                          placeholder="+ Add competency..."
                          className="px-3 py-1 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-blue-400 transition w-36"
                        />
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          disabled={!newSkillInput.trim()}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Popular skills rack */}
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Tap to Add Popular Competencies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {['Python', 'Machine Learning', 'Data Analysis', 'React', 'TypeScript', 'Cloud Architecture', 'System Design', 'Project Leadership', 'Research', 'FinTech']
                          .filter((p) => !skills.includes(p))
                          .slice(0, 8)
                          .map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                if (!skills.includes(p)) {
                                  setSkills([...skills, p]);
                                }
                              }}
                              className="px-2.5 py-0.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-slate-400" />
                              <span>{p}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Navigation & Actions Bar */}
              <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-soft">
                <div className="flex items-center gap-2">
                  {editTab !== 'visuals' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editTab === 'academic') setEditTab('visuals');
                        else if (editTab === 'career') setEditTab('academic');
                        else if (editTab === 'skills' || editTab === 'bio') setEditTab('career');
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      ← Previous Step
                    </button>
                  )}
                  {editTab !== 'skills' && editTab !== 'bio' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editTab === 'visuals') setEditTab('academic');
                        else if (editTab === 'academic') setEditTab('career');
                        else if (editTab === 'career') setEditTab('skills');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewState('default')}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-navy hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black navy">Request Alumni Verification Badge</h3>
            <p className="text-xs text-slate-500 mt-1">
              Provide evidence of graduation for institutional review.
            </p>

            <form onSubmit={handleVerificationSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Verification Document / Proof Link *
                </label>
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="account-input mt-1"
                  placeholder="https://drive.google.com/... or Certificate URL"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Additional Notes</label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                  className="account-input mt-1"
                  placeholder="Student ID, graduating semester, department thesis advisor..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setVerificationModalOpen(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
