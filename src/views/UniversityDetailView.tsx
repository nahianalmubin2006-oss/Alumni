import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { University } from '../types';
import {
  universityInitials,
  getUniversityLogo,
} from '../data/initialData';
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
  ArrowLeft,
  Building2,
  MapPin,
  GraduationCap,
  Users,
  Globe,
  TrendingUp,
  Briefcase,
  Heart,
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
    canUserManageArticle,
    toggleFollowUniversity,
    isFollowingUniversity,
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

  // Administrative controls belong strictly to the separated Admin Portal
  const canMakePermanent = false;

  // Find university record or generate representation
  const university = useMemo(() => {
    return universities.find((u) => u.name.toLowerCase() === universityName.toLowerCase()) || {
      id: '', name: universityName, type: 'Public' as const, location: '', verified: false,
      alumniCount: 0, studentCount: 0, followersCount: 0, departmentCount: 0,
      employmentRate: 0, higherStudiesRate: 0, countriesCount: 0, companiesCount: 0,
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
    return Array.from(new Set(fromDb.filter((d) => d.verified === true).map((d) => d.name)));
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

  // Institutional administration is managed in the Admin Dashboard
  const isThisUniAdmin = false;

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Breadcrumb and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('universities')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
            <span>Back to Universities</span>
          </button>
          <span className="text-slate-300 text-xs hidden sm:inline">/</span>
          <span className="text-xs font-medium text-slate-500 truncate max-w-[200px] sm:max-w-md hidden sm:inline">
            {university.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Follow / Unfollow University Button */}
          <button
            onClick={() => {
              if (!currentUser) {
                onNavigate('account');
                return;
              }
              toggleFollowUniversity(university.name);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
              isFollowingUniversity(university.name)
                ? 'bg-blue-600 text-white hover:bg-rose-600'
                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFollowingUniversity(university.name) ? 'fill-current' : ''}`} />
            <span>{isFollowingUniversity(university.name) ? 'Following Campus' : '+ Follow Campus'}</span>
          </button>

          {isThisUniAdmin && (
            <button
              onClick={() => {
                setEditOverview(university.overview || '');
                setEditLocation(university.location || '');
                setShowEditModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>✏ Edit Institutional Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Premium Hero Banner */}
      <div className="hero-navy-card p-6 sm:p-8 md:p-10 relative overflow-hidden">
        {/* Subtle Decorative Ambient Rings & Mesh */}
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full border border-blue-400/10 pointer-events-none bg-blue-500/5 blur-2xl"></div>
        <div className="absolute -right-10 -bottom-36 w-96 h-96 rounded-full border border-indigo-400/10 pointer-events-none bg-indigo-500/5 blur-3xl"></div>
        <div className="absolute left-1/2 top-0 w-96 h-24 bg-gradient-to-b from-blue-400/10 to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start relative z-10">
          {/* Institution Crest / Insignia Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-0.5 shadow-2xl ring-4 ring-white/15 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-white flex flex-col items-center justify-center text-center p-1.5 shadow-inner overflow-hidden">
                {university.logoUrl || getUniversityLogo(university.name) ? (
                  <img
                    src={university.logoUrl || getUniversityLogo(university.name)}
                    alt={`${university.name} official crest emblem`}
                    className="w-full h-full object-contain p-1 rounded-md hover:scale-105 transition duration-200"
                  />
                ) : (
                  <>
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-0.5" />
                    <span className="text-2xl sm:text-3xl font-black text-[#0b1f3a] tracking-tight leading-none">
                      {universityInitials(university.name)}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600 mt-1">
                      CAMPUS
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Institution Information */}
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 backdrop-blur-md shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>UGC Verified Institution</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-100 border border-white/20 backdrop-blur-md">
                <Building2 className="w-3 h-3 text-blue-300" />
                <span>{university.type} University</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-100 border border-white/20 backdrop-blur-md">
                <Globe className="w-3 h-3 text-cyan-300" />
                <span>Global Intelligence Node</span>
              </span>
            </div>

            {/* University Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
              {university.name}
            </h1>

            {/* Location & Registry Subtitle */}
            <div className="flex items-center gap-2 mt-2 text-blue-200 text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-1 text-rose-300">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{university.location || 'Dhaka, Bangladesh'}</span>
              </div>
              <span className="text-white/30">•</span>
              <span className="text-slate-300">Official Higher Education Entity</span>
            </div>

            {/* Overview Statement */}
            <p className="text-slate-200 mt-3 text-xs sm:text-sm leading-relaxed max-w-3xl font-normal">
              {university.overview || `${university.name} is a premier institution recognized for academic excellence, innovative student research, and impactful alumni outcomes globally.`}
            </p>

            {/* Interactive Highlights & Pills */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-white/10">
              <div className="hero-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-300" />
                <span>{university.alumniCount?.toLocaleString() || '0'} Registered Alumni</span>
              </div>

              <div className="hero-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>{university.departmentCount || departments.filter((d) => d.university.toLowerCase() === university.name.toLowerCase()).length} Academic Departments</span>
              </div>

              <div className="hero-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-300" />
                <span>{university.countriesCount || 0} Destination Countries</span>
              </div>

              {university.website && (
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer ml-auto"
                >
                  <span>Portal Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern High-Impact Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6">
        <div className="metric flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Campus Followers</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <b className="text-2xl sm:text-3xl font-black text-rose-600">
            {university.followersCount?.toLocaleString() || '0'}
          </b>
          <p className="text-[11px] text-slate-400 mt-1">Community members</p>
        </div>

        <div className="metric flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Alumni Cohort</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <b className="text-2xl sm:text-3xl font-black text-[#0b1f3a]">
            {university.alumniCount?.toLocaleString() || '0'}
          </b>
          <p className="text-[11px] text-slate-400 mt-1">Graduated alumni</p>
        </div>

        <div className="metric flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Enrolled Students</span>
            <GraduationCap className="w-4 h-4 text-indigo-500" />
          </div>
          <b className="text-2xl sm:text-3xl font-black text-indigo-600">
            {university.studentCount?.toLocaleString() || '0'}
          </b>
          <p className="text-[11px] text-slate-400 mt-1">Current study body</p>
        </div>

        <div className="metric flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Employment Rate</span>
            <Briefcase className="w-4 h-4 text-emerald-500" />
          </div>
          <b className="text-2xl sm:text-3xl font-black text-emerald-600">
            {university.employmentRate ? `${university.employmentRate}%` : '—'}
          </b>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Industry placement</p>
        </div>

        <div className="metric flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Global Footprint</span>
            <Globe className="w-4 h-4 text-cyan-500" />
          </div>
          <b className="text-2xl sm:text-3xl font-black text-[#0b1f3a]">
            {university.countriesCount || 0}
          </b>
          <p className="text-[11px] text-slate-400 mt-1">Host nations worldwide</p>
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
          {departments.filter((d) => d.university.toLowerCase() === university.name.toLowerCase() && d.verified === true).map((dept) => (
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

                          {canUserManageArticle(n) && (
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
