import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Clock,
  CheckCircle2,
  MessageSquare,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  Building,
  GraduationCap,
  MapPin,
  ExternalLink,
  ChevronLeft,
  RotateCcw,
  Check,
  AlertCircle,
  Briefcase,
  Share2,
  ArrowLeft,
  QrCode,
  Award,
  BadgeCheck,
  Edit3,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  UserCheck,
  Layers,
  Sliders,
  Calendar,
  FileText,
  HelpCircle,
  Bookmark,
  CheckCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { AlumniRecord, AlumniConnectionStatus, AlumniConnectionRecord, UserProfile } from '../types';
import { DigitalIDCard } from '../components/DigitalIDCard';
import { ALL_DIRECTORY_UNIVERSITIES, getUniversityLogo, universityInitials } from '../data/initialData';
import goldCrestMedallion from '../assets/images/academic_crest_gold_1791743732343.jpg';
import oxfordGothicBanner from '../assets/images/campus_oxford_gothic_1791743675787.jpg';
import techQuadBanner from '../assets/images/campus_tech_quad_1791743699365.jpg';
import emeraldHeritageBanner from '../assets/images/campus_heritage_emerald_1791744473729.jpg';
import crimsonQuadBanner from '../assets/images/campus_crimson_quad_1791744501154.jpg';
import nightSapphireBanner from '../assets/images/campus_night_sapphire_1791744524534.jpg';

interface AlumniProfileViewProps {
  alumniId?: string;
  alumniName?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'me' | 'alumnus';
  text: string;
  timestamp: string;
}

type ProfileTab = 'overview' | 'career' | 'education' | 'skills' | 'network';

export const AlumniProfileView: React.FC<AlumniProfileViewProps> = ({
  alumniId,
  alumniName,
  onNavigate,
  onBack,
}) => {
  const { alumni, students, allUsers, loadingData } = useData();
  const { currentUser, userProfile, updateProfileData } = useAuth();

  // Find alumni record or generate rich profile with live synchronization
  const profile: AlumniRecord | null = useMemo(() => {
    // If viewing own profile, always use live userProfile state
    if (
      currentUser &&
      userProfile &&
      (alumniId === currentUser.uid ||
        (alumniName && alumniName.toLowerCase().trim() === (userProfile.name || '').toLowerCase().trim()))
    ) {
      return {
        id: currentUser.uid,
        userId: currentUser.uid,
        name: userProfile.name,
        email: userProfile.email,
        university: userProfile.university || 'University of Dhaka',
        department: userProfile.department || 'General Faculty',
        batch: userProfile.graduationYear || userProfile.expectedGraduation || '2024',
        graduationYear: userProfile.graduationYear || userProfile.expectedGraduation || '2024',
        studentId: userProfile.studentId || '',
        educationLevel: userProfile.educationLevel || 'Undergraduate',
        jobRole: userProfile.jobRole || '',
        company: userProfile.company || '',
        country: userProfile.country || 'Bangladesh',
        city: userProfile.city || '',
        bio: userProfile.bio || '',
        photoUrl: userProfile.photoUrl || '',
        linkedin: userProfile.linkedin || '',
        isVerified: Boolean(userProfile.isVerifiedAlumni),
        status: 'APPROVED',
        skills: userProfile.skills || [],
        portfolioUrl: userProfile.portfolioUrl || '',
        achievements: userProfile.achievements || '',
        mentorshipOpen: Boolean(userProfile.mentorshipOpen),
        publicDirectoryVisible: userProfile.publicDirectoryVisible !== false,
        degreeTitle: userProfile.degreeTitle || '',
        coverTheme: userProfile.coverTheme || 'classic',
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      };
    }

    if (alumniId) {
      const match = alumni.find((a) => a.id === alumniId || a.userId === alumniId);
      if (match) {
        const matchingUser = allUsers.find(
          (u) => u.uid === match.userId || u.id === match.userId || u.uid === match.id
        );
        return {
          ...match,
          skills: match.skills || matchingUser?.skills || [],
          portfolioUrl: match.portfolioUrl || matchingUser?.portfolioUrl || '',
          achievements: match.achievements || matchingUser?.achievements || '',
          mentorshipOpen:
            match.mentorshipOpen !== undefined
              ? match.mentorshipOpen
              : Boolean(matchingUser?.mentorshipOpen),
          publicDirectoryVisible:
            match.publicDirectoryVisible !== undefined
              ? match.publicDirectoryVisible
              : matchingUser?.publicDirectoryVisible !== false,
          degreeTitle: match.degreeTitle || matchingUser?.degreeTitle || match.degree || '',
          coverTheme: match.coverTheme || matchingUser?.coverTheme || 'classic',
        };
      }

      const userMatch = allUsers.find((u) => u.uid === alumniId || u.id === alumniId);
      if (userMatch) {
        return {
          id: userMatch.uid || userMatch.id,
          userId: userMatch.uid || userMatch.id,
          name: userMatch.name,
          email: userMatch.email,
          university: userMatch.university || 'University of Dhaka',
          department: userMatch.department || 'General Faculty',
          batch: userMatch.graduationYear || userMatch.expectedGraduation || '2024',
          graduationYear: userMatch.graduationYear || userMatch.expectedGraduation || '2024',
          studentId: userMatch.studentId || '',
          educationLevel: userMatch.educationLevel || 'Undergraduate',
          jobRole: userMatch.jobRole || '',
          company: userMatch.company || '',
          country: userMatch.country || 'Bangladesh',
          city: userMatch.city || '',
          bio: userMatch.bio || '',
          photoUrl: userMatch.photoUrl || '',
          linkedin: userMatch.linkedin || '',
          isVerified: Boolean(userMatch.isVerifiedAlumni),
          status: 'APPROVED',
          skills: userMatch.skills || [],
          portfolioUrl: userMatch.portfolioUrl || '',
          achievements: userMatch.achievements || '',
          mentorshipOpen: Boolean(userMatch.mentorshipOpen),
          publicDirectoryVisible: userMatch.publicDirectoryVisible !== false,
          degreeTitle: userMatch.degreeTitle || '',
          coverTheme: userMatch.coverTheme || 'classic',
          createdAt: userMatch.createdAt,
          updatedAt: userMatch.updatedAt,
        };
      }

      const studentMatch = students?.find((s) => s.id === alumniId || s.userId === alumniId);
      if (studentMatch) {
        return {
          id: studentMatch.id,
          userId: studentMatch.userId || studentMatch.id,
          name: studentMatch.name,
          email: studentMatch.email,
          university: studentMatch.university || 'University of Dhaka',
          department: studentMatch.department || 'General Faculty',
          batch: studentMatch.expectedGraduation || studentMatch.studentYear || 'Student',
          graduationYear: studentMatch.expectedGraduation || 'Student',
          studentId: studentMatch.studentId || '',
          educationLevel: studentMatch.educationLevel || 'Undergraduate',
          jobRole: studentMatch.studentYear ? `Student (${studentMatch.studentYear})` : 'Enrolled Student',
          company: studentMatch.university,
          country: 'Bangladesh',
          city: 'Dhaka',
          bio: studentMatch.bio || '',
          photoUrl: studentMatch.photoUrl || '',
          linkedin: '',
          isVerified: false,
          status: 'APPROVED',
          skills: [],
          mentorshipOpen: false,
          publicDirectoryVisible: true,
          createdAt: studentMatch.createdAt || new Date().toISOString(),
          updatedAt: studentMatch.updatedAt || new Date().toISOString(),
        };
      }

      // If explicit alumniId was requested and not found anywhere, return null for missing record state
      return null;
    }

    if (alumniName) {
      const q = (alumniName || '').toLowerCase().trim();
      const match = alumni.find((a) => (a.name || '').toLowerCase().trim() === q);
      if (match) {
        const matchingUser = allUsers.find(
          (u) => u.uid === match.userId || u.id === match.userId || u.uid === match.id
        );
        return {
          ...match,
          skills: match.skills || matchingUser?.skills || [],
          portfolioUrl: match.portfolioUrl || matchingUser?.portfolioUrl || '',
          achievements: match.achievements || matchingUser?.achievements || '',
          mentorshipOpen:
            match.mentorshipOpen !== undefined
              ? match.mentorshipOpen
              : Boolean(matchingUser?.mentorshipOpen),
          publicDirectoryVisible:
            match.publicDirectoryVisible !== undefined
              ? match.publicDirectoryVisible
              : matchingUser?.publicDirectoryVisible !== false,
          degreeTitle: match.degreeTitle || matchingUser?.degreeTitle || match.degree || '',
          coverTheme: match.coverTheme || matchingUser?.coverTheme || 'classic',
        };
      }

      const userMatch = allUsers.find((u) => (u.name || '').toLowerCase().trim() === q);
      if (userMatch) {
        return {
          id: userMatch.uid || userMatch.id,
          userId: userMatch.uid || userMatch.id,
          name: userMatch.name,
          email: userMatch.email,
          university: userMatch.university || 'University of Dhaka',
          department: userMatch.department || 'General Faculty',
          batch: userMatch.graduationYear || userMatch.expectedGraduation || '2024',
          graduationYear: userMatch.graduationYear || userMatch.expectedGraduation || '2024',
          studentId: userMatch.studentId || '',
          educationLevel: userMatch.educationLevel || 'Undergraduate',
          jobRole: userMatch.jobRole || '',
          company: userMatch.company || '',
          country: userMatch.country || 'Bangladesh',
          city: userMatch.city || '',
          bio: userMatch.bio || '',
          photoUrl: userMatch.photoUrl || '',
          linkedin: userMatch.linkedin || '',
          isVerified: Boolean(userMatch.isVerifiedAlumni),
          status: 'APPROVED',
          skills: userMatch.skills || [],
          portfolioUrl: userMatch.portfolioUrl || '',
          achievements: userMatch.achievements || '',
          mentorshipOpen: Boolean(userMatch.mentorshipOpen),
          publicDirectoryVisible: userMatch.publicDirectoryVisible !== false,
          degreeTitle: userMatch.degreeTitle || '',
          coverTheme: userMatch.coverTheme || 'classic',
          createdAt: userMatch.createdAt,
          updatedAt: userMatch.updatedAt,
        };
      }

      const studentMatch = students?.find((s) => (s.name || '').toLowerCase().trim() === q);
      if (studentMatch) {
        return {
          id: studentMatch.id,
          userId: studentMatch.userId || studentMatch.id,
          name: studentMatch.name,
          email: studentMatch.email,
          university: studentMatch.university || 'University of Dhaka',
          department: studentMatch.department || 'General Faculty',
          batch: studentMatch.expectedGraduation || studentMatch.studentYear || 'Student',
          graduationYear: studentMatch.expectedGraduation || 'Student',
          studentId: studentMatch.studentId || '',
          educationLevel: studentMatch.educationLevel || 'Undergraduate',
          jobRole: studentMatch.studentYear ? `Student (${studentMatch.studentYear})` : 'Enrolled Student',
          company: studentMatch.university,
          country: 'Bangladesh',
          city: 'Dhaka',
          bio: studentMatch.bio || '',
          photoUrl: studentMatch.photoUrl || '',
          linkedin: '',
          isVerified: false,
          status: 'APPROVED',
          skills: [],
          mentorshipOpen: false,
          publicDirectoryVisible: true,
          createdAt: studentMatch.createdAt || new Date().toISOString(),
          updatedAt: studentMatch.updatedAt || new Date().toISOString(),
        };
      }

      return null;
    }

    // Default showcase profile if no ID/name specified
    if (alumni.length > 0) return alumni[0];

    return {
      id: 'alumni-default',
      userId: 'usr-default',
      name: 'Tanvir Hasan',
      email: 'tanvir.hasan@alumni.ac.bd',
      university: 'University of Dhaka',
      department: 'Computer Science & Engineering',
      batch: '2019',
      graduationYear: '2019',
      jobRole: 'Senior Software Engineer',
      company: 'Google',
      country: 'Germany',
      city: 'Munich',
      bio: 'Distributed systems engineer and mentor for university students pursuing international tech careers.',
      linkedin: 'https://linkedin.com',
      isVerified: true,
      status: 'APPROVED',
      skills: ['Distributed Systems', 'Go', 'Cloud Architecture', 'Mentorship', 'Kubernetes'],
      portfolioUrl: 'https://github.com',
      achievements: 'Dean’s Honor Roll · ICPC Regional Finalist',
      mentorshipOpen: true,
      publicDirectoryVisible: true,
      degreeTitle: 'B.Sc. in Computer Science & Engineering',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }, [alumni, students, allUsers, currentUser, userProfile, alumniId, alumniName]);

  // Check if viewing current authenticated user's own profile
  const isOwnProfile = useMemo(() => {
    if (!currentUser || !profile) return false;
    if (profile.userId && currentUser.uid === profile.userId) return true;
    if (profile.id && currentUser.uid === profile.id) return true;
    if (currentUser.email && profile.email && currentUser.email.toLowerCase() === profile.email.toLowerCase()) return true;
    return false;
  }, [currentUser, profile]);

  // Tab State
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Initials for avatar fallback
  const initials = useMemo(() => {
    if (!profile || !profile.name) return 'AL';
    return profile.name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile]);

  // Profile completion indicator calculated from actual fields
  const profileCompletion = useMemo(() => {
    if (!profile) return { percentage: 0, items: [], missing: [] };
    const items = [
      { key: 'name', label: 'Full Name', filled: Boolean(profile.name?.trim()), weight: 10, tab: 'basic' as const },
      { key: 'photoUrl', label: 'Profile Photo', filled: Boolean(profile.photoUrl?.trim()), weight: 15, tab: 'basic' as const },
      { key: 'jobRole', label: 'Current Role', filled: Boolean(profile.jobRole?.trim()), weight: 15, tab: 'basic' as const },
      { key: 'company', label: 'Company / Org', filled: Boolean(profile.company?.trim()), weight: 10, tab: 'basic' as const },
      { key: 'university', label: 'University', filled: Boolean(profile.university?.trim()), weight: 10, tab: 'academic' as const },
      { key: 'department', label: 'Department', filled: Boolean(profile.department?.trim()), weight: 10, tab: 'academic' as const },
      { key: 'graduationYear', label: 'Graduation Year', filled: Boolean(profile.graduationYear?.trim()), weight: 5, tab: 'academic' as const },
      { key: 'bio', label: 'Bio / About', filled: Boolean(profile.bio?.trim()), weight: 10, tab: 'basic' as const },
      { key: 'location', label: 'Location', filled: Boolean(profile.country?.trim() || profile.city?.trim()), weight: 5, tab: 'basic' as const },
      { key: 'skills', label: 'Skills Added', filled: Boolean(profile.skills && profile.skills.length > 0), weight: 10, tab: 'skills' as const },
      { key: 'links', label: 'LinkedIn / Portfolio', filled: Boolean(profile.linkedin?.trim() || profile.portfolioUrl?.trim()), weight: 10, tab: 'skills' as const },
    ];
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const filledWeight = items.filter((i) => i.filled).reduce((sum, i) => sum + i.weight, 0);
    const percentage = Math.min(100, Math.round((filledWeight / totalWeight) * 100));
    const missing = items.filter((i) => !i.filled);
    return { percentage, items, missing };
  }, [profile]);

  // Computed experience metric from graduation year
  const experienceYears = useMemo(() => {
    if (!profile) return '—';
    const gradYearNum = parseInt(profile.graduationYear || profile.batch || '', 10);
    const currentYear = new Date().getFullYear();
    if (!isNaN(gradYearNum) && gradYearNum > 1960 && gradYearNum <= currentYear) {
      const diff = currentYear - gradYearNum;
      return diff > 0 ? `${diff}+ yrs` : 'Recent Grad';
    }
    if (profile.careerStatus) return profile.careerStatus;
    return 'Active';
  }, [profile]);

  // Storage key for per-alumnus connection status
  const storageKey = profile ? `alumni_conn_${profile.id}` : 'alumni_conn_none';

  // Connection State
  const [connectionRecord, setConnectionRecord] = useState<AlumniConnectionRecord>(() => {
    if (!profile) return { alumniId: '', alumniName: '', status: 'NOT_CONNECTED' };
    try {
      const saved = localStorage.getItem(`alumni_conn_${profile.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading connection record from storage:', e);
    }
    return {
      alumniId: profile.id,
      alumniName: profile.name,
      status: 'NOT_CONNECTED',
    };
  });

  // Re-sync when profile changes
  useEffect(() => {
    if (!profile) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setConnectionRecord(JSON.parse(saved));
      } else {
        setConnectionRecord({
          alumniId: profile.id,
          alumniName: profile.name,
          status: 'NOT_CONNECTED',
        });
      }
    } catch {
      setConnectionRecord({
        alumniId: profile.id,
        alumniName: profile.name,
        status: 'NOT_CONNECTED',
      });
    }
  }, [storageKey, profile]);

  // Save helper
  const updateConnection = (updates: Partial<AlumniConnectionRecord>) => {
    if (!profile) return;
    setConnectionRecord((prev) => {
      const next: AlumniConnectionRecord = {
        ...prev,
        ...updates,
        alumniId: profile.id,
        alumniName: profile.name,
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.error('Failed saving connection record:', err);
      }
      return next;
    });
  };

  // Modals & UI States
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [invitationNote, setInvitationNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDigitalPass, setShowDigitalPass] = useState(false);

  // Owner Edit Profile Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTab, setEditTab] = useState<'basic' | 'academic' | 'skills' | 'preferences'>('basic');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editJobRole, setEditJobRole] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('Bangladesh');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editUniversity, setEditUniversity] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDegreeTitle, setEditDegreeTitle] = useState('');
  const [editGraduationYear, setEditGraduationYear] = useState('');
  const [editEducationLevel, setEditEducationLevel] = useState('Undergraduate');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [newSkillText, setNewSkillText] = useState('');
  const [editPortfolioUrl, setEditPortfolioUrl] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editAchievements, setEditAchievements] = useState('');
  const [editMentorshipOpen, setEditMentorshipOpen] = useState(false);
  const [editPublicDirectoryVisible, setEditPublicDirectoryVisible] = useState(true);

  // Open Edit Profile modal with populated fields
  const openEditModal = (targetTab: 'basic' | 'academic' | 'skills' | 'preferences' = 'basic') => {
    if (!profile) return;
    setEditTab(targetTab);
    setSaveProfileError(null);
    setEditName(profile.name || '');
    setEditJobRole(profile.jobRole || '');
    setEditCompany(profile.company || '');
    setEditBio(profile.bio || '');
    setEditCity(profile.city || '');
    setEditCountry(profile.country || 'Bangladesh');
    setEditPhotoUrl(profile.photoUrl || '');
    setEditUniversity(profile.university || '');
    setEditDepartment(profile.department || '');
    setEditDegreeTitle(profile.degreeTitle || profile.degree || '');
    setEditGraduationYear(profile.graduationYear || profile.batch || '');
    setEditEducationLevel(profile.educationLevel || 'Undergraduate');
    setEditSkills(profile.skills ? [...profile.skills] : []);
    setNewSkillText('');
    setEditPortfolioUrl(profile.portfolioUrl || '');
    setEditLinkedin(profile.linkedin || '');
    setEditAchievements(profile.achievements || '');
    setEditMentorshipOpen(Boolean(profile.mentorshipOpen));
    setEditPublicDirectoryVisible(profile.publicDirectoryVisible !== false);
    setEditModalOpen(true);
  };

  // Add skill tag
  const handleAddSkillTag = () => {
    const trimmed = newSkillText.trim();
    if (trimmed && !editSkills.includes(trimmed)) {
      setEditSkills([...editSkills, trimmed]);
      setNewSkillText('');
    }
  };

  // Remove skill tag
  const handleRemoveSkillTag = (skillToRemove: string) => {
    setEditSkills(editSkills.filter((s) => s !== skillToRemove));
  };

  // Save updated profile data
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setSaveProfileError('Full name is required.');
      return;
    }
    if (editGraduationYear.trim() && !/^\d{4}$/.test(editGraduationYear.trim())) {
      setSaveProfileError('Graduation year must be a 4-digit year (e.g. 2023).');
      return;
    }
    setSaveProfileError(null);
    setIsSavingProfile(true);

    try {
      await updateProfileData({
        name: editName.trim(),
        jobRole: editJobRole.trim(),
        company: editCompany.trim(),
        bio: editBio.trim(),
        city: editCity.trim(),
        country: editCountry.trim(),
        photoUrl: editPhotoUrl.trim(),
        university: editUniversity.trim(),
        department: editDepartment.trim(),
        degreeTitle: editDegreeTitle.trim(),
        graduationYear: editGraduationYear.trim(),
        educationLevel: editEducationLevel,
        skills: editSkills,
        portfolioUrl: editPortfolioUrl.trim(),
        linkedin: editLinkedin.trim(),
        achievements: editAchievements.trim(),
        mentorshipOpen: editMentorshipOpen,
        publicDirectoryVisible: editPublicDirectoryVisible,
      });

      setIsSavingProfile(false);
      setEditModalOpen(false);
      showToast('Profile updated and synchronized successfully!');
    } catch (err: any) {
      console.error('Failed saving profile:', err);
      setIsSavingProfile(false);
      setSaveProfileError(err?.message || 'Failed to save changes. Please try again.');
    }
  };

  // Quick toggle for owner's mentorship availability
  const handleToggleMentorshipQuick = async () => {
    if (!isOwnProfile || !profile) return;
    const nextVal = !profile.mentorshipOpen;
    try {
      await updateProfileData({ mentorshipOpen: nextVal });
      showToast(
        nextVal
          ? '✓ You are now marked as available to mentor students!'
          : 'Mentorship status updated to unavailable.'
      );
    } catch (e) {
      showToast('Could not update mentorship status.');
    }
  };

  // Determine architectural campus banner for this profile
  const campusBanner = useMemo(() => {
    if (!profile) return emeraldHeritageBanner;
    const uniText = (profile.university || '').toLowerCase();
    const deptText = (profile.department || '').toLowerCase();
    if (
      uniText.includes('engineering') ||
      uniText.includes('science') ||
      uniText.includes('tech') ||
      deptText.includes('computer')
    ) {
      return techQuadBanner;
    }
    if (uniText.includes('dhaka') || uniText.includes('jahangirnagar')) {
      return oxfordGothicBanner;
    }
    if (uniText.includes('north south') || uniText.includes('brac')) {
      return nightSapphireBanner;
    }
    return emeraldHeritageBanner;
  }, [profile]);

  // Prepared userProfile object for DigitalIDCard
  const userProfileForCard = useMemo<UserProfile>(() => {
    if (!profile) {
      return {
        id: 'guest',
        uid: 'guest',
        name: 'Alumni Member',
        email: '',
        role: 'ALUMNI',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      id: profile.id,
      uid: profile.userId || profile.id,
      name: profile.name,
      email: profile.email || '',
      university: profile.university,
      department: profile.department,
      role: 'ALUMNI',
      status: 'APPROVED',
      profileType: 'Alumni',
      graduationYear: profile.graduationYear || profile.batch || '2024',
      studentId: profile.studentId || '',
      educationLevel: profile.educationLevel || 'Undergraduate',
      jobRole: profile.jobRole || '',
      company: profile.company || '',
      city: profile.city || '',
      country: profile.country || 'Bangladesh',
      bio: profile.bio || '',
      photoUrl: profile.photoUrl || '',
      linkedin: profile.linkedin || '',
      isVerifiedAlumni: Boolean(profile.isVerified),
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString(),
    };
  }, [profile]);

  // Chat conversation state for connected alumni
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'alumnus',
      text: `Hello! Thanks for connecting. I'm always glad to support fellow scholars from ${
        profile?.university || 'our university'
      }. How can I assist you?`,
      timestamp: 'Today, Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Quick message template options
  const messageTemplates = [
    {
      label: 'Mentorship',
      text: `Hi ${profile?.name || 'there'}, I am interested in your journey as a ${
        profile?.jobRole || 'professional'
      } at ${profile?.company || 'your firm'}. Would love to connect for mentorship and career advice!`,
    },
    {
      label: 'Campus Network',
      text: `Hello ${profile?.name || 'there'}, great to see fellow alumni from ${
        profile?.department || 'our faculty'
      } at ${profile?.university || 'the university'}. Let's stay connected in our professional network.`,
    },
    {
      label: 'Industry Advice',
      text: `Hi ${profile?.name || 'there'}, I admire your work at ${
        profile?.company || 'your organization'
      }. Would appreciate connecting to learn more about industry standards and opportunities!`,
    },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Simulate Sending Connection Request
  const handleSendConnectionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSending(true);

    setTimeout(() => {
      const now = new Date().toISOString();
      updateConnection({
        status: 'PENDING',
        sentAt: now,
        message: invitationNote.trim() || 'No personal note attached.',
        senderName: userProfile?.name || currentUser?.displayName || 'Alumni Network Member',
        senderRole: userProfile?.role || 'STUDENT',
      });

      setIsSending(false);
      setConnectModalOpen(false);
      setInvitationNote('');
      showToast(`Connection request sent to ${profile.name}! Status: Pending Approval.`);
    }, 700);
  };

  // 2. Simulate Acceptance (Transition PENDING -> CONNECTED)
  const handleSimulateAcceptance = () => {
    if (!profile) return;
    const now = new Date().toISOString();
    updateConnection({
      status: 'CONNECTED',
      connectedAt: now,
    });
    showToast(`✓ ${profile.name} accepted your connection request! You are now connected.`);
  };

  // 3. Withdraw Request (Transition PENDING -> NOT_CONNECTED)
  const handleWithdrawRequest = () => {
    if (!profile) return;
    updateConnection({
      status: 'NOT_CONNECTED',
      sentAt: undefined,
      message: undefined,
    });
    showToast(`Connection request to ${profile.name} has been withdrawn.`);
  };

  // 4. Remove / Disconnect (Transition CONNECTED -> NOT_CONNECTED)
  const handleDisconnect = () => {
    if (!profile) return;
    updateConnection({
      status: 'NOT_CONNECTED',
      connectedAt: undefined,
      sentAt: undefined,
    });
    showToast(`Connection with ${profile.name} removed.`);
  };

  // 5. Send Chat Message in Connected state
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !profile) return;

    const userText = chatInput.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: userText,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Simulate reply after 1.2s
    setTimeout(() => {
      const replies = [
        `Thank you for reaching out! Regarding ${profile.jobRole} positions at ${profile.company}, having a solid understanding of system design and core projects makes a huge difference.`,
        `Glad you asked. Keep pushing forward with your projects at ${profile.department}. I'd be happy to review your resume when you're ready for applications!`,
        `Great point! Best advice I can offer is to build real end-to-end applications and contribute to collaborative codebases.`,
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-reply`,
          sender: 'alumnus',
          text: randomReply,
          timestamp: 'Just now',
        },
      ]);
    }, 1200);
  };

  const handleCopyProfileLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Trigger Mentorship Request
  const handleRequestMentorship = () => {
    if (!profile) return;
    setInvitationNote(
      `Hi ${profile.name}, I noticed you are open to mentoring. I would love to connect for career guidance and advice regarding ${profile.jobRole} roles at ${profile.company}.`
    );
    setConnectModalOpen(true);
  };

  // =========================================================
  // LOADING STATE
  // =========================================================
  if (loadingData && !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-pulse">
        <div className="h-60 sm:h-72 bg-slate-200 rounded-3xl mb-6" />
        <div className="flex flex-col sm:flex-row gap-6 items-start px-4">
          <div className="w-32 h-32 rounded-3xl bg-slate-300 shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-8 bg-slate-300 rounded-md w-1/3" />
            <div className="h-5 bg-slate-200 rounded-md w-1/2" />
            <div className="h-4 bg-slate-200 rounded-md w-2/3" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // =========================================================
  // MISSING RECORD STATE
  // =========================================================
  if (!loadingData && !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black navy">Alumni Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          We could not locate an alumni record matching the specified criteria. The profile may have been removed or made private.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => (onBack ? onBack() : onNavigate('alumni'))}
            className="inline-flex items-center gap-2 bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Alumni Directory</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 max-w-md bg-navy text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => (onBack ? onBack() : onNavigate('alumni'))}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Alumni Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button
              onClick={() => openEditModal('basic')}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}

          <button
            onClick={handleCopyProfileLink}
            className="text-xs font-semibold text-slate-600 hover:text-navy px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Profile'}</span>
          </button>
        </div>
      </div>

      {/* Primary Profile Card with Luxury Campus Cover Banner */}
      <div className="card overflow-hidden bg-white shadow-2xl border border-slate-200/80 rounded-3xl">
        {/* Luxury Collegiate Cover Banner */}
        <div className="h-52 sm:h-64 lg:h-72 relative overflow-hidden bg-slate-950">
          <img
            src={campusBanner}
            alt={profile.university}
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/35 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-slate-900/60 to-indigo-950/80 mix-blend-overlay" />
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Gold Crest Medallion Watermark */}
          <div className="absolute right-6 -bottom-6 opacity-30 pointer-events-none select-none hidden sm:block">
            <img
              src={goldCrestMedallion}
              alt=""
              className="w-44 h-44 lg:w-52 lg:h-52 object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] brightness-110"
            />
          </div>

          {/* University Crest / Emblem Watermark */}
          {profile.university && (
            <div className="absolute right-48 -bottom-4 opacity-15 pointer-events-none select-none hidden md:block">
              {getUniversityLogo(profile.university) ? (
                <img
                  src={getUniversityLogo(profile.university)}
                  alt=""
                  className="w-32 h-32 object-contain brightness-200 contrast-125"
                />
              ) : (
                <span className="text-7xl font-black text-white/40 tracking-tighter font-serif">
                  {universityInitials(profile.university)}
                </span>
              )}
            </div>
          )}

          {/* Cover Top Badges & Quick Action Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-white bg-black/45 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/25 shadow-md flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>{profile.isVerified ? 'Verified Alumni' : 'Alumni Member'}</span>
              </span>

              {profile.university && (
                <span className="text-[11px] font-bold text-emerald-200 bg-emerald-950/65 backdrop-blur-md px-3.5 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{profile.university}</span>
                </span>
              )}

              {profile.publicDirectoryVisible === false && isOwnProfile && (
                <span className="text-[11px] font-bold text-rose-200 bg-rose-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-rose-400/40 flex items-center gap-1">
                  <EyeOff className="w-3 h-3 text-rose-300" />
                  <span>Private Profile</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDigitalPass((prev) => !prev)}
                className={`text-[11px] font-bold px-3.5 py-1.5 rounded-full backdrop-blur-md transition shadow-lg flex items-center gap-1.5 cursor-pointer border ${
                  showDigitalPass
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                    : 'text-amber-200 bg-amber-950/70 hover:bg-amber-900/90 border-amber-400/50'
                }`}
                title="Toggle Digital Campus Pass"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showDigitalPass ? 'Hide Digital Pass' : 'View Digital Pass'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Avatar & Primary Row */}
        <div className="px-4 pb-6 pt-6 sm:px-8 sm:pt-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between mb-4">
            <div className="flex min-w-0 flex-col sm:flex-row gap-5 items-start flex-1">
              {/* 3D Metallic Foil Avatar Frame */}
              <div className="relative group self-start shrink-0">
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1.5 shadow-2xl transition duration-300 ${
                    profile.isVerified
                      ? 'bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 ring-4 ring-amber-400/40 shadow-amber-950/30'
                      : 'bg-gradient-to-tr from-blue-600 via-sky-300 to-indigo-600 ring-4 ring-blue-500/30 shadow-blue-950/30'
                  }`}
                >
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover rounded-2xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full items-center justify-center font-black text-3xl sm:text-4xl text-blue-700 ${
                      profile.photoUrl ? 'hidden' : 'flex'
                    }`}
                  >
                    {initials}
                  </div>
                </div>

                {profile.isVerified && (
                  <div
                    className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 border-2 border-white shadow-xl flex items-center justify-center text-amber-950"
                    title="Verified Alumni Holder"
                  >
                    <BadgeCheck className="w-5 h-5 text-amber-950 fill-amber-300" />
                  </div>
                )}

                <div
                  className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center"
                  title="Active Member"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Profile Info & Status Indicators */}
              <div className="min-w-0 flex-1 pb-1 space-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <h1 className="max-w-full break-words text-2xl sm:text-3xl font-black navy tracking-tight">
                    {profile.name}
                  </h1>

                  {/* Institutional Verification Badge */}
                  {profile.isVerified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-amber-900 bg-amber-50 border border-amber-300 shadow-xs">
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Verified Alumni</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200">
                      <span>Self-Reported</span>
                    </span>
                  )}

                  {/* Mentorship Badge */}
                  {profile.mentorshipOpen && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Open to Mentoring</span>
                    </span>
                  )}
                </div>

                {/* Current Role & Company */}
                <div className="flex items-center gap-2 mt-1.5 text-slate-700 font-bold text-base">
                  <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {profile.jobRole || 'Alumni Scholar'}{' '}
                    {profile.company && (
                      <>
                        <span className="text-slate-400 font-normal">at</span>{' '}
                        <span className="text-navy">{profile.company}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Academic & Geographic details */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location:</span>
                    <b className="text-slate-700">
                      {profile.city ? `${profile.city}, ` : ''}
                      {profile.country || 'Bangladesh'}
                    </b>
                  </span>
                  <span>•</span>
                  {profile.university && (
                    <button
                      type="button"
                      onClick={() => onNavigate('universityDetail', { name: profile.university })}
                      className="flex items-center gap-1 text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      {getUniversityLogo(profile.university) && (
                        <img
                          src={getUniversityLogo(profile.university)}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                        />
                      )}
                      <span>{profile.university}</span>
                    </button>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {profile.degreeTitle || profile.degree ? `${profile.degreeTitle || profile.degree} · ` : ''}
                    {profile.department} ({profile.batch || profile.graduationYear})
                  </span>
                </div>

                {profile.bio && (
                  <p className="text-xs text-slate-600 mt-3 max-w-2xl leading-relaxed italic bg-slate-50/80 p-3 rounded-xl border border-slate-100 relative">
                    <span className="text-2xl text-blue-300 font-serif absolute -top-1 left-1.5 select-none leading-none">
                      “
                    </span>
                    <span className="pl-3 block">{profile.bio}</span>
                  </p>
                )}

                {/* Specialization & Sector pills */}
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {profile.sector && (
                    <span className="pill text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {profile.sector}
                    </span>
                  )}
                  {profile.specialization && (
                    <span className="pill text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                      {profile.specialization}
                    </span>
                  )}
                  {profile.careerStatus && (
                    <span className="pill text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      {profile.careerStatus}
                    </span>
                  )}
                  {profile.academicSession && (
                    <span className="pill text-xs bg-slate-50 text-slate-700 border-slate-200">
                      Session {profile.academicSession}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS & CONNECT CONTROLS */}
            <div className="flex flex-col gap-2.5 w-full sm:w-auto shrink-0 md:min-w-[190px]">
              {/* OWNER CONTROLS */}
              {isOwnProfile ? (
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => openEditModal('basic')}
                    className="bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-blue-300" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={handleToggleMentorshipQuick}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                      profile.mentorshipOpen
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{profile.mentorshipOpen ? 'Mentorship: Active' : 'Mentorship: Inactive'}</span>
                  </button>
                </div>
              ) : (
                /* OTHER PROFILE CONTROLS */
                <>
                  {/* NOT CONNECTED STATE */}
                  {connectionRecord.status === 'NOT_CONNECTED' && (
                    <button
                      data-testid="connect-button"
                      onClick={() => setConnectModalOpen(true)}
                      className="bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-blue-300" />
                      <span>Connect</span>
                    </button>
                  )}

                  {/* SENDING IN PROGRESS */}
                  {connectionRecord.status === 'SENDING' && (
                    <button
                      disabled
                      className="bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-wait"
                    >
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                      <span>Sending Request...</span>
                    </button>
                  )}

                  {/* REQUEST PENDING STATE */}
                  {connectionRecord.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        disabled
                        data-testid="pending-button"
                        className="bg-amber-50 text-amber-800 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default shadow-xs"
                      >
                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>Request Pending</span>
                      </button>

                      <div className="flex items-center justify-between gap-2 px-1">
                        <button
                          onClick={handleWithdrawRequest}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Withdraw</span>
                        </button>

                        <button
                          onClick={handleSimulateAcceptance}
                          title="Simulate alumnus accepting your invitation"
                          className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Simulate Accept</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CONNECTED STATE */}
                  {connectionRecord.status === 'CONNECTED' && (
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        data-testid="message-button"
                        onClick={() => setMessageModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Message</span>
                      </button>

                      <button
                        onClick={handleDisconnect}
                        className="text-center px-3 py-1.5 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Remove Connection
                      </button>
                    </div>
                  )}

                  {/* Mentorship Action for other users */}
                  {profile.mentorshipOpen && connectionRecord.status !== 'CONNECTED' && (
                    <button
                      onClick={handleRequestMentorship}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Request Mentorship</span>
                    </button>
                  )}
                </>
              )}

              {/* External Profile Link */}
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition flex items-center justify-center gap-1.5"
                >
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Expandable Official Digital Campus Pass */}
          {showDigitalPass && (
            <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white border border-white/20 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Official Smart Campus Passport
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDigitalPass(false)}
                  className="text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Close Pass ✕
                </button>
              </div>
              <DigitalIDCard userProfile={userProfileForCard} onNavigate={onNavigate} />
            </div>
          )}

          {/* PROFILE STRENGTH & COMPLETION INDICATOR (FOR OWNER) */}
          {isOwnProfile && (
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Profile Strength: <b className="text-blue-700 font-black">{profileCompletion.percentage}%</b>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {profileCompletion.percentage === 100
                    ? '🎉 Profile is 100% complete!'
                    : `${profileCompletion.missing.length} recommended items remaining`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion.percentage}%` }}
                />
              </div>

              {/* Missing recommendations */}
              {profileCompletion.missing.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="text-[11px] text-slate-500 mr-1 font-medium">Add to complete:</span>
                  {profileCompletion.missing.slice(0, 4).map((item) => (
                    <button
                      key={item.key}
                      onClick={() => openEditModal(item.tab)}
                      className="text-[11px] px-2.5 py-0.5 rounded-full bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition cursor-pointer"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* HIGHLIGHTS ROW WITH DEDICATED METRICS */}
          {/* ========================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8">
            <div className="metric p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Experience</div>
              <b className="text-lg navy mt-1 block truncate">{experienceYears}</b>
              <span className="text-[10px] text-slate-500 truncate block">
                {profile.sector || (profile.company ? profile.company : 'Career Milestone')}
              </span>
            </div>

            <div className="metric p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Location</div>
              <b className="text-lg navy mt-1 block truncate">
                {profile.city ? `${profile.city}, ` : ''}
                {profile.country || 'Global'}
              </b>
              <span className="text-[10px] text-slate-500 truncate block">Chapter Community</span>
            </div>

            <div className="metric p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verification</div>
              <b
                className={`text-lg mt-1 block truncate ${
                  profile.isVerified ? 'text-emerald-600' : 'text-slate-600'
                }`}
              >
                {profile.isVerified ? 'Verified' : 'Member'}
              </b>
              <span className="text-[10px] text-slate-500 truncate block">
                {profile.isVerified ? 'Institutional Record' : 'Self-Reported'}
              </span>
            </div>

            {/* DEDICATED STATUS INDICATOR TILE */}
            <div
              data-testid="connection-status-tile"
              className={`metric p-3.5 rounded-xl border transition ${
                connectionRecord.status === 'CONNECTED'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : connectionRecord.status === 'PENDING'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Network Status</div>
              <div className="flex items-center gap-1.5 mt-1">
                {isOwnProfile ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <b className="text-base text-blue-700 truncate">Your Profile</b>
                  </>
                ) : connectionRecord.status === 'CONNECTED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <b className="text-base text-emerald-700 truncate">Connected</b>
                  </>
                ) : connectionRecord.status === 'PENDING' ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <b className="text-base text-amber-700 truncate">Pending</b>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-slate-400 shrink-0" />
                    <b className="text-base text-slate-600 truncate">Available</b>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                {isOwnProfile
                  ? 'Primary account'
                  : connectionRecord.status === 'CONNECTED'
                  ? 'Direct chat unlocked'
                  : connectionRecord.status === 'PENDING'
                  ? 'Awaiting response'
                  : 'Send invitation'}
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ORGANIZED PROFILE SECTIONS (TAB BAR) */}
          {/* ========================================================= */}
          <div className="mt-8 border-b border-slate-200">
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('career')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'career'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Career & Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('education')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'education'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Education</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('skills')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'skills'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Skills & Projects</span>
                {profile.skills && profile.skills.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {profile.skills.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('network')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'network'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Network & Links</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="py-6 space-y-6 animate-in fade-in duration-150">
              {/* Bio & Professional Statement */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold navy flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Professional Statement</span>
                  </h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => openEditModal('basic')}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Edit Bio
                    </button>
                  )}
                </div>

                {profile.bio ? (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    <p>No biographical statement provided yet.</p>
                    {isOwnProfile && (
                      <button
                        onClick={() => openEditModal('basic')}
                        className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                      >
                        + Add your professional statement
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Distinction Banner: Verified vs Self-Reported */}
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  profile.isVerified
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/60 border-amber-200 text-amber-900'
                }`}
              >
                {profile.isVerified ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold">
                    {profile.isVerified
                      ? 'Officially Verified Institutional Record'
                      : 'Self-Reported Member Information'}
                  </h4>
                  <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                    {profile.isVerified
                      ? 'Academic credentials, graduation status, and university affiliation have been cross-referenced with official university alumni records.'
                      : 'This profile contains member-submitted data. Official institutional credential validation is pending verification from the university registrar.'}
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>Current Focus</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold navy text-sm">
                      {profile.jobRole || 'Scholar'} {profile.company ? `· ${profile.company}` : ''}
                    </p>
                    <p className="text-slate-500">
                      Sector: <b className="text-slate-700">{profile.sector || 'Industry Technology'}</b>
                    </p>
                    {profile.specialization && (
                      <p className="text-slate-500">
                        Focus: <b className="text-slate-700">{profile.specialization}</b>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Academic Background</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold navy text-sm">
                      {profile.degreeTitle || profile.degree || `Degree in ${profile.department}`}
                    </p>
                    <p className="text-slate-500">
                      University: <b className="text-slate-700">{profile.university}</b>
                    </p>
                    <p className="text-slate-500">
                      Class / Batch: <b className="text-slate-700">{profile.graduationYear || profile.batch}</b>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CAREER & TIMELINE (DYNAMIC REAL DATA) */}
          {/* ========================================================= */}
          {activeTab === 'career' && (
            <div className="py-6 space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black navy">Career Journey & Milestones</h3>
                  <p className="text-xs text-slate-500">
                    Chronological career trajectory derived from verified profile records
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => openEditModal('basic')}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Update Current Role
                  </button>
                )}
              </div>

              {/* Dynamic Timeline - strictly based on saved records */}
              <div className="border-l-2 border-blue-200 ml-3 pl-6 space-y-8">
                {/* 1. Current Professional Position */}
                {profile.jobRole || profile.company ? (
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-blue-600 absolute -left-[31px] top-1.5 ring-4 ring-blue-100" />
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      Current Position · Present
                    </div>
                    <b className="block mt-1 navy text-base">
                      {profile.jobRole || 'Professional Role'} {profile.company ? `· ${profile.company}` : ''}
                    </b>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {profile.city ? `${profile.city}, ` : ''}
                      {profile.country || 'Global'}
                      {profile.careerStatus ? ` · ${profile.careerStatus}` : ' · Full-time'}
                    </p>
                    {profile.specialization && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-lg">
                        Specialized focus: <b>{profile.specialization}</b>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-slate-300 absolute -left-[31px] top-1.5" />
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Activity
                    </div>
                    <b className="block mt-1 navy text-base">Alumni Scholar</b>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No specific company or job role recorded yet.
                    </p>
                  </div>
                )}

                {/* 2. University Graduation Milestone */}
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-slate-400 absolute -left-[31px] top-1.5" />
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Graduated {profile.graduationYear || profile.batch || 'Institutional Alumnus'}
                  </div>
                  <b className="block mt-1 navy text-base">
                    {profile.degreeTitle || profile.degree || `Degree in ${profile.department}`}
                  </b>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {profile.university} {profile.academicSession ? `· Session ${profile.academicSession}` : ''}
                  </p>
                  {profile.educationLevel && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                      {profile.educationLevel} Degree
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: EDUCATION */}
          {/* ========================================================= */}
          {activeTab === 'education' && (
            <div className="py-6 space-y-6 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {getUniversityLogo(profile.university) ? (
                      <img
                        src={getUniversityLogo(profile.university)}
                        alt=""
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black navy">{profile.university}</h3>
                      {isOwnProfile && (
                        <button
                          onClick={() => openEditModal('academic')}
                          className="text-xs text-blue-600 font-bold hover:underline"
                        >
                          Edit Academic Info
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-bold text-blue-700 mt-0.5">
                      {profile.degreeTitle || profile.degree || `Department of ${profile.department}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Faculty / Department: <b className="text-slate-700">{profile.department}</b>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                        Graduation Year: {profile.graduationYear || profile.batch}
                      </span>
                      {profile.educationLevel && (
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                          Level: {profile.educationLevel}
                        </span>
                      )}
                      {profile.academicSession && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                          Session: {profile.academicSession}
                        </span>
                      )}
                      {profile.studentId && isOwnProfile && (
                        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold">
                          Student ID: {profile.studentId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Institutional Source Card */}
              {profile.sourceUrl && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold navy text-xs">Institutional Source & Verification Record</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Verified Status: <b className="text-emerald-700">{profile.verificationStatus || 'Verified'}</b>
                        {profile.confidence ? ` · Confidence: ${profile.confidence}` : ''}
                        {profile.dateChecked ? ` · Date Checked: ${profile.dateChecked}` : ''}
                      </p>
                      {profile.notes && (
                        <p className="text-slate-600 text-[11px] italic mt-1 bg-white p-2 rounded-lg border border-slate-100">
                          "{profile.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={profile.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 font-bold text-xs hover:bg-blue-50 transition shrink-0"
                  >
                    <span>View Primary Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: SKILLS & PROJECTS */}
          {/* ========================================================= */}
          {activeTab === 'skills' && (
            <div className="py-6 space-y-6 animate-in fade-in duration-150">
              {/* Skills Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold navy flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Skills & Competencies</span>
                  </h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => openEditModal('skills')}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Manage Skills
                    </button>
                  )}
                </div>

                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200/80 text-xs font-semibold transition"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    <p>No technical skills or competencies listed yet.</p>
                    {isOwnProfile && (
                      <button
                        onClick={() => openEditModal('skills')}
                        className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                      >
                        + Add technical skills
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Portfolio & Project Links */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold navy flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Portfolio & Digital Footprint</span>
                  </h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => openEditModal('skills')}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Edit Portfolio
                    </button>
                  )}
                </div>

                {profile.portfolioUrl ? (
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 break-all">{profile.portfolioUrl}</span>
                    </div>
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 px-3 py-1.5 rounded-lg transition"
                    >
                      Visit
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No personal portfolio or project link provided.</p>
                )}
              </div>

              {/* Achievements & Honors */}
              {profile.achievements ? (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold navy flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Key Achievements & Honors</span>
                    </h3>
                    {isOwnProfile && (
                      <button
                        onClick={() => openEditModal('skills')}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Edit Achievements
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {profile.achievements}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: NETWORK & LINKS */}
          {/* ========================================================= */}
          {activeTab === 'network' && (
            <div className="py-6 space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Professional Links */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200">
                  <h3 className="text-sm font-bold navy mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <span>External Profiles</span>
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {profile.linkedin ? (
                      <a
                        href={profile.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition"
                      >
                        <span className="font-semibold text-slate-700">LinkedIn Profile</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      </a>
                    ) : (
                      <p className="text-slate-400 text-xs">LinkedIn profile not connected.</p>
                    )}

                    {profile.portfolioUrl ? (
                      <a
                        href={profile.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition"
                      >
                        <span className="font-semibold text-slate-700">Portfolio Website</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      </a>
                    ) : null}
                  </div>
                </div>

                {/* Mentorship Opportunities */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200">
                  <h3 className="text-sm font-bold navy mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Mentorship Availability</span>
                  </h3>
                  <div className="text-xs space-y-2">
                    <p className="text-slate-600">
                      Status:{' '}
                      <b className={profile.mentorshipOpen ? 'text-emerald-700' : 'text-slate-500'}>
                        {profile.mentorshipOpen
                          ? 'Available to Mentor Students'
                          : 'Mentorship currently inactive'}
                      </b>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {profile.mentorshipOpen
                        ? 'This alumnus is welcoming connection requests from enrolled students seeking career guidance and project feedback.'
                        : 'Currently not accepting new mentorship requests.'}
                    </p>
                    {profile.mentorshipOpen && !isOwnProfile && connectionRecord.status !== 'CONNECTED' && (
                      <button
                        onClick={handleRequestMentorship}
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Request Mentorship Session</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SEND CONNECTION REQUEST MODAL */}
      {/* ========================================================= */}
      {connectModalOpen && profile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl bg-white rounded-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl avatar flex items-center justify-center text-lg font-bold bg-navy text-white">
                  {initials}
                </div>
                <div>
                  <h3 className="text-lg font-black navy">Connect with {profile.name}</h3>
                  <p className="text-xs text-slate-500">
                    {profile.jobRole || 'Alumni'} at {profile.company || profile.university} · {profile.university}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendConnectionRequest} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Add a personal note (Optional)</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {invitationNote.length}/300
                  </span>
                </label>

                {/* Quick note templates */}
                <div className="flex flex-wrap gap-1.5 my-2">
                  {messageTemplates.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => setInvitationNote(tmpl.text)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                    >
                      + {tmpl.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={invitationNote}
                  onChange={(e) => setInvitationNote(e.target.value.slice(0, 300))}
                  rows={4}
                  className="account-input mt-1 w-full text-xs"
                  placeholder={`Hi ${profile.name}, I'm interested in your tech journey and would appreciate connecting to learn more...`}
                />
              </div>

              {/* Status Simulation Notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Sending will simulate delivering a connection notification to {profile.name}. Your profile will be marked with a <b>Request Pending</b> status indicator until verified or accepted.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-blue-300" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DIRECT MESSAGING MODAL (ACTIVE WHEN CONNECTED) */}
      {/* ========================================================= */}
      {messageModalOpen && profile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full shadow-2xl bg-white rounded-2xl flex flex-col h-[520px] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl avatar flex items-center justify-center text-sm font-bold bg-blue-600 text-white">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{profile.name}</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {profile.jobRole || 'Alumni'} · {profile.company || profile.university}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation message stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              <div className="text-center my-2">
                <span className="text-[10px] bg-slate-200/80 text-slate-600 px-3 py-1 rounded-full font-medium">
                  Connected on Alumni Direct Network
                </span>
              </div>

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                      msg.sender === 'me'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Message input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Write a message to ${profile.name}...`}
                className="flex-1 account-input text-xs py-2"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-navy hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. OWNER EDIT PROFILE MODAL (SECURE, GROUPED, PERSISTENT) */}
      {/* ========================================================= */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-2xl w-full p-6 shadow-2xl bg-white rounded-3xl animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black navy">Edit Alumni Profile</h3>
                  <p className="text-[11px] text-slate-500">
                    Update your public professional credentials and directory visibility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Banner */}
            {saveProfileError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{saveProfileError}</span>
              </div>
            )}

            {/* Studio Sub-Tabs */}
            <div className="flex flex-wrap gap-1.5 mt-4 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setEditTab('basic')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  editTab === 'basic'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                1. Basic Info & Bio
              </button>
              <button
                type="button"
                onClick={() => setEditTab('academic')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  editTab === 'academic'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                2. Academic Background
              </button>
              <button
                type="button"
                onClick={() => setEditTab('skills')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  editTab === 'skills'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                3. Skills & Portfolio
              </button>
              <button
                type="button"
                onClick={() => setEditTab('preferences')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  editTab === 'preferences'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                4. Privacy & Mentorship
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              {/* SUB-TAB 1: BASIC INFO */}
              {editTab === 'basic' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="account-input w-full text-xs"
                      placeholder="e.g. Tanvir Hasan"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Current Role / Title
                      </label>
                      <input
                        type="text"
                        value={editJobRole}
                        onChange={(e) => setEditJobRole(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Company / Organization
                      </label>
                      <input
                        type="text"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. Google, DataSoft, BRAC"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. Dhaka, Munich"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
                      <input
                        type="text"
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. Bangladesh"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Profile Photo URL
                    </label>
                    <input
                      type="url"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      className="account-input w-full text-xs"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Professional Statement / Bio
                    </label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="account-input w-full text-xs"
                      placeholder="Tell fellow alumni and students about your career path, achievements, and mentorship philosophy..."
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: ACADEMIC */}
              {editTab === 'academic' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      University Institution
                    </label>
                    <select
                      value={editUniversity}
                      onChange={(e) => setEditUniversity(e.target.value)}
                      className="account-input w-full text-xs"
                    >
                      <option value="">Select University</option>
                      {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Department / Faculty
                      </label>
                      <input
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. Computer Science & Engineering"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Degree Specialization Title
                      </label>
                      <input
                        type="text"
                        value={editDegreeTitle}
                        onChange={(e) => setEditDegreeTitle(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. B.Sc. in CSE, MBA in Finance"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Graduation Year (4 digits)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editGraduationYear}
                        onChange={(e) => setEditGraduationYear(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="e.g. 2022"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Education Level
                      </label>
                      <select
                        value={editEducationLevel}
                        onChange={(e) => setEditEducationLevel(e.target.value)}
                        className="account-input w-full text-xs"
                      >
                        <option value="Undergraduate">Undergraduate (Bachelor's)</option>
                        <option value="Postgraduate">Postgraduate (Master's)</option>
                        <option value="Doctoral">Doctoral (Ph.D.)</option>
                        <option value="Diploma">Diploma / Specialization</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: SKILLS & PORTFOLIO */}
              {editTab === 'skills' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Technical & Professional Skills
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillText}
                        onChange={(e) => setNewSkillText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkillTag();
                          }
                        }}
                        className="account-input flex-1 text-xs"
                        placeholder="Type a skill (e.g. Distributed Systems) and press Enter"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkillTag}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {/* Skill tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {editSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkillTag(skill)}
                            className="text-blue-500 hover:text-rose-600 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        value={editLinkedin}
                        onChange={(e) => setEditLinkedin(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Portfolio / Project URL
                      </label>
                      <input
                        type="url"
                        value={editPortfolioUrl}
                        onChange={(e) => setEditPortfolioUrl(e.target.value)}
                        className="account-input w-full text-xs"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Notable Achievements & Honors
                    </label>
                    <textarea
                      rows={2}
                      value={editAchievements}
                      onChange={(e) => setEditAchievements(e.target.value)}
                      className="account-input w-full text-xs"
                      placeholder="Awards, hackathon wins, scholarships, publications, patents..."
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: PRIVACY & MENTORSHIP PREFERENCES */}
              {editTab === 'preferences' && (
                <div className="space-y-4">
                  {/* Public Directory Control */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Eye className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Public Directory Visibility
                        </span>
                        <span className="text-[11px] text-slate-500 leading-relaxed block">
                          Allow other alumni and enrolled students to find and connect with your profile in the directory.
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={editPublicDirectoryVisible}
                        onChange={(e) => setEditPublicDirectoryVisible(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>

                  {/* Mentorship Preference */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Available to Mentor Students
                        </span>
                        <span className="text-[11px] text-slate-500 leading-relaxed block">
                          Display the "Open to Mentoring" badge and allow campus students to request mentorship guidance.
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={editMentorshipOpen}
                        onChange={(e) => setEditMentorshipOpen(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  {/* Locked Institutional Information */}
                  <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Protected Account Attributes</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Email address ({currentUser?.email || profile.email}) and official Institutional Verification status can only be modified by University Administration.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Save & Update Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
