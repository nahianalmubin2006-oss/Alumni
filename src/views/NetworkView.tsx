import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Users,
  UserPlus,
  UserCheck,
  GraduationCap,
  Briefcase,
  Building2,
  Calendar,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  Handshake,
  AlertCircle,
  Trash2,
  Sparkles,
  BookOpen,
  Send,
  X,
  Layers,
} from 'lucide-react';
import { ConnectionRequest, MentorshipRequest, MentorshipTopic, Role } from '../types';
import { getUniversityLogo } from '../data/initialData';

interface NetworkViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
  pageParams?: Record<string, string>;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ onNavigate, onBack, pageParams }) => {
  const { currentUser, userProfile, updateProfileData } = useAuth();
  const {
    connectionRequests,
    mentorshipRequests,
    respondConnectionRequest,
    cancelConnectionRequest,
    disconnectConnection,
    respondMentorshipRequest,
    cancelMentorshipRequest,
    completeMentorshipRequest,
    alumni,
  } = useData();

  // Active Tab: 'connections', 'requests', 'mentorship', 'history'
  const initialTab = (pageParams?.tab as any) || 'connections';
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'mentorship' | 'history'>(
    ['connections', 'requests', 'mentorship', 'history'].includes(initialTab) ? initialTab : 'connections'
  );

  // Search filter for connections
  const [searchQuery, setSearchQuery] = useState('');

  // Mentorship Response Modal state
  const [respondingMentorship, setRespondingMentorship] = useState<{
    request: MentorshipRequest;
    status: 'ACCEPTED' | 'DECLINED';
  } | null>(null);
  const [mentorFeedbackNote, setMentorFeedbackNote] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Disconnect Confirmation Modal
  const [disconnectTarget, setDisconnectTarget] = useState<ConnectionRequest | null>(null);

  // Mentorship availability toggle state
  const [mentorshipToggling, setMentorshipToggling] = useState(false);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentUid = currentUser?.uid?.toLowerCase() || '';
  const currentEmail = userProfile?.email?.toLowerCase() || currentUser?.email?.toLowerCase() || '';

  // --------------------------------------------------------------------------
  // Categorized Connection Requests
  // --------------------------------------------------------------------------
  const myConnectionRequests = useMemo(() => {
    if (!currentUid) return [];
    return connectionRequests.filter(
      (r) =>
        r.senderId.toLowerCase() === currentUid ||
        r.recipientId.toLowerCase() === currentUid ||
        (r.senderEmail && r.senderEmail.toLowerCase() === currentEmail) ||
        (r.recipientEmail && r.recipientEmail.toLowerCase() === currentEmail)
    );
  }, [connectionRequests, currentUid, currentEmail]);

  // Accepted connections
  const activeConnections = useMemo(() => {
    return myConnectionRequests.filter((r) => r.status === 'ACCEPTED');
  }, [myConnectionRequests]);

  // Incoming pending requests
  const incomingRequests = useMemo(() => {
    return myConnectionRequests.filter(
      (r) =>
        (r.recipientId.toLowerCase() === currentUid || (r.recipientEmail && r.recipientEmail.toLowerCase() === currentEmail)) &&
        r.status === 'PENDING'
    );
  }, [myConnectionRequests, currentUid, currentEmail]);

  // Outgoing pending requests
  const outgoingRequests = useMemo(() => {
    return myConnectionRequests.filter(
      (r) =>
        (r.senderId.toLowerCase() === currentUid || (r.senderEmail && r.senderEmail.toLowerCase() === currentEmail)) &&
        r.status === 'PENDING'
    );
  }, [myConnectionRequests, currentUid, currentEmail]);

  // Resolved connection requests for history
  const connectionHistory = useMemo(() => {
    return myConnectionRequests.filter((r) => r.status !== 'PENDING');
  }, [myConnectionRequests]);

  // --------------------------------------------------------------------------
  // Categorized Mentorship Requests
  // --------------------------------------------------------------------------
  const myMentorshipRequests = useMemo(() => {
    if (!currentUid) return [];
    return mentorshipRequests.filter(
      (r) =>
        r.studentId.toLowerCase() === currentUid ||
        r.mentorId.toLowerCase() === currentUid ||
        (r.studentEmail && r.studentEmail.toLowerCase() === currentEmail)
    );
  }, [mentorshipRequests, currentUid, currentEmail]);

  const incomingMentorship = useMemo(() => {
    return myMentorshipRequests.filter(
      (r) => r.mentorId.toLowerCase() === currentUid && r.status !== 'CANCELLED'
    );
  }, [myMentorshipRequests, currentUid]);

  const outgoingMentorship = useMemo(() => {
    return myMentorshipRequests.filter(
      (r) =>
        (r.studentId.toLowerCase() === currentUid || (r.studentEmail && r.studentEmail.toLowerCase() === currentEmail)) &&
        r.status !== 'CANCELLED'
    );
  }, [myMentorshipRequests, currentUid, currentEmail]);

  const pendingIncomingMentorship = useMemo(() => {
    return incomingMentorship.filter((r) => r.status === 'PENDING');
  }, [incomingMentorship]);

  const isAlumni = userProfile?.profileType === 'Alumni' || userProfile?.role === 'ALUMNI';
  const isMentorshipOpen = userProfile?.mentorshipOpen !== false;

  // --------------------------------------------------------------------------
  // Filtered Connections List
  // --------------------------------------------------------------------------
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return activeConnections;
    const q = searchQuery.toLowerCase().trim();
    return activeConnections.filter((r) => {
      const isSender = r.senderId.toLowerCase() === currentUid;
      const otherName = (isSender ? r.recipientName : r.senderName).toLowerCase();
      const otherCompany = (isSender ? r.recipientCompany : r.senderCompany)?.toLowerCase() || '';
      const otherJob = (isSender ? r.recipientJobRole : r.senderJobRole)?.toLowerCase() || '';
      const otherUni = (isSender ? r.recipientUniversity : r.senderUniversity)?.toLowerCase() || '';
      const otherDept = (isSender ? r.recipientDepartment : r.senderDepartment)?.toLowerCase() || '';

      return (
        otherName.includes(q) ||
        otherCompany.includes(q) ||
        otherJob.includes(q) ||
        otherUni.includes(q) ||
        otherDept.includes(q)
      );
    });
  }, [activeConnections, searchQuery, currentUid]);

  // Toggle Mentorship Availability
  const handleToggleMentorshipAvailability = async () => {
    if (!currentUser) return;
    setMentorshipToggling(true);
    try {
      const nextVal = !isMentorshipOpen;
      await updateProfileData({ mentorshipOpen: nextVal });
      showToast(nextVal ? '✓ You are now marked as Open to Mentorship!' : 'Mentorship status updated to inactive.');
    } catch {
      showToast('Could not update mentorship status.');
    } finally {
      setMentorshipToggling(false);
    }
  };

  // Handle responding to mentorship request
  const handleConfirmMentorshipResponse = async () => {
    if (!respondingMentorship) return;
    setIsSubmittingResponse(true);
    try {
      await respondMentorshipRequest(
        respondingMentorship.request.id,
        respondingMentorship.status,
        mentorFeedbackNote
      );
      showToast(
        respondingMentorship.status === 'ACCEPTED'
          ? `✓ Mentorship request from ${respondingMentorship.request.studentName} accepted!`
          : `Mentorship request from ${respondingMentorship.request.studentName} declined.`
      );
      setRespondingMentorship(null);
      setMentorFeedbackNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update mentorship request.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Helper to resolve profile link for a connected member
  const handleNavigateToProfile = (req: ConnectionRequest) => {
    const isSender = req.senderId.toLowerCase() === currentUid;
    const targetAlumniId = isSender ? req.recipientAlumniId : req.senderAlumniId;
    const targetName = isSender ? req.recipientName : req.senderName;
    const targetId = isSender ? req.recipientId : req.senderId;

    // Check if target matches an alumnus in alumni collection
    const matchedAlum = alumni.find(
      (a) =>
        (targetAlumniId && a.id === targetAlumniId) ||
        (targetId && (a.userId === targetId || a.id === targetId)) ||
        a.name.toLowerCase() === targetName.toLowerCase()
    );

    if (matchedAlum) {
      onNavigate('alumniProfile', { id: matchedAlum.id, name: matchedAlum.name });
    } else {
      onNavigate('alumniProfile', { id: targetId, name: targetName });
    }
  };

  // If user is logged out, show attractive networking overview
  if (!currentUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="card p-8 md:p-12 text-center bg-gradient-to-b from-white to-slate-50 border border-slate-200/80 shadow-xl rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black navy tracking-tight">Professional Alumni Network & Mentorship</h1>
          <p className="mt-3 text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
            Build verified relationships across institutions. Connect with alumni in your target companies, request structured career mentorship, and track your campus professional relationships in real time.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8 text-left">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3">
                <Handshake className="w-4 h-4" />
              </div>
              <h3 className="font-bold navy text-sm">Real Connections</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verified mutual invitations with pending, accepted, and custom notes.
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-bold navy text-sm">Student Mentorship</h3>
              <p className="text-xs text-slate-500 mt-1">
                Request guidance on career paths, resume reviews, and technical interview preparation.
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold navy text-sm">Secure & Private</h3>
              <p className="text-xs text-slate-500 mt-1">
                Strict database authorization rules with verified ownership and contact privacy.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('account')}
              className="bg-navy hover:bg-slate-800 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-sm cursor-pointer"
            >
              Sign In to Access Your Network
            </button>
            <button
              onClick={() => onNavigate('alumni')}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl transition cursor-pointer"
            >
              Explore Alumni Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-slate-900 via-navy to-slate-950 text-white rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>Professional Networking & Mentorship</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              My Network & Requests
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Manage your verified institutional connections, incoming invitations, and active student-alumni mentorship programs.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Connections</span>
              <b className="text-xl text-white font-black block mt-0.5">{activeConnections.length}</b>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Incoming</span>
              <b className="text-xl text-amber-300 font-black block mt-0.5">{incomingRequests.length}</b>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Mentorships</span>
              <b className="text-xl text-emerald-300 font-black block mt-0.5">
                {isAlumni ? incomingMentorship.filter((m) => m.status === 'ACCEPTED').length : outgoingMentorship.filter((m) => m.status === 'ACCEPTED').length}
              </b>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-center">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Outgoing</span>
              <b className="text-xl text-slate-200 font-black block mt-0.5">{outgoingRequests.length}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'connections'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Connections</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {activeConnections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Connection Requests</span>
          {incomingRequests.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mentorship')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'mentorship'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span>Mentorship Hub</span>
          {pendingIncomingMentorship.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
              {pendingIncomingMentorship.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Request History</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MY CONNECTIONS */}
      {/* ==================================================================== */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          {/* Search toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search connections by name, company, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="account-input pl-9 text-xs w-full"
              />
            </div>

            <button
              onClick={() => onNavigate('alumni')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Explore More Alumni</span>
            </button>
          </div>

          {filteredConnections.length === 0 ? (
            <div className="card p-12 text-center bg-white border border-slate-200 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold navy text-base">
                {searchQuery ? 'No matching connections found' : 'No connections yet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No connected members matched "${searchQuery}". Try a different keyword.`
                  : 'Start expanding your academic and professional circle by connecting with alumni and university peers.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => onNavigate('alumni')}
                  className="mt-4 bg-navy hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Browse Alumni Directory
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConnections.map((req) => {
                const isSender = req.senderId.toLowerCase() === currentUid;
                const otherName = isSender ? req.recipientName : req.senderName;
                const otherPhoto = isSender ? req.recipientPhotoUrl : req.senderPhotoUrl;
                const otherUni = isSender ? req.recipientUniversity : req.senderUniversity;
                const otherDept = isSender ? req.recipientDepartment : req.senderDepartment;
                const otherJob = isSender ? req.recipientJobRole : req.senderJobRole;
                const otherCompany = isSender ? req.recipientCompany : req.senderCompany;
                const otherRole = isSender ? req.recipientRole : req.senderRole;

                const initials = otherName
                  ? otherName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0].toUpperCase())
                      .join('')
                  : 'AL';

                return (
                  <div
                    key={req.id}
                    className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden shadow-xs">
                          {otherPhoto ? (
                            <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold navy text-sm truncate">{otherName}</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Connected</span>
                            </span>
                          </div>

                          {(otherJob || otherCompany) && (
                            <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                              {otherJob} {otherJob && otherCompany ? 'at' : ''} <span className="navy font-semibold">{otherCompany}</span>
                            </p>
                          )}

                          {otherUni && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {otherDept ? `${otherDept} · ` : ''}{otherUni}
                            </p>
                          )}
                        </div>
                      </div>

                      {req.message && (
                        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 italic">
                          "{req.message}"
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleNavigateToProfile(req)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDisconnectTarget(req)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                        title="Remove connection"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CONNECTION REQUESTS (INCOMING & OUTGOING) */}
      {/* ==================================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-8">
          {/* Section: Incoming Requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black navy">Incoming Invitations</h2>
                {incomingRequests.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                    {incomingRequests.length} Pending
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">People requesting to connect with you</span>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold navy text-sm">All caught up!</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You have no pending incoming connection invitations right now.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden shadow-xs">
                        {req.senderPhotoUrl ? (
                          <img src={req.senderPhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>
                            {req.senderName
                              .split(' ')
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold navy text-sm">{req.senderName}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {req.senderRole || 'Student'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {req.senderJobRole ? `${req.senderJobRole} · ` : ''}
                          {req.senderUniversity}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Requested {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {req.message && (
                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5">Note:</span>
                        "{req.message}"
                      </div>
                    )}

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await respondConnectionRequest(req.id, 'ACCEPTED');
                            showToast(`✓ You are now connected with ${req.senderName}!`);
                          } catch (err: any) {
                            showToast(err.message);
                          }
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            await respondConnectionRequest(req.id, 'DECLINED');
                            showToast(`Invitation from ${req.senderName} declined.`);
                          } catch (err: any) {
                            showToast(err.message);
                          }
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition cursor-pointer"
                      >
                        Decline
                      </button>

                      <button
                        onClick={() => handleNavigateToProfile(req)}
                        className="px-3 py-2 border border-slate-200 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold cursor-pointer"
                        title="View sender profile"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Outgoing Requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black navy">Outgoing Invitations</h2>
              <span className="text-xs text-slate-400">Requests you sent that are awaiting response</span>
            </div>

            {outgoingRequests.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                <Send className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold navy text-sm">No pending outgoing invitations</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  When you invite alumni or students to connect, you can track their status here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold navy text-sm">{req.recipientName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {req.recipientJobRole ? `${req.recipientJobRole} · ` : ''}
                          {req.recipientUniversity}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Sent {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Pending</span>
                      </span>
                    </div>

                    {req.message && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 italic">
                        "{req.message}"
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleNavigateToProfile(req)}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View Profile →
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            await cancelConnectionRequest(req.id);
                            showToast('Invitation cancelled.');
                          } catch (err: any) {
                            showToast(err.message);
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MENTORSHIP HUB */}
      {/* ==================================================================== */}
      {activeTab === 'mentorship' && (
        <div className="space-y-6">
          {/* Alumni Mentorship Availability Switcher Card (If Alumni) */}
          {isAlumni && (
            <div className="card p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-black navy text-base">Alumni Mentorship Availability</h3>
                </div>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  Toggle whether current students and junior alumni can discover you for career path guidance, resume review, and industry advice.
                </p>
              </div>

              <button
                type="button"
                disabled={mentorshipToggling}
                onClick={handleToggleMentorshipAvailability}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isMentorshipOpen
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isMentorshipOpen ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                <span>{isMentorshipOpen ? 'Active: Open for Mentorship' : 'Inactive: Not Accepting Requests'}</span>
              </button>
            </div>
          )}

          {/* Mentorship Section: Incoming Requests (For Mentors) */}
          {isAlumni && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black navy">Student Mentorship Inquiries</h2>
                  {pendingIncomingMentorship.length > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      {pendingIncomingMentorship.length} Awaiting Review
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">Students seeking your professional counsel</span>
              </div>

              {incomingMentorship.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h3 className="font-bold navy text-sm">No mentorship inquiries yet</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When students reach out with mentorship requests, they will appear here with their goals and notes.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {incomingMentorship.map((req) => (
                    <div
                      key={req.id}
                      className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold navy text-sm">{req.studentName}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {req.topic}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {req.studentDepartment ? `${req.studentDepartment} · ` : ''}
                            {req.studentUniversity}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Requested {new Date(req.createdAt).toLocaleDateString()}
                            {req.preferredSchedule ? ` · Prefers: ${req.preferredSchedule}` : ''}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                            req.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : req.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : req.status === 'DECLINED'
                              ? 'bg-slate-100 text-slate-600 border-slate-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {/* Student's message */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Mentorship Purpose & Questions:
                        </span>
                        "{req.message}"
                      </div>

                      {/* Mentor's Feedback note if already responded */}
                      {req.feedback && (
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">
                            Your Response / Advice:
                          </span>
                          "{req.feedback}"
                        </div>
                      )}

                      {/* Actions */}
                      {req.status === 'PENDING' && (
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setRespondingMentorship({ request: req, status: 'ACCEPTED' })
                            }
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Request</span>
                          </button>

                          <button
                            onClick={() =>
                              setRespondingMentorship({ request: req, status: 'DECLINED' })
                            }
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {req.status === 'ACCEPTED' && (
                        <div className="pt-2 flex items-center justify-end">
                          <button
                            onClick={async () => {
                              try {
                                await completeMentorshipRequest(req.id);
                                showToast('Mentorship marked as completed.');
                              } catch (err: any) {
                                showToast(err.message);
                              }
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            Mark as Completed ✓
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mentorship Section: Outgoing Requests (For Students / Mentees) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black navy">My Mentorship Inquiries</h2>
              <span className="text-xs text-slate-400">Requests you submitted to alumni mentors</span>
            </div>

            {outgoingMentorship.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                <Handshake className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold navy text-sm">No mentorship requests sent yet</h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                  Browse the Alumni directory to find experienced graduates in your desired industry, and click <b>Request Mentorship</b> on their profile.
                </p>
                <button
                  onClick={() => onNavigate('alumni')}
                  className="mt-4 bg-navy hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Explore Mentors
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {outgoingMentorship.map((req) => (
                  <div
                    key={req.id}
                    className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold navy text-sm">{req.mentorName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {req.topic}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {req.mentorJobRole ? `${req.mentorJobRole} · ` : ''}
                          {req.mentorCompany || req.mentorUniversity}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Requested {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                          req.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : req.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : req.status === 'DECLINED'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Your Inquiry:
                      </span>
                      "{req.message}"
                    </div>

                    {/* Mentor's Feedback note */}
                    {req.feedback && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Mentor's Feedback & Advice:</span>
                        </span>
                        "{req.feedback}"
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          const matchedAlum = alumni.find(
                            (a) =>
                              (req.mentorAlumniId && a.id === req.mentorAlumniId) ||
                              a.name.toLowerCase() === req.mentorName.toLowerCase()
                          );
                          if (matchedAlum) {
                            onNavigate('alumniProfile', { id: matchedAlum.id, name: matchedAlum.name });
                          } else {
                            onNavigate('alumniProfile', { id: req.mentorId, name: req.mentorName });
                          }
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View Mentor Profile →
                      </button>

                      {req.status === 'PENDING' && (
                        <button
                          onClick={async () => {
                            try {
                              await cancelMentorshipRequest(req.id);
                              showToast('Mentorship request cancelled.');
                            } catch (err: any) {
                              showToast(err.message);
                            }
                          }}
                          className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: REQUEST HISTORY */}
      {/* ==================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black navy">Resolved Request History</h2>
            <span className="text-xs text-slate-400">Historical log of accepted and resolved networking interactions</span>
          </div>

          {connectionHistory.length === 0 && myMentorshipRequests.filter((m) => m.status !== 'PENDING').length === 0 ? (
            <div className="card p-12 text-center bg-white border border-slate-200 rounded-2xl">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="font-bold navy text-sm">No past request history</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Past accepted, declined, or completed connection and mentorship events will appear here.
              </p>
            </div>
          ) : (
            <div className="card bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
              {connectionHistory.map((req) => {
                const isSender = req.senderId.toLowerCase() === currentUid;
                const otherName = isSender ? req.recipientName : req.senderName;
                return (
                  <div key={req.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="navy text-xs">{otherName}</b>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              req.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : req.status === 'DECLINED'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            Connection {req.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isSender ? 'Outgoing connection invitation' : 'Incoming connection invitation'} ·{' '}
                          {new Date(req.updatedAt || req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigateToProfile(req)}
                      className="text-blue-600 hover:underline font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Profile →
                    </button>
                  </div>
                );
              })}

              {myMentorshipRequests
                .filter((m) => m.status !== 'PENDING')
                .map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between gap-3 text-xs bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Handshake className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="navy text-xs">
                            {req.studentId.toLowerCase() === currentUid ? req.mentorName : req.studentName}
                          </b>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Mentorship: {req.topic} ({req.status})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {req.studentId.toLowerCase() === currentUid ? 'Mentorship received from mentor' : 'Student mentorship requested'} ·{' '}
                          {new Date(req.updatedAt || req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <span className="text-slate-400 text-[11px]">Completed / Resolved</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MENTORSHIP RESPONSE MODAL */}
      {/* ==================================================================== */}
      {respondingMentorship && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black navy">
                  {respondingMentorship.status === 'ACCEPTED' ? 'Accept Mentorship Request' : 'Decline Mentorship Request'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Student: <b>{respondingMentorship.request.studentName}</b> ({respondingMentorship.request.topic})
                </p>
              </div>
              <button
                onClick={() => setRespondingMentorship(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {respondingMentorship.status === 'ACCEPTED'
                  ? 'Welcome note, meeting link, or instructions (Optional)'
                  : 'Courtesy message or advice for the student (Optional)'}
              </label>
              <textarea
                rows={4}
                value={mentorFeedbackNote}
                onChange={(e) => setMentorFeedbackNote(e.target.value.slice(0, 1000))}
                className="account-input w-full text-xs"
                placeholder={
                  respondingMentorship.status === 'ACCEPTED'
                    ? "Glad to support! Let's arrange a 30-min call or send over your resume draft..."
                    : "Thanks for reaching out! Currently at capacity for mentorship, but keep up your great work in systems..."
                }
              />
              <span className="text-[10px] text-slate-400 block text-right mt-1">
                {mentorFeedbackNote.length}/1000
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRespondingMentorship(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingResponse}
                onClick={handleConfirmMentorshipResponse}
                className={`text-xs font-bold px-5 py-2.5 rounded-xl text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  respondingMentorship.status === 'ACCEPTED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {isSubmittingResponse ? 'Submitting...' : `Confirm ${respondingMentorship.status}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DISCONNECT CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-sm w-full p-6 bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black navy">Remove Connection?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to disconnect with{' '}
                <b>
                  {disconnectTarget.senderId.toLowerCase() === currentUid
                    ? disconnectTarget.recipientName
                    : disconnectTarget.senderName}
                </b>
                ? You will need to send a new invitation if you wish to reconnect.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisconnectTarget(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await disconnectConnection(disconnectTarget.id);
                    showToast('Connection removed.');
                    setDisconnectTarget(null);
                  } catch (err: any) {
                    showToast(err.message);
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
