import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Bot,
  Flame,
  Award,
  Shield,
  Clock,
  Pin,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  Search,
  ShieldCheck,
  Mail,
  GraduationCap,
} from 'lucide-react';

interface DepartmentAdminViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const DepartmentAdminView: React.FC<DepartmentAdminViewProps> = ({ onNavigate }) => {
  const { isDepartmentAdmin, userProfile } = useAuth();
  const {
    alumni,
    students,
    news,
    allUsers,
    submitChangeRequest,
    makeNewsPermanent,
    removeNewsPermanent,
    deleteNewsArticle,
    triggerAINewsBotScan,
    createNewsArticle,
  } = useData();

  const assignedUni =
    userProfile?.assignedUniversity ||
    userProfile?.university ||
    'University of Dhaka';
  const assignedDept =
    userProfile?.assignedDepartment ||
    userProfile?.department ||
    'Computer Science & Engineering';

  const deptUsers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.university?.toLowerCase() === assignedUni.toLowerCase() &&
        u.department?.toLowerCase() === assignedDept.toLowerCase()
    );
  }, [allUsers, assignedUni, assignedDept]);

  const [deptSearch, setDeptSearch] = useState('');
  const [deptRoleFilter, setDeptRoleFilter] = useState<'ALL' | 'STUDENT' | 'ALUMNI'>('ALL');

  const filteredDeptUsers = useMemo(() => {
    let list = deptUsers;
    if (deptRoleFilter === 'STUDENT') {
      list = list.filter((u) => u.profileType === 'Student' || u.role === 'STUDENT');
    } else if (deptRoleFilter === 'ALUMNI') {
      list = list.filter((u) => u.profileType === 'Alumni' || u.role === 'ALUMNI');
    }
    if (!deptSearch.trim()) return list;
    const q = deptSearch.toLowerCase();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [deptUsers, deptSearch, deptRoleFilter]);

  const deptAlumni = alumni.filter(
    (a) =>
      a.university.toLowerCase() === assignedUni.toLowerCase() &&
      a.department.toLowerCase() === assignedDept.toLowerCase()
  );

  const deptStudents = students.filter(
    (s) =>
      s.university.toLowerCase() === assignedUni.toLowerCase() &&
      s.department.toLowerCase() === assignedDept.toLowerCase()
  );

  const deptNews = news.filter(
    (n) =>
      (!n.university || n.university.toLowerCase() === assignedUni.toLowerCase()) &&
      (!n.department || n.department.toLowerCase() === assignedDept.toLowerCase())
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'news' | 'batches' | 'change'>('members');
  const [achievements, setAchievements] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // AI News Bot interaction states
  const [isScanningWire, setIsScanningWire] = useState(false);
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<any>('Alumni special achievements');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newIsHot, setNewIsHot] = useState(false);

  const handleScanDepartmentWire = async () => {
    try {
      setIsScanningWire(true);
      await triggerAINewsBotScan({
        university: assignedUni,
        department: assignedDept,
        focusType: 'Alumni special achievements, prize winnings, research papers, grants',
        forceHotTopic: true,
        count: 2,
      });
      setMsg('AI Bot successfully scanned web information and updated department wire!');
    } catch (err: any) {
      setMsg('AI scan encountered an issue.');
    } finally {
      setIsScanningWire(false);
    }
  };

  const handleCreateDeptNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    try {
      await createNewsArticle({
        title: newTitle.trim(),
        category: newCategory,
        summary: newSummary.trim(),
        content: newContent.trim(),
        university: assignedUni,
        department: assignedDept,
        alumniPrizeName: newPrizeName.trim() || undefined,
        isHotTopic: newIsHot,
        hotTopicReason: newIsHot ? 'Department alumni achievement milestone' : undefined,
        authorId: userProfile.uid,
        authorName: userProfile.name,
        status: 'PUBLISHED',
        isPermanent: true, // Department Admin can publish permanent records for their department
        views: 1,
        imageUrl:
          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      });
      setShowAddNewsModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      setNewPrizeName('');
      setNewIsHot(false);
      setMsg('Department achievement published to permanent archive!');
    } catch (err) {
      setMsg('Failed to publish department achievement.');
    }
  };

  if (!isDepartmentAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="card p-10">
          <h2 className="text-2xl font-black navy">Restricted Department Admin Area</h2>
          <p className="text-sm text-slate-500 mt-2">
            You are not assigned as a Department Administrator.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="mt-6 bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold"
          >
            ← Return to Explore
          </button>
        </div>
      </div>
    );
  }

  const handleProposeDeptChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitChangeRequest({
        requesterId: userProfile?.uid || 'dept-admin',
        requesterName: userProfile?.name || 'Department Administrator',
        requesterEmail: userProfile?.email || '',
        requesterRole: 'DEPARTMENT_ADMIN',
        targetType: 'DEPARTMENT',
        targetId: 'dept-' + encodeURIComponent(assignedDept.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        targetTitle: `${assignedDept} (${assignedUni})`,
        university: assignedUni,
        department: assignedDept,
        oldValue: JSON.stringify({ achievements: 'Baseline curriculum' }),
        newValue: JSON.stringify({ achievements }),
        reason: reason || 'Updated research benchmarks and achievements.',
      });
      setMsg('Change request submitted to Super Admin for approval!');
    } catch (err: any) {
      setMsg('Failed to submit change request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            DEPARTMENT ADMINISTRATOR WORKSPACE
          </div>
          <h1 className="text-3xl font-black navy mt-1">{assignedDept}</h1>
          <p className="text-slate-500 mt-1 text-sm">{assignedUni}</p>
        </div>

        <button
          onClick={() =>
            onNavigate('departmentProfile', {
              dept: assignedDept,
              uni: assignedUni,
            })
          }
          className="pill text-blue-600 self-start md:self-end"
        >
          View Department Profile →
        </button>
      </div>

      {msg && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        <div className="metric">
          <span className="text-xs text-slate-400 block">Department Alumni</span>
          <b className="text-2xl navy mt-1 block">{deptAlumni.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Current Students</span>
          <b className="text-2xl navy mt-1 block">{deptStudents.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Tracked Batches</span>
          <b className="text-2xl navy mt-1 block">6 cohorts</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Department News</span>
          <b className="text-2xl navy mt-1 block">{deptNews.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Employment Target</span>
          <b className="text-2xl text-emerald-600 mt-1 block">85%</b>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-soft pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`pill cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'members' ? 'bg-navy text-white shadow-xs' : 'bg-blue-50 text-blue-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Department Members & Registered Users ({deptUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`pill cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'news' ? 'bg-navy text-white' : 'bg-blue-50 text-blue-700'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Department Live Wire ({deptNews.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pill cursor-pointer ${activeTab === 'batches' ? 'bg-navy text-white' : ''}`}
        >
          Batches (2020–2025)
        </button>
        <button
          onClick={() => setActiveTab('change')}
          className={`pill cursor-pointer ${activeTab === 'change' ? 'bg-navy text-white' : ''}`}
        >
          Submit Changes
        </button>
      </div>

      {/* Tab: Department Members & Registered Users Directory */}
      {activeTab === 'members' && (
        <div className="mt-6 space-y-4">
          <div className="card p-5 shadow-xl border-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold navy text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>
                    {assignedDept} Members Directory ({deptUsers.length})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional roster of registered students, alumni, and faculty in {assignedDept} at {assignedUni}.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  placeholder="Search by name, gmail, ID, role..."
                  className="w-full pl-9 pr-3 py-1.5 border border-soft rounded-xl text-xs bg-white outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Quick Member Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-soft">
              <button
                type="button"
                onClick={() => setDeptRoleFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  deptRoleFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                All Department Members ({deptUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setDeptRoleFilter('STUDENT')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  deptRoleFilter === 'STUDENT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                Students ({deptUsers.filter((u) => u.profileType === 'Student' || u.role === 'STUDENT').length})
              </button>
              <button
                type="button"
                onClick={() => setDeptRoleFilter('ALUMNI')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  deptRoleFilter === 'ALUMNI'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-soft text-slate-600 hover:text-slate-900'
                }`}
              >
                Alumni ({deptUsers.filter((u) => u.profileType === 'Alumni' || u.role === 'ALUMNI').length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-soft">
                  <tr>
                    <th className="p-3">Member & Contact (Gmail)</th>
                    <th className="p-3">Student ID / Roll</th>
                    <th className="p-3">Role & Status</th>
                    <th className="p-3">Session / Career</th>
                    <th className="p-3 text-right">Security & Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft">
                  {filteredDeptUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No registered members found for {assignedDept} matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDeptUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition">
                        {/* Member Identity & Gmail */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {u.name?.charAt(0) || 'M'}
                            </div>
                            <div>
                              <b className="navy text-xs block">{u.name}</b>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{u.email}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ID / Roll */}
                        <td className="p-3">
                          <b className="text-slate-800 text-xs block font-mono">
                            {u.studentId || 'Not assigned'}
                          </b>
                          <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                            {u.profileType || 'Student'}
                          </span>
                        </td>

                        {/* Role & Status */}
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 block w-fit">
                            {u.role}
                          </span>
                          <span
                            className={`text-[10px] font-semibold mt-1 inline-block ${
                              u.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            ● {u.status}
                          </span>
                        </td>

                        {/* Session / Year / Career */}
                        <td className="p-3">
                          <span className="text-xs text-slate-700 block">
                            {u.profileType === 'Student'
                              ? u.studentYear || 'Current Student'
                              : u.graduationYear
                              ? `Batch of ${u.graduationYear}`
                              : 'Alumni'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">
                            {u.jobRole
                              ? `${u.jobRole} at ${u.company}`
                              : u.city
                              ? `${u.city}, ${u.country}`
                              : 'Bangladesh'}
                          </span>
                        </td>

                        {/* Security: Protected / Encrypted Password */}
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Protected (Encrypted)</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Department Live Wire */}
      {activeTab === 'news' && (
        <div className="mt-6 space-y-6">
          <div className="card p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 bg-purple-100 text-purple-700 rounded-lg">
                  <Bot className="w-4 h-4 text-purple-700" />
                </span>
                <h3 className="font-black navy text-lg">
                  {assignedDept} Alumni Wire & Achievements
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                As Department Administrator for {assignedDept} ({assignedUni}), you can seal alumni achievements into permanent records, cancel 10-day TTL expiration, and trigger automated web intelligence scans.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleScanDepartmentWire}
                disabled={isScanningWire}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningWire ? 'animate-spin' : ''}`} />
                <span>{isScanningWire ? 'Scanning Web Wire...' : 'Scan Department AI Wire'}</span>
              </button>

              <button
                onClick={() => setShowAddNewsModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Achievement</span>
              </button>
            </div>
          </div>

          {/* Add News Modal */}
          {showAddNewsModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="card p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black navy mb-1">Record Department Alumni Achievement</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Permanently archived for {assignedDept} at {assignedUni}.
                </p>

                <form onSubmit={handleCreateDeptNews} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Headline *</label>
                    <input
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. CSE 2021 Alumnus receives IEEE Fellowship or wins international prize"
                      className="w-full text-xs border border-soft rounded-xl px-3 py-2.5 outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                      >
                        <option value="Alumni special achievements">Alumni special achievements</option>
                        <option value="Department announcements">Department announcements</option>
                        <option value="Research">Research</option>
                        <option value="Scholarships">Scholarships</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Award / Medal / Prize Name
                      </label>
                      <input
                        value={newPrizeName}
                        onChange={(e) => setNewPrizeName(e.target.value)}
                        placeholder="e.g. ACM Innovation Prize ($100,000)"
                        className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Summary</label>
                    <textarea
                      required
                      rows={2}
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      placeholder="1-2 sentences summarizing the breakthrough"
                      className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Content</label>
                    <textarea
                      required
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Full narrative of the alumni accomplishment and impact"
                      className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isHotDeptCheckbox"
                      checked={newIsHot}
                      onChange={(e) => setNewIsHot(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="isHotDeptCheckbox" className="text-xs font-bold text-rose-700 flex items-center gap-1 cursor-pointer">
                      <Flame className="w-3.5 h-3.5" />
                      Mark as Breaking HOT TOPIC
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-soft">
                    <button
                      type="button"
                      onClick={() => setShowAddNewsModal(false)}
                      className="px-3 py-1.5 rounded-xl border border-soft text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Department News List */}
          <div className="grid gap-4">
            {deptNews.length === 0 ? (
              <div className="card p-12 text-center text-slate-400">
                <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold navy text-sm">No stories published for {assignedDept} yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Scan Department AI Wire" to browse web archives for verified alumni prize winners.
                </p>
              </div>
            ) : (
              deptNews.map((n) => {
                const daysLeft = n.expiresAt
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(n.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )
                    )
                  : null;

                return (
                  <div
                    key={n.id}
                    className={`card p-5 border transition ${
                      n.isHotTopic
                        ? 'border-rose-300 bg-gradient-to-r from-rose-50/40 via-white to-amber-50/30'
                        : 'border-soft bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.isHotTopic && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full animate-pulse">
                            <Flame className="w-3 h-3 text-rose-600" />
                            <span>HOT TOPIC</span>
                          </span>
                        )}

                        {n.alumniPrizeName && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Award className="w-3 h-3 text-amber-600" />
                            <span>{n.alumniPrizeName}</span>
                          </span>
                        )}

                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          {n.category}
                        </span>
                      </div>

                      {/* Permanence & Actions */}
                      <div className="flex items-center gap-2">
                        {n.isPermanent ? (
                          <span
                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200"
                            title={
                              n.permanentBy
                                ? `Made permanent by ${n.permanentBy.role} ${n.permanentBy.userName}`
                                : 'Permanent archive'
                            }
                          >
                            <Shield className="w-3 h-3 text-emerald-600" />
                            <span>Permanent</span>
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg"
                            title="Auto-purged after 10 days unless confirmed permanent"
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Expires in {daysLeft}d</span>
                          </span>
                        )}

                        <button
                          onClick={() => {
                            if (n.isPermanent) {
                              removeNewsPermanent(n.id);
                            } else {
                              makeNewsPermanent(n.id);
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                            n.isPermanent
                              ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                              : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                          }`}
                          title="Department Admin action to seal news as permanent"
                        >
                          <Pin className="w-3 h-3" />
                          <span>{n.isPermanent ? 'Unpin' : 'Make Permanent'}</span>
                        </button>

                        <button
                          onClick={() => deleteNewsArticle(n.id, 'Department Admin deletion')}
                          className="text-[10px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h4
                      onClick={() => onNavigate('newsDetail', { id: n.id })}
                      className="text-base font-black navy hover:text-blue-600 transition cursor-pointer"
                    >
                      {n.title}
                    </h4>

                    {n.isHotTopic && n.hotTopicReason && (
                      <div className="mt-1.5 text-xs text-rose-700 font-bold bg-rose-50/80 p-2 rounded-lg border border-rose-200/80 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{n.hotTopicReason}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {n.summary || n.content.slice(0, 180) + '...'}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-soft text-[11px] text-slate-400">
                      <span>By {n.authorName} · {new Date(n.publishedAt || n.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => onNavigate('newsDetail', { id: n.id })}
                        className="text-purple-600 font-bold hover:underline"
                      >
                        Read details →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="mt-6 card p-6 shadow-xl">
          <h3 className="font-bold navy text-lg mb-4">Department Members Directory</h3>
          <div className="divide-y divide-soft">
            {[...deptAlumni, ...deptStudents].length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No registered student or alumni members for this department yet.
              </div>
            ) : (
              [...deptAlumni, ...deptStudents].map((m: any) => (
                <div key={m.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <b className="navy text-sm block">{m.name}</b>
                    <span className="text-slate-500">
                      {m.jobRole || m.studentYear} · {m.company || m.expectedGraduation}
                    </span>
                  </div>
                  <span className="pill text-[10px]">{m.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Batches */}
      {activeTab === 'batches' && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {['2020', '2021', '2022', '2023', '2024', '2025'].map((yr) => (
            <button
              key={yr}
              onClick={() =>
                onNavigate('departmentBatch', {
                  dept: assignedDept,
                  uni: assignedUni,
                  batch: yr,
                })
              }
              className="card p-4 text-center hover:border-blue-400 transition"
            >
              <b className="navy text-lg block">{yr}</b>
              <span className="text-[11px] text-slate-400 block mt-1">Cohort Batch</span>
              <span className="text-xs text-blue-600 font-bold block mt-2">Manage →</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab: Change */}
      {activeTab === 'change' && (
        <div className="mt-6 card p-6 sm:p-8 shadow-xl max-w-2xl">
          <h3 className="text-xl font-black navy">Propose Department Information</h3>
          <p className="text-xs text-slate-500 mt-1">
            Department updates require Super Admin approval prior to publication.
          </p>

          <form onSubmit={handleProposeDeptChange} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Achievements & Milestones</label>
              <textarea
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                rows={4}
                className="account-input mt-1"
                placeholder="e.g. ACM ICPC regional finalists, patent filings..."
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Reason for Update</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="account-input mt-1"
                placeholder="e.g. Annual department outcome verification"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              {submitting ? 'Submitting...' : 'Submit to Super Admin'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
