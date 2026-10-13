import React, { useState, useMemo, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Briefcase,
  Globe,
  Calendar,
  Filter,
  CheckCircle2,
  Sparkles,
  BarChart3,
  PieChart,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Users,
  Compass,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Award,
  Layers,
  Search,
  Check,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { AlumniRecord } from '../types';
import { ALL_DIRECTORY_UNIVERSITIES, RAW_DEPARTMENT_CATALOG, getUniversityLogo } from '../data/initialData';

interface AlumniAnalyticsViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
  initialParams?: Record<string, string>;
}

export const AlumniAnalyticsView: React.FC<AlumniAnalyticsViewProps> = ({
  onNavigate,
  onBack,
  initialParams,
}) => {
  const { alumni, allUsers, universities, loadingData } = useData();
  const { currentUser, userProfile } = useAuth();

  // Filter out students, private profiles (unless own profile), and suspended records
  const validAlumni = useMemo(() => {
    return alumni.filter((record) => {
      if ((record as any).profileType === 'Student') return false;
      const linkedUserId = record.userId || record.id;
      const linkedProfile = allUsers.find(
        (u) => u.uid === linkedUserId || u.id === linkedUserId
      );
      if (linkedProfile?.profileType === 'Student' || linkedProfile?.role === 'STUDENT') {
        return false;
      }
      // Respect privacy settings
      if (
        record.publicDirectoryVisible === false &&
        currentUser?.uid !== linkedUserId
      ) {
        return false;
      }
      if (record.status === 'REJECTED') return false;
      return true;
    });
  }, [alumni, allUsers, currentUser]);

  // Filter states
  const [universityFilter, setUniversityFilter] = useState<string>(
    initialParams?.uni || 'All'
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    initialParams?.dept || 'All'
  );
  const [sectorFilter, setSectorFilter] = useState<string>(
    initialParams?.sector || 'All'
  );
  const [countryFilter, setCountryFilter] = useState<string>(
    initialParams?.country || 'All'
  );
  const [yearFilter, setYearFilter] = useState<string>(
    initialParams?.year || 'All'
  );
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(
    initialParams?.verified === 'true'
  );
  const [careerMode, setCareerMode] = useState<'sector' | 'company' | 'jobRole'>(
    'sector'
  );

  // Sync if initialParams changes
  useEffect(() => {
    if (initialParams) {
      if (initialParams.uni) setUniversityFilter(initialParams.uni);
      if (initialParams.dept) setDepartmentFilter(initialParams.dept);
      if (initialParams.sector) setSectorFilter(initialParams.sector);
      if (initialParams.country) setCountryFilter(initialParams.country);
      if (initialParams.year) setYearFilter(initialParams.year);
      if (initialParams.verified === 'true') setVerifiedOnly(true);
    }
  }, [initialParams]);

  // Helper to extract 4-digit graduation year
  const parseGradYear = (record: AlumniRecord): number | null => {
    const raw = (record.graduationYear || record.batch || '').trim();
    if (!raw) return null;
    const match = raw.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return parseInt(match[1], 10);
    const parsed = parseInt(raw, 10);
    return !isNaN(parsed) && parsed >= 1950 && parsed <= 2050 ? parsed : null;
  };

  // Filtered dataset according to active selections
  const filteredAlumni = useMemo(() => {
    return validAlumni.filter((a) => {
      if (verifiedOnly && !a.isVerified) return false;

      if (
        universityFilter !== 'All' &&
        a.university?.toLowerCase() !== universityFilter.toLowerCase()
      ) {
        return false;
      }

      if (
        departmentFilter !== 'All' &&
        a.department?.toLowerCase() !== departmentFilter.toLowerCase()
      ) {
        return false;
      }

      if (
        sectorFilter !== 'All' &&
        (a.sector || 'Uncategorized').toLowerCase() !== sectorFilter.toLowerCase()
      ) {
        return false;
      }

      if (countryFilter !== 'All' && a.country !== countryFilter) {
        return false;
      }

      const yr = parseGradYear(a);
      if (yearFilter !== 'All') {
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
          if (!isNaN(targetYear) && yr !== targetYear) return false;
        }
      }

      return true;
    });
  }, [
    validAlumni,
    universityFilter,
    departmentFilter,
    sectorFilter,
    countryFilter,
    yearFilter,
    verifiedOnly,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setUniversityFilter('All');
    setDepartmentFilter('All');
    setSectorFilter('All');
    setCountryFilter('All');
    setYearFilter('All');
    setVerifiedOnly(false);
  };

  const hasActiveFilters =
    universityFilter !== 'All' ||
    departmentFilter !== 'All' ||
    sectorFilter !== 'All' ||
    countryFilter !== 'All' ||
    yearFilter !== 'All' ||
    verifiedOnly;

  // Chart Canvas & Instance References
  const uniChartRef = useRef<HTMLCanvasElement | null>(null);
  const deptChartRef = useRef<HTMLCanvasElement | null>(null);
  const yearChartRef = useRef<HTMLCanvasElement | null>(null);
  const careerChartRef = useRef<HTMLCanvasElement | null>(null);

  const uniChartInstance = useRef<Chart | null>(null);
  const deptChartInstance = useRef<Chart | null>(null);
  const yearChartInstance = useRef<Chart | null>(null);
  const careerChartInstance = useRef<Chart | null>(null);

  // Computed Distributions
  // 1. University Distribution
  const universityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAlumni.forEach((a) => {
      const u = a.university || 'Unspecified';
      counts[u] = (counts[u] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const top8 = sorted.slice(0, 8);
    const otherCount = sorted.slice(8).reduce((sum, item) => sum + item.count, 0);
    if (otherCount > 0) {
      top8.push({ name: 'Other Institutions', count: otherCount });
    }
    return top8;
  }, [filteredAlumni]);

  // 2. Department Distribution
  const departmentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAlumni.forEach((a) => {
      const d = a.department || 'General Faculty';
      counts[d] = (counts[d] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const top8 = sorted.slice(0, 8);
    const otherCount = sorted.slice(8).reduce((sum, item) => sum + item.count, 0);
    if (otherCount > 0) {
      top8.push({ name: 'Other Disciplines', count: otherCount });
    }
    return top8;
  }, [filteredAlumni]);

  // 3. Graduation Year & Batch Distribution
  const yearDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAlumni.forEach((a) => {
      const yr = parseGradYear(a);
      const key = yr ? yr.toString() : 'Unrecorded';
      counts[key] = (counts[key] || 0) + 1;
    });

    const entries = Object.entries(counts);
    const yearEntries = entries
      .filter(([k]) => k !== 'Unrecorded')
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));

    const unrecorded = entries.find(([k]) => k === 'Unrecorded');
    if (unrecorded) {
      yearEntries.push(unrecorded);
    }
    return yearEntries.map(([year, count]) => ({ year, count }));
  }, [filteredAlumni]);

  // 4. Career Distributions (Sector, Company, Job Role)
  const careerDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAlumni.forEach((a) => {
      let val = '';
      if (careerMode === 'sector') {
        val = a.sector || 'Technology & Engineering';
      } else if (careerMode === 'company') {
        val = a.company || 'Private Practice / Unlisted';
      } else {
        val = a.jobRole || 'Alumni Professional';
      }
      val = val.trim();
      counts[val] = (counts[val] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const top7 = sorted.slice(0, 7);
    const otherCount = sorted.slice(7).reduce((sum, item) => sum + item.count, 0);
    if (otherCount > 0) {
      top7.push({ name: 'Others', count: otherCount });
    }
    return top7;
  }, [filteredAlumni, careerMode]);

  // Palette colors for charts
  const bluePalette = [
    '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
    '#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b',
  ];
  const emeraldPalette = [
    '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7',
    '#3b82f6', '#60a5fa', '#f59e0b', '#d97706', '#64748b',
  ];

  // Render University Chart
  useEffect(() => {
    if (!uniChartRef.current) return;
    if (uniChartInstance.current) uniChartInstance.current.destroy();

    const ctx = uniChartRef.current.getContext('2d');
    if (!ctx || universityDistribution.length === 0) return;

    uniChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: universityDistribution.map((u) => u.name),
        datasets: [
          {
            label: 'Alumni Count',
            data: universityDistribution.map((u) => u.count),
            backgroundColor: bluePalette.slice(0, universityDistribution.length),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const total = filteredAlumni.length;
                const pct = total > 0 ? Math.round((Number(item.raw) / total) * 100) : 0;
                return ` ${item.raw} alumni (${pct}% of cohort)`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 25,
              font: { size: 10, weight: 600 },
              callback: function (val, index) {
                const label = universityDistribution[index]?.name || '';
                return label.length > 18 ? label.slice(0, 16) + '...' : label;
              },
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 10 } },
            grid: { color: '#f1f5f9' },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedUni = universityDistribution[index]?.name;
            if (clickedUni && clickedUni !== 'Other Institutions') {
              setUniversityFilter(clickedUni);
            }
          }
        },
      },
    });

    return () => {
      if (uniChartInstance.current) uniChartInstance.current.destroy();
    };
  }, [universityDistribution, filteredAlumni.length]);

  // Render Department Chart
  useEffect(() => {
    if (!deptChartRef.current) return;
    if (deptChartInstance.current) deptChartInstance.current.destroy();

    const ctx = deptChartRef.current.getContext('2d');
    if (!ctx || departmentDistribution.length === 0) return;

    deptChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: departmentDistribution.map((d) => d.name),
        datasets: [
          {
            data: departmentDistribution.map((d) => d.count),
            backgroundColor: emeraldPalette.slice(0, departmentDistribution.length),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              font: { size: 10, weight: 500 },
              generateLabels: (chart) => {
                const data = chart.data;
                if (!data.labels?.length || !data.datasets.length) return [];
                return data.labels.map((lbl, i) => {
                  const val = data.datasets[0].data[i] as number;
                  const shortLbl =
                    String(lbl).length > 20
                      ? String(lbl).slice(0, 18) + '...'
                      : String(lbl);
                  return {
                    text: `${shortLbl} (${val})`,
                    fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                    hidden: false,
                    index: i,
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const total = filteredAlumni.length;
                const pct = total > 0 ? Math.round((Number(item.raw) / total) * 100) : 0;
                return ` ${item.label}: ${item.raw} alumni (${pct}%)`;
              },
            },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedDept = departmentDistribution[index]?.name;
            if (clickedDept && clickedDept !== 'Other Disciplines') {
              setDepartmentFilter(clickedDept);
            }
          }
        },
      },
    });

    return () => {
      if (deptChartInstance.current) deptChartInstance.current.destroy();
    };
  }, [departmentDistribution, filteredAlumni.length]);

  // Render Year & Batch Timeline Chart
  useEffect(() => {
    if (!yearChartRef.current) return;
    if (yearChartInstance.current) yearChartInstance.current.destroy();

    const ctx = yearChartRef.current.getContext('2d');
    if (!ctx || yearDistribution.length === 0) return;

    yearChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: yearDistribution.map((y) => y.year),
        datasets: [
          {
            label: 'Graduates Count',
            data: yearDistribution.map((y) => y.count),
            backgroundColor: '#3b82f6',
            hoverBackgroundColor: '#1d4ed8',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.raw} alumni graduated in ${item.label}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 10, weight: 600 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 10 } },
            grid: { color: '#f1f5f9' },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedYear = yearDistribution[index]?.year;
            if (clickedYear && clickedYear !== 'Unrecorded') {
              setYearFilter(clickedYear);
            }
          }
        },
      },
    });

    return () => {
      if (yearChartInstance.current) yearChartInstance.current.destroy();
    };
  }, [yearDistribution]);

  // Render Career Landscape Chart (Sector / Company / Job Role)
  useEffect(() => {
    if (!careerChartRef.current) return;
    if (careerChartInstance.current) careerChartInstance.current.destroy();

    const ctx = careerChartRef.current.getContext('2d');
    if (!ctx || careerDistribution.length === 0) return;

    careerChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: careerDistribution.map((c) => c.name),
        datasets: [
          {
            axis: 'y',
            label: 'Alumni',
            data: careerDistribution.map((c) => c.count),
            backgroundColor: [
              '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe',
              '#06b6d4', '#14b8a6', '#f59e0b',
            ].slice(0, careerDistribution.length),
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.raw} alumni`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 10 } },
            grid: { color: '#f1f5f9' },
          },
          y: {
            ticks: {
              font: { size: 10, weight: 600 },
              callback: function (val, index) {
                const label = careerDistribution[index]?.name || '';
                return label.length > 20 ? label.slice(0, 18) + '...' : label;
              },
            },
            grid: { display: false },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedName = careerDistribution[index]?.name;
            if (clickedName && clickedName !== 'Others') {
              if (careerMode === 'sector') {
                setSectorFilter(clickedName);
              } else {
                // Navigate to directory with search for that company/role
                onNavigate('alumni', { search: clickedName });
              }
            }
          }
        },
      },
    });

    return () => {
      if (careerChartInstance.current) careerChartInstance.current.destroy();
    };
  }, [careerDistribution, careerMode, onNavigate]);

  // Overall Integrity & Data Health Metrics
  const healthMetrics = useMemo(() => {
    const total = filteredAlumni.length;
    if (total === 0) {
      return {
        verifiedCount: 0,
        verifiedRate: 0,
        missingCompany: 0,
        missingYear: 0,
        completenessScore: 0,
      };
    }
    const verified = filteredAlumni.filter((a) => a.isVerified).length;
    const missingComp = filteredAlumni.filter((a) => !a.company?.trim()).length;
    const missingYr = filteredAlumni.filter((a) => !parseGradYear(a)).length;
    const completeProfiles = filteredAlumni.filter(
      (a) => a.company?.trim() && parseGradYear(a) && a.jobRole?.trim()
    ).length;

    return {
      verifiedCount: verified,
      verifiedRate: Math.round((verified / total) * 100),
      missingCompany: missingComp,
      missingYear: missingYr,
      completenessScore: Math.round((completeProfiles / total) * 100),
    };
  }, [filteredAlumni]);

  // Related Alumni Recommendations Engine
  const recommendedAlumni = useMemo(() => {
    if (filteredAlumni.length === 0) return [];

    // Prioritize alumni sharing university or department or sector with currentUser
    const targetUni = userProfile?.university || filteredAlumni[0]?.university;
    const targetDept = userProfile?.department || filteredAlumni[0]?.department;
    const targetSector = userProfile?.jobRole || 'Tech';

    const scored = filteredAlumni.map((a) => {
      let score = 0;
      if (a.university && targetUni && a.university.toLowerCase() === targetUni.toLowerCase()) {
        score += 40;
      }
      if (a.department && targetDept && a.department.toLowerCase() === targetDept.toLowerCase()) {
        score += 35;
      }
      if (a.sector && targetSector && a.sector.toLowerCase().includes(targetSector.toLowerCase())) {
        score += 25;
      }
      if (a.isVerified) score += 10;
      if (a.mentorshipOpen) score += 15;
      return { alumnus: a, score };
    });

    return scored
      .filter((s) => s.alumnus.id !== currentUser?.uid)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.alumnus);
  }, [filteredAlumni, userProfile, currentUser]);

  // Navigate to Directory pre-filtered by current scope
  const handleOpenFilteredDirectory = () => {
    const params: Record<string, string> = {};
    if (universityFilter !== 'All') params.uni = universityFilter;
    if (departmentFilter !== 'All') params.dept = departmentFilter;
    if (sectorFilter !== 'All') params.sector = sectorFilter;
    if (countryFilter !== 'All') params.country = countryFilter;
    if (yearFilter !== 'All') params.year = yearFilter;
    if (verifiedOnly) params.verified = 'true';
    onNavigate('alumni', params);
  };

  // Loading skeleton
  if (loadingData && validAlumni.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-pulse space-y-6">
        <div className="h-28 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => (onBack ? onBack() : onNavigate('alumni'))}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Alumni Directory</span>
        </button>

        <button
          onClick={handleOpenFilteredDirectory}
          className="inline-flex items-center gap-1.5 bg-navy hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <span>View {filteredAlumni.length} in Directory</span>
          <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
        </button>
      </div>

      {/* Main Header Hero */}
      <div className="card overflow-hidden bg-gradient-to-br from-slate-900 via-navy to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative mb-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-black text-amber-300 uppercase tracking-widest bg-amber-400/10 border border-amber-400/25 px-3 py-1 rounded-full mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Network Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Alumni Discovery & Career Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Synthesizing genuine institutional records to visualize alumni representation across
              universities, academic disciplines, graduation cohorts, and global industries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-400/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{filteredAlumni.length} Records in Scope</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FILTER CONTROLS TOOLBAR */}
      {/* ========================================================= */}
      <div className="card p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold navy uppercase tracking-wider">
              Analytics Scope & Filters
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. University Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              University
            </label>
            <select
              value={universityFilter}
              onChange={(e) => setUniversityFilter(e.target.value)}
              className="account-input w-full text-xs py-2"
            >
              <option value="All">All Universities</option>
              {ALL_DIRECTORY_UNIVERSITIES.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="account-input w-full text-xs py-2"
            >
              <option value="All">All Departments</option>
              {RAW_DEPARTMENT_CATALOG.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Industry Sector Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Industry Sector
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="account-input w-full text-xs py-2"
            >
              <option value="All">All Sectors</option>
              <option value="Software & IT">Software & IT</option>
              <option value="Banking & Finance">Banking & Finance</option>
              <option value="Telecommunications">Telecommunications</option>
              <option value="Academia & Research">Academia & Research</option>
              <option value="Government & Public Sector">Government & Public Sector</option>
              <option value="Consulting & Corporate">Consulting & Corporate</option>
              <option value="Healthcare & BioTech">Healthcare & BioTech</option>
            </select>
          </div>

          {/* 4. Graduation Batch Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Graduation Cohort
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="account-input w-full text-xs py-2"
            >
              <option value="All">All Years</option>
              <option value="2020+">2020 & Newer</option>
              <option value="2015-2019">2015 — 2019</option>
              <option value="2010-2014">2010 — 2014</option>
              <option value="before-2010">Before 2010</option>
              <option value="2024">Batch 2024</option>
              <option value="2023">Batch 2023</option>
              <option value="2022">Batch 2022</option>
              <option value="2021">Batch 2021</option>
              <option value="2020">Batch 2020</option>
              <option value="2019">Batch 2019</option>
            </select>
          </div>

          {/* 5. Verified Only Switch */}
          <div className="flex flex-col justify-end pb-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Verified Records Only</span>
            </label>
            <span className="text-[10px] text-slate-400 mt-1">
              Excludes unconfirmed entries
            </span>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
            {universityFilter !== 'All' && (
              <span className="pill text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                <span>Uni: {universityFilter}</span>
                <button
                  onClick={() => setUniversityFilter('All')}
                  className="hover:text-rose-600 ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {departmentFilter !== 'All' && (
              <span className="pill text-xs bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                <span>Dept: {departmentFilter}</span>
                <button
                  onClick={() => setDepartmentFilter('All')}
                  className="hover:text-rose-600 ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {sectorFilter !== 'All' && (
              <span className="pill text-xs bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <span>Sector: {sectorFilter}</span>
                <button
                  onClick={() => setSectorFilter('All')}
                  className="hover:text-rose-600 ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {yearFilter !== 'All' && (
              <span className="pill text-xs bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
                <span>Cohort: {yearFilter}</span>
                <button
                  onClick={() => setYearFilter('All')}
                  className="hover:text-rose-600 ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {verifiedOnly && (
              <span className="pill text-xs bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <span>Verified Only</span>
                <button
                  onClick={() => setVerifiedOnly(false)}
                  className="hover:text-rose-600 ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* KEY METRICS SUMMARY ROW */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cohort Scope</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <b className="text-2xl font-black navy block">{filteredAlumni.length}</b>
          <span className="text-[10px] text-slate-500">
            {filteredAlumni.length === validAlumni.length
              ? 'Complete alumni database'
              : `Filtered from ${validAlumni.length} total`}
          </span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verification Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <b className="text-2xl font-black text-emerald-700 block">
            {healthMetrics.verifiedRate}%
          </b>
          <span className="text-[10px] text-slate-500">
            {healthMetrics.verifiedCount} institutionally confirmed
          </span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lead Sector</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <b className="text-base font-black navy block truncate">
            {careerDistribution[0]?.name || 'Technology'}
          </b>
          <span className="text-[10px] text-slate-500">
            {careerDistribution[0]?.count || 0} alumni represented
          </span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Data Health</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <b className="text-2xl font-black navy block">
            {healthMetrics.completenessScore}%
          </b>
          <span className="text-[10px] text-slate-500">
            Comprehensive profile records
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EMPTY STATE IF FILTERS YIELD ZERO RESULTS */}
      {/* ========================================================= */}
      {filteredAlumni.length === 0 ? (
        <div className="card p-12 text-center bg-white border border-slate-200 rounded-3xl my-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-black navy">No Records Match This Scope</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Try adjusting your university, discipline, or cohort filters to view aggregate intelligence.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-5 bg-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 4 INTERACTIVE CHARTS GRID */}
          {/* ========================================================= */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Chart 1: University Representation */}
            <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold navy">Alumni Distribution by University</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Click bar to filter</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Institutional alumni count across major university campuses
                </p>
              </div>

              <div className="h-72 mt-4 relative" role="region" aria-label="Alumni distribution by university chart">
                <canvas ref={uniChartRef} aria-label="University distribution chart"></canvas>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Showing Top {universityDistribution.length} institutions</span>
                {universityFilter !== 'All' && (
                  <button
                    onClick={() => setUniversityFilter('All')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Clear Uni Filter
                  </button>
                )}
              </div>
            </div>

            {/* Chart 2: Department Disciplines */}
            <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold navy">Academic Discipline Distribution</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Click slice to filter</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Departmental proportions across faculties and disciplines
                </p>
              </div>

              <div className="h-72 mt-4 relative" role="region" aria-label="Academic discipline distribution chart">
                <canvas ref={deptChartRef} aria-label="Department distribution chart"></canvas>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Interactive breakdown</span>
                {departmentFilter !== 'All' && (
                  <button
                    onClick={() => setDepartmentFilter('All')}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Clear Dept Filter
                  </button>
                )}
              </div>
            </div>

            {/* Chart 3: Graduation Cohort & Batch Timeline */}
            <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold navy">Graduation-Year & Batch Distribution</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Timeline analysis</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Historical graduation cohort frequency and progression over years
                </p>
              </div>

              <div className="h-72 mt-4 relative" role="region" aria-label="Graduation batch distribution chart">
                <canvas ref={yearChartRef} aria-label="Graduation year distribution chart"></canvas>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Cohorts from 1995 to present</span>
                {yearFilter !== 'All' && (
                  <button
                    onClick={() => setYearFilter('All')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Clear Cohort Filter
                  </button>
                )}
              </div>
            </div>

            {/* Chart 4: Career & Industry Landscape */}
            <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold navy">Career & Professional Distribution</h3>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start">
                    <button
                      onClick={() => setCareerMode('sector')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        careerMode === 'sector'
                          ? 'bg-white text-navy shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Industry Sector
                    </button>
                    <button
                      onClick={() => setCareerMode('company')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        careerMode === 'company'
                          ? 'bg-white text-navy shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Top Companies
                    </button>
                    <button
                      onClick={() => setCareerMode('jobRole')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        careerMode === 'jobRole'
                          ? 'bg-white text-navy shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Job Roles
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  {careerMode === 'sector'
                    ? 'Proportions by employment industry & domain'
                    : careerMode === 'company'
                    ? 'Leading employers and institutions hiring alumni'
                    : 'Common designations and career titles'}
                </p>
              </div>

              <div className="h-72 mt-4 relative" role="region" aria-label="Career landscape distribution chart">
                <canvas ref={careerChartRef} aria-label="Career landscape chart"></canvas>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Top represented segments</span>
                {sectorFilter !== 'All' && (
                  <button
                    onClick={() => setSectorFilter('All')}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Clear Sector Filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DATA HEALTH & TRANSPARENCY PANEL */}
          {/* ========================================================= */}
          <div className="card p-5 sm:p-6 bg-slate-50 border border-slate-200/90 rounded-2xl mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold navy uppercase tracking-wider">
                  Data Integrity, Privacy & Verification Transparency
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Analytics are computed dynamically from active alumni registrations. Private profiles
                  ({validAlumni.filter((a) => a.publicDirectoryVisible === false).length} records) are
                  excluded to honor member visibility preferences.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      <b>{healthMetrics.verifiedCount}</b> Verified institutional records
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>
                      <b>{filteredAlumni.length - healthMetrics.verifiedCount}</b> Self-reported member records
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>
                      <b>{healthMetrics.missingCompany}</b> Unspecified employment records
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RELATED ALUMNI RECOMMENDATIONS RACK */}
          {/* ========================================================= */}
          {recommendedAlumni.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black navy flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Smart Alumni Recommendations</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Alumni scholars matching your current institutional focus & career domain
                  </p>
                </div>
                <button
                  onClick={handleOpenFilteredDirectory}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendedAlumni.map((alum) => {
                  const initials = (alum.name || 'AL')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={alum.id}
                      className="card p-4 bg-white border border-slate-200/80 rounded-2xl hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                            {alum.photoUrl ? (
                              <img
                                src={alum.photoUrl}
                                alt={alum.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold navy text-xs truncate">{alum.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {alum.jobRole || 'Alumnus'} {alum.company ? `at ${alum.company}` : ''}
                            </p>
                            {alum.isVerified && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold mt-0.5">
                                <Award className="w-3 h-3 text-amber-500" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="truncate">
                            <b>{alum.university}</b>
                          </p>
                          <p className="text-slate-500 truncate">
                            {alum.department} ({alum.batch || alum.graduationYear})
                          </p>
                          {alum.sector && (
                            <span className="inline-block mt-1 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              {alum.sector}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() =>
                            onNavigate('alumniProfile', {
                              id: alum.id,
                              name: alum.name,
                            })
                          }
                          className="w-full text-center py-1.5 rounded-lg bg-navy hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SYNCHRONIZED ALUMNI COHORT PREVIEW TABLE */}
          {/* ========================================================= */}
          <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold navy flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Synchronized Cohort Sample ({filteredAlumni.length} Total)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Showing top member profiles matching current scope filters
                </p>
              </div>

              <button
                onClick={handleOpenFilteredDirectory}
                className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Browse in Full Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Alumnus</th>
                    <th className="py-2.5 px-3">University</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Role & Company</th>
                    <th className="py-2.5 px-3">Verification</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlumni.slice(0, 8).map((alum) => (
                    <tr key={alum.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-bold navy">{alum.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{alum.university}</td>
                      <td className="py-2.5 px-3 text-slate-600">{alum.department}</td>
                      <td className="py-2.5 px-3 text-slate-500">{alum.batch || alum.graduationYear}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {alum.jobRole} {alum.company ? `at ${alum.company}` : ''}
                      </td>
                      <td className="py-2.5 px-3">
                        {alum.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Member</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() =>
                            onNavigate('alumniProfile', {
                              id: alum.id,
                              name: alum.name,
                            })
                          }
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
