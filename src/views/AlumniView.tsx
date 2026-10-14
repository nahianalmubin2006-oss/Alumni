import React, { useEffect, useRef, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import {
  ArrowLeft,
  Search,
  Building2,
  GraduationCap,
  Calendar,
  Globe,
  SlidersHorizontal,
  X,
  RotateCcw,
  Filter,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  List,
  Check,
  ChevronRight,
  UserCheck,
  Briefcase,
  Layers,
  ArrowUpDown,
  Handshake,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RAW_DEPARTMENT_CATALOG, ALL_DIRECTORY_UNIVERSITIES } from '../data/initialData';
import { AlumniRecord } from '../types';

interface AlumniViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const AlumniView: React.FC<AlumniViewProps> = ({ onNavigate, onBack }) => {
  const { currentUser, userProfile, isSuperAdmin, isUniversityAdmin } = useAuth();
  const { universities, alumni, stats, allUsers, loadingData } = useData();

  // Legacy student records may exist in the alumni collection. Never list a profile
  const alumniOnly = useMemo(() => alumni.filter((record) => {
    if ((record as any).profileType === 'Student') return false;
    const linkedUserId = record.userId || record.id;
    const linkedProfile = allUsers.find((user) => user.uid === linkedUserId || user.id === linkedUserId);
    return linkedProfile?.profileType !== 'Student';
  }), [alumni, allUsers]);

  const uChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uChartInstance = useRef<Chart | null>(null);
  const dChartInstance = useRef<Chart | null>(null);
  const directoryRef = useRef<HTMLDivElement | null>(null);

  const [selectedUni, setSelectedUni] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [universityFilter, setUniversityFilter] = useState('All');
  const [universityTypeFilter, setUniversityTypeFilter] = useState<'All' | 'Public' | 'Private' | 'International'>('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [deptGroupFilter, setDeptGroupFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [yearMin, setYearMin] = useState<string>('');
  const [yearMax, setYearMax] = useState<string>('');
  const [useYearRange, setUseYearRange] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [mentorshipOnly, setMentorshipOnly] = useState(false);
  const [directorySort, setDirectorySort] = useState('name-asc');
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState(9);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search input to avoid excessive re-filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(alumniSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [alumniSearch]);

  // Sorted universities by alumni count
  const universityRankings = useMemo(() => {
    return universities
      .map((u) => {
        const liveCount = alumniOnly.filter(
          (a) => (!a.status || a.status.toUpperCase() === 'APPROVED') && a.university?.toLowerCase() === u.name.toLowerCase()
        ).length;
        return {
          name: u.name,
          type: u.type,
          alumni: liveCount || u.alumniCount || 0,
        };
      })
      .sort((a, b) => b.alumni - a.alumni);
  }, [universities, alumniOnly]);

  // Sorted departments by aggregated alumni
  const departmentRankings = useMemo(() => {
    return RAW_DEPARTMENT_CATALOG.map((d) => {
      const dName = d.name.toLowerCase().trim();
      const deptAlumni = alumniOnly.filter(
        (a) => (!a.status || a.status.toUpperCase() === 'APPROVED') && (a.department || '').toLowerCase().trim() === dName
      );
      const liveCount = deptAlumni.length;
      const unisCount = new Set(deptAlumni.map((a) => (a.university || '').toLowerCase().trim()).filter(Boolean)).size;
      return {
        name: d.name,
        group: d.group,
        alumni: liveCount,
        universitiesCount: unisCount,
      };
    }).sort((a, b) => b.alumni - a.alumni);
  }, [alumniOnly]);

  const top5Unis = universityRankings.slice(0, 5);
  const top5Depts = departmentRankings.slice(0, 5);

  // Initialize charts
  useEffect(() => {
    if (!uChartCanvasRef.current || !dChartCanvasRef.current) return;

    if (uChartInstance.current) uChartInstance.current.destroy();
    if (dChartInstance.current) dChartInstance.current.destroy();

    const top10Unis = universityRankings.slice(0, 10);
    const top10Depts = departmentRankings.slice(0, 10);

    uChartInstance.current = new Chart(uChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: top10Unis.map((u) => u.name),
        datasets: [
          {
            data: top10Unis.map((u) => u.alumni),
            backgroundColor: [
              '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
              '#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { size: 10 },
            },
          },
        },
      },
    });

    dChartInstance.current = new Chart(dChartCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: top10Depts.map((d) => d.name),
        datasets: [
          {
            data: top10Depts.map((d) => d.alumni),
            backgroundColor: [
              '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd',
              '#f59e0b', '#d97706', '#b45309', '#78350f', '#fbbf24'
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { size: 10 },
            },
          },
        },
      },
    });

    return () => {
      if (uChartInstance.current) uChartInstance.current.destroy();
      if (dChartInstance.current) dChartInstance.current.destroy();
    };
  }, [universityRankings, departmentRankings]);

  // Helper to parse 4-digit graduation year reliably
  const getGraduationYear = (record: AlumniRecord): number | null => {
    const raw = (record.graduationYear || record.batch || '').trim();
    if (!raw) return null;
    const match = raw.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return parseInt(match[1], 10);
    const parsed = parseInt(raw, 10);
    return !isNaN(parsed) && parsed >= 1950 && parsed <= 2050 ? parsed : null;
  };

  // Fast mapping of university to its type (Public, Private, International)
  const universityTypeLookup = useMemo(() => {
    const map = new Map<string, string>();
    ALL_DIRECTORY_UNIVERSITIES.forEach((u) => map.set(u.name.toLowerCase(), u.type));
    universities.forEach((u) => {
      if (u.name && u.type) map.set(u.name.toLowerCase(), u.type);
    });
    return map;
  }, [universities]);

  // Fast mapping of department to its academic group
  const departmentGroupLookup = useMemo(() => {
    const map = new Map<string, string>();
    RAW_DEPARTMENT_CATALOG.forEach((d) => {
      map.set(d.name.toLowerCase(), d.group);
      d.aliases.forEach((al) => map.set(al.toLowerCase(), d.group));
    });
    return map;
  }, []);

  const approvedAlumni = useMemo(
    () => alumniOnly.filter((a) => !a.status || a.status.toUpperCase() === 'APPROVED'),
    [alumniOnly]
  );

  // Filter and sort only approved alumni, then paginate the result set.
  const filteredAlumni = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = approvedAlumni.filter((a) => {
      // 0. Privacy filter: if publicDirectoryVisible is explicitly false, only visible to owner or admins
      if (a.publicDirectoryVisible === false) {
        const isOwner = Boolean(currentUser && (currentUser.uid === a.userId || currentUser.uid === a.id));
        if (!isOwner && !isSuperAdmin && !isUniversityAdmin) return false;
      }

      // 1. Verified filter
      if (verifiedOnly && !a.isVerified) return false;

      // 1b. Mentorship availability filter
      if (mentorshipOnly && a.mentorshipOpen === false) return false;

      // 2. University filter
      if (universityFilter !== 'All' && a.university?.toLowerCase() !== universityFilter.toLowerCase()) {
        return false;
      }

      // 3. University type filter
      if (universityTypeFilter !== 'All') {
        const uType = a.university ? universityTypeLookup.get(a.university.toLowerCase()) : null;
        if (uType !== universityTypeFilter) return false;
      }

      // 4. Department filter
      if (departmentFilter !== 'All' && a.department?.toLowerCase() !== departmentFilter.toLowerCase()) {
        return false;
      }

      // 5. Department group filter
      if (deptGroupFilter !== 'All') {
        const dGroup = a.department ? departmentGroupLookup.get(a.department.toLowerCase()) : null;
        if (dGroup !== deptGroupFilter) return false;
      }

      // 6. Graduation year filter
      const yr = getGraduationYear(a);
      if (useYearRange) {
        const min = parseInt(yearMin, 10);
        const max = parseInt(yearMax, 10);
        if (!isNaN(min) && (yr === null || yr < min)) return false;
        if (!isNaN(max) && (yr === null || yr > max)) return false;
      } else if (yearFilter !== 'All') {
        if (yearFilter === '2020+') {
          if (yr === null || yr < 2020) return false;
        } else if (yearFilter === '2015-2019') {
          if (yr === null || yr < 2015 || yr > 2019) return false;
        } else if (yearFilter === '2010-2014') {
          if (yr === null || yr < 2010 || yr > 2014) return false;
        } else if (yearFilter === 'before-2010') {
          if (yr === null || yr >= 2010) return false;
        } else {
          const targetYear = parseInt(yearFilter, 10);
          const rawYearStr = a.graduationYear || a.batch || '';
          const matchesNum = !isNaN(targetYear) && yr === targetYear;
          const matchesStr = rawYearStr.includes(yearFilter);
          if (!matchesNum && !matchesStr) return false;
        }
      }

      // 7. Country filter
      if (countryFilter !== 'All' && a.country !== countryFilter) {
        return false;
      }

      // 8. Sector filter
      if (sectorFilter !== 'All' && (a.sector || 'Other') !== sectorFilter) {
        return false;
      }

      // 9. Search query (multi-field including sector, specialization, degree)
      if (query) {
        const hay = [
          a.name,
          a.university,
          a.department,
          a.jobRole,
          a.company,
          a.country,
          a.city,
          a.batch,
          a.graduationYear,
          a.sector,
          a.specialization,
          a.degree,
          a.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const universityA = (a.university || '').toLowerCase();
      const universityB = (b.university || '').toLowerCase();
      const deptA = (a.department || '').toLowerCase();
      const deptB = (b.department || '').toLowerCase();
      const yearA = getGraduationYear(a) || 0;
      const yearB = getGraduationYear(b) || 0;

      switch (directorySort) {
        case 'name-desc': return nameB.localeCompare(nameA);
        case 'university-asc': return universityA.localeCompare(universityB) || nameA.localeCompare(nameB);
        case 'dept-asc': return deptA.localeCompare(deptB) || nameA.localeCompare(nameB);
        case 'year-newest': return yearB - yearA || nameA.localeCompare(nameB);
        case 'year-oldest': return yearA - yearB || nameA.localeCompare(nameB);
        default: return nameA.localeCompare(nameB);
      }
    });
  }, [
    approvedAlumni,
    debouncedSearch,
    countryFilter,
    sectorFilter,
    universityFilter,
    universityTypeFilter,
    departmentFilter,
    deptGroupFilter,
    yearFilter,
    yearMin,
    yearMax,
    useYearRange,
    verifiedOnly,
    mentorshipOnly,
    directorySort,
    universityTypeLookup,
    departmentGroupLookup,
    currentUser,
    isSuperAdmin,
    isUniversityAdmin,
  ]);

  const uniqueCountries = useMemo(
    () => Array.from(new Set(approvedAlumni.map((a) => a.country).filter((value): value is string => Boolean(value))).values()).sort(),
    [approvedAlumni]
  );

  const uniqueSectors = useMemo(
    () => Array.from(new Set(approvedAlumni.map((a) => a.sector).filter((value): value is string => Boolean(value))).values()).sort(),
    [approvedAlumni]
  );

  const universityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    approvedAlumni.forEach((a) => {
      if (a.university) {
        if (universityTypeFilter === 'All' || universityTypeLookup.get(a.university.toLowerCase()) === universityTypeFilter) {
          counts.set(a.university, (counts.get(a.university) || 0) + 1);
        }
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        type: universityTypeLookup.get(name.toLowerCase()) || 'University',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [approvedAlumni, universityTypeFilter, universityTypeLookup]);

  const departmentOptions = useMemo(() => {
    const counts = new Map<string, number>();
    approvedAlumni.forEach((a) => {
      if (a.department) {
        const matchesUni = universityFilter === 'All' || a.university?.toLowerCase() === universityFilter.toLowerCase();
        const matchesGroup = deptGroupFilter === 'All' || departmentGroupLookup.get(a.department.toLowerCase()) === deptGroupFilter;
        if (matchesUni && matchesGroup) {
          counts.set(a.department, (counts.get(a.department) || 0) + 1);
        }
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        group: departmentGroupLookup.get(name.toLowerCase()) || 'Other',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [approvedAlumni, universityFilter, deptGroupFilter, departmentGroupLookup]);

  const graduationYearOptions = useMemo(() => {
    const counts = new Map<number, number>();
    approvedAlumni.forEach((a) => {
      const yr = getGraduationYear(a);
      if (yr) {
        counts.set(yr, (counts.get(yr) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([year, count]) => ({ year: String(year), numYear: year, count }))
      .sort((a, b) => b.numYear - a.numYear);
  }, [approvedAlumni]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (alumniSearch.trim()) count++;
    if (universityFilter !== 'All') count++;
    if (universityTypeFilter !== 'All') count++;
    if (departmentFilter !== 'All') count++;
    if (deptGroupFilter !== 'All') count++;
    if (useYearRange ? (Boolean(yearMin) || Boolean(yearMax)) : yearFilter !== 'All') count++;
    if (countryFilter !== 'All') count++;
    if (sectorFilter !== 'All') count++;
    if (verifiedOnly) count++;
    if (mentorshipOnly) count++;
    return count;
  }, [
    alumniSearch,
    universityFilter,
    universityTypeFilter,
    departmentFilter,
    deptGroupFilter,
    useYearRange,
    yearMin,
    yearMax,
    yearFilter,
    countryFilter,
    sectorFilter,
    verifiedOnly,
    mentorshipOnly,
  ]);

  const totalDirectoryPages = Math.max(1, Math.ceil(filteredAlumni.length / directoryPageSize));
  const safeDirectoryPage = Math.min(Math.max(1, directoryPage), totalDirectoryPages);
  const visibleAlumni = filteredAlumni.slice((safeDirectoryPage - 1) * directoryPageSize, safeDirectoryPage * directoryPageSize);

  useEffect(() => {
    if (directoryPage > totalDirectoryPages) {
      setDirectoryPage(1);
    }
  }, [directoryPage, totalDirectoryPages]);

  const clearDirectoryFilters = () => {
    setAlumniSearch('');
    setCountryFilter('All');
    setSectorFilter('All');
    setUniversityFilter('All');
    setUniversityTypeFilter('All');
    setDepartmentFilter('All');
    setDeptGroupFilter('All');
    setYearFilter('All');
    setYearMin('');
    setYearMax('');
    setUseYearRange(false);
    setVerifiedOnly(false);
    setMentorshipOnly(false);
    setDirectorySort('name-asc');
    setDirectoryPage(1);
  };

  const applyUniversityFilter = (uniName: string) => {
    setUniversityFilter((prev) => (prev === uniName ? 'All' : uniName));
    setDirectoryPage(1);
    directoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const applyDepartmentFilter = (deptName: string) => {
    setDepartmentFilter((prev) => (prev === deptName ? 'All' : deptName));
    setDirectoryPage(1);
    directoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-5 py-7 sm:py-10">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => (onBack ? onBack() : onNavigate('home'))}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Home</span>
        </button>
      </div>

      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
        <UserCheck className="w-4 h-4 text-blue-600" />
        <span>Verified Alumni Network</span>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black navy">
            Verified Alumni Directory
          </h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            Explore verified graduates across all 178 institutions and 48 academic departments.
            Narrow down by graduation year, academic department, university, and location in real time.
          </p>
        </div>
        <span className="pill text-blue-600 self-start lg:self-end">
          {stats.totalAlumni.toLocaleString()} verified alumni
        </span>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="card p-4 sm:p-5 mt-6">
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="metric">
            <div className="text-2xl font-black navy">{stats.totalUniversities}</div>
            <div className="text-xs text-slate-400 mt-0.5">Universities represented</div>
          </div>
          <div className="metric">
            <div className="text-2xl font-black navy">{stats.totalDepartments}</div>
            <div className="text-xs text-slate-400 mt-0.5">Departments cataloged</div>
          </div>
          <div className="metric">
            <div className="text-2xl font-black navy">{stats.totalAlumni.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-0.5">Total network alumni</div>
          </div>
        </div>
      </div>

      {/* Directory Account Opening & Member Gateway */}
      <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <b className="navy text-sm block">
              {!currentUser
                ? 'Are you an alumnus or graduating university student?'
                : `Logged in as ${userProfile?.name || 'Member'} (${userProfile?.profileType || 'Student'})`}
            </b>
            <p className="text-xs text-slate-600 mt-0.5">
              {!currentUser
                ? 'Open your verified account to record your graduation batch, appear in this directory, and connect with peers.'
                : 'Your profile data is stored securely in the internal persistent database and mirrored to this directory.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!currentUser ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('account', { mode: 'wizard' })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Open Account (Step-by-Step)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('account', { mode: 'login' })}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                Log In
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('account', { tab: 'storage' })}
              className="bg-navy hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>View Data Storage Receipt</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Alumni Directory Table / Profiles */}
      <div ref={directoryRef} id="alumni-directory-section" className="card p-4 sm:p-7 mt-8 shadow-sm">
        {/* Header with Title, Stats, and View Mode Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-soft">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black navy">Verified Alumni Directory</h2>
              {activeFiltersCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  {approvedAlumni.length.toLocaleString()} verified graduates
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Filter by graduation year, academic department, university institution, location, or search keywords to explore where graduates go.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Grid Card View"
                aria-label="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Compact Table View"
                aria-label="Compact Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Table</span>
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-soft rounded-xl px-2 py-1.5">
              <span className="text-[11px] font-medium text-slate-400">Show:</span>
              <select
                value={directoryPageSize}
                onChange={(e) => {
                  setDirectoryPageSize(Number(e.target.value));
                  setDirectoryPage(1);
                }}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-xs"
                aria-label="Profiles per page"
              >
                <option value={9}>9</option>
                <option value={18}>18</option>
                <option value={36}>36</option>
              </select>
            </div>

            {/* Reset All Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearDirectoryFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={alumniSearch}
              onChange={(e) => {
                setAlumniSearch(e.target.value);
                setDirectoryPage(1);
              }}
              placeholder="Search by alumni name, current job role, company, batch, or location..."
              aria-label="Search alumni directory"
              className="w-full border border-soft rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition shadow-2xs"
            />
            {alumniSearch && (
              <button
                type="button"
                onClick={() => { setAlumniSearch(''); setDirectoryPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                title="Clear search text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Filter Control Cards: University, Department, Graduation Year */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-4">
          {/* 1. UNIVERSITY FILTER CARD */}
          <div className="p-3.5 rounded-2xl border border-soft bg-slate-50/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>University</span>
                </label>
                {universityFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => { setUniversityFilter('All'); setDirectoryPage(1); }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Institution Type Sub-filter Segmented Control */}
              <div className="flex items-center gap-1 mb-2 bg-slate-200/70 p-0.5 rounded-lg text-[10px]">
                {(['All', 'Public', 'Private', 'International'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setUniversityTypeFilter(type);
                      setDirectoryPage(1);
                    }}
                    className={`flex-1 py-1 rounded-md font-semibold transition cursor-pointer text-center ${
                      universityTypeFilter === type
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* University Select */}
              <select
                value={universityFilter}
                onChange={(e) => {
                  setUniversityFilter(e.target.value);
                  setDirectoryPage(1);
                }}
                aria-label="Filter by university institution"
                className={`w-full border rounded-xl px-3 py-2 text-xs bg-white outline-none cursor-pointer font-medium transition ${
                  universityFilter !== 'All'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold ring-2 ring-blue-100'
                    : 'border-soft text-slate-700 hover:border-slate-300'
                }`}
              >
                <option value="All">
                  All Universities ({universityOptions.reduce((acc, u) => acc + u.count, 0)})
                </option>
                {universityOptions.map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name} ({u.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Top University Shortcuts */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">Quick:</span>
              {top5Unis.slice(0, 3).map((u) => {
                const shortLabel = u.name
                  .replace(/University of | Bangladesh| University/g, '')
                  .trim() || u.name;
                const isSelected = universityFilter === u.name;
                return (
                  <button
                    key={u.name}
                    type="button"
                    onClick={() => {
                      setUniversityFilter(isSelected ? 'All' : u.name);
                      setDirectoryPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer text-[10px] ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={u.name}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DEPARTMENT FILTER CARD */}
          <div className="p-3.5 rounded-2xl border border-soft bg-slate-50/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Academic Department</span>
                </label>
                {departmentFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => { setDepartmentFilter('All'); setDirectoryPage(1); }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Faculty / Group Selector Sub-filter */}
              <div className="mb-2">
                <select
                  value={deptGroupFilter}
                  onChange={(e) => {
                    setDeptGroupFilter(e.target.value);
                    setDirectoryPage(1);
                  }}
                  aria-label="Filter by faculty / discipline group"
                  className={`w-full border rounded-lg px-2.5 py-1 text-[11px] outline-none cursor-pointer transition ${
                    deptGroupFilter !== 'All'
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <option value="All">All Disciplines / Faculties</option>
                  <option value="Engineering">Engineering & Technology</option>
                  <option value="Business">Business & Management</option>
                  <option value="Science">Physical & Biological Sciences</option>
                  <option value="Health">Medicine & Health Sciences</option>
                  <option value="Arts">Arts, Social Sciences & Humanities</option>
                  <option value="Law">Law & Legal Studies</option>
                  <option value="Agriculture">Agriculture & Veterinary</option>
                </select>
              </div>

              {/* Department Select */}
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setDirectoryPage(1);
                }}
                aria-label="Filter by department"
                className={`w-full border rounded-xl px-3 py-2 text-xs bg-white outline-none cursor-pointer font-medium transition ${
                  departmentFilter !== 'All'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-bold ring-2 ring-indigo-100'
                    : 'border-soft text-slate-700 hover:border-slate-300'
                }`}
              >
                <option value="All">
                  All Departments ({departmentOptions.reduce((acc, d) => acc + d.count, 0)})
                </option>
                {departmentOptions.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Popular Discipline Shortcuts */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">Quick:</span>
              {[
                { label: 'CSE', full: 'Computer Science & Engineering' },
                { label: 'EEE', full: 'Electrical & Electronic Engineering' },
                { label: 'BBA', full: 'Business Administration' },
                { label: 'Economics', full: 'Economics' },
              ].map((item) => {
                const isSelected = departmentFilter === item.full;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setDepartmentFilter(isSelected ? 'All' : item.full);
                      setDirectoryPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer text-[10px] ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={item.full}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GRADUATION YEAR FILTER CARD */}
          <div className="p-3.5 rounded-2xl border border-soft bg-slate-50/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Graduation Year</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseYearRange((prev) => !prev);
                      setDirectoryPage(1);
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 transition cursor-pointer underline"
                  >
                    {useYearRange ? 'Switch to List' : 'Custom Range'}
                  </button>
                  {(yearFilter !== 'All' || yearMin || yearMax) && (
                    <button
                      type="button"
                      onClick={() => {
                        setYearFilter('All');
                        setYearMin('');
                        setYearMax('');
                        setDirectoryPage(1);
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {useYearRange ? (
                /* Custom Year Range Inputs */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">From Year</label>
                      <input
                        type="number"
                        min="1970"
                        max="2030"
                        placeholder="e.g. 2018"
                        value={yearMin}
                        onChange={(e) => {
                          setYearMin(e.target.value);
                          setDirectoryPage(1);
                        }}
                        className="w-full border border-soft rounded-xl px-2.5 py-1.5 text-xs bg-white outline-none focus:border-emerald-400"
                      />
                    </div>
                    <span className="text-slate-400 font-bold self-end mb-2">–</span>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">To Year</label>
                      <input
                        type="number"
                        min="1970"
                        max="2030"
                        placeholder="e.g. 2024"
                        value={yearMax}
                        onChange={(e) => {
                          setYearMax(e.target.value);
                          setDirectoryPage(1);
                        }}
                        className="w-full border border-soft rounded-xl px-2.5 py-1.5 text-xs bg-white outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setYearMin('2021');
                        setYearMax('2024');
                        setDirectoryPage(1);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                    >
                      Last 3 Years
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setYearMin('2019');
                        setYearMax('2024');
                        setDirectoryPage(1);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                    >
                      Last 5 Years
                    </button>
                  </div>
                </div>
              ) : (
                /* Year Dropdown Select */
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setDirectoryPage(1);
                  }}
                  aria-label="Filter by graduation year or cohort"
                  className={`w-full border rounded-xl px-3 py-2 text-xs bg-white outline-none cursor-pointer font-medium transition ${
                    yearFilter !== 'All'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold ring-2 ring-emerald-100'
                      : 'border-soft text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <option value="All">All Graduation Years</option>
                  <optgroup label="Cohort Brackets">
                    <option value="2020+">Recent Cohorts (2020 & Newer)</option>
                    <option value="2015-2019">Mid Cohorts (2015 – 2019)</option>
                    <option value="2010-2014">Classic Cohorts (2010 – 2014)</option>
                    <option value="before-2010">Senior Cohorts (Before 2010)</option>
                  </optgroup>
                  {graduationYearOptions.length > 0 && (
                    <optgroup label="Specific Classes">
                      {graduationYearOptions.map((y) => (
                        <option key={y.year} value={y.year}>
                          Class of {y.year} ({y.count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>

            {/* Quick Cohort Shortcuts */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">Quick:</span>
              {['2024', '2023', '2022', '2020+'].map((yr) => {
                const isSelected = !useYearRange && yearFilter === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setUseYearRange(false);
                      setYearFilter(isSelected ? 'All' : yr);
                      setDirectoryPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer text-[10px] ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {yr === '2020+' ? '2020+' : `'${yr.slice(2)}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Secondary Filter & Sort Toolbar */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-soft flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Country Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Country:</span>
              </label>
              <select
                value={countryFilter}
                onChange={(e) => {
                  setCountryFilter(e.target.value);
                  setDirectoryPage(1);
                }}
                className={`border rounded-xl px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer font-medium transition ${
                  countryFilter !== 'All'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                aria-label="Filter by country"
              >
                <option value="All">All Countries ({uniqueCountries.length})</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector / Industry Filter */}
            {uniqueSectors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">Industry:</span>
                </label>
                <select
                  value={sectorFilter}
                  onChange={(e) => {
                    setSectorFilter(e.target.value);
                    setDirectoryPage(1);
                  }}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer font-medium transition ${
                    sectorFilter !== 'All'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  aria-label="Filter by industry sector"
                >
                  <option value="All">All Industries ({uniqueSectors.length})</option>
                  {uniqueSectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Sort:</span>
              </label>
              <select
                value={directorySort}
                onChange={(e) => {
                  setDirectorySort(e.target.value);
                  setDirectoryPage(1);
                }}
                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white outline-none cursor-pointer font-medium text-slate-700 hover:border-slate-300 transition"
                aria-label="Sort alumni order"
              >
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
                <option value="university-asc">University: A to Z</option>
                <option value="dept-asc">Department: A to Z</option>
                <option value="year-newest">Graduation: Newest first</option>
                <option value="year-oldest">Graduation: Oldest first</option>
              </select>
            </div>

            {/* Verified Only Toggle */}
            <button
              type="button"
              onClick={() => {
                setVerifiedOnly((prev) => !prev);
                setDirectoryPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                verifiedOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Toggle verified alumni only"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Verified Only</span>
            </button>

            {/* Mentorship Availability Toggle */}
            <button
              type="button"
              onClick={() => {
                setMentorshipOnly((prev) => !prev);
                setDirectoryPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                mentorshipOnly
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Filter alumni available for student mentorship"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Open for Mentorship</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setDeptGroupFilter('Engineering');
                setYearFilter('2020+');
                setUseYearRange(false);
                setDirectoryPage(1);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer text-slate-700"
            >
              Tech &apos;20+
            </button>
            <button
              type="button"
              onClick={() => {
                setDeptGroupFilter('Business');
                setDirectoryPage(1);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer text-slate-700"
            >
              Business Grads
            </button>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="mb-5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-600" />
              <span>Active Filters:</span>
            </span>

            {/* University Chip */}
            {universityFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span>Uni: <b>{universityFilter}</b></span>
                <button
                  type="button"
                  onClick={() => { setUniversityFilter('All'); setDirectoryPage(1); }}
                  className="hover:bg-blue-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove university filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* University Type Chip */}
            {universityTypeFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs">
                <span>Type: <b>{universityTypeFilter}</b></span>
                <button
                  type="button"
                  onClick={() => { setUniversityTypeFilter('All'); setDirectoryPage(1); }}
                  className="hover:bg-blue-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove university type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Department Chip */}
            {departmentFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-2xs">
                <GraduationCap className="w-3 h-3 text-indigo-600" />
                <span>Dept: <b>{departmentFilter}</b></span>
                <button
                  type="button"
                  onClick={() => { setDepartmentFilter('All'); setDirectoryPage(1); }}
                  className="hover:bg-indigo-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove department filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Department Group Chip */}
            {deptGroupFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-2xs">
                <span>Faculty: <b>{deptGroupFilter}</b></span>
                <button
                  type="button"
                  onClick={() => { setDeptGroupFilter('All'); setDirectoryPage(1); }}
                  className="hover:bg-indigo-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove faculty filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Graduation Year Chip */}
            {useYearRange ? (
              (Boolean(yearMin) || Boolean(yearMax)) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>Year Range: <b>{yearMin || 'Any'} – {yearMax || 'Any'}</b></span>
                  <button
                    type="button"
                    onClick={() => {
                      setYearMin('');
                      setYearMax('');
                      setUseYearRange(false);
                      setDirectoryPage(1);
                    }}
                    className="hover:bg-emerald-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                    title="Remove year range filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            ) : (
              yearFilter !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>
                    Year: <b>{yearFilter === '2020+' ? '2020 & Newer' : yearFilter === '2015-2019' ? '2015–2019' : yearFilter === '2010-2014' ? '2010–2014' : yearFilter === 'before-2010' ? 'Before 2010' : `Class of ${yearFilter}`}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setYearFilter('All'); setDirectoryPage(1); }}
                    className="hover:bg-emerald-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                    title="Remove graduation year filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            )}

            {/* Country Chip */}
            {countryFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs">
                <Globe className="w-3 h-3" />
                <span>Country: <b>{countryFilter}</b></span>
                <button
                  type="button"
                  onClick={() => { setCountryFilter('All'); setDirectoryPage(1); }}
                  className="hover:bg-slate-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove country filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Sector / Industry Chip */}
            {sectorFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-amber-800 border border-amber-300 text-xs font-semibold shadow-2xs">
                <Briefcase className="w-3 h-3 text-amber-600" />
                <span>Industry: <b>{sectorFilter}</b></span>
                <button
                  type="button"
                  onClick={() => { setSectorFilter('All'); setDirectoryPage(1); }}
                  className="hover:bg-amber-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove industry filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Verified Chip */}
            {verifiedOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold shadow-2xs">
                <UserCheck className="w-3 h-3" />
                <span>Verified Alumni Only</span>
                <button
                  type="button"
                  onClick={() => { setVerifiedOnly(false); setDirectoryPage(1); }}
                  className="hover:bg-emerald-200 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove verified filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Mentorship Chip */}
            {mentorshipOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold shadow-2xs">
                <Handshake className="w-3 h-3" />
                <span>Open for Mentorship</span>
                <button
                  type="button"
                  onClick={() => { setMentorshipOnly(false); setDirectoryPage(1); }}
                  className="hover:bg-blue-200 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Remove mentorship filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Search Query Chip */}
            {alumniSearch.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-amber-800 border border-amber-300 text-xs font-semibold shadow-2xs">
                <Search className="w-3 h-3 text-amber-600" />
                <span>Keyword: &ldquo;<b>{alumniSearch}</b>&rdquo;</span>
                <button
                  type="button"
                  onClick={() => { setAlumniSearch(''); setDirectoryPage(1); }}
                  className="hover:bg-amber-100 rounded-full p-0.5 ml-0.5 cursor-pointer"
                  title="Clear search query"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={clearDirectoryFilters}
              className="text-slate-500 hover:text-rose-600 text-[11px] font-bold underline transition ml-1 cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Results Counter and Page Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 text-xs text-slate-500">
          <span>
            Showing <b className="navy">{filteredAlumni.length === 0 ? 0 : (directoryPage - 1) * directoryPageSize + 1}–{Math.min(directoryPage * directoryPageSize, filteredAlumni.length)}</b> of <b className="navy">{filteredAlumni.length.toLocaleString()}</b> alumni found
          </span>
          <span>Page {Math.min(directoryPage, totalDirectoryPages)} of {totalDirectoryPages}</span>
        </div>

        {/* Main Content: Loading Skeleton vs Empty State vs Cards vs Table */}
        {loadingData && approvedAlumni.length === 0 ? (
          /* Loading Skeleton */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: directoryPageSize }).map((_, i) => (
              <div key={`skeleton-${i}`} className="rounded-2xl border border-slate-100 bg-white overflow-hidden animate-pulse">
                <div className="p-4 pb-0">
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 pt-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                      <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                    </div>
                  </div>
                </div>
                <div className="px-4 pt-3 pb-3">
                  <div className="h-px bg-slate-100 mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded-lg w-4/5" />
                    <div className="h-3 bg-slate-100 rounded-lg w-3/5" />
                    <div className="h-3 bg-slate-100 rounded-lg w-2/5" />
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="h-4 bg-slate-200 rounded-full w-16" />
                  <div className="h-4 bg-slate-100 rounded-lg w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAlumni.length === 0 ? (
          <div className="py-14 text-center card p-8 border border-dashed border-soft bg-slate-50/50">
            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <b className="navy text-base block font-bold">No alumni records match your filter criteria</b>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              We couldn&apos;t find any verified alumni with the current selection. Try broadening your criteria or reset individual filters below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {yearFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => { setYearFilter('All'); setDirectoryPage(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                >
                  Clear Year Filter
                </button>
              )}
              {departmentFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => { setDepartmentFilter('All'); setDirectoryPage(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  Clear Department Filter
                </button>
              )}
              {universityFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => { setUniversityFilter('All'); setDirectoryPage(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                >
                  Clear University Filter
                </button>
              )}
              {sectorFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => { setSectorFilter('All'); setDirectoryPage(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                >
                  Clear Industry Filter
                </button>
              )}
              {alumniSearch && (
                <button
                  type="button"
                  onClick={() => { setAlumniSearch(''); setDirectoryPage(1); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Clear Search Query
                </button>
              )}
              <button
                type="button"
                onClick={clearDirectoryFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View for Rapid Comparison Across Year / Dept / Uni */
          <div className="overflow-x-auto rounded-2xl border border-soft shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-soft">
                <tr>
                  <th className="py-3.5 px-4">Alumnus</th>
                  <th className="py-3.5 px-4">University</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Graduation / Batch</th>
                  <th className="py-3.5 px-4">Current Role</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft bg-white">
                {visibleAlumni.map((person) => {
                  const initials = person.name
                    .split(' ')
                    .map((x) => x[0])
                    .join('')
                    .slice(0, 2);
                  const displayYear = person.graduationYear || person.batch || '—';

                  return (
                    <tr
                      key={person.id}
                      onClick={() => onNavigate('alumniProfile', { id: person.id, name: person.name })}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-2xs relative">
                            {person.photoUrl ? (
                              <img
                                src={person.photoUrl}
                                alt={person.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full avatar items-center justify-center font-bold text-xs ${person.photoUrl ? 'hidden' : 'flex'}`}>
                              {initials}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <b className="navy block text-xs group-hover:text-blue-600 transition truncate">
                              {person.name}
                            </b>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {person.isVerified && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {person.mentorshipOpen !== false && (
                                <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5" title="Available for Student Mentorship">
                                  <Handshake className="w-2.5 h-2.5" />
                                  <span>Mentor</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[200px]" title={person.university}>
                          {person.university}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {universityTypeLookup.get(person.university?.toLowerCase()) || 'University'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 block truncate max-w-[180px]" title={person.department}>
                          {person.department}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {departmentGroupLookup.get(person.department?.toLowerCase()) || 'Academic'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {displayYear}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <b className="navy block truncate max-w-[170px]">{person.jobRole}</b>
                        <span className="text-slate-400 text-[11px] truncate block max-w-[170px]">{person.company}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {person.country || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('alumniProfile', { id: person.id, name: person.name });
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition cursor-pointer"
                        >
                          Profile →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Card View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleAlumni.map((person) => {
              const initials = person.name
                .split(' ')
                .map((x) => x[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const displayYear = person.graduationYear || person.batch || '—';

              return (
                <div
                  key={person.id}
                  role="article"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate('alumniProfile', { id: person.id, name: person.name });
                    }
                  }}
                  onClick={() => onNavigate('alumniProfile', { id: person.id, name: person.name })}
                  className="card p-0 text-left hover:-translate-y-0.5 transition-all duration-200 group flex flex-col justify-between cursor-pointer border border-soft hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded-2xl overflow-hidden bg-white"
                  aria-label={`Alumni profile: ${person.name}, ${person.department} at ${person.university}`}
                >
                  {/* Card Header with Photo */}
                  <div className="p-4 pb-0">
                    <div className="flex items-start gap-3.5">
                      <div className="relative shrink-0">
                        {person.photoUrl ? (
                          <img
                            src={person.photoUrl}
                            alt={person.name}
                            className="w-14 h-14 rounded-xl object-cover shadow-sm border border-slate-100"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-slate-200/80 items-center justify-center font-bold text-base text-blue-700 shadow-sm ${
                            person.photoUrl ? 'hidden' : 'flex'
                          }`}
                        >
                          {initials}
                        </div>
                        {person.isVerified && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center" title="Verified Alumni">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <b className="navy text-sm block truncate group-hover:text-blue-600 transition leading-snug">
                          {person.name}
                        </b>
                        {person.jobRole && (
                          <p className="text-xs text-slate-700 font-semibold truncate mt-0.5 leading-snug">
                            {person.jobRole}
                          </p>
                        )}
                        {person.company && (
                          <p className="text-[11px] text-slate-400 truncate leading-snug flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3 h-3 shrink-0 text-slate-300" />
                            {person.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body — Academic Details */}
                  <div className="px-4 pt-3 pb-3">
                    <div className="h-px bg-slate-100 mb-3" />
                    <div className="text-xs text-slate-600 space-y-1.5">
                      <div className="truncate flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate font-medium">{person.university}</span>
                      </div>
                      <div className="truncate flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{person.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Class of <b className="text-slate-700">{displayYear}</b></span>
                        </div>
                        {person.country && (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span>{person.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer — Status + CTA */}
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {person.isVerified ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          Graduate
                        </span>
                      )}
                      {person.mentorshipOpen !== false && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1" title="Available for Student Mentorship">
                          <Handshake className="w-2.5 h-2.5 text-blue-600" />
                          <span>Mentor</span>
                        </span>
                      )}
                    </div>
                    <span
                      className="text-blue-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1"
                      aria-hidden="true"
                    >
                      View Profile
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {filteredAlumni.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-soft">
            <p className="text-xs text-slate-400">
              Showing page {directoryPage} of {totalDirectoryPages} ({visibleAlumni.length} alumni on this page)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={directoryPage <= 1}
                onClick={() => setDirectoryPage((page) => Math.max(1, page - 1))}
                className="px-3.5 py-2 rounded-xl border border-soft text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 transition cursor-pointer"
              >
                ← Previous
              </button>
              <span className="text-xs text-slate-500 tabular-nums px-2">
                {directoryPage} / {totalDirectoryPages}
              </span>
              <button
                type="button"
                disabled={directoryPage >= totalDirectoryPages}
                onClick={() => setDirectoryPage((page) => Math.min(totalDirectoryPages, page + 1))}
                className="px-3.5 py-2 rounded-xl border border-soft text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 transition cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Analytics, Rankings & Visual Distribution (Placed below Directory) */}
      <div className="mt-12 pt-8 border-t border-soft">
        <div className="mb-6">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Institutional Intelligence
          </div>
          <h2 className="text-xl sm:text-2xl font-black navy mt-1">
            Top Universities & Academic Discipline Rankings
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Aggregated institutional proportions across the national graduate network. Click &quot;Filter in Directory&quot; on any institution to instantly narrow down the directory above.
          </p>
        </div>

        {/* Top 5 Lists Grid */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top Universities */}
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black navy">Top universities by alumni</h3>
                <p className="text-xs text-slate-400 mt-0.5">Top institutions by verified count</p>
              </div>
              <select
                value={selectedUni}
                onChange={(e) => setSelectedUni(e.target.value)}
                className="border border-soft rounded-xl px-3 py-2 bg-white text-xs w-full sm:max-w-[220px] outline-none"
              >
                <option value="">All other universities...</option>
                {universityRankings.slice(5).map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name} — {u.alumni.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {top5Unis.map((x, i) => (
                <div
                  key={x.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer group"
                  onClick={() => onNavigate('universityDetail', { name: x.name })}
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-soft flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="text-sm block truncate navy group-hover:text-blue-600 transition">{x.name}</b>
                    <span className="text-[11px] text-slate-400">{x.type} University</span>
                  </div>
                  <b className="text-sm navy whitespace-nowrap">{x.alumni.toLocaleString()}</b>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyUniversityFilter(x.name);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 transition opacity-80 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-2xs"
                    title={`Filter directory by ${x.name}`}
                  >
                    Filter
                  </button>
                </div>
              ))}
            </div>

            {selectedUni && (
              <div className="mt-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <b className="navy text-sm block">{selectedUni}</b>
                  <b className="text-blue-700 font-bold text-xs">
                    {universityRankings
                      .find((u) => u.name === selectedUni)
                      ?.alumni.toLocaleString()}{' '}
                    alumni
                  </b>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyUniversityFilter(selectedUni)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
                  >
                    Filter in Directory
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('universityDetail', { name: selectedUni })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition cursor-pointer"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Top Departments */}
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black navy">Top departments by alumni</h3>
                <p className="text-xs text-slate-400 mt-0.5">Aggregated across all universities</p>
              </div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="border border-soft rounded-xl px-3 py-2 bg-white text-xs w-full sm:max-w-[220px] outline-none"
              >
                <option value="">All other departments...</option>
                {departmentRankings.slice(5).map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} — {d.alumni.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {top5Depts.map((x, i) => (
                <div
                  key={x.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer group"
                  onClick={() =>
                    onNavigate('departmentUniversities', {
                      dept: x.name,
                      group: x.group,
                    })
                  }
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-soft flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <b className="text-sm block truncate navy group-hover:text-indigo-600 transition">{x.name}</b>
                    <span className="text-[11px] text-slate-400">
                      {x.group} · {x.universitiesCount} offering universities
                    </span>
                  </div>
                  <b className="text-sm navy whitespace-nowrap">{x.alumni.toLocaleString()}</b>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyDepartmentFilter(x.name);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 transition opacity-80 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-2xs"
                    title={`Filter directory by ${x.name}`}
                  >
                    Filter
                  </button>
                </div>
              ))}
            </div>

            {selectedDept && (
              <div className="mt-3 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <b className="navy text-sm block">{selectedDept}</b>
                  <b className="text-indigo-700 font-bold text-xs">
                    {departmentRankings
                      .find((d) => d.name === selectedDept)
                      ?.alumni.toLocaleString()}{' '}
                    alumni
                  </b>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyDepartmentFilter(selectedDept)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Filter in Directory
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const deptObj = departmentRankings.find((d) => d.name === selectedDept);
                      onNavigate('departmentUniversities', {
                        dept: selectedDept,
                        group: deptObj?.group || 'Academic',
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-black navy">University alumni distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Top 10 institutions visual proportion</p>
            <div className="h-80 mt-4 relative">
              <canvas ref={uChartCanvasRef}></canvas>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-black navy">Department alumni distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Top 10 academic disciplines proportion</p>
            <div className="h-80 mt-4 relative">
              <canvas ref={dChartCanvasRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
