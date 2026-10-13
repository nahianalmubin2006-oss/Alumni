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
  Handshake,
  Users,
  Trash2,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  AlumniRecord,
  UserProfile,
  ConnectionRequest,
  MentorshipRequest,
  MentorshipTopic,
  AlumniConnectionRecord,
  AlumniConnectionStatus,
} from '../types';
import { DigitalIDCard } from '../components/DigitalIDCard';
import { getUniversityLogo, universityInitials } from '../data/initialData';
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

const MENTORSHIP_TOPICS: MentorshipTopic[] = [
  'Career Path Guidance',
  'Resume & Portfolio Review',
  'Job Search & Referrals',
  'Technical Interview Prep',
  'Higher Studies & Research',
  'Industry Transition',
  'General Mentorship',
];

export const AlumniProfileView: React.FC<AlumniProfileViewProps> = ({
  alumniId,
  alumniName,
  onNavigate,
  onBack,
}) => {
  const {
    alumni,
    students,
    allUsers,
    sendConnectionRequest,
    respondConnectionRequest,
    cancelConnectionRequest,
    disconnectConnection,
    sendMentorshipRequest,
    cancelMentorshipRequest,
    getConnectionStatusWith,
    getMentorshipStatusWith,
  } = useData();
  const { currentUser, userProfile } = useAuth();

  // Find alumni record or generate rich fallback profile with live synchronization
  const profile: AlumniRecord = useMemo(() => {
    // If viewing own profile, always use live userProfile state
    if (currentUser && userProfile && (alumniId === currentUser.uid || (alumniName && alumniName.toLowerCase().trim() === (userProfile.name || '').toLowerCase().trim()))) {
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
        mentorshipOpen: userProfile.mentorshipOpen !== false,
        status: 'APPROVED',
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      };
    }

    if (alumniId) {
      const match = alumni.find((a) => a.id === alumniId || a.userId === alumniId);
      if (match) return match;
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
          createdAt: studentMatch.createdAt || new Date().toISOString(),
          updatedAt: studentMatch.updatedAt || new Date().toISOString(),
        };
      }
    }
    if (alumniName) {
      const q = (alumniName || '').toLowerCase().trim();
      const match = alumni.find((a) => (a.name || '').toLowerCase().trim() === q);
      if (match) return match;
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
          mentorshipOpen: userMatch.mentorshipOpen !== false,
          status: 'APPROVED',
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
          mentorshipOpen: false,
          status: 'APPROVED',
          createdAt: studentMatch.createdAt || new Date().toISOString(),
          updatedAt: studentMatch.updatedAt || new Date().toISOString(),
        };
      }
    }

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
      mentorshipOpen: true,
      status: 'APPROVED',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }, [alumni, students, allUsers, currentUser, userProfile, alumniId, alumniName]);

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Identity checks
  const isOwnProfile = Boolean(
    currentUser && (
      currentUser.uid.toLowerCase() === (profile.userId || profile.id).toLowerCase() ||
      currentUser.uid.toLowerCase() === profile.id.toLowerCase() ||
      (userProfile?.email && profile.email && userProfile.email.toLowerCase() === profile.email.toLowerCase())
    )
  );

  // Live connection & mentorship status from centralized state
  const liveConn = useMemo(() => {
    const byUserOrId = getConnectionStatusWith(profile.userId || profile.id);
    if (byUserOrId.status !== 'NONE') return byUserOrId;
    return getConnectionStatusWith(profile.id);
  }, [getConnectionStatusWith, profile.userId, profile.id]);

  const liveMentor = useMemo(() => {
    const byUserOrId = getMentorshipStatusWith(profile.userId || profile.id);
    if (byUserOrId.status !== 'NONE') return byUserOrId;
    return getMentorshipStatusWith(profile.id);
  }, [getMentorshipStatusWith, profile.userId, profile.id]);

  // Modals & UI States
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [mentorshipModalOpen, setMentorshipModalOpen] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [invitationNote, setInvitationNote] = useState('');
  const [mentorshipTopic, setMentorshipTopic] = useState<MentorshipTopic>('Career Path Guidance');
  const [mentorshipMessage, setMentorshipMessage] = useState('');
  const [mentorshipSchedule, setMentorshipSchedule] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingMentorship, setIsSendingMentorship] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDigitalPass, setShowDigitalPass] = useState(false);

  // Determine architectural campus banner for this profile
  const campusBanner = useMemo(() => {
    const uniText = (profile.university || '').toLowerCase();
    const deptText = (profile.department || '').toLowerCase();
    if (uniText.includes('engineering') || uniText.includes('science') || uniText.includes('tech') || deptText.includes('computer')) {
      return techQuadBanner;
    }
    if (uniText.includes('dhaka') || uniText.includes('jahangirnagar')) {
      return oxfordGothicBanner;
    }
    if (uniText.includes('north south') || uniText.includes('brac')) {
      return nightSapphireBanner;
    }
    return emeraldHeritageBanner;
  }, [profile.university, profile.department]);

  // Prepared userProfile object for DigitalIDCard
  const userProfileForCard = useMemo<UserProfile>(() => ({
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
  }), [profile]);

  // Quick message template options for Connection Note
  const messageTemplates = [
    {
      label: 'Mentorship',
      text: `Hi ${profile.name}, I am a student interested in your journey as a ${profile.jobRole || 'professional'} at ${profile.company || 'your organization'}. Would love to connect for career advice!`,
    },
    {
      label: 'Campus Network',
      text: `Hello ${profile.name}, great to see fellow alumni from ${profile.department} at ${profile.university}. Let's stay connected in our professional network.`,
    },
    {
      label: 'Industry Advice',
      text: `Hi ${profile.name}, I'm aspiring to work in your field and admire your work at ${profile.company || 'your company'}. Would appreciate having you in my network!`,
    },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenConnect = () => {
    if (!currentUser) {
      showToast('Please log in or create an account to connect with alumni.');
      onNavigate('account');
      return;
    }
    setConnectModalOpen(true);
  };

  const handleSendRealConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSending(true);
    try {
      await sendConnectionRequest({
        recipientId: profile.userId || profile.id,
        recipientName: profile.name,
        recipientEmail: profile.email,
        recipientRole: 'ALUMNI',
        recipientPhotoUrl: profile.photoUrl,
        recipientUniversity: profile.university,
        recipientDepartment: profile.department,
        recipientJobRole: profile.jobRole,
        recipientCompany: profile.company,
        recipientAlumniId: profile.id,
        message: invitationNote.trim() || undefined,
      });
      showToast(`Connection request sent to ${profile.name}! Status: Pending.`);
      setConnectModalOpen(false);
      setInvitationNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to send connection request.');
    } finally {
      setIsSending(false);
    }
  };

  const handleWithdrawConnection = async () => {
    if (!liveConn.request) return;
    try {
      await cancelConnectionRequest(liveConn.request.id);
      showToast(`Connection request to ${profile.name} has been withdrawn.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to withdraw connection request.');
    }
  };

  const handleAcceptConnection = async () => {
    if (!liveConn.request) return;
    try {
      await respondConnectionRequest(liveConn.request.id, 'ACCEPTED');
      showToast(`✓ You are now connected with ${profile.name}!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept connection request.');
    }
  };

  const handleDeclineConnection = async () => {
    if (!liveConn.request) return;
    try {
      await respondConnectionRequest(liveConn.request.id, 'DECLINED');
      showToast(`Connection request from ${profile.name} declined.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to decline connection request.');
    }
  };

  const handleDisconnect = async () => {
    if (!liveConn.request) return;
    try {
      await disconnectConnection(liveConn.request.id);
      showToast(`Connection with ${profile.name} removed.`);
      setDisconnectModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect.');
    }
  };

  const handleOpenMentorship = () => {
    if (!currentUser) {
      showToast('Please log in or create an account to request mentorship.');
      onNavigate('account');
      return;
    }
    setMentorshipModalOpen(true);
  };

  const handleSendRealMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (mentorshipMessage.trim().length < 20) {
      showToast('Please provide a clear purpose of at least 20 characters.');
      return;
    }
    setIsSendingMentorship(true);
    try {
      await sendMentorshipRequest({
        mentorId: profile.userId || profile.id,
        mentorName: profile.name,
        mentorRole: 'ALUMNI',
        mentorPhotoUrl: profile.photoUrl,
        mentorUniversity: profile.university,
        mentorDepartment: profile.department,
        mentorJobRole: profile.jobRole,
        mentorCompany: profile.company,
        mentorAlumniId: profile.id,
        topic: mentorshipTopic,
        message: mentorshipMessage.trim(),
        preferredSchedule: mentorshipSchedule.trim() || undefined,
      });
      showToast(`Mentorship request submitted to ${profile.name}!`);
      setMentorshipModalOpen(false);
      setMentorshipMessage('');
      setMentorshipSchedule('');
    } catch (err: any) {
      showToast(err.message || 'Failed to send mentorship request.');
    } finally {
      setIsSendingMentorship(false);
    }
  };

  const handleWithdrawMentorship = async () => {
    if (!liveMentor.request) return;
    try {
      await cancelMentorshipRequest(liveMentor.request.id);
      showToast(`Mentorship request to ${profile.name} withdrawn.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to withdraw mentorship request.');
    }
  };

  const handleCopyProfileLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

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
                <span>{profile.isVerified ? 'Verified Alumni' : 'Alumni Profile'}</span>
              </span>

              {profile.university && (
                <span className="text-[11px] font-bold text-emerald-200 bg-emerald-950/65 backdrop-blur-md px-3.5 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{profile.university}</span>
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

          {/* Bottom Latin Motto */}
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
                    <div className={`w-full h-full items-center justify-center font-black text-3xl sm:text-4xl text-blue-700 ${profile.photoUrl ? 'hidden' : 'flex'}`}>
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
                  <h1 className="max-w-full break-words text-2xl sm:text-3xl font-black navy tracking-tight">{profile.name}</h1>

                  {/* Institutional Verification Badge */}
                  {profile.isVerified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-amber-900 bg-amber-50 border border-amber-300 shadow-xs">
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Verified Alumni</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200">
                      Alumni Member
                    </span>
                  )}

                </div>

                {/* Current Role & Company */}
                <div className="flex items-center gap-2 mt-1.5 text-slate-700 font-bold text-base">
                  <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {profile.jobRole} <span className="text-slate-400 font-normal">at</span>{' '}
                    <span className="text-navy">{profile.company}</span>
                  </span>
                </div>

                {/* Academic & Geographic details */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Residence / Location:</span>
                    <b className="text-slate-700">{profile.city ? `${profile.city}, ` : ''}{profile.country}</b>
                  </span>
                  <span>•</span>
                  {profile.university && (
                    <button
                      type="button"
                      onClick={() => onNavigate('universityDetail', { name: profile.university })}
                      className="flex items-center gap-1 text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      {getUniversityLogo(profile.university) && (
                        <img src={getUniversityLogo(profile.university)} alt="" className="w-3.5 h-3.5 object-contain" />
                      )}
                      <span>{profile.university}</span>
                    </button>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {profile.degree ? `${profile.degree} · ` : ''}{profile.department} ({profile.batch || profile.graduationYear})
                  </span>
                </div>

                {profile.bio && (
                  <p className="text-xs text-slate-600 mt-3 max-w-xl leading-relaxed italic bg-slate-50/80 p-3 rounded-xl border border-slate-100 relative">
                    <span className="text-2xl text-blue-300 font-serif absolute -top-1 left-1.5 select-none leading-none">“</span>
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

          {/* ========================================================= */}
          {/* ACTION BUTTONS & CONNECT CONTROLS */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-2.5 w-full sm:w-auto shrink-0 md:min-w-[210px]">
            {/* OWN PROFILE */}
            {isOwnProfile && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <span className="text-xs font-bold text-blue-800 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Your Profile
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="mt-2 w-full text-xs bg-white text-blue-700 border border-blue-300 font-bold py-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            )}

            {/* NOT OWN PROFILE - CONNECTION STATUS ACTIONS */}
            {!isOwnProfile && (
              <>
                {/* 1. NOT CONNECTED */}
                {(liveConn.status === 'NONE' || liveConn.status === 'CANCELLED' || liveConn.status === 'DECLINED') && (
                  <button
                    data-testid="connect-button"
                    onClick={handleOpenConnect}
                    className="bg-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-blue-300" />
                    <span>Connect</span>
                  </button>
                )}

                {/* 2. PENDING OUTGOING REQUEST */}
                {liveConn.status === 'PENDING' && liveConn.isOutgoing && (
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      disabled
                      data-testid="pending-button"
                      className="bg-amber-50 text-amber-800 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default shadow-xs"
                    >
                      <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>Request Pending</span>
                    </button>

                    <div className="flex items-center justify-center gap-2 px-1">
                      <button
                        onClick={handleWithdrawConnection}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Withdraw Request</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. PENDING INCOMING REQUEST */}
                {liveConn.status === 'PENDING' && !liveConn.isOutgoing && (
                  <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-xs font-bold text-blue-900 text-center">
                      Connection Request Received
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAcceptConnection}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={handleDeclineConnection}
                        className="flex-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. CONNECTED */}
                {liveConn.status === 'ACCEPTED' && (
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      disabled
                      data-testid="connected-badge"
                      className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Connected</span>
                    </button>

                    <button
                      onClick={() => onNavigate('network')}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>View in Network</span>
                    </button>

                    <button
                      onClick={() => setDisconnectModalOpen(true)}
                      className="text-center px-3 py-1 text-slate-400 hover:text-rose-600 hover:underline text-[11px] font-medium transition cursor-pointer"
                    >
                      Remove Connection
                    </button>
                  </div>
                )}

                {/* MENTORSHIP ACTION BUTTON */}
                {profile.mentorshipOpen !== false && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    {liveMentor.status === 'NONE' || liveMentor.status === 'CANCELLED' ? (
                      <button
                        onClick={handleOpenMentorship}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Request Mentorship</span>
                      </button>
                    ) : liveMentor.status === 'PENDING' ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                        <span className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Mentorship Pending
                        </span>
                        {liveMentor.isOutgoing && (
                          <button
                            onClick={handleWithdrawMentorship}
                            className="mt-1 text-[10px] text-rose-600 hover:underline font-semibold block mx-auto cursor-pointer"
                          >
                            Withdraw Request
                          </button>
                        )}
                      </div>
                    ) : liveMentor.status === 'ACCEPTED' ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-center">
                        <span className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Active Mentee
                        </span>
                        <button
                          onClick={() => onNavigate('network', { tab: 'mentorship' })}
                          className="mt-1 text-[10px] text-emerald-700 hover:underline font-bold block mx-auto cursor-pointer"
                        >
                          Open Mentorship Workspace →
                        </button>
                      </div>
                    ) : liveMentor.status === 'DECLINED' ? (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[11px] text-slate-500 font-semibold block">
                          Mentorship Request Closed
                        </span>
                        <button
                          onClick={handleOpenMentorship}
                          className="mt-1 text-[10px] text-blue-600 hover:underline font-bold block mx-auto cursor-pointer"
                        >
                          Request Again
                        </button>
                      </div>
                    ) : null}
                  </div>
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

        {/* ========================================================= */}
        {/* HIGHLIGHTS ROW WITH DEDICATED CONNECTION STATUS METRIC */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8">
          <div className="metric p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Experience</div>
            <b className="text-lg navy mt-1 block">3+ years</b>
            <span className="text-[10px] text-slate-500">Tech Industry</span>
          </div>

          <div className="metric p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Location</div>
            <b className="text-lg navy mt-1 block truncate">
              {profile.city ? `${profile.city}, ` : ''}
              {profile.country}
            </b>
            <span className="text-[10px] text-slate-500">Global Chapter</span>
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
            <span className="text-[10px] text-slate-500">Institutional record</span>
          </div>

          {/* DEDICATED STATUS INDICATOR TILE */}
          <div
            data-testid="connection-status-tile"
            className={`metric p-3.5 rounded-xl border transition ${
              liveConn.status === 'ACCEPTED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : liveConn.status === 'PENDING'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Connection</div>
            <div className="flex items-center gap-1.5 mt-1">
              {liveConn.status === 'ACCEPTED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <b className="text-base text-emerald-700 truncate">Connected</b>
                </>
              ) : liveConn.status === 'PENDING' ? (
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
              {liveConn.status === 'ACCEPTED'
                ? 'Direct network active'
                : liveConn.status === 'PENDING'
                ? (liveConn.isOutgoing ? 'Request pending review' : 'Incoming request')
                : 'Send connection request'}
            </span>
          </div>
        </div>

        {/* Career Journey Timeline */}
        <div className="mt-10 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black navy">Career journey & Milestones</h2>
            <span className="text-xs text-slate-400 font-medium">Verified by Alumni Network</span>
          </div>

          <div className="border-l-2 border-blue-200 ml-3 pl-6 space-y-6">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[30px] top-1.5 ring-4 ring-blue-50" />
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">2026 — PRESENT</div>
              <b className="block mt-0.5 navy text-base">
                {profile.jobRole} · {profile.company}
              </b>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.city ? `${profile.city}, ` : ''}
                {profile.country} · Full-time
              </p>
            </div>

            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 absolute -left-[30px] top-1.5" />
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">2024 — 2026</div>
              <b className="block mt-0.5 navy text-base">Software Engineer · Technology Labs</b>
              <p className="text-xs text-slate-500 mt-0.5">Dhaka, Bangladesh</p>
            </div>

            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 absolute -left-[30px] top-1.5" />
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Graduated {profile.graduationYear || profile.batch || '2023'}
              </div>
              <b className="block mt-0.5 navy text-base">
                {profile.degree || `B.Sc. in ${profile.department}`}
              </b>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.university} {profile.academicSession ? `· Session ${profile.academicSession}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Verified Institutional Source Card */}
        {profile.sourceUrl && (
          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold navy text-xs">
                  Institutional Source & Verification Record
                </p>
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
      </div>

      {/* ========================================================= */}
      {/* 1. SEND CONNECTION REQUEST MODAL */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 1. REAL CONNECTION REQUEST MODAL */}
      {/* ========================================================= */}
      {connectModalOpen && (
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
                    {profile.jobRole} at {profile.company} · {profile.university}
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

            <form onSubmit={handleSendRealConnection} className="mt-5 space-y-4">
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

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Your connection request will be sent to <b>{profile.name}</b>. Once accepted, both of you will have confirmed connection records in your personal Network directory.
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
      {/* 2. REAL MENTORSHIP REQUEST FORM MODAL */}
      {/* ========================================================= */}
      {mentorshipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl bg-white rounded-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xl font-bold">
                  🤝
                </div>
                <div>
                  <h3 className="text-lg font-black navy">Request Mentorship from {profile.name}</h3>
                  <p className="text-xs text-slate-500">
                    {profile.jobRole} at {profile.company} · {profile.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMentorshipModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendRealMentorship} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mentorship Focus Area <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mentorshipTopic}
                  onChange={(e) => setMentorshipTopic(e.target.value as MentorshipTopic)}
                  className="account-input w-full text-xs"
                >
                  {MENTORSHIP_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Mentorship Purpose & Objectives <span className="text-rose-500">*</span></span>
                  <span className={`text-[11px] ${mentorshipMessage.trim().length >= 20 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    {mentorshipMessage.length}/500 (min 20)
                  </span>
                </label>
                <textarea
                  value={mentorshipMessage}
                  onChange={(e) => setMentorshipMessage(e.target.value.slice(0, 500))}
                  rows={4}
                  className="account-input mt-1 w-full text-xs"
                  placeholder="Describe your background, what specific guidance you are seeking, and what you hope to achieve through this mentorship relationship..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Preferred Availability / Schedule (Optional)
                </label>
                <input
                  type="text"
                  value={mentorshipSchedule}
                  onChange={(e) => setMentorshipSchedule(e.target.value.slice(0, 100))}
                  placeholder="e.g., Weekday evenings, Saturday mornings, or 30-min monthly sync"
                  className="account-input w-full text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Alumni mentors volunteer their time to guide students. Please be specific, respectful, and prepared for constructive feedback.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMentorshipModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingMentorship || mentorshipMessage.trim().length < 20}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingMentorship ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Handshake className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DISCONNECT CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {disconnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl bg-white rounded-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black navy">Remove Connection?</h3>
                <p className="text-xs text-slate-500">This will remove {profile.name} from your network.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to disconnect from <b>{profile.name}</b>? You can send another connection request in the future if needed.
            </p>
            <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisconnectModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
