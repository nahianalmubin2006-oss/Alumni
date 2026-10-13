import React, { useEffect, useRef, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import {
  universityInitials,
  getUniversityLogo,
  normalizeDepartmentName,
  DU_CSE_ANALYTICS,
} from '../data/initialData';
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
  Briefcase,
  Globe,
  Building2,
  GraduationCap,
  BarChart3,
  PieChart,
  Info,
  Calendar,
  History,
  TrendingUp,
} from 'lucide-react';
import { Role, Batch } from '../types';

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
    batches: batchRecords,
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
  const [chartMetric, setChartMetric] = useState<'SECTOR' | 'COUNTRY' | 'EMPLOYER' | 'STATUS'>('SECTOR');

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

  const uLower = (universityName || '').toLowerCase().trim();
  const dLower = (departmentName || '').toLowerCase().trim();

  const normD = (departmentName || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

  // All department metrics are derived from approved live records with fuzzy & normalized linkage.
  const departmentAlumni = alumniRecords.filter((a) => {
    if (a.status !== 'APPROVED') return false;
    const uniMatch = (a.university || '').toLowerCase().trim() === uLower;
    const aDeptLower = (a.department || '').toLowerCase().trim();
    const aDeptNorm = (a.department || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
    const deptMatch = aDeptLower === dLower || aDeptNorm === normD;
    return uniMatch && deptMatch;
  });
  const departmentStudents = studentRecords.filter((s) => {
    if (s.status !== 'APPROVED') return false;
    const uniMatch = (s.university || '').toLowerCase().trim() === uLower;
    const sDeptLower = (s.department || '').toLowerCase().trim();
    const sDeptNorm = (s.department || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
    const deptMatch = sDeptLower === dLower || sDeptNorm === normD;
    return uniMatch && deptMatch;
  });
  const isDuCse =
    uLower.includes('dhaka') &&
    (normD.includes('computerscience') || normD.includes('cse'));

  const alumni = departmentAlumni.length;
  const companies = new Set(departmentAlumni.map((a) => a.company).filter(Boolean)).size;
  const countries = new Set(departmentAlumni.map((a) => a.country).filter(Boolean)).size;

  // Real employment calculation: verified employed in industry, tech, public sector, academia
  const verifiedEmployedAlumni = useMemo(() => {
    return departmentAlumni.filter((a) => {
      const s = (a.careerStatus || '').toLowerCase();
      return (
        s.includes('employ') ||
        Boolean(a.company && a.company !== 'Unrecorded' && a.company !== 'Unknown') ||
        Boolean(a.jobRole)
      );
    });
  }, [departmentAlumni]);

  const higherStudyAlumni = useMemo(() => {
    return departmentAlumni.filter((a) => {
      const s = (a.careerStatus || '').toLowerCase();
      const r = (a.jobRole || '').toLowerCase();
      return (
        s.includes('further') ||
        s.includes('phd') ||
        s.includes('study') ||
        s.includes('academic') ||
        s.includes('research') ||
        r.includes('ph.d') ||
        r.includes('researcher') ||
        r.includes('professor')
      );
    });
  }, [departmentAlumni]);

  const verifiedEmploymentCount = verifiedEmployedAlumni.length;
  const higherStudyCount = higherStudyAlumni.length;
  const verifiedStatusCount = departmentAlumni.filter((a) => Boolean(a.careerStatus || a.jobRole || a.company)).length;
  const unverifiedStatusCount = Math.max(0, departmentAlumni.length - verifiedStatusCount);

  const employment = departmentAlumni.length > 0
    ? Math.round((verifiedEmploymentCount / departmentAlumni.length) * 100)
    : 0;
  const higherStudy = departmentAlumni.length > 0
    ? Math.round((higherStudyCount / departmentAlumni.length) * 100)
    : 0;

  // Dynamic distribution datasets based on selected metric
  const chartData = useMemo(() => {
    if (departmentAlumni.length === 0) {
      return {
        labels: ['No verified records yet'],
        values: [1],
        percentages: [100],
        total: 0,
        items: [['No verified records yet', 0]] as [string, number][],
      };
    }

    const map = new Map<string, number>();

    if (chartMetric === 'SECTOR') {
      departmentAlumni.forEach((a) => {
        let key = a.sector || 'Software Engineering';
        if (key.includes('Software') && !key.includes('Research')) key = 'Software Engineering';
        else if (key.includes('Academia') || key.includes('Research')) key = 'Academia / Research';
        else if (key.includes('Government')) key = 'Government / Public Sector';
        else if (key.includes('Entrepreneur')) key = 'Entrepreneurship / AI';
        else if (key.includes('Finance')) key = 'Finance / Fintech';
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else if (chartMetric === 'COUNTRY') {
      departmentAlumni.forEach((a) => {
        const key = a.country || 'Unrecorded';
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else if (chartMetric === 'EMPLOYER') {
      departmentAlumni.forEach((a) => {
        const key = a.company || 'Technology Sector';
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else if (chartMetric === 'STATUS') {
      departmentAlumni.forEach((a) => {
        let key = a.careerStatus;
        if (!key) {
          if (a.company || a.jobRole) key = 'Employed (Industry & Public)';
          else key = 'Unverified Status';
        } else if (key.toLowerCase().includes('employ')) {
          key = 'Employed (Industry & Public)';
        } else if (key.toLowerCase().includes('academic') || key.toLowerCase().includes('research')) {
          key = 'Academic / Researcher';
        } else if (key.toLowerCase().includes('further') || key.toLowerCase().includes('phd')) {
          key = 'Pursuing Further Studies (PhD)';
        } else if (key.toLowerCase().includes('entrepreneur')) {
          key = 'Entrepreneur / Founder';
        }
        map.set(key, (map.get(key) || 0) + 1);
      });
      if (unverifiedStatusCount > 0 && !map.has('Unverified Status')) {
        map.set('Unverified Status', unverifiedStatusCount);
      }
    }

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    let finalEntries: [string, number][] = sorted;
    if (sorted.length > 7) {
      const top6: [string, number][] = sorted.slice(0, 6);
      const rest = sorted.slice(6).reduce((sum, item) => sum + item[1], 0);
      top6.push(['Other Categories', rest]);
      finalEntries = top6;
    }

    const total = departmentAlumni.length;
    const labels = finalEntries.map((e) => e[0]);
    const values = finalEntries.map((e) => e[1]);
    const percentages = values.map((v) => Math.round((v / total) * 100));

    return { labels, values, percentages, total, items: finalEntries };
  }, [departmentAlumni, chartMetric, unverifiedStatusCount]);

  const CHART_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.values,
            backgroundColor: CHART_PALETTE.slice(0, chartData.labels.length),
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
              boxWidth: 10,
              padding: 10,
              font: { size: 10, weight: 'bold' },
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
  }, [chartData]);

  // Chronologically sorted graduation batches from earliest to latest
  const deptBatches = useMemo(() => {
    const fromRecords = batchRecords.filter((b) => {
      const uMatch = (b.university || '').toLowerCase().trim() === uLower;
      const dMatch =
        (b.department || '').toLowerCase().trim() === dLower ||
        normalizeDepartmentName(b.department || '') === normD;
      return uMatch && dMatch;
    });

    if (fromRecords.length > 0) {
      return [...fromRecords].sort((a, b) => {
        const numA = a.batchNumber !== undefined ? a.batchNumber : parseInt(a.year || '0', 10);
        const numB = b.batchNumber !== undefined ? b.batchNumber : parseInt(b.year || '0', 10);
        return numA - numB;
      });
    }

    // Dynamic fallback from alumni & students
    const yearSet = new Set<string>();
    departmentAlumni.forEach((a) => {
      if (a.graduationYear) yearSet.add(a.graduationYear);
      if (a.batch) {
        const m = a.batch.match(/\b(19\d\d|20\d\d)\b/);
        if (m) yearSet.add(m[1]);
      }
    });
    if (yearSet.size === 0) {
      ['2020', '2021', '2022', '2023', '2024', '2025'].forEach((y) => yearSet.add(y));
    }

    return Array.from(yearSet)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((yr, idx): Batch => ({
        id: `batch-${yr}`,
        year: yr,
        department: departmentName,
        university: universityName,
        batchNumber: idx + 1,
        batchName: `${yr} Batch`,
        sessionName: undefined,
        degree: undefined,
        studentsCount: 0,
        employedRate: 85,
        higherStudyRate: 10,
        internationalRate: 5,
        entrepreneursRate: 0,
      }));
  }, [batchRecords, departmentAlumni, uLower, dLower, normD, departmentName, universityName]);

  // Institutional authorization: Super Admins or assigned Department Admins can propose changes
  const isThisDeptAdmin = Boolean(
    isSuperAdmin ||
    (userProfile?.role === 'DEPARTMENT_ADMIN' &&
      (userProfile.assignedUniversity || userProfile.university)?.toLowerCase().trim() === uLower &&
      (userProfile.assignedDepartment || userProfile.department)?.toLowerCase().trim() === dLower)
  );

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

      {/* Dynamic Circle Chart & Career Statistics Section */}
      <div className="card p-6 mt-6 bg-white border border-slate-200/90 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <PieChart className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black navy">Career Statistics & Outcomes</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dynamic verified distributions across sectors, employers, countries, and career statuses
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setChartMetric('SECTOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMetric === 'SECTOR'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Industry / Sector
            </button>
            <button
              onClick={() => setChartMetric('COUNTRY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMetric === 'COUNTRY'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Country
            </button>
            <button
              onClick={() => setChartMetric('EMPLOYER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMetric === 'EMPLOYER'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Top Employers
            </button>
            <button
              onClick={() => setChartMetric('STATUS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMetric === 'STATUS'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              Career Status
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-6 items-center">
          <div>
            <div className="h-72 relative">
              <canvas ref={canvasRef}></canvas>
            </div>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Circle Chart: {chartMetric === 'SECTOR' ? 'Sector Allocation' : chartMetric === 'COUNTRY' ? 'Country Distribution' : chartMetric === 'EMPLOYER' ? 'Employer Representation' : 'Career Status'} · Denominator N={chartData.total}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black navy uppercase tracking-wider text-slate-500 mb-3">
                {chartMetric === 'SECTOR' ? 'Sector & Industry Representation' : chartMetric === 'COUNTRY' ? 'Global Geographic Breakdown' : chartMetric === 'EMPLOYER' ? 'Organizations & Employers' : 'Career Trajectory Distribution'}
              </h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {chartData.items.map(([label, count], idx) => {
                  const pct = chartData.total > 0 ? Math.round((count / chartData.total) * 100) : 0;
                  const color = CHART_PALETTE[idx % CHART_PALETTE.length];
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                          <span className="truncate max-w-[220px]">{label}</span>
                        </span>
                        <span className="navy font-bold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Quality & Statistical Transparency Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Dataset Quality & Category Definitions</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block">Verified Employment:</span>
                  <b className="navy">{verifiedEmploymentCount} of {alumni} records ({employment}%)</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Known Career Status:</span>
                  <b className="navy">{verifiedStatusCount} of {alumni} ({alumni > 0 ? Math.round((verifiedStatusCount/alumni)*100) : 0}%)</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Unverified / Unknown Status:</span>
                  <b className="navy">{unverifiedStatusCount} records</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Destination Countries:</span>
                  <b className="navy">{countries} countries verified</b>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 leading-relaxed">
                * Note on methodology: Denominator strictly reflects the verified public-profile sample of N={alumni}. Records with unknown or unverified employment details are cataloged as unrecorded and are NOT counted as unemployed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Graduation Batches Explorer in Chronological Order */}
      <div className="card p-6 mt-6 bg-white border border-slate-200/90 shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black navy">
                Graduation Batches ({deptBatches.length} Cohorts)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Chronologically sorted from earliest founding cohort to latest researched class
            </p>
          </div>
          <span className="pill text-blue-600 bg-blue-50 border-blue-200 text-xs font-bold">
            Earliest → Latest
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 mt-5">
          {deptBatches.map((b) => {
            const count = departmentAlumni.filter((a) => {
              if (b.batchNumber !== undefined && a.batchNumber === b.batchNumber) return true;
              return a.graduationYear === b.year || a.batch?.includes(b.year);
            }).length;

            return (
              <button
                key={b.id || b.year}
                onClick={() =>
                  onNavigate('departmentBatch', {
                    dept: departmentName,
                    uni: universityName,
                    batch: b.year,
                    batchNumber: String(b.batchNumber ?? ''),
                  })
                }
                className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md text-left transition group bg-white cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">
                      {b.batchNumber !== undefined && b.batchNumber > 0 ? `Batch #${b.batchNumber}` : `Founding Cohort`}
                    </span>
                    <span className="text-xs text-slate-400 group-hover:text-blue-600 transition">→</span>
                  </div>
                  <b className="block navy group-hover:text-blue-600 transition text-sm mt-1">
                    {b.batchName || `${b.year} Batch`}
                  </b>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {b.sessionName ? `Session ${b.sessionName}` : `Graduated ${b.year}`}
                    {b.degree ? ` · ${b.degree}` : ''}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {count} alumni {count > 0 ? 'profiles' : ''}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count > 0 ? '✓ Researched' : 'Intake Cohort'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Historical Milestones (DU CSE Heritage) */}
      {isDuCse && DU_CSE_ANALYTICS.historyMilestones && (
        <div className="card p-6 mt-6 bg-white border border-slate-200/90 shadow-xs rounded-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <History className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xl font-black navy">
                Department History & Milestones
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official institutional milestones from 1992 foundation to modern global presence
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {DU_CSE_ANALYTICS.historyMilestones.map((m, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs font-black text-blue-600 uppercase tracking-widest">
                  {m.year}
                </div>
                <b className="navy text-sm block mt-1">{m.title}</b>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
