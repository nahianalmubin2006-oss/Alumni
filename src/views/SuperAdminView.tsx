import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Role, UserStatus, ChangeRequest } from '../types';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG } from '../data/initialData';

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
    suspendUser,
    changeUserRole,
    verifyAlumni,
    approveVerificationRequest,
    rejectVerificationRequest,
    approveChangeRequest,
    rejectChangeRequest,
    updateNewsArticle,
    deleteNewsArticle,
    assignAdmin,
    removeAdminAssignment,
    saveUniversity,
    saveDepartment,
  } = useData();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'users'
    | 'approvals'
    | 'verifications'
    | 'news'
    | 'admins'
    | 'institutions'
    | 'audit'
  >('overview');

  // Filters
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [reviewerNote, setReviewerNote] = useState('');

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

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="card p-8 sm:p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-3xl mx-auto mb-4 font-black shadow-sm">
            ⚙
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Security Clearance
            </span>
            <h2 className="text-2xl sm:text-3xl font-black navy mt-1">Super Admin Portal</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Access is reserved for platform administrators and system owners. You can enter with
              creator credentials or activate test mode below.
            </p>
          </div>

          {/* Quick Access for Owner */}
          <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <b className="navy text-sm block">System Owner Quick Access</b>
                <span className="text-xs text-slate-500 block mt-0.5">
                  nahianalmubin2006@gmail.com (BUP CSE)
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

          {/* Switcher for All 3 Admin Tiers */}
          <div className="mt-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Testing Modes:
            </span>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setSimulatedRole('SUPER_ADMIN')}
                className="p-3 border border-soft rounded-xl text-left hover:border-blue-400 bg-white font-semibold navy transition"
              >
                <b>⚙ Super Admin</b>
                <span className="text-[10px] text-slate-400 block mt-0.5">All permissions</span>
              </button>
              <button
                onClick={() => {
                  setSimulatedRole('UNIVERSITY_ADMIN');
                  onNavigate('university-admin');
                }}
                className="p-3 border border-soft rounded-xl text-left hover:border-blue-400 bg-white font-semibold navy transition"
              >
                <b>🏛 Uni Admin</b>
                <span className="text-[10px] text-slate-400 block mt-0.5">BUP Scope</span>
              </button>
              <button
                onClick={() => {
                  setSimulatedRole('DEPARTMENT_ADMIN');
                  onNavigate('department-admin');
                }}
                className="p-3 border border-soft rounded-xl text-left hover:border-blue-400 bg-white font-semibold navy transition"
              >
                <b>📂 Dept Admin</b>
                <span className="text-[10px] text-slate-400 block mt-0.5">CSE Scope</span>
              </button>
            </div>
          </div>

          <div className="line my-6"></div>

          {/* Regular Admin Credentials Form */}
          <div>
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

  const filteredUsers = allUsers.filter((u) => {
    const matchesStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
    const matchesSearch =
      !userSearch ||
      [u.name, u.email, u.university, u.department, u.role]
        .join(' ')
        .toLowerCase()
        .includes(userSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
    alert(`${user.name} assigned as ${assignRole.replace('_', ' ')}!`);
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
    alert('University created successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            ROOT ADMINISTRATOR CONSOLE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-2">Super Admin Control Center</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Manage users, evaluate pending change requests, verify alumni, assign institutional admins,
            and monitor live audit trails.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAssignModalOpen(true)}
            className="bg-navy text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow"
          >
            + Assign Admin
          </button>
          <button
            onClick={() => setUniModalOpen(true)}
            className="border border-soft bg-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
          >
            + Add Institution
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 border-b border-soft">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pill cursor-pointer transition ${
            activeTab === 'overview' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Dashboard Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pill cursor-pointer transition ${
            activeTab === 'users' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Users & Approvals ({allUsers.filter((u) => u.status === 'PENDING').length} pending)
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pill cursor-pointer transition ${
            activeTab === 'approvals' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Change Requests ({changeRequests.filter((c) => c.status === 'PENDING').length} pending)
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`pill cursor-pointer transition ${
            activeTab === 'verifications' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Alumni Verifications ({verificationRequests.filter((v) => v.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`pill cursor-pointer transition ${
            activeTab === 'news' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          News Management ({news.filter((n) => n.status === 'PENDING_APPROVAL').length} pending)
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`pill cursor-pointer transition ${
            activeTab === 'admins' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Admin Assignments ({adminAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pill cursor-pointer transition ${
            activeTab === 'audit' ? 'bg-navy text-white border-navy' : 'text-slate-600'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* 1. Dashboard Overview Tab */}
      {activeTab === 'overview' && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric">
              <span className="text-xs text-slate-400 block">Total Registered Users</span>
              <b className="text-3xl navy mt-1 block">{allUsers.length}</b>
              <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
                {allUsers.filter((u) => u.status === 'PENDING').length} awaiting approval
              </span>
            </div>
            <div className="metric">
              <span className="text-xs text-slate-400 block">Change Request Queue</span>
              <b className="text-3xl navy mt-1 block">{changeRequests.length}</b>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
                {changeRequests.filter((c) => c.status === 'PENDING').length} pending review
              </span>
            </div>
            <div className="metric">
              <span className="text-xs text-slate-400 block">Verification Requests</span>
              <b className="text-3xl navy mt-1 block">{verificationRequests.length}</b>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                {verificationRequests.filter((v) => v.status === 'PENDING').length} awaiting review
              </span>
            </div>
            <div className="metric">
              <span className="text-xs text-slate-400 block">Live News Articles</span>
              <b className="text-3xl navy mt-1 block">{news.length}</b>
              <span className="text-[11px] text-purple-600 font-semibold mt-1 block">
                {news.filter((n) => n.status === 'PENDING_APPROVAL').length} pending approval
              </span>
            </div>
          </div>

          {/* Quick Pending Summary */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between pb-3 border-b border-soft">
                <h3 className="font-bold navy text-base">Pending User Approvals</h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="mt-4 divide-y divide-soft">
                {allUsers.filter((u) => u.status === 'PENDING').length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No pending users at this time.
                  </div>
                ) : (
                  allUsers
                    .filter((u) => u.status === 'PENDING')
                    .slice(0, 5)
                    .map((u) => (
                      <div key={u.uid} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <b className="navy text-sm block">{u.name}</b>
                          <p className="text-xs text-slate-500">
                            {u.profileType} · {u.university}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveUser(u.uid)}
                            className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectUser(u.uid)}
                            className="border border-soft px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between pb-3 border-b border-soft">
                <h3 className="font-bold navy text-base">Pending Institutional Changes</h3>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="mt-4 divide-y divide-soft">
                {changeRequests.filter((c) => c.status === 'PENDING').length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No pending change requests in queue.
                  </div>
                ) : (
                  changeRequests
                    .filter((c) => c.status === 'PENDING')
                    .slice(0, 5)
                    .map((c) => (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <b className="navy text-sm block">{c.targetTitle}</b>
                          <p className="text-xs text-slate-500">
                            Submitted by {c.requesterName} ({c.requesterRole})
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveChangeRequest(c.id)}
                            className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectChangeRequest(c.id)}
                            className="border border-soft px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. User Management Tab */}
      {activeTab === 'users' && (
        <div className="mt-8 space-y-6">
          <div className="card p-4 flex flex-col sm:flex-row gap-3 justify-between">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, email, institution..."
              className="border border-soft rounded-xl px-4 py-2 text-sm outline-none bg-white flex-1"
            />
            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="border border-soft rounded-xl px-3 py-2 text-sm bg-white cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved Members</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="card overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-soft">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Institution</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <b className="navy text-sm block">{u.name}</b>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.uid, e.target.value as Role)}
                        className="border border-soft rounded-lg px-2 py-1 text-xs bg-white font-semibold cursor-pointer"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="UNIVERSITY_ADMIN">UNIVERSITY_ADMIN</option>
                        <option value="DEPARTMENT_ADMIN">DEPARTMENT_ADMIN</option>
                        <option value="STUDENT">STUDENT</option>
                        <option value="ALUMNI">ALUMNI</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span className="block font-medium">{u.university || 'Not set'}</span>
                      <span className="text-[11px] text-slate-400">{u.department}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`pill text-[10px] py-0.5 px-2 ${
                          u.status === 'APPROVED'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : u.status === 'PENDING'
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-rose-700 bg-rose-50 border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {u.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => approveUser(u.uid)}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectUser(u.uid)}
                            className="border border-soft px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => suspendUser(u.uid)}
                          className="border border-soft px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Central Approvals Queue */}
      {activeTab === 'approvals' && (
        <div className="mt-8 space-y-6">
          <div className="card p-6 shadow-xl">
            <h2 className="text-xl font-black navy">Central Change Approval System</h2>
            <p className="text-xs text-slate-400 mt-1">
              Workflow: Submitted → Pending → Approved / Rejected. Only approved changes alter public
              institutional records.
            </p>

            <div className="mt-6 space-y-4">
              {changeRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No change requests have been submitted yet.
                </div>
              ) : (
                changeRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl border border-soft bg-white shadow-sm flex flex-col md:flex-row justify-between gap-6"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="pill text-[10px] text-blue-600 font-bold">
                          {req.targetType}
                        </span>
                        <span
                          className={`pill text-[10px] ${
                            req.status === 'APPROVED'
                              ? 'text-emerald-700 bg-emerald-50'
                              : req.status === 'PENDING'
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-rose-700 bg-rose-50'
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
                          className="bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                        >
                          Approve Changes
                        </button>
                        <button
                          onClick={() => rejectChangeRequest(req.id, reviewerNote)}
                          className="border border-soft py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Alumni Verifications Tab */}
      {activeTab === 'verifications' && (
        <div className="mt-8 space-y-6">
          <div className="card p-6 shadow-xl">
            <h2 className="text-xl font-black navy">Alumni Verification Badges Queue</h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify degree credentials and confer the official Verified badge to alumni profiles.
            </p>

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
                        <span className="pill text-[10px] text-blue-600">{v.status}</span>
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
                          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                        >
                          Grant Verified Badge
                        </button>
                        <button
                          onClick={() => rejectVerificationRequest(v.id)}
                          className="border border-soft px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Live News Management */}
      {activeTab === 'news' && (
        <div className="mt-8 space-y-6">
          <div className="card p-6 shadow-xl">
            <h2 className="text-xl font-black navy">News Articles & Approvals</h2>
            <p className="text-xs text-slate-400 mt-1">
              Statuses: DRAFT → PENDING_APPROVAL → PUBLISHED → ARCHIVED. Only published stories appear
              on the public website.
            </p>

            <div className="mt-6 divide-y divide-soft">
              {news.map((n) => (
                <div key={n.id} className="py-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="pill text-[10px] text-blue-600">{n.category}</span>
                      <span
                        className={`pill text-[10px] font-bold ${
                          n.status === 'PUBLISHED'
                            ? 'text-emerald-700 bg-emerald-50'
                            : n.status === 'PENDING_APPROVAL'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-slate-500'
                        }`}
                      >
                        {n.status}
                      </span>
                      {n.featured && <span className="pill text-[10px] text-amber-600">★ Featured</span>}
                    </div>
                    <h3 className="font-bold navy text-base mt-2">{n.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.summary}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Author: {n.authorName} · {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                    {n.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => updateNewsArticle(n.id, { status: 'PUBLISHED' })}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                      >
                        Publish Now
                      </button>
                    )}
                    {n.status === 'PUBLISHED' ? (
                      <button
                        onClick={() => updateNewsArticle(n.id, { status: 'ARCHIVED' })}
                        className="border border-soft px-3 py-1.5 rounded-xl text-xs text-slate-600 font-semibold"
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        onClick={() => updateNewsArticle(n.id, { status: 'PUBLISHED' })}
                        className="border border-soft px-3 py-1.5 rounded-xl text-xs text-emerald-600 font-semibold"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => updateNewsArticle(n.id, { featured: !n.featured })}
                      className="border border-soft px-3 py-1.5 rounded-xl text-xs text-amber-600 font-semibold"
                    >
                      {n.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      onClick={() => deleteNewsArticle(n.id)}
                      className="text-xs text-rose-600 font-bold hover:underline self-end sm:self-center"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Admin Assignments */}
      {activeTab === 'admins' && (
        <div className="mt-8 space-y-6">
          <div className="card p-6 shadow-xl">
            <div className="flex justify-between items-center pb-4 border-b border-soft">
              <div>
                <h2 className="text-xl font-black navy">Assigned Institutional Administrators</h2>
                <p className="text-xs text-slate-400 mt-1">
                  University Admins can manage their own institution; Department Admins manage their
                  own department.
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(true)}
                className="bg-navy text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
              >
                + Assign Admin
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {adminAssignments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No regional or institutional administrators assigned yet.
                </div>
              ) : (
                adminAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-soft bg-white flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="navy text-sm">{a.userName}</b>
                        <span className="pill text-[10px] text-blue-600 font-bold">
                          {a.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Assigned to: <b>{a.university}</b>
                        {a.department ? ` (${a.department})` : ''} · {a.userEmail}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAdminAssignment(a.id)}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Revoke Assignment
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Audit Logs */}
      {activeTab === 'audit' && (
        <div className="mt-8 space-y-6">
          <div className="card p-6 shadow-xl">
            <h2 className="text-xl font-black navy">System Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-1">
              Immutable logging of administrative security, role changes, and content moderation.
            </p>

            <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-soft bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                      <p className="navy font-medium mt-1">{log.details}</p>
                      <span className="text-[11px] text-slate-400">
                        Actor: {log.actorName} ({log.actorEmail}) · Target: {log.targetType} ({log.targetId})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Admin Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black navy">Assign Institutional Administrator</h3>
            <p className="text-xs text-slate-500 mt-1">
              Grant scoped administrative privileges to a registered user.
            </p>

            <form onSubmit={handleAssignSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Select User *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="">Choose a registered user...</option>
                  {allUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.email}) — current: {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Administrative Role *</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as any)}
                  className="account-input mt-1 bg-white cursor-pointer"
                >
                  <option value="UNIVERSITY_ADMIN">University Admin (Whole Institution)</option>
                  <option value="DEPARTMENT_ADMIN">Department Admin (Specific Department)</option>
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

      {/* Add University Modal */}
      {uniModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl">
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
