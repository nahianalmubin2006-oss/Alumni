import React, { useState, useEffect, useMemo } from 'react';
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
  onBack?: () => void;
}

export const UniversityDetailView: React.FC<UniversityDetailViewProps> = ({
  universityName,
  onNavigate,
  onBack,
}) => {
  const {
    universities,
    departments,
    alumni,
    students,
    batches,
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
  const [updateVersion, setUpdateVersion] = useState(0);

  useEffect(() => {
    const handler = () => setUpdateVersion((v) => v + 1);
    window.addEventListener('alumni-custom-logos-changed', handler);
    window.addEventListener('alumni-university-updated', handler);
    window.addEventListener('alumni-profile-updated', handler);
    window.addEventListener('alumni-directory-updated', handler);
    return () => {
      window.removeEventListener('alumni-custom-logos-changed', handler);
      window.removeEventListener('alumni-university-updated', handler);
      window.removeEventListener('alumni-profile-updated', handler);
      window.removeEventListener('alumni-directory-updated', handler);
    };
  }, []);

  // Administrative controls belong strictly to the separated Admin Portal
  const canMakePermanent = false;

  // Find university record or generate representation
  const university = useMemo(() => {
    const qName = universityName.toLowerCase().trim();
    let found = universities.find(
      (u) => u.name.toLowerCase().trim() === qName || u.id === universityName
    );

    if (!found) {
      try {
        const raw = localStorage.getItem('alumni_custom_universities');
        if (raw) {
          const customList: University[] = JSON.parse(raw);
          if (Array.isArray(customList)) {
            found = customList.find(
              (u) => u.name.toLowerCase().trim() === qName || u.id === universityName
            );
          }
        }
      } catch (e) {}
    }

    const customLogo = getUniversityLogo(universityName, found?.logoUrl);

    const matchingAlumni = alumni.filter(
      (a) => (a.university || '').toLowerCase().trim() === qName && (!a.status || a.status.toUpperCase() === 'APPROVED')
    );
    const matchingStudents = students.filter(
      (s) => (s.university || '').toLowerCase().trim() === qName && (!s.status || s.status.toUpperCase() === 'APPROVED')
    );
    const matchingDepts = new Set([
      ...departments.filter((d) => (d.university || '').toLowerCase().trim() === qName && d.status !== 'Inactive').map((d) => d.name),
      ...matchingAlumni.map((a) => a.department).filter(Boolean),
      ...matchingStudents.map((s) => s.department).filter(Boolean),
    ]);
    const liveAlumni = matchingAlumni.length;
    const liveStudents = matchingStudents.length;
    const liveDepts = matchingDepts.size;
    const liveCountries = new Set(matchingAlumni.map((a) => a.country).filter(Boolean)).size;
    const liveCompanies = new Set(matchingAlumni.map((a) => a.company).filter(Boolean)).size;

    const base: University = found || {
      id: 'uni-' + encodeURIComponent(qName.replace(/[^a-z0-9]/g, '-')),
      name: universityName,
      type: 'Public' as const,
      location: '',
      logoUrl: customLogo || '',
      website: '',
      overview: '',
      verified: false,
      followersCount: 0,
      alumniCount: 0,
      studentCount: 0,
      departmentCount: 0,
      countriesCount: 0,
      companiesCount: 0,
      employmentRate: 0,
      higherStudiesRate: 0,
    };

    return {
      ...base,
      logoUrl: base.logoUrl || customLogo || '',
      alumniCount: liveAlumni || base.alumniCount || 0,
      studentCount: liveStudents || base.studentCount || 0,
      departmentCount: liveDepts || base.departmentCount || 0,
      countriesCount: liveCountries || base.countriesCount || 0,
      companiesCount: liveCompanies || base.companiesCount || 0,
    };
  }, [universities, universityName, updateVersion, alumni, students, departments]);

  // Related alumni
  const uniAlumni = useMemo(() => {
    const qName = (universityName || '').toLowerCase().trim();
    return alumni.filter(
      (a) => (a.university || '').toLowerCase().trim() === qName && (!a.status || a.status.toUpperCase() === 'APPROVED')
    );
  }, [alumni, universityName]);

  // Related students
  const uniStudents = useMemo(() => {
    const qName = (universityName || '').toLowerCase().trim();
    return students.filter(
      (s) => (s.university || '').toLowerCase().trim() === qName && (!s.status || s.status.toUpperCase() === 'APPROVED')
    );
  }, [students, universityName]);

  // Real geographic destination distribution calculated from actual alumni records
  const topDestinations = useMemo(() => {
    if (uniAlumni.length === 0) return [];
    const countryMap = new Map<string, number>();
    uniAlumni.forEach((a) => {
      const c = (a.country || '').trim() || 'Bangladesh';
      countryMap.set(c, (countryMap.get(c) || 0) + 1);
    });
    return Array.from(countryMap.entries())
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / uniAlumni.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [uniAlumni]);

  // Available departments for this university (combining verified catalog + active alumni & student affiliations)
  const uniDeptList = useMemo(() => {
    const qName = (universityName || '').toLowerCase().trim();
    const fromDb = departments
      .filter((d) => (d.university || '').toLowerCase().trim() === qName && d.status !== 'Inactive')
      .map((d) => d.name);
    const fromAlumni = uniAlumni.map((a) => a.department).filter(Boolean);
    const fromStudents = uniStudents.map((s) => s.department).filter(Boolean);
    return Array.from(new Set([...fromDb, ...fromAlumni, ...fromStudents])).sort();
  }, [departments, universityName, uniAlumni, uniStudents]);

  // Dynamically featured department based on largest active alumni or student cohort
  const featuredDepartment = useMemo(() => {
    if (uniDeptList.length === 0) return null;
    let bestDept = uniDeptList[0];
    let bestCount = -1;
    uniDeptList.forEach((dName) => {
      const count = uniAlumni.filter((a) => (a.department || '').toLowerCase().trim() === dName.toLowerCase().trim()).length;
      if (count > bestCount) {
        bestCount = count;
        bestDept = dName;
      }
    });
    const deptAlumni = uniAlumni.filter((a) => (a.department || '').toLowerCase().trim() === bestDept.toLowerCase().trim());
    const employedCount = deptAlumni.filter((a) => Boolean(a.jobRole || a.company)).length;
    const employmentRate = deptAlumni.length > 0 ? Math.round((employedCount / deptAlumni.length) * 100) : 85;
    return {
      name: bestDept,
      alumniCount: deptAlumni.length,
      employmentRate,
    };
  }, [uniDeptList, uniAlumni]);

  // Chronologically sorted graduation cohorts for this university
  const uniBatches = useMemo(() => {
    const qName = (universityName || '').toLowerCase().trim();
    const list = batches.filter(
      (b) => (b.university || '').toLowerCase().trim() === qName
    );
    if (list.length > 0) {
      return [...list].sort((a, b) => {
        const numA = a.batchNumber !== undefined ? a.batchNumber : parseInt(a.year || '0', 10);
        const numB = b.batchNumber !== undefined ? b.batchNumber : parseInt(b.year || '0', 10);
        return numA - numB;
      });
    }
    const years = new Set<string>();
    uniAlumni.forEach((a) => {
      if (a.graduationYear) years.add(a.graduationYear);
      if (a.batch) {
        const m = a.batch.match(/\b(19\d\d|20\d\d)\b/);
        if (m) years.add(m[1]);
      }
    });
    if (years.size === 0) {
      ['2020', '2021', '2022', '2023', '2024', '2025'].forEach((y) => years.add(y));
    }
    const defaultDept = uniDeptList[0] || 'Computer Science and Engineering';
    return Array.from(years)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((yr, idx) => ({
        id: `batch-${yr}`,
        year: yr,
        department: defaultDept,
        university: universityName,
        batchName: `${yr} Batch`,
        batchNumber: idx + 1,
        sessionName: undefined as string | undefined,
      }));
  }, [batches, universityName, uniAlumni, uniDeptList]);

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

  // Institutional authorization: Super Admins or assigned University Admins can propose changes
  const isThisUniAdmin = Boolean(
    isSuperAdmin ||
    (userProfile?.role === 'UNIVERSITY_ADMIN' &&
      (userProfile.assignedUniversity || userProfile.university)?.toLowerCase().trim() === (universityName || '').toLowerCase().trim())
  );

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
            onClick={() => (onBack ? onBack() : onNavigate('universities'))}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
            title="Back to previous / upper page"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
            <span>← Back to Universities</span>
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
                <span>{university.departmentCount || uniDeptList.length} Academic Departments</span>
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
          {featuredDepartment ? (
            <button
              onClick={() =>
                onNavigate('departmentProfile', {
                  dept: featuredDepartment.name,
                  uni: university.name,
                })
              }
              className="card p-6 text-left lg:col-span-2 hover:-translate-y-1 transition group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                    Leading Academic Department
                  </span>
                  <h2 className="text-xl font-black navy mt-1 group-hover:text-blue-600 transition">
                    {featuredDepartment.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {featuredDepartment.alumniCount} verified alumni · {featuredDepartment.employmentRate}% verified employment outcome
                  </p>
                </div>
                <span className="text-blue-600 font-black text-xl group-hover:translate-x-1 transition">
                  →
                  </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <b className="navy text-base">{featuredDepartment.alumniCount}</b>
                  <p className="text-xs text-slate-400 mt-0.5">Verified Alumni</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <b className="text-emerald-600 text-base">{featuredDepartment.employmentRate}%</b>
                  <p className="text-xs text-slate-400 mt-0.5">Placement Outcome</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <b className="text-blue-600 text-base">{uniBatches.length}</b>
                  <p className="text-xs text-slate-400 mt-0.5">Tracked Batches</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="card p-6 text-left lg:col-span-2 text-slate-500 flex flex-col justify-center">
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Academic Directory</span>
              <h2 className="text-xl font-black navy mt-1">Departments in Development</h2>
              <p className="text-xs text-slate-400 mt-2">
                New department affiliations added by registered alumni will appear dynamically here.
              </p>
            </div>
          )}

          <div className="card p-6">
            <h3 className="font-bold navy text-base">Top global destinations</h3>
            <p className="text-xs text-slate-400 mt-1">
              {topDestinations.length > 0 ? `Calculated from ${uniAlumni.length} verified records` : 'Awaiting alumni country records'}
            </p>
            <div className="mt-5 space-y-3.5 text-sm">
              {topDestinations.length > 0 ? (
                topDestinations.map((dest) => (
                  <div key={dest.country}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-600 text-xs font-semibold">{dest.country}</span>
                      <b className="navy text-xs">{dest.percentage}% ({dest.count})</b>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${dest.percentage}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <span>No alumni country destinations cataloged yet for this campus.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="mt-6">
          {uniDeptList.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              <p className="font-semibold">No departments registered yet for {university.name}.</p>
              <p className="text-xs text-slate-400 mt-2">
                Departments added via the Admin Panel will immediately appear here.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniDeptList.map((deptName) => {
                const foundDept = departments.find(
                  (d) =>
                    d.name.toLowerCase().trim() === deptName.toLowerCase().trim() &&
                    d.university.toLowerCase().trim() === university.name.toLowerCase().trim()
                );
                const deptAlumniCount = uniAlumni.filter(
                  (a) => (a.department || '').toLowerCase().trim() === deptName.toLowerCase().trim()
                ).length;
                const group = foundDept?.group || 'Engineering';

                return (
                  <button
                    key={deptName}
                    onClick={() =>
                      onNavigate('departmentProfile', {
                        dept: deptName,
                        uni: university.name,
                      })
                    }
                    className="card p-5 text-left hover:-translate-y-1 hover:border-blue-400 hover:shadow-xs transition group cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <span className="pill text-[11px] text-blue-600 bg-blue-50 border-blue-200">{group}</span>
                      <span className="text-slate-400 group-hover:text-blue-600 transition">→</span>
                    </div>
                    <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 transition">
                      {deptName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {deptAlumniCount > 0 ? `${deptAlumniCount} verified alumni · Active tracking` : 'Active career cohort tracking'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
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
                <button
                  key={a.id}
                  onClick={() => onNavigate('alumniProfile', { id: a.id, name: a.name })}
                  className="card p-5 flex gap-4 text-left hover:border-blue-400 hover:shadow-xs transition group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full avatar flex items-center justify-center font-bold text-base shrink-0 bg-linear-to-br from-blue-700 to-indigo-900 text-white">
                    {a.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="text-slate-900 group-hover:text-blue-600 transition block truncate">{a.name}</b>
                    <p className="text-sm text-slate-500 truncate">{a.jobRole || 'Alumnus'}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {a.company || a.department} · {a.country || 'Bangladesh'}
                    </p>
                    {a.isVerified && (
                      <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✓ Verified Alumni
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black navy">
                Graduating Cohorts ({uniBatches.length} Batches)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Chronologically ordered from earliest available batch to latest researched class
              </p>
            </div>
            <span className="pill text-blue-600 bg-blue-50 text-xs font-bold">
              Earliest → Latest
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {uniBatches.map((b) => (
              <button
                key={b.id || b.year}
                onClick={() =>
                  onNavigate('departmentBatch', {
                    dept: b.department || 'Computer Science and Engineering',
                    uni: university.name,
                    batch: b.year,
                    batchNumber: String(b.batchNumber ?? ''),
                  })
                }
                className="card p-3.5 text-center hover:border-blue-400 hover:shadow-xs transition cursor-pointer group"
              >
                <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">
                  {b.batchNumber !== undefined && b.batchNumber > 0 ? `Batch #${b.batchNumber}` : 'Cohort'}
                </span>
                <b className="text-lg navy block mt-0.5 group-hover:text-blue-600 transition">
                  {b.year}
                </b>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                  {b.sessionName ? `Session ${b.sessionName}` : b.batchName || 'View batch →'}
                </span>
              </button>
            ))}
          </div>
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
