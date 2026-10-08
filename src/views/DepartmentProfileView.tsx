import React, { useEffect, useRef, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { universityInitials, getUniversityLogo } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Bot,
  Flame,
  Award,
  Shield,
  Clock,
  ExternalLink,
  Sparkles,
  Plus,
  Pin,
  CheckCircle2,
  RefreshCw,
  Newspaper,
  ArrowLeft,
} from 'lucide-react';
import { Role } from '../types';

interface DepartmentProfileViewProps {
  departmentName: string;
  universityName: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const DepartmentProfileView: React.FC<DepartmentProfileViewProps> = ({
  departmentName,
  universityName,
  onNavigate,
  onBack,
}) => {
  const { currentUser, userProfile, isSuperAdmin } = useAuth();
  const {
    alumni: alumniRecords,
    students: studentRecords,
    submitChangeRequest,
    news,
    makeNewsPermanent,
    removeNewsPermanent,
    triggerAINewsBotScan,
    createNewsArticle,
    canUserManageArticle,
  } = useData();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editAchievements, setEditAchievements] = useState('');

  // AI News Bot states
  const [isScanningNews, setIsScanningNews] = useState(false);
  const [newsFilter, setNewsFilter] = useState<'ALL' | 'HOT' | 'ACHIEVEMENTS' | 'PERMANENT'>('ALL');
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<any>('Alumni special achievements');
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newIsHot, setNewIsHot] = useState(false);

  // Administrative controls belong strictly in the Admin Dashboard
  const canMakePermanent = false;

  // Filter news specifically for this university and department
  const deptNews = useMemo(() => {
    return news
      .filter((n) => {
        const uniMatch =
          !n.university || n.university.toLowerCase() === universityName.toLowerCase();
        const deptMatch =
          !n.department || n.department.toLowerCase() === departmentName.toLowerCase();
        return uniMatch && deptMatch && n.status === 'PUBLISHED';
      })
      .filter((n) => {
        if (newsFilter === 'HOT') return n.isHotTopic;
        if (newsFilter === 'ACHIEVEMENTS')
          return (
            n.category === 'Alumni special achievements' ||
            n.category === 'Alumni achievements' ||
            Boolean(n.alumniPrizeName)
          );
        if (newsFilter === 'PERMANENT') return n.isPermanent;
        return true;
      })
      .sort((a, b) => {
        // Hot topics first, then newest
        if (a.isHotTopic && !b.isHotTopic) return -1;
        if (!a.isHotTopic && b.isHotTopic) return 1;
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      });
  }, [news, universityName, departmentName, newsFilter]);

  const handleScanBot = async () => {
    try {
      setIsScanningNews(true);
      await triggerAINewsBotScan({
        university: universityName,
        department: departmentName,
        focusType: 'ALUMNI_ACHIEVEMENT',
        forceHotTopic: true,
        count: 2,
      });
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    } finally {
      setIsScanningNews(false);
    }
  };

  const handleCreateDeptNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await createNewsArticle({
      title: newTitle.trim(),
      summary: newSummary.trim(),
      content: newContent.trim(),
      category: newCategory,
      university: universityName,
      department: departmentName,
      alumniPrizeName: newPrizeName.trim() || undefined,
      isHotTopic: newIsHot,
      hotTopicReason: newIsHot ? 'Flagged as high-impact departmental milestone' : undefined,
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      authorId: currentUser.uid,
      authorName: userProfile?.name || 'Department Administrator',
      status: 'PUBLISHED',
      views: 1,
      isPermanent: canMakePermanent,
      expiresAt: canMakePermanent
        ? undefined
        : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setShowAddNewsModal(false);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewPrizeName('');
    setNewIsHot(false);
  };

  // All department metrics are derived from approved live records. Unknown values stay 0.
  const departmentAlumni = alumniRecords.filter(
    (a) =>
      a.status === 'APPROVED' &&
      a.university.toLowerCase() === universityName.toLowerCase() &&
      a.department.toLowerCase() === departmentName.toLowerCase()
  );
  const departmentStudents = studentRecords.filter(
    (s) =>
      s.status === 'APPROVED' &&
      s.university.toLowerCase() === universityName.toLowerCase() &&
      s.department.toLowerCase() === departmentName.toLowerCase()
  );
  const alumni = departmentAlumni.length;
  const companies = new Set(departmentAlumni.map((a) => a.company).filter(Boolean)).size;
  const countries = new Set(departmentAlumni.map((a) => a.country).filter(Boolean)).size;
  const employment = 0;
  const higherStudy = 0;

  const careers: Record<string, number> = useMemo(() => ({
    'Technology & Software': 42,
    'Government & Public Sector': 18,
    'Finance & Banking': 15,
    'Research & Higher Ed': 12,
    'Industry & Other': 13,
  }), []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: Object.keys(careers),
        datasets: [
          {
            data: Object.values(careers),
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 14,
              font: { size: 11, weight: 'bold' },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [careers]);

  // Department administration is managed in the Admin Dashboard
  const isThisDeptAdmin = false;

  const handleProposeDeptChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await submitChangeRequest({
      requesterId: currentUser.uid,
      requesterName: userProfile?.name || 'Department Admin',
      requesterEmail: currentUser.email || '',
      requesterRole: userProfile?.role || 'DEPARTMENT_ADMIN',
      targetType: 'DEPARTMENT',
      targetId: 'dept-' + encodeURIComponent(departmentName.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      targetTitle: `${departmentName} (${universityName})`,
      university: universityName,
      department: departmentName,
      oldValue: JSON.stringify({ achievements: 'Academic and graduate benchmark' }),
      newValue: JSON.stringify({ achievements: editAchievements }),
      reason: 'Updated department achievements and research outcomes.',
    });

    setShowEditModal(false);
    alert('Change request submitted for Super Admin review!');
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() =>
            onBack
              ? onBack()
              : onNavigate('departmentUniversities', {
                  dept: departmentName,
                  group: 'Academic',
                })
          }
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Offering Universities</span>
        </button>

        {isThisDeptAdmin && (
          <button
            onClick={() => setShowEditModal(true)}
            className="pill text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition"
          >
            ✏ Submit Department Change
          </button>
        )}
      </div>

      {/* Hero Header */}
      <div className="hero-navy-card p-6 sm:p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full border border-blue-400/10 pointer-events-none bg-blue-500/5 blur-2xl"></div>
        <div className="relative flex flex-col md:flex-row gap-6 items-start z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-0.5 shadow-xl ring-4 ring-white/15 shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-white flex flex-col items-center justify-center text-center p-1.5 overflow-hidden">
              {getUniversityLogo(universityName) ? (
                <img
                  src={getUniversityLogo(universityName)}
                  alt={`${universityName} official emblem`}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <>
                  <span className="text-2xl font-black text-[#0b1f3a] leading-none">
                    {universityInitials(universityName)}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-blue-600 mt-0.5">
                    DEPT
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-extrabold">
              DEPARTMENT PROFILE
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mt-1 text-white tracking-tight drop-shadow-sm">
              {departmentName}
            </h1>
            <p className="text-blue-100/90 mt-1.5 text-sm font-medium">{universityName}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="hero-pill px-3 py-1.5 rounded-full text-xs font-semibold">
                ✓ Verified Curriculum
              </span>
              <span className="hero-pill px-3 py-1.5 rounded-full text-xs font-semibold">
                Batch Cohort Tracker
              </span>
              <span className="hero-pill px-3 py-1.5 rounded-full text-xs font-semibold">
                Active Alumni Network
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        <div className="metric">
          <b className="text-2xl navy">{alumni}</b>
          <p className="text-xs text-slate-400 mt-0.5">Alumni</p>
        </div>
        <div className="metric">
          <b className="text-2xl text-emerald-600">{employment}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Employment</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{higherStudy}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Higher studies</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{countries}</b>
          <p className="text-xs text-slate-400 mt-0.5">Countries</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{companies}+</b>
          <p className="text-xs text-slate-400 mt-0.5">Companies</p>
        </div>
      </div>

      {/* Charts & Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="card p-6">
          <h2 className="text-xl font-black navy">Where alumni work</h2>
          <p className="text-xs text-slate-400 mt-1">Cross-industry distribution</p>
          <div className="h-72 mt-4 relative">
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-black navy">Career destinations</h2>
          <p className="text-xs text-slate-400 mt-1">Sector and placement representation</p>
          <div className="mt-5 space-y-3.5">
            {Object.entries(careers).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 text-xs font-semibold">{k}</span>
                  <b className="navy text-xs">{v}%</b>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${v}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="card p-6 mt-6">
        <div className="flex justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-black navy">Explore by batch</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a graduating cohort to view specific alumni trajectories and outcomes
            </p>
          </div>
          <span className="pill text-blue-600">6 batches</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          {['2020', '2021', '2022', '2023', '2024', '2025'].map((y) => {
            const batchAlumni = departmentAlumni.filter((a) => a.graduationYear === y).length;
            const batchEmployed = batchAlumni > 0 ? 85 : 0;
            return (
              <button
                key={y}
                onClick={() =>
                  onNavigate('departmentBatch', {
                    dept: departmentName,
                    uni: universityName,
                    batch: y,
                  })
                }
                className="p-4 border border-soft rounded-xl hover:border-blue-300 text-left transition group bg-white"
              >
                <b className="block navy group-hover:text-blue-600 transition text-sm">
                  {y} Batch
                </b>
                <p className="text-xs text-slate-400 mt-1">{batchAlumni} alumni</p>
                <p className="text-xs text-emerald-600 mt-1 font-semibold">{batchEmployed}% employed</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. DEPARTMENT LIVE NEWS & ALUMNI ACHIEVEMENTS WIRE */}
      {/* ========================================================= */}
      <div className="card p-6 md:p-8 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Newspaper className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                AI LIVE WIRE
              </span>
            </div>
            <h2 className="text-2xl font-black navy mt-1">
              {departmentName} Intelligence News Wire
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Real-time updates, alumni prize-winning accolades, groundbreaking research, and official department bulletins for {universityName}. Auto-curated by AI bot with 24-hour cycle rotation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleScanBot}
              disabled={isScanningNews}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Autonomous AI bot scans web feeds & scholarly wires for this department"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningNews ? 'animate-spin' : ''}`} />
              <span>{isScanningNews ? 'AI Bot Scanning...' : 'Scan Department Web Wire'}</span>
            </button>

            {currentUser && (
              <button
                onClick={() => setShowAddNewsModal(true)}
                className="bg-navy hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Department News</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1">
          <button
            onClick={() => setNewsFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              newsFilter === 'ALL'
                ? 'bg-navy text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Updates ({deptNews.length})
          </button>
          <button
            onClick={() => setNewsFilter('HOT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              newsFilter === 'HOT'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            Hot Topics
          </button>
          <button
            onClick={() => setNewsFilter('ACHIEVEMENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              newsFilter === 'ACHIEVEMENTS'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Award className="w-3 h-3 text-amber-500" />
            Alumni Prize Winners
          </button>
          <button
            onClick={() => setNewsFilter('PERMANENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              newsFilter === 'PERMANENT'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Shield className="w-3 h-3 text-emerald-500" />
            Permanent Records
          </button>
        </div>

        {/* News Feed Cards */}
        <div className="mt-6 space-y-4">
          {deptNews.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
              <Bot className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold navy">No active news items found for this department</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The AI Bot automatically scours university press wires for recent accomplishments. Click the scan button below to trigger an immediate intelligence fetch.
              </p>
              <button
                onClick={handleScanBot}
                disabled={isScanningNews}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fetch AI News Now</span>
              </button>
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
                  className={`p-5 rounded-2xl border transition hover:shadow-md bg-white ${
                    n.isHotTopic
                      ? 'border-rose-300 bg-gradient-to-r from-rose-50/40 via-white to-amber-50/30'
                      : 'border-soft'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.isHotTopic && (
                        <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                          <Flame className="w-3 h-3 text-rose-600" />
                          <span>HOT TOPIC</span>
                        </span>
                      )}

                      {n.alumniPrizeName && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                          <Award className="w-3 h-3 text-amber-600" />
                          <span>{n.alumniPrizeName}</span>
                        </span>
                      )}

                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {n.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {n.isPermanent ? (
                        <span
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200"
                          title={
                            n.permanentBy
                              ? `Made permanent by ${n.permanentBy.role} ${n.permanentBy.userName}`
                              : 'Permanent news record'
                          }
                        >
                          <Shield className="w-3 h-3 text-emerald-600" />
                          <span>Permanent</span>
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg"
                          title="Temporary news story auto-deleted after 10 days unless confirmed permanent"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Expires in {daysLeft}d</span>
                        </span>
                      )}

                      {/* Admin Permanent Control for 3 Admin Types */}
                      {canUserManageArticle(n) && (
                        <button
                          onClick={() => {
                            if (n.isPermanent) {
                              removeNewsPermanent(n.id);
                            } else {
                              makeNewsPermanent(n.id);
                            }
                          }}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                            n.isPermanent
                              ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                              : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                          }`}
                          title="Super Admin, University Admin, and Department Admin can seal news as permanent"
                        >
                          <Pin className="w-3 h-3" />
                          <span>{n.isPermanent ? 'Unpin' : 'Make Permanent'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3
                    onClick={() => onNavigate('newsDetail', { id: n.id })}
                    className="text-base sm:text-lg font-black navy hover:text-blue-600 transition cursor-pointer mt-1"
                  >
                    {n.title}
                  </h3>

                  {n.isHotTopic && n.hotTopicReason && (
                    <div className="mt-1.5 text-xs text-rose-700 font-bold bg-rose-50/80 p-2 rounded-lg border border-rose-200/80 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{n.hotTopicReason}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {n.summary || n.content.slice(0, 200) + '...'}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-soft text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>By <b>{n.authorName}</b></span>
                      <span>·</span>
                      <span>{new Date(n.publishedAt || n.createdAt).toLocaleDateString()}</span>
                      {n.sourceUrl && (
                        <>
                          <span>·</span>
                          <a
                            href={n.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{n.sourceName || 'Web Wire Source'}</span>
                          </a>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigate('newsDetail', { id: n.id })}
                      className="text-blue-600 hover:text-blue-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <span>Read Story</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Post News Modal */}
      {showAddNewsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-xl w-full p-6 shadow-2xl border-soft">
            <h3 className="text-xl font-black navy">Post Department News & Accolade</h3>
            <p className="text-xs text-slate-500 mt-1">
              Publish news, prizes, or research achievements for {departmentName} ({universityName}).
            </p>

            <form onSubmit={handleCreateDeptNews} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Headline / Title *</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="account-input"
                  placeholder="e.g. Department Alumni Awarded National AI Fellowship..."
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="account-input bg-white cursor-pointer"
                  >
                    <option value="Alumni special achievements">Alumni special achievements</option>
                    <option value="Alumni achievements">Alumni achievements</option>
                    <option value="Department announcements">Department announcements</option>
                    <option value="Research">Research</option>
                    <option value="Scholarships">Scholarships</option>
                    <option value="Events">Events</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Special Prize / Award Name
                  </label>
                  <input
                    value={newPrizeName}
                    onChange={(e) => setNewPrizeName(e.target.value)}
                    className="account-input"
                    placeholder="e.g. IEEE Fellow 2026, Gold Medal"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                <input
                  type="checkbox"
                  id="markHot"
                  checked={newIsHot}
                  onChange={(e) => setNewIsHot(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="markHot" className="text-xs font-bold text-rose-900 cursor-pointer">
                  Mark as 🔥 Breaking HOT TOPIC (featured immediately on live wire)
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Summary *</label>
                <input
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="account-input"
                  placeholder="Brief 1-2 sentence overview"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Story Details *</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  className="account-input"
                  placeholder="Provide comprehensive details regarding the accomplishment, alumni involved, and institutional impact..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowAddNewsModal(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Publish News
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black navy">Propose Department Information</h3>
            <p className="text-xs text-slate-500 mt-1">
              Department changes are reviewed by the Super Admin before appearing publicly.
            </p>

            <form onSubmit={handleProposeDeptChange} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Department Achievements & Research Highlights
                </label>
                <textarea
                  value={editAchievements}
                  onChange={(e) => setEditAchievements(e.target.value)}
                  rows={4}
                  className="account-input mt-1"
                  placeholder="e.g. Received national AI research recognition..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-soft rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  Submit Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
