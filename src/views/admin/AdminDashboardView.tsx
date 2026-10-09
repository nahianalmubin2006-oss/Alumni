import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { AdminUniversityManagement } from '../../components/admin/AdminUniversityManagement';
import { useData } from '../../context/DataContext';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  ExternalLink,
  Building2,
  GraduationCap,
  Sparkles,
  Bot,
  Settings,
  History,
  Lock,
  Eye,
  SlidersHorizontal,
  FileCheck,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SectionErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin SectionErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center my-6 max-w-2xl mx-auto shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">
            {this.props.fallbackTitle || 'Unable to load section'}
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            {this.state.error?.message || 'An unexpected rendering error occurred in this section.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Retry Loading Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AdminDashboardViewProps {
  onNavigatePublic: () => void;
  onLogoutSuccess: () => void;
  onBack?: () => void;
}

interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN';
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  university?: string;
  department?: string;
  profileType?: string;
  studentId?: string;
  graduationYear?: string;
  jobRole?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigatePublic,
  onLogoutSuccess,
  onBack,
}) => {
  const { profileClaims, canReviewProfileClaims, approveProfileClaim, rejectProfileClaim } = useData();

  const {
    adminUser,
    isAuthenticated,
    isSuperAdmin,
    logoutAdmin,
    apiFetch,
    loading: authLoading,
  } = useAdmin();

  // Active Admin Sidebar Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'universities' | 'approvals' | 'news' | 'audit' | 'settings'
  >('overview');

  // Stats
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    pendingUsers: 0,
    activeAdmins: 0,
    pendingVerifications: 0,
    pendingChangeRequests: 0,
    totalAuditLogs: 0,
  });

  // Users management state
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<ServerUser | null>(null);

  // User Actions modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [newUserUni, setNewUserUni] = useState('University of Dhaka');
  const [newUserDept, setNewUserDept] = useState('Computer Science & Engineering');

  // Role modification modal
  const [roleModalUser, setRoleModalUser] = useState<ServerUser | null>(null);
  const [newSelectedAccountType, setNewSelectedAccountType] = useState<'Student' | 'Alumni' | 'Admin' | 'Super Admin'>('Student');

  // Delete modal
  const [userToDelete, setUserToDelete] = useState<ServerUser | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Verifications & Change Requests
  const [verifications, setVerifications] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [approvalsTab, setApprovalsTab] = useState<'verifications' | 'changes' | 'admin-applications' | 'profile-claims'>('verifications');
  const [adminApplications, setAdminApplications] = useState<any[]>([]);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Settings
  const [settings, setSettings] = useState<any>({
    maintenanceMode: false,
    allowRegistrations: true,
    requireVerificationReview: true,
    defaultProfilePictures: [],
  });
  const [newDefaultPictureName, setNewDefaultPictureName] = useState('');
  const [newDefaultPictureUrl, setNewDefaultPictureUrl] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Feedback toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  }, [apiFetch]);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await apiFetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      showToast('Failed to load users from admin API', 'error');
    } finally {
      setUserLoading(false);
    }
  }, [apiFetch, searchQuery, roleFilter, statusFilter]);

  // Fetch Approvals
  const loadApprovals = useCallback(async () => {
    try {
      const [verifRes, crRes, appRes] = await Promise.all([
        apiFetch('/api/admin/verifications'),
        apiFetch('/api/admin/change-requests'),
        apiFetch('/api/admin/applications'),
      ]);
      if (verifRes.ok) {
        const vData = await verifRes.json();
        setVerifications(vData.verifications || []);
      }
      if (crRes.ok) {
        const crData = await crRes.json();
        setChangeRequests(crData.changeRequests || []);
      }
      if (appRes.ok) {
        const appData = await appRes.json();
        setAdminApplications(appData.applications || []);
      }
    } catch (e) {
      console.warn('Failed to load approvals', e);
    }
  }, [apiFetch]);

  const handleReviewAdminApplication = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await apiFetch('/api/admin/applications/' + encodeURIComponent(id) + '/review', {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not review this application.');
      showToast(data.message || 'Application reviewed.', 'success');
      await loadApprovals();
      await loadUsers();
      await loadStats();
    } catch (error: any) {
      showToast(error.message || 'Could not review this application.', 'error');
    }
  };

  const handleReviewProfileClaim = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      if (decision === 'APPROVED') {
        await approveProfileClaim(id, 'Profile ownership reviewed by Super Admin.');
      } else {
        await rejectProfileClaim(id, 'The submitted evidence was not sufficient to confirm ownership.');
      }
      showToast(decision === 'APPROVED' ? 'Profile claim approved and linked.' : 'Profile claim rejected.', 'success');
      await loadApprovals();
    } catch (error: any) {
      showToast(error?.message || 'Could not review profile claim.', 'error');
    }
  };

  // Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      }
    } catch (e) {
      console.warn('Failed to load audit logs', e);
    }
  }, [apiFetch]);

  // Fetch Settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }, [apiFetch]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadUsers();
      loadApprovals();
      loadAuditLogs();
      loadSettings();
    }
  }, [isAuthenticated, loadStats, loadUsers, loadApprovals, loadAuditLogs, loadSettings]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logoutAdmin();
      showToast('Admin session terminated.', 'info');
      onLogoutSuccess();
    } catch (e) {
      onLogoutSuccess();
    }
  };

  // User Actions
  const handleSetUserStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`User status updated to ${newStatus}`, 'success');
      loadUsers();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    try {
      const role = newSelectedAccountType === 'Admin' ? 'ADMIN' : newSelectedAccountType === 'Super Admin' ? 'SUPER_ADMIN' : 'USER';
      const profileType = newSelectedAccountType === 'Super Admin' ? 'Admin' : newSelectedAccountType;
      const res = await apiFetch(`/api/admin/users/${roleModalUser.id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role, profileType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`${roleModalUser.name} is now ${newSelectedAccountType}`, 'success');
      setRoleModalUser(null);
      loadUsers();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await apiFetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`User ${userToDelete.name} deleted successfully`, 'success');
      setUserToDelete(null);
      setDeleteReason('');
      if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
      loadUsers();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          university: newUserUni,
          department: newUserDept,
          password: 'Admin@2026!',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`User ${newUserName} created successfully`, 'success');
      setShowCreateUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      loadUsers();
      loadStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  // Verification approvals
  const handleApproveVerification = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/verifications/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to approve verification');
      showToast('Alumni verification approved!', 'success');
      loadApprovals();
      loadStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRejectVerification = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/verifications/${id}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reject verification');
      showToast('Alumni verification declined', 'info');
      loadApprovals();
      loadStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Change request approvals
  const handleApproveChangeRequest = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/change-requests/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to approve change request');
      showToast('Institutional profile change approved!', 'success');
      loadApprovals();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRejectChangeRequest = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/change-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Administrative rejection' }),
      });
      if (!res.ok) throw new Error('Failed to decline change request');
      showToast('Institutional profile change declined', 'info');
      loadApprovals();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Change admin password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    try {
      const res = await apiFetch('/api/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPassMsg({ text: 'Admin password successfully rotated!', type: 'success' });
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      setPassMsg({ text: err.message || 'Failed to update password', type: 'error' });
    }
  };

  // Update Settings
  const handleToggleSetting = async (key: string, val: boolean) => {
    try {
      const updated = { ...settings, [key]: val };
      setSettings(updated);
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      showToast('Platform setting updated.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      loadSettings();
    }
  };

  const saveDefaultProfilePictures = async (pictures: Array<{ id: string; name: string; url: string }>) => {
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ defaultProfilePictures: pictures }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save default profile pictures');
      setSettings((previous: any) => ({ ...previous, ...(data.settings || {}), defaultProfilePictures: pictures }));
      showToast('Default profile pictures saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save default profile pictures', 'error');
    }
  };

  const handleAddDefaultProfilePicture = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newDefaultPictureName.trim();
    const url = newDefaultPictureUrl.trim();
    if (!name || !url) return;
    const pictures = Array.isArray(settings.defaultProfilePictures) ? settings.defaultProfilePictures : [];
    if (pictures.length >= 12) {
      showToast('You can add up to 12 default pictures.', 'error');
      return;
    }
    await saveDefaultProfilePictures([...pictures, { id: `profile-default-${Date.now()}`, name, url }]);
    setNewDefaultPictureName('');
    setNewDefaultPictureUrl('');
  };

  const handleRemoveDefaultProfilePicture = async (id: string) => {
    const pictures = (Array.isArray(settings.defaultProfilePictures) ? settings.defaultProfilePictures : [])
      .filter((picture: any) => picture.id !== id);
    await saveDefaultProfilePictures(pictures);
  };

  // If loading or unauthenticated, enforce strict security gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Verifying security clearance...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black">403 Forbidden</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            You do not have active administrative clearance to view the dashboard. Authentication is strictly enforced on the server.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onLogoutSuccess}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition shadow"
            >
              Go to Admin Login →
            </button>
            <button
              onClick={onNavigatePublic}
              className="text-xs text-slate-400 hover:text-white py-2"
            >
              Return to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-blue-950/90 border-blue-500/40 text-blue-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <Shield className="w-4 h-4 text-blue-400" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="min-h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-3 sm:px-6 py-2 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Contextual Back Navigation */}
          {activeTab !== 'overview' ? (
            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer group shrink-0"
              title="Return to Dashboard Overview"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="sm:hidden">Back</span>
            </button>
          ) : (
            <button
              onClick={() => (onBack ? onBack() : onNavigatePublic())}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer group shrink-0"
              title="Return to Public Website"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back to Website</span>
              <span className="sm:hidden">Back</span>
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-sm">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                AlumniSphere Console
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isSuperAdmin
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {adminUser?.role}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Isolated Administrative Workspace
            </div>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <button
            onClick={onNavigatePublic}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition"
            title="Open normal user view in public mode"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="hidden md:flex flex-col text-right px-2">
            <span className="text-xs font-bold text-white">{adminUser?.name}</span>
            <span className="text-[10px] text-slate-400">{adminUser?.email}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
            title="Terminate administrative session immediately"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 p-3 sm:p-4 space-y-1 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Overview & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </div>
            {stats.pendingUsers > 0 && (
              <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                {stats.pendingUsers}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('universities')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
              activeTab === 'universities'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4" />
              <span>Universities & Logos</span>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-md font-bold">
              Director
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
              activeTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-4 h-4" />
              <span>Approvals Queue</span>
            </div>
            {stats.pendingVerifications + stats.pendingChangeRequests > 0 && (
              <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-black">
                {stats.pendingVerifications + stats.pendingChangeRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'news'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI News Bot & Publications</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail & Security</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Platform Settings</span>
            </button>
          )}

          <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500 px-3">
            <div>Protected by RBAC</div>
            <div className="text-[10px] text-slate-600 mt-0.5">Session: 2h TTL sliding</div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Welcome, {adminUser?.name}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  You are authenticated with{' '}
                  <strong className="text-blue-400">{adminUser?.role}</strong> privileges. All mutations are recorded to the immutable audit registry.
                </p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-semibold">Total Registered Users</div>
                  <div className="text-3xl font-black text-white mt-2">{stats.totalUsers}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Students & Alumni</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-semibold">Pending Review Queue</div>
                  <div className="text-3xl font-black text-amber-400 mt-2">{stats.pendingUsers}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Awaiting verification</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-semibold">Active Administrators</div>
                  <div className="text-3xl font-black text-blue-400 mt-2">{stats.activeAdmins}</div>
                  <div className="text-[10px] text-slate-500 mt-1">ADMIN & SUPER_ADMIN</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-semibold">Audit Logs Recorded</div>
                  <div className="text-3xl font-black text-emerald-400 mt-2">{stats.totalAuditLogs}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Tamper-evident trail</div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Quick Operations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setStatusFilter('PENDING');
                      setActiveTab('users');
                    }}
                    className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-blue-400">
                      Review Pending Users →
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {stats.pendingUsers} registrations awaiting review
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('approvals')}
                    className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-blue-400">
                      Alumni Verifications →
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {stats.pendingVerifications} graduation badge requests
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('news')}
                    className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-blue-400">
                      Trigger AI Live News Scan →
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Scrape & publish university achievements
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                  title="Return to Dashboard Overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                  <span>← Back to Dashboard Overview</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    User Management
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Server-enforced directory. Manage member statuses, review applications, and assign roles.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadUsers}
                    className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
                    title="Refresh user list"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create User</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="w-full md:w-80 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, institution..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {userLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No users found matching current filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Institution</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  u.role === 'SUPER_ADMIN'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : u.role === 'ADMIN'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {u.role}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1">{u.profileType || (u.role === 'USER' ? 'Student' : 'Admin')} profile</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : u.status === 'PENDING'
                                    ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                                    : u.status === 'SUSPENDED'
                                    ? 'bg-rose-500/10 text-rose-400'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <div>{u.university || '—'}</div>
                              <div className="text-[10px] text-slate-500">{u.department || ''}</div>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition"
                                title="View Dossier"
                              >
                                Dossier
                              </button>

                              {u.status === 'PENDING' && (
                                <button
                                  onClick={() => handleSetUserStatus(u.id, 'APPROVED')}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white transition"
                                >
                                  Approve
                                </button>
                              )}

                              {u.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleSetUserStatus(u.id, 'SUSPENDED')}
                                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold transition"
                                >
                                  Suspend
                                </button>
                              )}

                              {u.status === 'SUSPENDED' && (
                                <button
                                  onClick={() => handleSetUserStatus(u.id, 'APPROVED')}
                                  className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                                >
                                  Unsuspend
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    setRoleModalUser(u);
                                    setNewSelectedAccountType(
                                      u.role === 'SUPER_ADMIN' ? 'Super Admin' :
                                      u.role === 'ADMIN' ? 'Admin' :
                                      u.profileType === 'Alumni' ? 'Alumni' : 'Student'
                                    );
                                  }}
                                  className="px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-semibold transition"
                                >
                                  Role
                                </button>
                              )}

                              {u.role !== 'SUPER_ADMIN' && (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: UNIVERSITIES & DEPARTMENT MANAGEMENT */}
          {activeTab === 'universities' && (
            <SectionErrorBoundary fallbackTitle="Universities & Logos Editor">
              <AdminUniversityManagement onBackToOverview={() => setActiveTab('overview')} />
            </SectionErrorBoundary>
          )}

          {/* TAB 3: APPROVALS & VERIFICATIONS */}
          {activeTab === 'approvals' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                  title="Return to Dashboard Overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                  <span>← Back to Dashboard Overview</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    Approvals & Verifications
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review and verify credential claims and proposed institutional edits.
                  </p>
                </div>

                <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs font-bold">
                  <button
                    onClick={() => setApprovalsTab('verifications')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      approvalsTab === 'verifications' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Alumni Verifications ({verifications.length})
                  </button>
                  <button
                    onClick={() => setApprovalsTab('changes')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      approvalsTab === 'changes' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Change Requests ({changeRequests.length})
                  </button>
                  <button
                    onClick={() => setApprovalsTab('admin-applications')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      approvalsTab === 'admin-applications' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Admin Access ({adminApplications.filter((item) => item.status === 'PENDING').length})
                  </button>
                  {isSuperAdmin && canReviewProfileClaims && (
                    <button
                      onClick={() => setApprovalsTab('profile-claims')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        approvalsTab === 'profile-claims' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Profile Claims ({profileClaims.filter((item) => item.status === 'PENDING').length})
                    </button>
                  )}
                </div>
              </div>

              {approvalsTab === 'verifications' && (
                <div className="space-y-3">
                  {verifications.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                      No alumni verification requests in queue.
                    </div>
                  ) : (
                    verifications.map((v) => (
                      <div
                        key={v.id}
                        className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{v.userName}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                v.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : v.status === 'REJECTED'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {v.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {v.userEmail} · {v.university} ({v.department}, Batch {v.graduationYear})
                          </div>
                          {v.notes && (
                            <div className="text-xs text-slate-300 mt-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                              <strong>Notes:</strong> {v.notes}
                            </div>
                          )}
                        </div>

                        {v.status === 'PENDING' && (
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleRejectVerification(v.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold transition"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleApproveVerification(v.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold transition"
                            >
                              Approve Badge
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {approvalsTab === 'profile-claims' && isSuperAdmin && canReviewProfileClaims && (
                <div className="space-y-3">
                  {profileClaims.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                      No profile claim requests are recorded.
                    </div>
                  ) : (
                    profileClaims.map((claim) => (
                      <div key={claim.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{claim.requesterName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${claim.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : claim.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>{claim.status}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{claim.requesterEmail} · {claim.university} · {claim.department}</p>
                          <p className="text-xs text-slate-300 mt-1">Student ID: {claim.studentId || 'Not provided'} · Graduation: {claim.graduationYear || 'Not provided'}</p>
                          {claim.notes && <p className="text-xs text-slate-300 mt-2">{claim.notes}</p>}
                          {claim.proofUrl && <a href={claim.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-300 hover:text-blue-200"><ExternalLink className="w-3 h-3" /> Open evidence</a>}
                          <p className="text-[10px] text-slate-500 mt-2">Target record: {claim.targetAlumniId}</p>
                          {claim.reviewerComment && <p className="text-xs text-slate-500 mt-1">Review note: {claim.reviewerComment}</p>}
                        </div>
                        {claim.status === 'PENDING' && (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => void handleReviewProfileClaim(claim.id, 'REJECTED')} className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-200">Reject</button>
                            <button onClick={() => void handleReviewProfileClaim(claim.id, 'APPROVED')} className="px-3 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white">Approve & Link</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {approvalsTab === 'changes' && (
                <div className="space-y-3">
                  {changeRequests.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                      No change requests in queue.
                    </div>
                  ) : (
                    changeRequests.map((cr) => (
                      <div
                        key={cr.id}
                        className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{cr.targetTitle}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                              {cr.requesterRole}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Requested by {cr.requesterName} ({cr.requesterEmail})
                          </div>
                          <div className="text-xs text-slate-300 mt-2 space-y-1">
                            <div>
                              <span className="text-slate-500">Current:</span> {cr.oldValue}
                            </div>
                            <div>
                              <span className="text-emerald-400 font-bold">Proposed:</span> {cr.newValue}
                            </div>
                            <div>
                              <span className="text-slate-500">Reason:</span> {cr.reason}
                            </div>
                          </div>
                        </div>

                        {cr.status === 'PENDING' && (
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleRejectChangeRequest(cr.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold transition"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleApproveChangeRequest(cr.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold transition"
                            >
                              Approve Change
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              {approvalsTab === 'admin-applications' && (
                <div className="space-y-3">
                  {adminApplications.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                      No admin access applications have been submitted.
                    </div>
                  ) : adminApplications.map((application) => (
                    <div key={application.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{application.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">{application.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            application.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                            application.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>{application.status}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{application.email}</div>
                        <div className="text-xs text-slate-300 mt-2">
                          Scope: {application.university || 'Platform-wide'}{application.department ? ' / ' + application.department : ''}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Submitted {application.createdAt ? new Date(application.createdAt).toLocaleString() : 'recently'}</div>
                        {application.reviewerNote && <div className="text-xs text-slate-400 mt-2">Review note: {application.reviewerNote}</div>}
                      </div>
                      {application.status === 'PENDING' && (isSuperAdmin || application.type !== 'CO_ADMIN') && (
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button onClick={() => handleReviewAdminApplication(application.id, 'REJECTED')} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold">Decline</button>
                          <button onClick={() => handleReviewAdminApplication(application.id, 'APPROVED')} className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold">Approve access</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NEWS & AI BOT */}
          {activeTab === 'news' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                  title="Return to Dashboard Overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                  <span>← Back to Dashboard Overview</span>
                </button>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Live News & AI Bot Controller
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated scraping engine and institutional announcement publications.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Automated Live Web Scanner</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                    Trigger Gemini Live Crawler to scan for university milestones, alumni award winners,
                    and research breakthroughs across Bangladesh higher education institutions.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      showToast('Triggering AI News Bot Scan...', 'info');
                      const res = await fetch('/api/ai-news-bot/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ count: 2, forceHotTopic: true }),
                      });
                      if (res.ok) {
                        showToast('AI Wire Bot scan completed! New articles generated.', 'success');
                      }
                    } catch (e) {
                      showToast('Bot scan failed', 'error');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2"
                >
                  <Bot className="w-4 h-4" />
                  <span>Run Scan Now</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                  title="Return to Dashboard Overview"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                  <span>← Back to Dashboard Overview</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    Audit Trail & Security Registry
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable server-side audit logs. All login attempts, privilege changes, and deletions are recorded.
                  </p>
                </div>

                <button
                  onClick={loadAuditLogs}
                  className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4">Client IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{log.actorEmail}</div>
                            <div className="text-[10px] text-blue-400 uppercase font-black">{log.actorRole}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-300">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-xs max-w-md">
                            {log.details}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {log.ip || '127.0.0.1'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS (SUPER ADMIN ONLY) */}
          {activeTab === 'settings' && isSuperAdmin && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Platform Security & System Settings
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Root administrative configurations accessible exclusively by Super Admin.
                </p>
              </div>

              {/* Toggles */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  System Governance
                </h3>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">Maintenance Mode</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Restrict public platform access to maintenance notice
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleToggleSetting('maintenanceMode', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">Allow Public Registrations</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Permit new students and alumni to submit onboarding applications
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowRegistrations}
                    onChange={(e) => handleToggleSetting('allowRegistrations', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">Enforce Administrative Review</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Require admin approval before accounts receive verified status
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requireVerificationReview}
                    onChange={(e) => handleToggleSetting('requireVerificationReview', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </div>
              </div>

              {/* Default profile picture library */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Default Profile Pictures</h3>
                  <p className="text-xs text-slate-400 mt-1">Manage up to 12 HTTPS image links that students and alumni can choose for their profile. Host images publicly, then paste their image URL here.</p>
                </div>
                <form onSubmit={handleAddDefaultProfilePicture} className="grid sm:grid-cols-[1fr_2fr_auto] gap-3">
                  <input
                    value={newDefaultPictureName}
                    onChange={(e) => setNewDefaultPictureName(e.target.value)}
                    required
                    maxLength={50}
                    placeholder="Picture name (e.g. Blue Avatar)"
                    className="min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="url"
                    value={newDefaultPictureUrl}
                    onChange={(e) => setNewDefaultPictureUrl(e.target.value)}
                    required
                    placeholder="https://example.com/default-avatar.png"
                    className="min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition">Add Picture</button>
                </form>
                {(settings.defaultProfilePictures || []).length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {settings.defaultProfilePictures.map((picture: { id: string; name: string; url: string }) => (
                      <div key={picture.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 p-2">
                        <img src={picture.url} alt={picture.name} className="w-full h-28 object-cover rounded-lg bg-slate-700" />
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-xs text-white font-bold truncate">{picture.name}</span>
                          <button type="button" onClick={() => handleRemoveDefaultProfilePicture(picture.id)} className="text-[10px] text-rose-300 hover:text-rose-200 font-bold shrink-0">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">No default pictures added yet.</div>
                )}
              </div>

              {/* Password update */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Rotate Administrator Password
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Update password for account <strong>{adminUser?.email}</strong>.
                </p>

                {passMsg && (
                  <div
                    className={`p-3 rounded-xl mb-4 text-xs ${
                      passMsg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {passMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* USER DOSSIER MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-white text-base">User Dossier</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                <b className="text-white text-sm mt-0.5 block">{selectedUser.name}</b>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <b className="text-white text-sm mt-0.5 block">{selectedUser.email}</b>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Server Role</span>
                <b className="text-blue-400 text-sm mt-0.5 block">{selectedUser.role}</b>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <b className="text-emerald-400 text-sm mt-0.5 block">{selectedUser.status}</b>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">University</span>
                <div className="text-slate-200 mt-0.5">{selectedUser.university || 'Not specified'}</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                <div className="text-slate-200 mt-0.5">{selectedUser.department || 'Not specified'}</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Student ID</span>
                <div className="text-slate-200 mt-0.5">{selectedUser.studentId || '—'}</div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Graduation Year</span>
                <div className="text-slate-200 mt-0.5">{selectedUser.graduationYear || '—'}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE MODIFICATION MODAL */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-black text-white text-base">
              Change Account Type: {roleModalUser.name}
            </h3>
            <p className="text-xs text-slate-400">
              Convert between Student and Alumni, or grant an administrative account type. Admin options are restricted to Super Admins.
            </p>

            <div className="space-y-2">
              {(['Student', 'Alumni', 'Admin', 'Super Admin'] as const).map((accountType) => (
                <button
                  key={accountType}
                  type="button"
                  onClick={() => setNewSelectedAccountType(accountType)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    newSelectedAccountType === accountType
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{accountType === 'Super Admin' ? 'Super Admin — full platform access' : accountType}</span>
                  {newSelectedAccountType === accountType && <span>✓</span>}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Save Account Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-black text-white text-base">
              Delete Account: {userToDelete.name}
            </h3>
            <p className="text-xs text-rose-300">
              Warning: Permanently removes account {userToDelete.email}. This action is logged to the security audit trail.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Reason for Deletion
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate account, policy breach"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-black text-white text-base">Create User Account</h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  placeholder="e.g. Shakib Al Hasan"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  placeholder="shakib@du.ac.bd"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="USER">USER (Student / Alumni)</option>
                  {isSuperAdmin && <option value="ADMIN">ADMIN</option>}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
