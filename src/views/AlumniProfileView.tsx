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
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { AlumniRecord, AlumniConnectionStatus, AlumniConnectionRecord } from '../types';

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

export const AlumniProfileView: React.FC<AlumniProfileViewProps> = ({
  alumniId,
  alumniName,
  onNavigate,
  onBack,
}) => {
  const { alumni, allUsers } = useData();
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
          status: 'APPROVED',
          createdAt: userMatch.createdAt,
          updatedAt: userMatch.updatedAt,
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
      status: 'APPROVED',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }, [alumni, alumniId, alumniName]);

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Storage key for per-alumnus connection status
  const storageKey = `alumni_conn_${profile.id}`;

  // Connection State
  const [connectionRecord, setConnectionRecord] = useState<AlumniConnectionRecord>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
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
  }, [storageKey, profile.id, profile.name]);

  // Save helper
  const updateConnection = (updates: Partial<AlumniConnectionRecord>) => {
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

  // Chat conversation state for connected alumni
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'alumnus',
      text: `Hello! Thanks for connecting. I'm always glad to support fellow scholars from ${profile.university}. How can I assist you?`,
      timestamp: 'Today, Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Quick message template options
  const messageTemplates = [
    {
      label: 'Mentorship',
      text: `Hi ${profile.name}, I am a student interested in your journey as a ${profile.jobRole} at ${profile.company}. Would love to connect for mentorship and career advice!`,
    },
    {
      label: 'Campus Network',
      text: `Hello ${profile.name}, great to see fellow alumni from ${profile.department} at ${profile.university}. Let's stay connected in our professional network.`,
    },
    {
      label: 'Industry Advice',
      text: `Hi ${profile.name}, I'm aspiring to work in software systems and admire your work at ${profile.company}. Would appreciate having you in my network!`,
    },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Simulate Sending Connection Request
  const handleSendConnectionRequest = (e: React.FormEvent) => {
    e.preventDefault();
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
    const now = new Date().toISOString();
    updateConnection({
      status: 'CONNECTED',
      connectedAt: now,
    });
    showToast(`✓ ${profile.name} accepted your connection request! You are now connected.`);
  };

  // 3. Withdraw Request (Transition PENDING -> NOT_CONNECTED)
  const handleWithdrawRequest = () => {
    updateConnection({
      status: 'NOT_CONNECTED',
      sentAt: undefined,
      message: undefined,
    });
    showToast(`Connection request to ${profile.name} has been withdrawn.`);
  };

  // 4. Remove / Disconnect (Transition CONNECTED -> NOT_CONNECTED)
  const handleDisconnect = () => {
    if (window.confirm(`Are you sure you want to remove your connection with ${profile.name}?`)) {
      updateConnection({
        status: 'NOT_CONNECTED',
        connectedAt: undefined,
        sentAt: undefined,
      });
      showToast(`Connection with ${profile.name} removed.`);
    }
  };

  // 5. Send Chat Message in Connected state
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

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

  // Format sent timestamp
  const formattedSentDate = connectionRecord.sentAt
    ? new Date(connectionRecord.sentAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

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

      {/* Primary Profile Card */}
      <div className="card p-6 sm:p-8 relative overflow-hidden bg-white shadow-sm border border-slate-200/80 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl avatar flex items-center justify-center text-3xl font-black shadow-md shrink-0 border-2 border-white bg-linear-to-br from-blue-700 to-indigo-900 text-white">
              {initials}
            </div>

            {/* Profile Info & Status Indicators */}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black navy tracking-tight">{profile.name}</h1>

                {/* Institutional Verification Badge */}
                {profile.isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Alumni
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200">
                    Alumni Member
                  </span>
                )}

                {/* ========================================================= */}
                {/* CONNECTION STATUS INDICATOR (PROMINENT HEADER BADGE) */}
                {/* ========================================================= */}
                {connectionRecord.status === 'NOT_CONNECTED' && (
                  <span
                    data-testid="connection-status-not-connected"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/90"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                    Status: Not Connected
                  </span>
                )}

                {connectionRecord.status === 'PENDING' && (
                  <span
                    data-testid="connection-status-pending"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    Status: Request Pending
                  </span>
                )}

                {connectionRecord.status === 'CONNECTED' && (
                  <span
                    data-testid="connection-status-connected"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Status: Connected (1st Degree)
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
                  {profile.city ? `${profile.city}, ` : ''}
                  {profile.country}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {profile.university}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  {profile.department} ({profile.graduationYear || profile.batch})
                </span>
              </div>

              {profile.bio && (
                <p className="text-xs text-slate-600 mt-3 max-w-xl leading-relaxed italic bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  "{profile.bio}"
                </p>
              )}

              {/* Expertise tags */}
              <div className="flex flex-wrap gap-1.5 mt-3.5">
                <span className="pill text-xs">Software Engineering</span>
                <span className="pill text-xs">Cloud Architecture</span>
                <span className="pill text-xs">Distributed Systems</span>
                <span className="pill text-xs">Mentorship Available</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ACTION BUTTONS & CONNECT CONTROLS */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-2.5 w-full sm:w-auto shrink-0 md:min-w-[190px]">
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

        {/* ========================================================= */}
        {/* INTERACTIVE CONNECTION STATUS CALLOUT BANNER */}
        {/* ========================================================= */}
        {connectionRecord.status === 'PENDING' && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Connection Invitation Pending: Sent {formattedSentDate}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  You sent a connection request to {profile.name}. Once accepted, you can initiate direct 1-on-1 mentorship messages.
                </p>
                {connectionRecord.message && connectionRecord.message !== 'No personal note attached.' && (
                  <p className="text-xs italic text-amber-800/90 mt-1 bg-amber-100/60 p-2 rounded-lg border border-amber-200/50">
                    "{connectionRecord.message}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={handleSimulateAcceptance}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Accept</span>
              </button>
              <button
                onClick={handleWithdrawRequest}
                className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Withdraw
              </button>
            </div>
          </div>
        )}

        {connectionRecord.status === 'CONNECTED' && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Connected Network Member (1st Degree)
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  You and {profile.name} are directly connected. You have full access to direct messaging and peer mentoring.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setMessageModalOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat with {profile.name.split(' ')[0]}</span>
              </button>
            </div>
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
              connectionRecord.status === 'CONNECTED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : connectionRecord.status === 'PENDING'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Connection</div>
            <div className="flex items-center gap-1.5 mt-1">
              {connectionRecord.status === 'CONNECTED' ? (
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
              {connectionRecord.status === 'CONNECTED'
                ? 'Direct access active'
                : connectionRecord.status === 'PENDING'
                ? 'Awaiting response'
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
                BSc in {profile.department}
              </b>
              <p className="text-xs text-slate-500 mt-0.5">{profile.university}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SEND CONNECTION REQUEST MODAL */}
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
      {messageModalOpen && (
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
                    {profile.jobRole} · {profile.company}
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
    </div>
  );
};
