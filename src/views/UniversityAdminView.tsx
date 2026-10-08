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
  ExternalLink,
  Users,
  Search,
  ShieldCheck,
  Mail,
  GraduationCap,
  Building2,
} from 'lucide-react';

interface UniversityAdminViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const UniversityAdminView: React.FC<UniversityAdminViewProps> = ({ onNavigate }) => {
  const { isUniversityAdmin, userProfile, isSuperAdmin } = useAuth();
  const {
    universities,
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

  const assignedUniName =
    userProfile?.assignedUniversity ||
    userProfile?.university ||
    (universities.length > 0 ? universities[0].name : 'University of Dhaka');

  const university = universities.find(
    (u) => u.name.toLowerCase() === assignedUniName.toLowerCase()
  ) || {
    name: assignedUniName,
    location: 'Dhaka, Bangladesh',
    alumniCount: 2840,
    employmentRate: 84,
    overview: 'Flagship higher education institution profile.',
  };

  const uniUsers = useMemo(() => {
    return allUsers.filter(
      (u) => u.university?.toLowerCase() === assignedUniName.toLowerCase()
    );
  }, [allUsers, assignedUniName]);

  const [memberSearch, setMemberSearch] = useState('');

  const filteredUniUsers = useMemo(() => {
    if (!memberSearch.trim()) return uniUsers;
    const q = memberSearch.toLowerCase();
    return uniUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [uniUsers, memberSearch]);

  const uniAlumni = alumni.filter(
    (a) => a.university.toLowerCase() === assignedUniName.toLowerCase()
  );
  const uniStudents = students.filter(
    (s) => s.university.toLowerCase() === assignedUniName.toLowerCase()
  );
  const uniNews = news.filter(
    (n) => n.university?.toLowerCase() === assignedUniName.toLowerCase()
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'news' | 'alumni' | 'students' | 'change'>('members');
  const [proposedOverview, setProposedOverview] = useState(university.overview || '');
  const [proposedLocation, setProposedLocation] = useState(university.location || '');
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
  const [newDept, setNewDept] = useState('');
  const [newIsHot, setNewIsHot] = useState(false);

  const handleScanUniversityWire = async () => {
    try {
      setIsScanningWire(true);
      await triggerAINewsBotScan({
        university: assignedUniName,
        focusType: 'Alumni special achievements, prize winnings, research and fellowships',
        forceHotTopic: true,
        count: 2,
      });
      setMsg('AI Bot successfully scanned web information and updated university wire!');
    } catch (err: any) {
      setMsg('AI scan encountered an issue.');
    } finally {
      setIsScanningWire(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    try {
      await createNewsArticle({
        title: newTitle.trim(),
        category: newCategory,
        summary: newSummary.trim(),
        content: newContent.trim(),
        university: assignedUniName,
        department: newDept.trim() || undefined,
        alumniPrizeName: newPrizeName.trim() || undefined,
        isHotTopic: newIsHot,
        hotTopicReason: newIsHot ? 'Institutional milestone announcement' : undefined,
        authorId: userProfile.uid,
        authorName: userProfile.name,
        status: 'PUBLISHED',
        isPermanent: true, // University Admin can publish permanent records directly
        views: 1,
        imageUrl:
          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      });
      setShowAddNewsModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      setNewPrizeName('');
      setNewDept('');
      setNewIsHot(false);
      setMsg('Institutional news published as permanent archive!');
    } catch (err) {
      setMsg('Failed to publish announcement.');
    }
  };

  if (!isUniversityAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="card p-10">
          <h2 className="text-2xl font-black navy">Restricted University Admin Area</h2>
          <p className="text-sm text-slate-500 mt-2">
            You are not currently assigned as a University Administrator.
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

  const handleProposeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitChangeRequest({
        requesterId: userProfile?.uid || 'uni-admin',
        requesterName: userProfile?.name || 'University Administrator',
        requesterEmail: userProfile?.email || '',
        requesterRole: 'UNIVERSITY_ADMIN',
        targetType: 'UNIVERSITY',
        targetId: (university as any).id || 'uni-target',
        targetTitle: university.name,
        university: university.name,
        oldValue: JSON.stringify({ overview: university.overview, location: university.location }),
        newValue: JSON.stringify({ overview: proposedOverview, location: proposedLocation }),
        reason: reason || 'Proposed factual profile update.',
      });
      setMsg('Change request submitted to Super Admin! Check notifications for review decisions.');
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
            UNIVERSITY ADMINISTRATOR WORKSPACE
          </div>
          <h1 className="text-3xl font-black navy mt-1">{university.name}</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Institutional management scope restricted to {university.name}.
          </p>
        </div>

        <button
          onClick={() => onNavigate('universityDetail', { name: university.name })}
          className="pill text-blue-600 self-start md:self-end"
        >
          View Public Page →
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
          <span className="text-xs text-slate-400 block">Enrolled Students</span>
          <b className="text-2xl navy mt-1 block">{uniStudents.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Registered Alumni</span>
          <b className="text-2xl navy mt-1 block">{uniAlumni.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Published News</span>
          <b className="text-2xl navy mt-1 block">{uniNews.length}</b>
        </div>
        <div className="metric">
          <span className="text-xs text-slate-400 block">Employment Index</span>
          <b className="text-2xl text-emerald-600 mt-1 block">{university.employmentRate}%</b>
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
          <span>Campus Members & Registered Users ({uniUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`pill cursor-pointer ${activeTab === 'overview' ? 'bg-navy text-white' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`pill cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'news' ? 'bg-navy text-white' : 'bg-blue-50 text-blue-700'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Campus Live Wire & AI News ({uniNews.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`pill cursor-pointer ${activeTab === 'alumni' ? 'bg-navy text-white' : ''}`}
        >
          Alumni Directory ({uniAlumni.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pill cursor-pointer ${activeTab === 'students' ? 'bg-navy text-white' : ''}`}
        >
          Students ({uniStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('change')}
          className={`pill cursor-pointer ${activeTab === 'change' ? 'bg-navy text-white' : ''}`}
        >
          Submit Information Change
        </button>
      </div>

      {/* Tab: Campus Live Wire & AI News */}
      {activeTab === 'news' && (
        <div className="mt-6 space-y-6">
          <div className="card p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 bg-blue-100 text-blue-700 rounded-lg">
                  <Bot className="w-4 h-4 text-blue-700" />
                </span>
                <h3 className="font-black navy text-lg">
                  {assignedUniName} Live News & Achievement Wire
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                As University Administrator, you can designate live stories as permanent archives, cancel the 10-day expiration timer, trigger autonomous web intelligence scans, and publish campus announcements.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleScanUniversityWire}
                disabled={isScanningWire}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningWire ? 'animate-spin' : ''}`} />
                <span>{isScanningWire ? 'Scanning Web Wire...' : 'Scan Campus AI Wire'}</span>
              </button>

              <button
                onClick={() => setShowAddNewsModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish News</span>
              </button>
            </div>
          </div>

          {/* Add News Modal */}
          {showAddNewsModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="card p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-black navy mb-1">Publish Campus News / Achievement</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Will be published under {assignedUniName} as a permanent institutional archive.
                </p>

                <form onSubmit={handleCreateAnnouncement} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Headline *</label>
                    <input
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Alumnus wins prestigious national award or closes funding"
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
                        <option value="University announcements">University announcements</option>
                        <option value="Department announcements">Department announcements</option>
                        <option value="Research">Research</option>
                        <option value="Scholarships">Scholarships</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                      <input
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        placeholder="e.g. Computer Science & Engineering"
                        className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Award / Prize Name (Optional)
                    </label>
                    <input
                      value={newPrizeName}
                      onChange={(e) => setNewPrizeName(e.target.value)}
                      placeholder="e.g. ACM Gordon Bell Prize, Fulbright Scholarship ($100k)"
                      className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Summary</label>
                    <textarea
                      required
                      rows={2}
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      placeholder="1-2 sentences summarizing the achievement"
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
                      placeholder="Full details of the announcement or alumni milestone"
                      className="w-full text-xs border border-soft rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isHotCheckbox"
                      checked={newIsHot}
                      onChange={(e) => setNewIsHot(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="isHotCheckbox" className="text-xs font-bold text-rose-700 flex items-center gap-1 cursor-pointer">
                      <Flame className="w-3.5 h-3.5" />
                      Mark as Breaking HOT TOPIC (Prominently featured across platform)
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
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* News List */}
          <div className="grid gap-4">
            {uniNews.length === 0 ? (
              <div className="card p-12 text-center text-slate-400">
                <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold navy text-sm">No campus stories published yet.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Scan Campus AI Wire" to crawl web achievements and scholarly journals for {assignedUniName}.
                </p>
              </div>
            ) : (
              uniNews.map((n) => {
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

                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {n.category}
                        </span>

                        {n.department && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {n.department}
                          </span>
                        )}
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
                            title="Auto-purged after 10 days unless made permanent"
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
                          title="University Admin action to seal news permanently"
                        >
                          <Pin className="w-3 h-3" />
                          <span>{n.isPermanent ? 'Unpin' : 'Make Permanent'}</span>
                        </button>

                        <button
                          onClick={() => deleteNewsArticle(n.id, 'University Admin removal')}
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
                        className="text-blue-600 font-bold hover:underline"
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

      {/* Tab: Campus Members & Registered Users */}
      {activeTab === 'members' && (
        <div className="mt-6 space-y-4">
          <div className="card p-5 shadow-xl border-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold navy text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Campus Members Directory ({uniUsers.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional access to all registered students, alumni, and departmental staff for {assignedUniName}.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name, gmail, dept, id..."
                  className="w-full pl-9 pr-3 py-1.5 border border-soft rounded-xl text-xs bg-white outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-soft">
                  <tr>
                    <th className="p-3">User & Contact (Gmail)</th>
                    <th className="p-3">Department & Academic ID</th>
                    <th className="p-3">Role & Status</th>
                    <th className="p-3">Career / Year</th>
                    <th className="p-3 text-right">Security & Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft">
                  {filteredUniUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No registered members found matching the search criteria for {assignedUniName}.
                      </td>
                    </tr>
                  ) : (
                    filteredUniUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {u.name?.charAt(0) || 'U'}
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

                        <td className="p-3">
                          <b className="text-slate-800 text-xs block">{u.department || 'General'}</b>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            {u.studentId ? `ID: ${u.studentId}` : 'ID: Not specified'}
                          </span>
                        </td>

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

                        <td className="p-3">
                          <span className="text-xs text-slate-700 block">
                            {u.profileType === 'Student'
                              ? u.studentYear || 'Current Student'
                              : u.graduationYear ? `Batch of ${u.graduationYear}` : 'Alumni'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">
                            {u.jobRole ? `${u.jobRole} at ${u.company}` : u.city ? `${u.city}, ${u.country}` : 'Bangladesh'}
                          </span>
                        </td>

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

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="mt-6 card p-6 shadow-xl space-y-4">
          <h3 className="font-bold navy text-lg">Institutional Information</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{university.overview}</p>
          <div className="text-xs text-slate-400 pt-4 border-t border-soft">
            Location: {university.location}
          </div>
        </div>
      )}

      {/* Tab: Alumni */}
      {activeTab === 'alumni' && (
        <div className="mt-6 card p-6 shadow-xl">
          <h3 className="font-bold navy text-lg mb-4">University Alumni Records</h3>
          {uniAlumni.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No alumni records yet.</div>
          ) : (
            <div className="divide-y divide-soft">
              {uniAlumni.map((a) => (
                <div key={a.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <b className="navy text-sm block">{a.name}</b>
                    <span className="text-slate-500">
                      {a.department} · {a.jobRole} at {a.company} ({a.country})
                    </span>
                  </div>
                  <span className="pill text-[10px]">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Students */}
      {activeTab === 'students' && (
        <div className="mt-6 card p-6 shadow-xl">
          <h3 className="font-bold navy text-lg mb-4">Enrolled Students</h3>
          {uniStudents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No registered students yet.</div>
          ) : (
            <div className="divide-y divide-soft">
              {uniStudents.map((s) => (
                <div key={s.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <b className="navy text-sm block">{s.name}</b>
                    <span className="text-slate-500">
                      {s.department} · {s.studentYear} · Expected: {s.expectedGraduation}
                    </span>
                  </div>
                  <span className="pill text-[10px]">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Change Request */}
      {activeTab === 'change' && (
        <div className="mt-6 card p-6 sm:p-8 shadow-xl max-w-2xl">
          <h3 className="text-xl font-black navy">Propose University Information Change</h3>
          <p className="text-xs text-slate-500 mt-1">
            Protected public information requires Super Admin approval before updating.
          </p>

          <form onSubmit={handleProposeChange} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Location</label>
              <input
                value={proposedLocation}
                onChange={(e) => setProposedLocation(e.target.value)}
                className="account-input mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Institution Overview / Vision</label>
              <textarea
                value={proposedOverview}
                onChange={(e) => setProposedOverview(e.target.value)}
                rows={4}
                className="account-input mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Reason for Update</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="account-input mt-1"
                placeholder="e.g. Updated strategic research facilities and campus location"
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
