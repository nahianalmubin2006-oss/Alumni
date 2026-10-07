import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { universityInitials, RAW_DEPARTMENT_CATALOG, demoSeed } from '../data/initialData';
import {
  Flame,
  Award,
  Shield,
  Clock,
  ExternalLink,
  Pin,
  RefreshCw,
  Bot,
  Sparkles,
  Newspaper,
  CheckCircle2,
} from 'lucide-react';

interface UniversityDetailViewProps {
  universityName: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const UniversityDetailView: React.FC<UniversityDetailViewProps> = ({
  universityName,
  onNavigate,
}) => {
  const {
    universities,
    departments,
    alumni,
    news,
    submitChangeRequest,
    makeNewsPermanent,
    removeNewsPermanent,
    triggerAINewsBotScan,
  } = useData();
  const { currentUser, userProfile, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'alumni' | 'batches' | 'news'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOverview, setEditOverview] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // AI news state in University View
  const [selectedNewsDept, setSelectedNewsDept] = useState('All');
  const [newsFilterType, setNewsFilterType] = useState<'ALL' | 'HOT' | 'ACHIEVEMENTS' | 'PERMANENT'>('ALL');
  const [isScanningUniNews, setIsScanningUniNews] = useState(false);

  // Check if current user is one of the 3 admin types
  const canMakePermanent =
    isSuperAdmin ||
    userProfile?.role === 'SUPER_ADMIN' ||
    userProfile?.role === 'UNIVERSITY_ADMIN' ||
    userProfile?.role === 'DEPARTMENT_ADMIN';

  // Find university record or generate representation
  const university = useMemo(() => {
    const found = universities.find((u) => u.name.toLowerCase() === universityName.toLowerCase());
    if (found) return found;

    const seed = demoSeed('uni-' + universityName);
    return {
      id: 'uni-' + encodeURIComponent(universityName.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      name: universityName,
      type: (universityName.includes('Engineering') || universityName.includes('Dhaka') ? 'Public' : 'Public') as any,
      location: 'Dhaka, Bangladesh',
      verified: true,
      alumniCount: 2840,
      departmentCount: 48,
      employmentRate: 84,
      higherStudiesRate: 11,
      countriesCount: 28,
      companiesCount: 510,
      overview: `${universityName} is a prestigious center of higher learning dedicated to academic excellence, innovative student research, and high-impact industry collaboration.`,
      website: 'https://ugc.gov.bd',
    };
  }, [universities, universityName]);

  // Related alumni
  const uniAlumni = useMemo(() => {
    return alumni.filter((a) => a.university.toLowerCase() === universityName.toLowerCase() && a.status === 'APPROVED');
  }, [alumni, universityName]);

  // Available departments for this university
  const uniDeptList = useMemo(() => {
    const fromDb = departments
      .filter((d) => d.university.toLowerCase() === universityName.toLowerCase())
      .map((d) => d.name);
    const catalog = RAW_DEPARTMENT_CATALOG.map((d) => d.name);
    return Array.from(new Set([...fromDb, ...catalog]));
  }, [departments, universityName]);

  // Related news with department filtering & hot topic prioritization
  const uniNews = useMemo(() => {
    return news
      .filter(
        (n) =>
          n.university?.toLowerCase() === universityName.toLowerCase() &&
          n.status === 'PUBLISHED'
      )
      .filter((n) => {
        if (selectedNewsDept === 'All') return true;
        return n.department?.toLowerCase() === selectedNewsDept.toLowerCase();
      })
      .filter((n) => {
        if (newsFilterType === 'HOT') return n.isHotTopic;
        if (newsFilterType === 'ACHIEVEMENTS')
          return (
            n.category === 'Alumni special achievements' ||
            n.category === 'Alumni achievements' ||
            Boolean(n.alumniPrizeName)
          );
        if (newsFilterType === 'PERMANENT') return n.isPermanent;
        return true;
      })
      .sort((a, b) => {
        if (a.isHotTopic && !b.isHotTopic) return -1;
        if (!a.isHotTopic && b.isHotTopic) return 1;
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      });
  }, [news, universityName, selectedNewsDept, newsFilterType]);

  const handleScanUniNews = async () => {
    try {
      setIsScanningUniNews(true);
      await triggerAINewsBotScan({
        university: universityName,
        department: selectedNewsDept !== 'All' ? selectedNewsDept : undefined,
        focusType: 'ALUMNI_ACHIEVEMENT',
        forceHotTopic: true,
        count: 2,
      });
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    } finally {
      setIsScanningUniNews(false);
    }
  };

  // Check if current user is university admin for this uni
  const isThisUniAdmin =
    isSuperAdmin ||
    (userProfile?.role === 'UNIVERSITY_ADMIN' &&
      userProfile?.assignedUniversity?.toLowerCase() === universityName.toLowerCase());

  const handleProposeChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await submitChangeRequest({
      requesterId: currentUser.uid,
      requesterName: userProfile?.name || 'University Admin',
      requesterEmail: currentUser.email || '',
      requesterRole: userProfile?.role || 'UNIVERSITY_ADMIN',
      targetType: 'UNIVERSITY',
      targetId: university.id,
      targetTitle: university.name,
      university: university.name,
      oldValue: JSON.stringify({ overview: university.overview, location: university.location }),
      newValue: JSON.stringify({ overview: editOverview || university.overview, location: editLocation || university.location }),
      reason: 'Updated institutional profile details for public network.',
    });

    setShowEditModal(false);
    alert('Change request submitted to Super Admin for approval!');
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      {/* Back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate('universities')}
          className="text-sm text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
        >
          <span>← Back to Universities</span>
        </button>

        {isThisUniAdmin && (
          <button
            onClick={() => {
              setEditOverview(university.overview || '');
              setEditLocation(university.location || '');
              setShowEditModal(true);
            }}
            className="pill text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition"
          >
            ✏ Submit Information Change
          </button>
        )}
      </div>

      {/* Hero Banner */}
      <div className="card p-7 md:p-9 bg-navy text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-white/10 pointer-events-none"></div>
        <div className="absolute -right-8 -bottom-40 w-96 h-96 rounded-full border border-white/10 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white text-navy flex items-center justify-center text-2xl font-black shadow-lg">
            {universityInitials(university.name)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{university.name}</h1>
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                ✓ UGC Verified
              </span>
            </div>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed max-w-2xl">
              {university.location || 'Bangladesh'} · {university.overview || 'Official Higher Education Profile'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="pill bg-white/10 border-white/15 text-white">
                {university.type} University
              </span>
              <span className="pill bg-white/10 border-white/15 text-white">
                {university.departmentCount || 48} departments
              </span>
              <span className="pill bg-white/10 border-white/15 text-white">
                Global Network Node
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
        <div className="metric">
          <b className="text-2xl navy">{university.alumniCount?.toLocaleString() || '2,840'}</b>
          <p className="text-xs text-slate-400 mt-0.5">Alumni</p>
        </div>
        <div className="metric">
          <b className="text-2xl text-emerald-600">{university.employmentRate || 84}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Employment</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{university.higherStudiesRate || 11}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Higher studies</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{university.countriesCount || 28}</b>
          <p className="text-xs text-slate-400 mt-0.5">Countries</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{university.companiesCount || '510+'}</b>
          <p className="text-xs text-slate-400 mt-0.5">Companies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10 flex gap-2 overflow-x-auto pb-2 border-b border-soft">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pill cursor-pointer transition ${
            activeTab === 'overview' ? 'text-blue-600 bg-blue-50 border-blue-200' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pill cursor-pointer transition ${
            activeTab === 'departments' ? 'text-blue-600 bg-blue-50 border-blue-200' : ''
          }`}
        >
          Departments
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`pill cursor-pointer transition ${
            activeTab === 'alumni' ? 'text-blue-600 bg-blue-50 border-blue-200' : ''
          }`}
        >
          Alumni ({uniAlumni.length || 'Directory'})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pill cursor-pointer transition ${
            activeTab === 'batches' ? 'text-blue-600 bg-blue-50 border-blue-200' : ''
          }`}
        >
          Batches (2020–2025)
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`pill cursor-pointer transition ${
            activeTab === 'news' ? 'text-blue-600 bg-blue-50 border-blue-200' : ''
          }`}
        >
          Live News ({uniNews.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <button
            onClick={() =>
              onNavigate('departmentProfile', {
                dept: 'Computer Science & Engineering',
                uni: university.name,
              })
            }
            className="card p-6 text-left lg:col-span-2 hover:-translate-y-1 transition group"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                  Featured Department
                </span>
                <h2 className="text-xl font-black navy mt-1 group-hover:text-blue-600 transition">
                  Computer Science & Engineering
                </h2>
                <p className="text-sm text-slate-400 mt-1">842 alumni · 84% employment outcome</p>
              </div>
              <span className="text-blue-600 font-black text-xl group-hover:translate-x-1 transition">
                →
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <b className="navy text-base">86/100</b>
                <p className="text-xs text-slate-400 mt-0.5">Career Index</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <b className="navy text-base">74/100</b>
                <p className="text-xs text-slate-400 mt-0.5">Research Index</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <b className="navy text-base">88/100</b>
                <p className="text-xs text-slate-400 mt-0.5">Industry Rating</p>
              </div>
            </div>
          </button>

          <div className="card p-6">
            <h3 className="font-bold navy text-base">Top global destinations</h3>
            <p className="text-xs text-slate-400 mt-1">Geographic distribution of alumni</p>
            <div className="mt-5 space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Bangladesh</span>
                <b className="navy">72%</b>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '72%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Germany</span>
                <b className="navy">7%</b>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '7%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">USA</span>
                <b className="navy">6%</b>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '6%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">Canada</span>
                <b className="navy">5%</b>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '5%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600">United Kingdom</span>
                <b className="navy">4%</b>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '4%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RAW_DEPARTMENT_CATALOG.slice(0, 15).map((dept) => (
            <button
              key={dept.name}
              onClick={() =>
                onNavigate('departmentProfile', {
                  dept: dept.name,
                  uni: university.name,
                })
              }
              className="card p-5 text-left hover:-translate-y-1 transition group"
            >
              <div className="flex justify-between items-start">
                <span className="pill text-[11px] text-blue-600">{dept.group}</span>
                <span className="text-slate-400 group-hover:text-blue-600 transition">→</span>
              </div>
              <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 transition">
                {dept.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Active career cohort tracking</p>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'alumni' && (
        <div className="mt-6">
          {uniAlumni.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              <p className="font-semibold">No direct alumni records registered yet for {university.name}.</p>
              <p className="text-xs text-slate-400 mt-2">
                New accounts created by graduates of this university appear here automatically once approved.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniAlumni.map((a) => (
                <div key={a.id} className="card p-5 flex gap-4">
                  <div className="w-12 h-12 rounded-full avatar flex items-center justify-center font-bold text-base">
                    {a.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <b className="text-slate-900 block">{a.name}</b>
                    <p className="text-sm text-slate-500">{a.jobRole}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {a.company} · {a.country}
                    </p>
                    {a.isVerified && (
                      <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✓ Verified Alumni
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {['2020', '2021', '2022', '2023', '2024', '2025'].map((yr) => (
            <button
              key={yr}
              onClick={() =>
                onNavigate('departmentBatch', {
                  dept: 'Computer Science & Engineering',
                  uni: university.name,
                  batch: yr,
                })
              }
              className="card p-4 text-center hover:border-blue-400 transition"
            >
              <span className="text-xs text-blue-600 font-bold block">COHORT</span>
              <b className="text-xl navy block mt-1">{yr}</b>
              <span className="text-[11px] text-slate-400 block mt-1">View batch →</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'news' && (
        <div className="mt-6 space-y-6">
          {/* AI Intelligence Header & Department Filter Bar */}
          <div className="card p-6 border-soft">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-soft">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-blue-100 text-blue-700 rounded-lg">
                    <Newspaper className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    AI LIVE WIRE
                  </span>
                </div>
                <h3 className="text-lg font-black navy mt-1">
                  {university.name} Live Intelligence & Accolades
                </h3>
                <p className="text-xs text-slate-500">
                  Daily 24h rotating news wire covering all departments, alumni prize winners, and research breakthroughs.
                </p>
              </div>

              <button
                onClick={handleScanUniNews}
                disabled={isScanningUniNews}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningUniNews ? 'animate-spin' : ''}`} />
                <span>{isScanningUniNews ? 'AI Bot Scanning...' : 'Scan University Web Wire'}</span>
              </button>
            </div>

            {/* Department and Category Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Department:</label>
                <select
                  value={selectedNewsDept}
                  onChange={(e) => setSelectedNewsDept(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-soft rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {uniDeptList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setNewsFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    newsFilterType === 'ALL'
                      ? 'bg-navy text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({uniNews.length})
                </button>
                <button
                  onClick={() => setNewsFilterType('HOT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    newsFilterType === 'HOT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  Hot Topics
                </button>
                <button
                  onClick={() => setNewsFilterType('ACHIEVEMENTS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    newsFilterType === 'ACHIEVEMENTS'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <Award className="w-3 h-3 text-amber-500" />
                  Alumni Prizes
                </button>
                <button
                  onClick={() => setNewsFilterType('PERMANENT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    newsFilterType === 'PERMANENT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Shield className="w-3 h-3 text-emerald-500" />
                  Permanent Records
                </button>
              </div>
            </div>
          </div>

          {/* News Cards Grid */}
          {uniNews.length === 0 ? (
            <div className="card p-12 text-center text-slate-400 bg-white border-dashed border-slate-300">
              <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm navy">
                No active news stories matching "{selectedNewsDept}"
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Trigger the autonomous AI bot to scan web archives and scholarly journals for this institution.
              </p>
              <button
                onClick={handleScanUniNews}
                disabled={isScanningUniNews}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fetch AI News Now</span>
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {uniNews.map((n) => {
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
                    className={`card p-5 transition hover:shadow-md flex flex-col justify-between bg-white ${
                      n.isHotTopic
                        ? 'border-rose-300 bg-gradient-to-br from-rose-50/30 to-amber-50/20'
                        : 'hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
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

                          <span className="pill text-[10px] text-blue-600 bg-blue-50">
                            {n.category}
                          </span>

                          {n.department && (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {n.department}
                            </span>
                          )}
                        </div>

                        {/* Retention & 3 Admin Types Permanent Action */}
                        <div className="flex items-center gap-1.5">
                          {n.isPermanent ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Shield className="w-3 h-3 text-emerald-600" />
                              <span>Permanent</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{daysLeft}d left</span>
                            </span>
                          )}

                          {canMakePermanent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (n.isPermanent) {
                                  removeNewsPermanent(n.id);
                                } else {
                                  makeNewsPermanent(n.id);
                                }
                              }}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                                n.isPermanent
                                  ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                                  : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                              }`}
                              title="Designate permanent status"
                            >
                              <Pin className="w-2.5 h-2.5" />
                              <span>{n.isPermanent ? 'Unpin' : 'Permanent'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <h3
                        onClick={() => onNavigate('newsDetail', { id: n.id })}
                        className="font-bold text-slate-900 mt-1 hover:text-blue-600 transition cursor-pointer leading-snug"
                      >
                        {n.title}
                      </h3>

                      {n.isHotTopic && n.hotTopicReason && (
                        <p className="text-[11px] text-rose-700 font-bold mt-1 bg-rose-50/70 p-1.5 rounded border border-rose-200">
                          {n.hotTopicReason}
                        </p>
                      )}

                      <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                        {n.summary || n.content.slice(0, 140) + '...'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-soft flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>{new Date(n.publishedAt || n.createdAt).toLocaleDateString()}</span>
                        {n.sourceUrl && (
                          <a
                            href={n.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Source</span>
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => onNavigate('newsDetail', { id: n.id })}
                        className="text-blue-600 hover:underline font-bold text-xs cursor-pointer"
                      >
                        Read story →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Proposal Modal for University Admin */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black navy">Propose University Information Change</h3>
            <p className="text-xs text-slate-500 mt-1">
              Submissions go to the central approval queue. Only Super Admin approved changes become public.
            </p>

            <form onSubmit={handleProposeChanges} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Location</label>
                <input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="account-input mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Overview / Vision</label>
                <textarea
                  value={editOverview}
                  onChange={(e) => setEditOverview(e.target.value)}
                  rows={4}
                  className="account-input mt-1"
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
