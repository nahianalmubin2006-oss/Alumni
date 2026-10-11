import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Role, UserStatus, ChangeRequest, UserProfile } from '../types';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG } from '../data/initialData';
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  GraduationCap,
  Briefcase,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
  Mail,
  FileSpreadsheet,
  FileCode,
  MapPin,
  Linkedin,
  IdCard,
  UserPlus,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Layers,
  ArrowUpDown,
  Trash2,
  Activity,
  History,
  Bot,
  Pin,
} from 'lucide-react';
import { AdminActivityLog } from '../components/AdminActivityLog';

interface SuperAdminViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onNavigate }) => {
  const { isSuperAdmin, userProfile, setSimulatedRole, loginWithEmail, currentUser } = useAuth();
  const {
    allUsers,
    changeRequests,
    verificationRequests,
    news,
    auditLogs,
    adminAssignments,
    stats,
    approveUser,
    rejectUser,
    unapproveUser,
    suspendUser,
    changeUserRole,
    verifyAlumni,
    approveVerificationRequest,
    rejectVerificationRequest,
    approveChangeRequest,
    rejectChangeRequest,
    updateNewsArticle,
    deleteNewsArticle,
    makeNewsPermanent,
    removeNewsPermanent,
    triggerAINewsBotScan,
    cleanupExpiredNews,
    deleteUser,
    deleteAlumni,
    logAudit,
    assignAdmin,
    removeAdminAssignment,
    saveUniversity,
    saveDepartment,
  } = useData();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'approvals'
    | 'users'
    | 'verifications'
    | 'news'
    | 'admins'
    | 'institutions'
    | 'audit'
  >('overview');

  // Approvals sub-tab
  const [approvalsSubTab, setApprovalsSubTab] = useState<'users' | 'changes' | 'verifications'>('users');

  // Filter States for Directory
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userUniFilter, setUserUniFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState<'newest' | 'oldest' | 'name' | 'uni'>('newest');

  // Active Selected User for Full Dossier Modal ("All Other Info")
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserProfile | null>(null);

  // Reviewer Note for change requests
  const [reviewerNote, setReviewerNote] = useState('');

  // Action status / Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Assign admin modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN'>('UNIVERSITY_ADMIN');
  const [assignUni, setAssignUni] = useState(ALL_DIRECTORY_UNIVERSITIES[0].name);
  const [assignDept, setAssignDept] = useState(RAW_DEPARTMENT_CATALOG[0].name);

  // Institution form modal
  const [uniModalOpen, setUniModalOpen] = useState(false);
  const [newUniName, setNewUniName] = useState('');
  const [newUniType, setNewUniType] = useState<'Public' | 'Private' | 'International'>('Public');
  const [newUniLocation, setNewUniLocation] = useState('Dhaka, Bangladesh');

  // Admin login states for access gate
  const [adminEmailInput, setAdminEmailInput] = useState('nahianalmubin2006@gmail.com');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // User deletion state & accountability tracking
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteUser(userToDelete.uid, deleteReason || 'Manual deletion by Super Admin');
      showToast(`User account ${userToDelete.name} permanently deleted`, 'success');
      setUserToDelete(null);
      setDeleteReason('');
      if (selectedUserForModal?.uid === userToDelete.uid) {
        setSelectedUserForModal(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete user account', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogCustomEvent = async (action: string, targetType: string, targetId: string, details: string) => {
    await logAudit(action, targetType, targetId, details, { severity: 'INFO' });
    showToast('Administrative audit event recorded in Firestore', 'success');
  };

  const handleAdminDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');
    try {
      await loginWithEmail(adminEmailInput.trim(), adminPassInput);
    } catch (err: any) {
      setAdminLoginError(err.message || 'Invalid administrator credentials.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Actions with visual feedback
  const handleApprove = async (userId: string, targetRole?: Role) => {
    setActionLoadingId(userId);
    try {
      await approveUser(userId, targetRole);
      showToast('Member approved successfully! Profile updated in directory.', 'success');
      if (selectedUserForModal && selectedUserForModal.uid === userId) {
        setSelectedUserForModal((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
      }
    } catch (err: any) {
      showToast('Approval could not be completed: ' + err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnapprove = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await unapproveUser(userId, 'Placed back in review by Super Admin');
      showToast('Member unapproved and placed back in review queue.', 'info');
      if (selectedUserForModal && selectedUserForModal.uid === userId) {
        setSelectedUserForModal((prev) => (prev ? { ...prev, status: 'PENDING' } : null));
      }
    } catch (err: any) {
      showToast('Unapprove failed: ' + err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (userId: string, reason?: string) => {
    setActionLoadingId(userId);
    try {
      await rejectUser(userId, reason || 'Did not meet institutional verification criteria');
      showToast('Member application declined/rejected.', 'info');
      if (selectedUserForModal && selectedUserForModal.uid === userId) {
        setSelectedUserForModal((prev) => (prev ? { ...prev, status: 'REJECTED' } : null));
      }
    } catch (err: any) {
      showToast('Reject failed: ' + err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBatchApprovePending = async () => {
    const pendingList = allUsers.filter((u) => u.status === 'PENDING');
    if (pendingList.length === 0) {
      showToast('No pending members in queue to approve.', 'info');
      return;
    }

    setBatchLoading(true);
    let count = 0;
    for (const u of pendingList) {
      try {
        await approveUser(u.uid);
        count++;
      } catch (e) {}
    }
    setBatchLoading(false);
    showToast(`Successfully approved ${count} pending members!`, 'success');
  };

  // Modern Export Tools
  const handleExportCSV = () => {
    if (allUsers.length === 0) {
      showToast('No users available to export.', 'info');
      return;
    }
    const headers = [
      'Name',
      'Email',
      'Role',
      'Status',
      'ProfileType',
      'University',
      'Department',
      'StudentID',
      'EducationLevel',
      'GraduationYear',
      'Company',
      'JobRole',
      'City',
      'Country',
      'LinkedIn',
      'JoinedAt',
    ];
    const rows = filteredUsers.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${u.role || ''}"`,
      `"${u.status || ''}"`,
      `"${u.profileType || ''}"`,
      `"${(u.university || '').replace(/"/g, '""')}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      `"${(u.studentId || '').replace(/"/g, '""')}"`,
      `"${(u.educationLevel || '').replace(/"/g, '""')}"`,
      `"${(u.graduationYear || u.studentYear || '').replace(/"/g, '""')}"`,
      `"${(u.company || '').replace(/"/g, '""')}"`,
      `"${(u.jobRole || '').replace(/"/g, '""')}"`,
      `"${(u.city || '').replace(/"/g, '""')}"`,
      `"${(u.country || '').replace(/"/g, '""')}"`,
      `"${(u.linkedin || '').replace(/"/g, '""')}"`,
      `"${u.createdAt || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `alumnisphere_members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported members CSV successfully!', 'success');
  };

  const handleExportJSON = () => {
    if (allUsers.length === 0) {
      showToast('No users available to export.', 'info');
      return;
    }
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredUsers, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `alumnisphere_members_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported members JSON successfully!', 'success');
  };

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    return allUsers
      .filter((u) => {
        const matchesStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
        const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter || (userRoleFilter === 'STUDENT' && u.profileType === 'Student') || (userRoleFilter === 'ALUMNI' && u.profileType === 'Alumni');
        const matchesUni = userUniFilter === 'ALL' || u.university === userUniFilter;
        const searchTarget = [
          u.name,
          u.email,
          u.university,
          u.department,
          u.studentId,
          u.company,
          u.jobRole,
          u.role,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = !userSearch || searchTarget.includes(userSearch.toLowerCase());
        return matchesStatus && matchesRole && matchesUni && matchesSearch;
      })
      .sort((a, b) => {
        if (userSort === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (userSort === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (userSort === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (userSort === 'uni') {
          return (a.university || '').localeCompare(b.university || '');
        }
        return 0;
      });
  }, [allUsers, userStatusFilter, userRoleFilter, userUniFilter, userSearch, userSort]);

  // Newly Added Members (most recent 8 members)
  const newlyAddedMembers = useMemo(() => {
    return [...allUsers]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
  }, [allUsers]);

  const pendingMembers = useMemo(() => {
    return allUsers.filter((u) => u.status === 'PENDING' && u.profileType !== 'Student' && u.profileType !== 'Alumni');
  }, [allUsers]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = allUsers.find((u) => u.uid === selectedUserId);
    if (!user) return;

    await assignAdmin({
      userId: user.uid,
      userEmail: user.email,
      userName: user.name,
      role: assignRole,
      university: assignUni,
      department: assignRole === 'DEPARTMENT_ADMIN' ? assignDept : undefined,
      assignedBy: userProfile?.name || 'Super Admin',
    });

    setAssignModalOpen(false);
    showToast(`${user.name} assigned as ${assignRole.replace('_', ' ')}!`, 'success');
  };

  const handleAddUniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniName.trim()) return;

    await saveUniversity({
      name: newUniName.trim(),
      type: newUniType,
      location: newUniLocation.trim(),
      verified: true,
      alumniCount: 0,
      departmentCount: 1,
      employmentRate: 80,
    });

    setUniModalOpen(false);
    setNewUniName('');
    showToast(`University ${newUniName} added to directory!`, 'success');
  };

  // If user is not Super Admin, show security access gate
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="card p-8 sm:p-10 shadow-2xl border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-3xl mx-auto mb-4 font-black shadow-sm">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Security Clearance Required
            </span>
            <h2 className="text-2xl sm:text-3xl font-black navy mt-1">Super Admin Console</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              This environment provides root access to member approvals, institutional rosters, and
              immutable audit controls.
            </p>
          </div>

          {/* Quick Access for Owner */}
          <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <b className="navy text-sm block">System Owner Quick Access</b>
                <span className="text-xs text-slate-500 block mt-0.5">
                  nahianalmubin2006@gmail.com / nahianalmubin212528@gmail.com
                </span>
              </div>
              <button
                onClick={() => setSimulatedRole('SUPER_ADMIN')}
                className="bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow"
              >
                Enter as Super Admin →
              </button>
            </div>
          </div>

          {/* Regular Admin Credentials Form */}
          <div className="mt-6 pt-6 border-t border-soft">
            <h3 className="font-bold navy text-sm">Sign in with Administrator Credentials</h3>
            {adminLoginError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs mt-2 border border-rose-200">
                {adminLoginError}
              </div>
            )}
            <form onSubmit={handleAdminDirectLogin} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500">Admin Email</label>
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  className="account-input mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Password</label>
                <input
                  type="password"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  className="account-input mt-1"
                  placeholder="Password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full bg-navy text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {adminLoginLoading ? 'Authenticating...' : 'Sign In as Administrator'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-soft text-center">
            <button
              onClick={() => onNavigate('home')}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              ← Return to Explore
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 transition-all transform animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-navy text-white border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Premium Executive Top Bar */}
      <div className="bg-gradient-to-r from-[#0b1f3a] via-[#102a4e] to-[#0b1f3a] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-blue-200 bg-blue-900/60 px-2.5 py-1 rounded-full border border-blue-400/30">
                Root Executive Control Center
              </span>
              <span className="text-[11px] text-slate-300 hidden sm:inline">
                Live Cloud Firestore Sync Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black mt-3 tracking-tight">
              Super Admin Console
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Real-time member onboarding, verifiable degree approvals, institutional governance,
              and live audit intelligence across Bangladesh and the global diaspora.
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setActiveTab('approvals');
                setApprovalsSubTab('users');
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Review Approvals ({pendingMembers.length})</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Download Members as CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Download Members as JSON"
            >
              <FileCode className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => setUniModalOpen(true)}
              className="bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>+ Add University</span>
            </button>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>+ Assign Admin</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div
            onClick={() => {
              setActiveTab('users');
              setUserStatusFilter('ALL');
            }}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition border border-white/10"
          >
            <div className="text-[11px] text-slate-300">Total Members</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{allUsers.length}</div>
            <div className="text-[10px] text-emerald-300 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>All registered</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('approvals');
              setApprovalsSubTab('users');
            }}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition border border-amber-400/30"
          >
            <div className="text-[11px] text-amber-200">Awaiting Approval</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
              {pendingMembers.length}
            </div>
            <div className="text-[10px] text-amber-200/80 mt-0.5">Needs admin action</div>
          </div>

          <div
            onClick={() => {
              setActiveTab('users');
              setUserStatusFilter('APPROVED');
            }}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition border border-white/10"
          >
            <div className="text-[11px] text-slate-300">Approved Members</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
              {allUsers.filter((u) => u.status === 'APPROVED').length}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">Verified in directory</div>
          </div>

          <div
            onClick={() => {
              setActiveTab('approvals');
              setApprovalsSubTab('changes');
            }}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition border border-white/10"
          >
            <div className="text-[11px] text-slate-300">Change Requests</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {changeRequests.filter((c) => c.status === 'PENDING').length}
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">Pending review</div>
          </div>

          <div
            onClick={() => {
              setActiveTab('verifications');
            }}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition border border-white/10"
          >
            <div className="text-[11px] text-slate-300">Badge Requests</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {verificationRequests.filter((v) => v.status === 'PENDING').length}
            </div>
            <div className="text-[10px] text-purple-300 mt-0.5">Graduation proofs</div>
          </div>

          <div
            onClick={() => setActiveTab('audit')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition border border-white/10"
          >
            <div className="text-[11px] text-slate-300">Audit Logs</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{auditLogs.length}</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Immutable trail</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 border-b border-soft">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dashboard & New Members</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'approvals'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Approvals Queue</span>
          {pendingMembers.length > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'approvals'
                  ? 'bg-white text-emerald-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {pendingMembers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>All Members Directory ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'verifications'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <IdCard className="w-3.5 h-3.5" />
          <span>Alumni Badges ({verificationRequests.filter((v) => v.status === 'PENDING').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'news'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <span>News & Notices ({news.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'admins'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <span>Admins ({adminAssignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-soft'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Activity Log & Audit ({auditLogs.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. OVERVIEW & NEWLY ADDED MEMBERS TAB */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="mt-8 space-y-8">
          {/* Section: Newly Added Members */}
          <div className="card p-6 md:p-8 shadow-xl border-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
              <div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-black navy">Newly Added Members</h2>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                    Chronological Feed
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Inspect every detail entered by recent registrants, verify institutional accuracy,
                  and approve or reject in real time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setUserSort('newest');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold transition flex items-center gap-1"
                >
                  <span>View All Members ({allUsers.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {newlyAddedMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No members registered in the database yet.
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {newlyAddedMembers.map((member) => {
                  const isActionLoading = actionLoadingId === member.uid;
                  return (
                    <div
                      key={member.uid}
                      className="p-5 rounded-2xl border border-soft bg-white hover:border-blue-200 transition shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      {/* Left: User identity & institution info */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-lg shadow-md shrink-0">
                          {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="navy text-base font-bold">{member.name || 'Anonymous User'}</b>
                            <span className="text-[11px] text-slate-400 font-medium">({member.email})</span>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                member.profileType === 'Alumni'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {member.profileType || 'Student'}
                            </span>

                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                member.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : member.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : member.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {member.status === 'APPROVED'
                                ? '✓ Approved'
                                : member.status === 'PENDING'
                                ? '⏳ Pending Approval'
                                : member.status === 'REJECTED'
                                ? '✕ Rejected'
                                : member.status}
                            </span>
                          </div>

                          {/* Institutional Info - Highlighted */}
                          <div className="mt-2 text-xs text-slate-700 flex flex-wrap items-center gap-y-1 gap-x-3">
                            <span className="font-bold text-blue-900 bg-blue-50/70 px-2 py-0.5 rounded-lg border border-blue-100">
                              🏛 {member.university || 'No university specified'}
                            </span>
                            <span className="font-semibold text-slate-600">
                              📂 {member.department || 'No department specified'}
                            </span>
                            {member.studentId && (
                              <span className="text-slate-500">ID: {member.studentId}</span>
                            )}
                            {member.graduationYear && (
                              <span className="text-slate-500">Grad: {member.graduationYear}</span>
                            )}
                            {member.jobRole && (
                              <span className="text-slate-600 font-medium">
                                💼 {member.jobRole} {member.company ? `@ ${member.company}` : ''}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Registered on{' '}
                              {member.createdAt
                                ? new Date(member.createdAt).toLocaleString()
                                : 'Recent session'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions with prominent Green and Red buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-soft">
                        <button
                          onClick={() => setSelectedUserForModal(member)}
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-soft bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Inspect Info</span>
                        </button>

                        {/* GREEN APPROVAL BUTTON */}
                        {member.status !== 'APPROVED' ? (
                          <button
                            onClick={() => handleApprove(member.uid)}
                            disabled={isActionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Approve member and grant full directory access"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>{isActionLoading ? 'Processing...' : 'Approve'}</span>
                          </button>
                        ) : (
                          // RED UNAPPROVAL BUTTON FOR APPROVED USERS
                          <button
                            onClick={() => handleUnapprove(member.uid)}
                            disabled={isActionLoading}
                            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Unapprove and revert member back to pending"
                          >
                            <UserX className="w-4 h-4 text-rose-200" />
                            <span>{isActionLoading ? 'Processing...' : 'Unapprove'}</span>
                          </button>
                        )}

                        {/* RED REJECT BUTTON FOR PENDING USERS */}
                        {member.status === 'PENDING' && (
                          <button
                            onClick={() => handleReject(member.uid)}
                            disabled={isActionLoading}
                            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Decline / Reject this registration"
                          >
                            <XCircle className="w-4 h-4 text-rose-200" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Degree Verification Notices Banner for Super Admin */}
          {verificationRequests.filter((v) => v.status === 'PENDING').length > 0 && (
            <div className="card p-5 bg-gradient-to-r from-purple-900/90 to-indigo-950 text-white shadow-xl border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <IdCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white tracking-wide uppercase">
                      Degree Verification Notice
                    </h3>
                    <span className="bg-purple-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {verificationRequests.filter((v) => v.status === 'PENDING').length} Pending
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90 mt-0.5">
                    Alumni have submitted academic transcripts and graduation credentials for degree verification badge approval.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('verifications')}
                className="bg-white hover:bg-purple-50 text-purple-950 font-black text-xs px-4 py-2.5 rounded-xl transition shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <span>Review Degree Badges</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* Quick Pending Approvals and Change Requests Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6 shadow-xl border-soft">
              <div className="flex items-center justify-between pb-3 border-b border-soft">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h3 className="font-bold navy text-base">
                    Pending Member Approvals ({pendingMembers.length})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('approvals');
                    setApprovalsSubTab('users');
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Go to Queue →
                </button>
              </div>

              <div className="mt-4 divide-y divide-soft">
                {pendingMembers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <p className="font-semibold text-slate-600">✓ Students and alumni join directly without review.</p>
                    <p className="text-[11px] text-slate-400 mt-1">All {allUsers.length} members are active in the campus directory.</p>
                  </div>
                ) : (
                  pendingMembers.slice(0, 5).map((u) => (
                    <div key={u.uid} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <b className="navy text-sm block">{u.name}</b>
                        <p className="text-xs text-slate-500">
                          {u.profileType} · {u.university || 'No university'} ({u.department || 'No dept'})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(u.uid)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(u.uid)}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-6 shadow-xl border-soft">
              <div className="flex items-center justify-between pb-3 border-b border-soft">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h3 className="font-bold navy text-base">
                    Pending Institutional Changes ({changeRequests.filter((c) => c.status === 'PENDING').length})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('approvals');
                    setApprovalsSubTab('changes');
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Review All →
                </button>
              </div>

              <div className="mt-4 divide-y divide-soft">
                {changeRequests.filter((c) => c.status === 'PENDING').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No pending institutional changes in queue.
                  </div>
                ) : (
                  changeRequests
                    .filter((c) => c.status === 'PENDING')
                    .slice(0, 5)
                    .map((c) => (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <b className="navy text-sm block">{c.targetTitle}</b>
                          <span className="text-xs text-slate-500">
                            By {c.requesterName} · {c.targetType}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveChangeRequest(c.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectChangeRequest(c.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Section: Live Activity Log Snapshot */}
          <div className="card p-6 md:p-8 shadow-xl border-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black navy">Recent Administrative Actions</h3>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Live Audit Stream
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological trail tracking member approvals, status revocations, role escalations, and critical data deletions.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('audit')}
                className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <span>View Full Activity Log ({auditLogs.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-soft">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No administrative actions logged yet.
                </div>
              ) : (
                auditLogs.slice(0, 4).map((log) => {
                  const isDel = log.action.includes('DELETED') || log.action.includes('PURGED');
                  const isApprove = log.action.includes('APPROVED') || log.action.includes('VERIFIED');
                  const isWarn = log.action.includes('REJECTED') || log.action.includes('UNAPPROVED') || log.action.includes('SUSPENDED');
                  return (
                    <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-[10px] ${
                            isDel ? 'bg-rose-600' : isWarn ? 'bg-amber-600' : isApprove ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                        >
                          {isDel ? 'DEL' : isWarn ? 'REV' : isApprove ? 'APP' : 'LOG'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <b className="navy text-xs">{log.action}</b>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {log.targetType}
                            </span>
                          </div>
                          <span className="text-slate-600 block mt-0.5">{log.details}</span>
                          <span className="text-slate-400 text-[10px] block mt-0.5">
                            By {log.actorName || 'Admin'} · {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('audit')}
                        className="text-[11px] text-blue-600 hover:underline font-bold shrink-0 cursor-pointer"
                      >
                        Details →
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DEDICATED APPROVALS SECTION (WITH GREEN & RED BUTTONS) */}
      {/* ========================================================= */}
      {activeTab === 'approvals' && (
        <div className="mt-8 space-y-6">
          <div className="card p-6 md:p-8 shadow-xl border-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-soft">
              <div>
                <h2 className="text-2xl font-black navy">Central Approval Verification Hub</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enforces zero-trust ABAC workflows. Green buttons approve records; red buttons reject or revoke approval.
                </p>
              </div>

              {pendingMembers.length > 0 && (
                <button
                  onClick={handleBatchApprovePending}
                  disabled={batchLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{batchLoading ? 'Approving All...' : `Approve All Pending (${pendingMembers.length})`}</span>
                </button>
              )}
            </div>

            {/* Sub Tabs */}
            <div className="mt-4 flex gap-2 border-b border-soft pb-3">
              <button
                onClick={() => setApprovalsSubTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  approvalsSubTab === 'users'
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Member Registrations</span>
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {pendingMembers.length}
                </span>
              </button>

              <button
                onClick={() => setApprovalsSubTab('changes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  approvalsSubTab === 'changes'
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Institutional Change Requests</span>
                <span className="bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {changeRequests.filter((c) => c.status === 'PENDING').length}
                </span>
              </button>

              <button
                onClick={() => setApprovalsSubTab('verifications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  approvalsSubTab === 'verifications'
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Alumni Degree Verifications</span>
                <span className="bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {verificationRequests.filter((v) => v.status === 'PENDING').length}
                </span>
              </button>
            </div>

            {/* Sub Tab Content: User Registrations */}
            {approvalsSubTab === 'users' && (
              <div className="mt-6 space-y-4">
                {pendingMembers.length === 0 ? (
                  <div className="py-16 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <h3 className="text-base font-bold navy">All Pending Registrations Cleared</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      No accounts are currently waiting for institutional approval.
                    </p>
                  </div>
                ) : (
                  pendingMembers.map((member) => (
                    <div
                      key={member.uid}
                      className="p-6 rounded-2xl border-2 border-amber-200 bg-amber-50/20 shadow-sm flex flex-col md:flex-row justify-between gap-6"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                            Awaiting Super Admin Approval
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Joined {new Date(member.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl font-black navy">{member.name}</h3>
                          <div className="text-xs text-slate-500 mt-0.5">{member.email}</div>
                        </div>

                        {/* Full User Info Dossier Card */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-amber-100 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[10px] block">
                              University
                            </span>
                            <span className="navy font-black text-sm block mt-0.5">
                              {member.university || 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[10px] block">
                              Department
                            </span>
                            <span className="navy font-semibold text-sm block mt-0.5">
                              {member.department || 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[10px] block">
                              Profile Type
                            </span>
                            <span className="text-blue-700 font-bold block mt-0.5">
                              {member.profileType}
                            </span>
                          </div>
                          {member.studentId && (
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                                Student ID / Roll
                              </span>
                              <span className="navy font-mono font-bold block mt-0.5">
                                {member.studentId}
                              </span>
                            </div>
                          )}
                          {member.graduationYear && (
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                                Graduation Year
                              </span>
                              <span className="navy font-bold block mt-0.5">
                                {member.graduationYear}
                              </span>
                            </div>
                          )}
                          {member.studentYear && (
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                                Current Year / Sem
                              </span>
                              <span className="navy font-bold block mt-0.5">
                                {member.studentYear}
                              </span>
                            </div>
                          )}
                          {member.jobRole && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                                Current Career
                              </span>
                              <span className="navy font-semibold block mt-0.5">
                                {member.jobRole} {member.company ? `at ${member.company}` : ''}
                              </span>
                            </div>
                          )}
                          {member.bio && (
                            <div className="sm:col-span-3">
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                                Personal Bio
                              </span>
                              <p className="text-slate-600 mt-0.5 italic">{member.bio}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prominent Green and Red Action Buttons */}
                      <div className="flex flex-col justify-center gap-3 shrink-0 sm:w-48">
                        <button
                          onClick={() => handleApprove(member.uid)}
                          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>✓ Approve</span>
                        </button>

                        <button
                          onClick={() => handleReject(member.uid)}
                          className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <XCircle className="w-5 h-5 text-rose-200" />
                          <span>✕ Reject</span>
                        </button>

                        <button
                          onClick={() => setSelectedUserForModal(member)}
                          className="text-xs text-slate-500 hover:text-slate-800 underline text-center cursor-pointer"
                        >
                          Inspect Complete Dossier
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sub Tab Content: Institutional Changes */}
            {approvalsSubTab === 'changes' && (
              <div className="mt-6 space-y-4">
                {changeRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No change requests in queue.
                  </div>
                ) : (
                  changeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl border border-soft bg-white shadow-sm flex flex-col md:flex-row justify-between gap-6"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {req.targetType}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-bold text-lg navy">{req.targetTitle}</h3>
                        <p className="text-xs text-slate-500">
                          Requested by: <b>{req.requesterName}</b> ({req.requesterEmail}) · Role:{' '}
                          {req.requesterRole}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-soft text-xs">
                          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                            <b className="text-rose-700 block mb-1">Old Stored Value:</b>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600">
                              {req.oldValue}
                            </pre>
                          </div>
                          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <b className="text-emerald-700 block mb-1">Proposed New Value:</b>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-600">
                              {req.newValue}
                            </pre>
                          </div>
                        </div>

                        {req.reviewerComment && (
                          <p className="text-xs text-slate-500 italic mt-2">
                            Reviewer comment: "{req.reviewerComment}"
                          </p>
                        )}
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex flex-col justify-center gap-2 shrink-0 sm:w-44">
                          <input
                            value={reviewerNote}
                            onChange={(e) => setReviewerNote(e.target.value)}
                            placeholder="Reviewer note..."
                            className="border border-soft rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none"
                          />
                          <button
                            onClick={() => approveChangeRequest(req.id, reviewerNote)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve Changes</span>
                          </button>
                          <button
                            onClick={() => rejectChangeRequest(req.id, reviewerNote)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sub Tab Content: Verifications */}
            {approvalsSubTab === 'verifications' && (
              <div className="mt-6 space-y-4">
                {verificationRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No verification badge requests pending.
                  </div>
                ) : (
                  verificationRequests.map((v) => (
                    <div
                      key={v.id}
                      className="p-5 rounded-2xl border border-soft bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="navy text-base">{v.userName}</b>
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                            {v.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {v.university} · {v.department} ({v.batch} Batch) · {v.userEmail}
                        </p>
                        {v.proofUrl && (
                          <a
                            href={v.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 font-semibold underline mt-2 inline-block"
                          >
                            Inspect Verification Document ↗
                          </a>
                        )}
                        {v.notes && (
                          <p className="text-xs text-slate-400 mt-1 italic">Notes: {v.notes}</p>
                        )}
                      </div>

                      {v.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveVerificationRequest(v.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Grant Verified Badge</span>
                          </button>
                          <button
                            onClick={() => rejectVerificationRequest(v.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ALL MEMBERS DIRECTORY & MANAGEMENT TAB */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="mt-8 space-y-6">
          {/* Advanced Multi-Tool Filter Toolbar */}
          <div className="card p-5 shadow-lg border-soft space-y-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Search box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, university, department, ID, company..."
                  className="w-full border border-soft rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-soft px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Export filtered members to CSV file"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-soft px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Export filtered members to JSON file"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Quick Category Filter Switcher */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-soft">
              <button
                type="button"
                onClick={() => setUserRoleFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                All Members ({allUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('STUDENT')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === 'STUDENT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                Students ({allUsers.filter((u) => u.profileType === 'Student' || u.role === 'STUDENT').length})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('ALUMNI')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === 'ALUMNI'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                Alumni ({allUsers.filter((u) => u.profileType === 'Alumni' || u.role === 'ALUMNI').length})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('UNIVERSITY_ADMIN')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === 'UNIVERSITY_ADMIN'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                University Admins ({allUsers.filter((u) => u.role === 'UNIVERSITY_ADMIN').length})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('DEPARTMENT_ADMIN')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === 'DEPARTMENT_ADMIN'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                Department Admins ({allUsers.filter((u) => u.role === 'DEPARTMENT_ADMIN').length})
              </button>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-soft text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Status
                </label>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="w-full border border-soft rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none"
                >
                  <option value="ALL">All Statuses ({allUsers.length})</option>
                  <option value="PENDING">
                    Pending Approval ({allUsers.filter((u) => u.status === 'PENDING').length})
                  </option>
                  <option value="APPROVED">
                    Approved ({allUsers.filter((u) => u.status === 'APPROVED').length})
                  </option>
                  <option value="REJECTED">
                    Rejected ({allUsers.filter((u) => u.status === 'REJECTED').length})
                  </option>
                  <option value="SUSPENDED">
                    Suspended ({allUsers.filter((u) => u.status === 'SUSPENDED').length})
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Role
                </label>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full border border-soft rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="ALUMNI">Alumni</option>
                  <option value="DEPARTMENT_ADMIN">Department Admin</option>
                  <option value="UNIVERSITY_ADMIN">University Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  University
                </label>
                <select
                  value={userUniFilter}
                  onChange={(e) => setUserUniFilter(e.target.value)}
                  className="w-full border border-soft rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none"
                >
                  <option value="ALL">All Universities</option>
                  {ALL_DIRECTORY_UNIVERSITIES.slice(0, 30).map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Sort Order
                </label>
                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value as any)}
                  className="w-full border border-soft rounded-xl px-3 py-2 bg-white cursor-pointer font-semibold outline-none"
                >
                  <option value="newest">Newest Registered First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="uni">University A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="card overflow-x-auto shadow-xl border-soft">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-soft">
                <tr>
                  <th className="p-4">Member Info</th>
                  <th className="p-4">Institutional Affiliation</th>
                  <th className="p-4">Role Assignment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No members matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isActionLoading = actionLoadingId === u.uid;
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition">
                        {/* Member Identity */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div>
                              <b className="navy text-sm block">{u.name}</b>
                              <span className="text-[11px] text-slate-400 block">{u.email}</span>
                              <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                                {u.profileType || 'Student'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Institution Info */}
                        <td className="p-4">
                          <span className="block font-bold text-slate-800">
                            {u.university || (
                              <span className="text-amber-600 italic">Not set</span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{u.department}</span>
                          {u.studentId && (
                            <span className="text-[10px] text-slate-400 block">ID: {u.studentId}</span>
                          )}
                        </td>

                        {/* Role Select Dropdown */}
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => changeUserRole(u.uid, e.target.value as Role)}
                            className="border border-soft rounded-lg px-2.5 py-1 text-xs bg-white font-bold cursor-pointer text-slate-700 outline-none hover:border-blue-400"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="UNIVERSITY_ADMIN">UNIVERSITY_ADMIN</option>
                            <option value="DEPARTMENT_ADMIN">DEPARTMENT_ADMIN</option>
                            <option value="STUDENT">STUDENT</option>
                            <option value="ALUMNI">ALUMNI</option>
                          </select>
                        </td>

                        {/* Status Badge */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-block ${
                              u.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : u.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : u.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {u.status === 'APPROVED'
                              ? '✓ Approved'
                              : u.status === 'PENDING'
                              ? '⏳ Pending'
                              : u.status === 'REJECTED'
                              ? '✕ Rejected'
                              : u.status}
                          </span>
                        </td>

                        {/* Actions (Green / Red Buttons) */}
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedUserForModal(u)}
                            className="border border-soft bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 transition cursor-pointer"
                            title="Inspect all data entered by member"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            <span>Info</span>
                          </button>

                          {/* Green Approve Button */}
                          {u.status !== 'APPROVED' ? (
                            <button
                              onClick={() => handleApprove(u.uid)}
                              disabled={isActionLoading}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                              title="Approve Member"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          ) : (
                            /* Red Unapprove Button */
                            <button
                              onClick={() => handleUnapprove(u.uid)}
                              disabled={isActionLoading}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                              title="Revoke approval and return to pending"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Unapprove</span>
                            </button>
                          )}

                          {/* Red Reject Button for Pending */}
                          {u.status === 'PENDING' && (
                            <button
                              onClick={() => handleReject(u.uid)}
                              disabled={isActionLoading}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                              title="Reject registration"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Delete Account (Tracked in Activity Log) */}
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="border border-soft hover:bg-rose-50 hover:border-rose-200 text-rose-600 px-2 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 cursor-pointer"
                            title="Delete member account (tracked with full audit accountability)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. OTHER ADMINISTRATIVE TABS (PRESERVED & STYLED) */}
      {/* ========================================================= */}
      {activeTab === 'verifications' && (
        <div className="mt-8 card p-6 shadow-xl border-soft">
          <h2 className="text-xl font-black navy">Alumni Degree Verification Requests</h2>
          <p className="text-xs text-slate-500 mt-1">
            Review academic transcripts and conferred degrees before granting the verified alumni checkmark.
          </p>
          <div className="mt-6 space-y-4">
            {verificationRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No alumni verification requests in queue.
              </div>
            ) : (
              verificationRequests.map((v) => (
                <div
                  key={v.id}
                  className="p-5 rounded-2xl border border-soft bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="navy text-base">{v.userName}</b>
                      <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                        {v.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {v.university} · {v.department} ({v.batch} Batch) · {v.userEmail}
                    </p>
                    {v.proofUrl && (
                      <a
                        href={v.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 font-semibold underline mt-2 inline-block"
                      >
                        Inspect Verification Document ↗
                      </a>
                    )}
                  </div>
                  {v.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveVerificationRequest(v.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Grant Verified Badge</span>
                      </button>
                      <button
                        onClick={() => rejectVerificationRequest(v.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="mt-8 card p-6 shadow-xl border-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-soft">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 bg-blue-100 text-blue-700 rounded-lg">
                  <Bot className="w-4 h-4 text-blue-700" />
                </span>
                <h2 className="text-xl font-black navy">AI News Intelligence & Campus Wire</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Oversee 24-hour rotating stories, verify breaking hot topics, and designate permanent status.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={async () => {
                  try {
                    const res = await triggerAINewsBotScan();
                    showToast(`AI Bot successfully rotated wire: Added ${res.length} stories`, 'success');
                  } catch (err: any) {
                    showToast('AI Bot scan encountered an issue', 'error');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Trigger web browsing scan and rotation"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Trigger AI Wire Scan</span>
              </button>

              <button
                onClick={async () => {
                  const cleaned = await cleanupExpiredNews();
                  showToast(
                    cleaned > 0
                      ? `Purged ${cleaned} expired temporary news items (>10d TTL)`
                      : 'No expired temporary items found',
                    'info'
                  );
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Run background expiration routine"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Purge Expired (&gt;10d)</span>
              </button>

              <button
                onClick={() => onNavigate('news')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Public Wire →
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {news.map((item) => {
              const daysLeft = item.expiresAt
                ? Math.max(
                    0,
                    Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  )
                : null;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                    item.isHotTopic ? 'border-rose-300 bg-rose-50/20' : 'border-soft bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isHotTopic && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full animate-pulse">
                          🔥 HOT TOPIC
                        </span>
                      )}

                      {item.alumniPrizeName && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                          🏆 {item.alumniPrizeName}
                        </span>
                      )}

                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {item.category}
                      </span>

                      {item.university && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.university} {item.department ? `· ${item.department}` : ''}
                        </span>
                      )}
                    </div>

                    <b
                      onClick={() => onNavigate('newsDetail', { id: item.id })}
                      className="navy text-sm block hover:text-blue-600 cursor-pointer"
                    >
                      {item.title}
                    </b>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Status: <b className="text-slate-600">{item.status}</b></span>
                      <span>·</span>
                      <span>
                        {item.isPermanent ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 inline-flex">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            Permanent Record
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Expires in {daysLeft}d (10d TTL)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        if (item.isPermanent) {
                          await removeNewsPermanent(item.id);
                          showToast(`Permanence removed for "${item.title}"`, 'info');
                        } else {
                          await makeNewsPermanent(item.id);
                          showToast(`"${item.title}" designated as permanent`, 'success');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        item.isPermanent
                          ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                      title="Super Admin permanent designation"
                    >
                      <Pin className="w-3 h-3" />
                      <span>{item.isPermanent ? 'Unpin' : 'Make Permanent'}</span>
                    </button>

                    {item.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => updateNewsArticle(item.id, { status: 'PUBLISHED' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => deleteNewsArticle(item.id, 'Super Admin deletion')}
                      className="border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="mt-8 card p-6 shadow-xl border-soft">
          <div className="flex items-center justify-between pb-4 border-b border-soft">
            <div>
              <h2 className="text-xl font-black navy">Assigned Institutional Administrators</h2>
              <p className="text-xs text-slate-500 mt-1">
                Designated University and Department administrators with regional approval scope.
              </p>
            </div>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="bg-navy text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              + Assign Admin
            </button>
          </div>
          <div className="mt-6 space-y-3">
            {adminAssignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No regional admin assignments created yet.
              </div>
            ) : (
              adminAssignments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-soft flex items-center justify-between gap-3"
                >
                  <div>
                    <b className="navy text-sm block">{a.userName}</b>
                    <span className="text-xs text-slate-500">
                      {a.userEmail} · Scope: {a.university} {a.department ? `(${a.department})` : ''} ·{' '}
                      {a.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removeAdminAssignment(a.id)}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="mt-8">
          <AdminActivityLog
            logs={auditLogs}
            onLogCustomEvent={handleLogCustomEvent}
            onInspectTarget={(targetType, targetId) => {
              if (targetType === 'USER') {
                const u = allUsers.find((user) => user.uid === targetId || user.id === targetId);
                if (u) setSelectedUserForModal(u);
              }
            }}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MEMBER DOSSIER INSPECTION MODAL ("ALL OTHER INFO") */}
      {/* ========================================================= */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border-soft">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-soft">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-xl shadow-md shrink-0">
                  {selectedUserForModal.name
                    ? selectedUserForModal.name.charAt(0).toUpperCase()
                    : 'M'}
                </div>
                <div>
                  <h3 className="text-xl font-black navy">{selectedUserForModal.name}</h3>
                  <p className="text-xs text-slate-500">{selectedUserForModal.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedUserForModal.role}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedUserForModal.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedUserForModal.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedUserForModal.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Dossier Sections */}
            <div className="mt-6 space-y-6">
              {/* 1. Academic Credentials */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Institutional Affiliation</span>
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      University
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.university || 'Not specified'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Department
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.department || 'Not specified'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Profile Classification
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.profileType || 'Student'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Student ID / Roll
                    </span>
                    <b className="navy text-sm block mt-0.5 font-mono">
                      {selectedUserForModal.studentId || 'None provided'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Education Level
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.educationLevel || 'Undergraduate'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Year / Graduation
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.graduationYear ||
                        selectedUserForModal.studentYear ||
                        selectedUserForModal.expectedGraduation ||
                        'N/A'}
                    </b>
                  </div>
                </div>
              </div>

              {/* 2. Professional & Career */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>Professional Career & Location</span>
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Job Role
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.jobRole || 'Not specified'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Company / Organization
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.company || 'Not specified'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Location
                    </span>
                    <b className="navy text-sm block mt-0.5">
                      {selectedUserForModal.city ? `${selectedUserForModal.city}, ` : ''}
                      {selectedUserForModal.country || 'Bangladesh'}
                    </b>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-soft">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      LinkedIn URL
                    </span>
                    {selectedUserForModal.linkedin ? (
                      <a
                        href={selectedUserForModal.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-bold text-xs truncate block mt-0.5"
                      >
                        {selectedUserForModal.linkedin} ↗
                      </a>
                    ) : (
                      <span className="text-slate-400 italic block mt-0.5">None provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Personal Bio */}
              {selectedUserForModal.bio && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Personal Bio / Statement
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-soft text-xs text-slate-700 leading-relaxed italic">
                    "{selectedUserForModal.bio}"
                  </div>
                </div>
              )}

              {/* 4. Credentials & Security */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-soft text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Email (Gmail):</span>
                    <span className="navy font-bold text-xs">{selectedUserForModal.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Password:</span>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Encrypted & Protected (Never Plaintext)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Metadata */}
              <div className="p-3 bg-slate-50 rounded-xl border border-soft text-[11px] text-slate-400 flex flex-wrap justify-between gap-2">
                <span>Account UID: {selectedUserForModal.uid}</span>
                <span>
                  Registered:{' '}
                  {selectedUserForModal.createdAt
                    ? new Date(selectedUserForModal.createdAt).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="mt-8 pt-4 border-t border-soft flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Role:</span>
                <select
                  value={selectedUserForModal.role}
                  onChange={(e) => {
                    const newRole = e.target.value as Role;
                    changeUserRole(selectedUserForModal.uid, newRole);
                    setSelectedUserForModal((prev) => (prev ? { ...prev, role: newRole } : null));
                    showToast(`Role updated to ${newRole}`, 'success');
                  }}
                  className="border border-soft rounded-lg px-2.5 py-1 text-xs bg-white font-bold cursor-pointer text-slate-700"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="UNIVERSITY_ADMIN">UNIVERSITY_ADMIN</option>
                  <option value="DEPARTMENT_ADMIN">DEPARTMENT_ADMIN</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="ALUMNI">ALUMNI</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedUserForModal.status !== 'APPROVED' ? (
                  <button
                    onClick={() => handleApprove(selectedUserForModal.uid)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Approve Member</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnapprove(selectedUserForModal.uid)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <UserX className="w-4 h-4" />
                    <span>✕ Unapprove (Revoke)</span>
                  </button>
                )}

                {selectedUserForModal.status === 'PENDING' && (
                  <button
                    onClick={() => handleReject(selectedUserForModal.uid)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>✕ Reject</span>
                  </button>
                )}

                <button
                  onClick={() => setUserToDelete(selectedUserForModal)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Delete user account permanently (tracked in activity log)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Account</span>
                </button>

                <button
                  onClick={() => setSelectedUserForModal(null)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5B. DELETE ACCOUNT CONFIRMATION MODAL (AUDIT ACCOUNTABILITY) */}
      {/* ========================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl border-soft bg-white">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black navy">Confirm Data Deletion</h3>
                <p className="text-xs text-rose-600 font-bold">Irreversible Administrative Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the member account for{' '}
              <b className="navy">{userToDelete.name}</b> ({userToDelete.email})? All profile data will be permanently purged from Firestore.
            </p>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 mt-4 text-[11px] text-rose-900">
              <b>Security & Accountability Notice:</b> This deletion event will be permanently sealed into the Activity Log with your admin identity, timestamp, and justification reason.
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Deletion Rationale / Reason *
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate account, fraudulent registration, member request..."
                className="w-full border border-soft rounded-xl px-3 py-2 text-xs outline-none bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteReason('');
                }}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs px-5 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleteLoading ? 'Deleting...' : 'Permanently Delete & Log'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODALS: ASSIGN ADMIN & ADD UNIVERSITY */}
      {/* ========================================================= */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 sm:p-7 shadow-2xl border-soft">
            <h3 className="text-xl font-black navy">Assign Institutional Administrator</h3>
            <p className="text-xs text-slate-500 mt-1">
              Delegate localized moderation permissions for a specific university or department.
            </p>

            <form onSubmit={handleAssignSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Select User *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="account-input mt-1 bg-white cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    -- Select member --
                  </option>
                  {allUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Admin Role Tier *</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as any)}
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="UNIVERSITY_ADMIN">University Admin (Full Campus Scope)</option>
                  <option value="DEPARTMENT_ADMIN">Department Admin (Specific Dept Scope)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Assigned University *</label>
                <select
                  value={assignUni}
                  onChange={(e) => setAssignUni(e.target.value)}
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {assignRole === 'DEPARTMENT_ADMIN' && (
                <div>
                  <label className="text-xs font-bold text-slate-600">Assigned Department *</label>
                  <select
                    value={assignDept}
                    onChange={(e) => setAssignDept(e.target.value)}
                    className="account-input mt-1 bg-white cursor-pointer"
                  >
                    {RAW_DEPARTMENT_CATALOG.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {uniModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl border-soft">
            <h3 className="text-xl font-black navy">Add New University</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a new higher education institution to the AlumniSphere network.
            </p>

            <form onSubmit={handleAddUniSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">University Name *</label>
                <input
                  value={newUniName}
                  onChange={(e) => setNewUniName(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. Bangladesh University of Science..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Classification *</label>
                <select
                  value={newUniType}
                  onChange={(e) => setNewUniType(e.target.value as any)}
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                  <option value="International">International</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Location</label>
                <input
                  value={newUniLocation}
                  onChange={(e) => setNewUniLocation(e.target.value)}
                  className="account-input mt-1"
                  placeholder="e.g. Dhaka, Bangladesh"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setUniModalOpen(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Add University
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
