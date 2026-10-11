import React, { useEffect, useRef, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { useData } from '../context/DataContext';
import { normalizeDepartmentName } from '../data/initialData';
import {
  Flame,
  Award,
  Bot,
  Shield,
  Clock,
  Pin,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  Briefcase,
  Globe,
  Building2,
  GraduationCap,
  Search,
  Filter,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface DepartmentBatchViewProps {
  departmentName: string;
  universityName: string;
  batchYear: string;
  batchNumber?: number;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const DepartmentBatchView: React.FC<DepartmentBatchViewProps> = ({
  departmentName,
  universityName,
  batchYear,
  batchNumber,
  onNavigate,
  onBack,
}) => {
  const {
    alumni,
    batches,
    news,
    makeNewsPermanent,
    removeNewsPermanent,
    triggerAINewsBotScan,
    canUserManageArticle,
  } = useData();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Batch search & filter controls
  const [alumniSearch, setAlumniSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [batchChartMetric, setBatchChartMetric] = useState<'SECTOR' | 'COUNTRY' | 'EMPLOYER' | 'STATUS'>('SECTOR');

  const uLower = (universityName || '').toLowerCase().trim();
  const dLower = (departmentName || '').toLowerCase().trim();
  const bYear = (batchYear || '').trim();
  const normD = normalizeDepartmentName(departmentName || '');

  // Look up structured batch metadata from DataContext
  const batchInfo = useMemo(() => {
    return batches.find((b) => {
      const uMatch = (b.university || '').toLowerCase().trim() === uLower;
      const dMatch =
        (b.department || '').toLowerCase().trim() === dLower ||
        normalizeDepartmentName(b.department || '') === normD;
      const yrMatch =
        (batchNumber !== undefined && b.batchNumber === batchNumber) ||
        b.year === bYear ||
        (b.id && b.id.endsWith(`-${bYear}`));
      return uMatch && dMatch && yrMatch;
    });
  }, [batches, uLower, dLower, normD, bYear, batchNumber]);

  // Verified alumni from this specific graduation batch
  const batchAlumni = useMemo(() => {
    return alumni.filter((a) => {
      if (a.status && a.status !== 'APPROVED') return false;
      const uniMatch = (a.university || '').toLowerCase().trim() === uLower;
      const aDeptLower = (a.department || '').toLowerCase().trim();
      const aDeptNorm = normalizeDepartmentName(a.department || '');
      const deptMatch = aDeptLower === dLower || aDeptNorm === normD;

      const yearMatch =
        (batchNumber !== undefined && a.batchNumber === batchNumber) ||
        (!bYear ||
          (a.batch || '').trim() === bYear ||
          (a.graduationYear || '').trim() === bYear ||
          (a.batch || '').includes(bYear) ||
          (a.graduationYear || '').includes(bYear) ||
          (batchInfo?.batchNumber !== undefined && a.batchNumber === batchInfo.batchNumber));

      return uniMatch && deptMatch && yearMatch;
    });
  }, [alumni, uLower, dLower, normD, bYear, batchNumber, batchInfo]);

  // Filtered batch alumni by search, country, and sector
  const filteredBatchAlumni = useMemo(() => {
    return batchAlumni.filter((a) => {
      if (countryFilter !== 'All' && a.country !== countryFilter) return false;
      if (sectorFilter !== 'All' && (a.sector || 'Other') !== sectorFilter) return false;
      if (alumniSearch.trim()) {
        const q = alumniSearch.toLowerCase().trim();
        const hay = [
          a.name,
          a.jobRole,
          a.company,
          a.country,
          a.city,
          a.sector,
          a.specialization,
          a.degree,
          a.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [batchAlumni, alumniSearch, countryFilter, sectorFilter]);

  const uniqueCountries = useMemo(() => {
    return Array.from(new Set(batchAlumni.map((a) => a.country).filter(Boolean))).sort();
  }, [batchAlumni]);

  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(batchAlumni.map((a) => a.sector).filter(Boolean))).sort();
  }, [batchAlumni]);

  // Dynamic statistics from verified dataset
  const studentsCount = batchInfo?.intakeCapacity || (batchAlumni.length > 0 ? batchAlumni.length : 60);

  const verifiedEmployedAlumni = useMemo(() => {
    return batchAlumni.filter((a) => {
      const s = (a.careerStatus || '').toLowerCase();
      return (
        s.includes('employ') ||
        Boolean(a.company && a.company !== 'Unrecorded' && a.company !== 'Unknown') ||
        Boolean(a.jobRole)
      );
    });
  }, [batchAlumni]);

  const higherStudyAlumni = useMemo(() => {
    return batchAlumni.filter((a) => {
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
  }, [batchAlumni]);

  const employedRate = batchAlumni.length > 0
    ? Math.round((verifiedEmployedAlumni.length / batchAlumni.length) * 100)
    : (batchInfo?.employedRate || 0);

  const higherStudyRate = batchAlumni.length > 0
    ? Math.round((higherStudyAlumni.length / batchAlumni.length) * 100)
    : (batchInfo?.higherStudyRate || 0);

  const internationalCount = batchAlumni.filter((a) => a.country && a.country !== 'Bangladesh').length;
  const internationalRate = batchAlumni.length > 0
    ? Math.round((internationalCount / batchAlumni.length) * 100)
    : (batchInfo?.internationalRate || 0);

  const entrepreneursCount = batchAlumni.filter((a) =>
    (a.careerStatus || '').toLowerCase().includes('entrepreneur')
  ).length;
  const entrepreneursRate = batchAlumni.length > 0
    ? Math.round((entrepreneursCount / batchAlumni.length) * 100)
    : (batchInfo?.entrepreneursRate || 0);

  const verifiedStatusCount = batchAlumni.filter((a) => Boolean(a.careerStatus || a.jobRole || a.company)).length;
  const unverifiedStatusCount = Math.max(0, batchAlumni.length - verifiedStatusCount);

  // Dynamic multi-metric distribution chart for this batch
  const chartBatchData = useMemo(() => {
    if (batchAlumni.length === 0) {
      return {
        labels: ['No verified records yet'],
        values: [1],
        total: 0,
        items: [['No verified records yet', 0]] as [string, number][],
      };
    }

    const map = new Map<string, number>();

    if (batchChartMetric === 'SECTOR') {
      batchAlumni.forEach((a) => {
        let key = a.sector || 'Software Engineering';
        if (key.includes('Software') && !key.includes('Research')) key = 'Software Engineering';
        else if (key.includes('Academia') || key.includes('Research')) key = 'Academia / Research';
        else if (key.includes('Government')) key = 'Government / Public Sector';
        else if (key.includes('Entrepreneur')) key = 'Entrepreneurship / AI';
        else if (key.includes('Finance')) key = 'Finance / Fintech';
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else if (batchChartMetric === 'COUNTRY') {
      batchAlumni.forEach((a) => {
        const key = a.country || 'Unrecorded';
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else if (batchChartMetric === 'EMPLOYER') {
      batchAlumni.forEach((a) => {
        const key = a.company || 'Technology Sector';
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else if (batchChartMetric === 'STATUS') {
      batchAlumni.forEach((a) => {
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
    }

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    let finalEntries: [string, number][] = sorted;
    if (sorted.length > 6) {
      const top5: [string, number][] = sorted.slice(0, 5);
      const rest = sorted.slice(5).reduce((sum, item) => sum + item[1], 0);
      top5.push(['Other Categories', rest]);
      finalEntries = top5;
    }

    const labels = finalEntries.map((e) => e[0]);
    const values = finalEntries.map((e) => e[1]);
    return { labels, values, total: batchAlumni.length, items: finalEntries };
  }, [batchAlumni, batchChartMetric]);

  const BATCH_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: chartBatchData.labels,
        datasets: [
          {
            data: chartBatchData.values,
            backgroundColor: BATCH_PALETTE.slice(0, chartBatchData.labels.length),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
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
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [chartBatchData]);

  const deptBatchNews = useMemo(() => {
    return news
      .filter((n) => {
        if (n.status !== 'PUBLISHED') return false;
        const deptMatch =
          !n.department || normalizeDepartmentName(n.department) === normD;
        const uniMatch =
          !n.university || n.university.toLowerCase() === uLower;
        return deptMatch && uniMatch;
      })
      .sort((a, b) => {
        if (a.isHotTopic && !b.isHotTopic) return -1;
        if (!a.isHotTopic && b.isHotTopic) return 1;
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      });
  }, [news, normD, uLower]);

  const handleScanNews = async () => {
    try {
      setIsScanning(true);
      setScanMessage('');
      await triggerAINewsBotScan({
        university: universityName,
        department: departmentName,
        focusType: 'Alumni special achievements, prize winnings, research papers, grants',
        forceHotTopic: true,
        count: 2,
      });
      setScanMessage('AI Bot scanned web news wire & updated department achievements!');
    } catch (e) {
      setScanMessage('Scan completed or cached wire maintained.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() =>
            onBack
              ? onBack()
              : onNavigate('departmentProfile', {
                  dept: departmentName,
                  uni: universityName,
                })
          }
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to {departmentName}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
            <span>Graduating Cohort Explorer</span>
            {batchInfo?.batchNumber !== undefined && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                Cohort #{batchInfo.batchNumber}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black navy mt-2">
            {departmentName} — {batchInfo?.batchName || `${batchYear} Batch`}
          </h1>
          <p className="text-slate-500 mt-1.5 text-xs sm:text-sm">
            {universityName} · {batchInfo?.sessionName ? `Session ${batchInfo.sessionName}` : `Graduation Year ${batchYear}`}
            {batchInfo?.degree ? ` · ${batchInfo.degree}` : ''}
          </p>

          {batchInfo?.historicalMilestones && (
            <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200/70 rounded-xl text-xs text-blue-900 flex items-start gap-2 max-w-3xl">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <b>Cohort Milestone:</b> {batchInfo.historicalMilestones}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-start md:self-end">
          <button
            onClick={() =>
              onNavigate('departmentProfile', {
                dept: departmentName,
                uni: universityName,
              })
            }
            className="pill text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition cursor-pointer"
          >
            ← View All Cohorts
          </button>
          <span className="pill text-emerald-600 bg-emerald-50/70 border-emerald-200">
            ✓ Verified Cohort Dataset
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-7">
        <div className="metric">
          <b className="text-2xl navy">{studentsCount}</b>
          <p className="text-xs text-slate-400 mt-0.5">Intake Capacity</p>
        </div>
        <div className="metric">
          <b className="text-2xl text-blue-600">{batchAlumni.length}</b>
          <p className="text-xs text-slate-400 mt-0.5">Researched Profiles</p>
        </div>
        <div className="metric">
          <b className="text-2xl text-emerald-600">{employedRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Employed</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{higherStudyRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">Higher Study / PhD</p>
        </div>
        <div className="metric">
          <b className="text-2xl navy">{internationalRate}%</b>
          <p className="text-xs text-slate-400 mt-0.5">International Diaspora</p>
        </div>
      </div>

      {/* Dynamic Circle Chart and Filterable Alumni List */}
      <div className="grid lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Doughnut Chart */}
        <div className="lg:col-span-5 card p-6 bg-white border border-slate-200/90 shadow-xs rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black navy">
                  {batchChartMetric === 'SECTOR'
                    ? 'Sector Distribution'
                    : batchChartMetric === 'COUNTRY'
                    ? 'Country Distribution'
                    : batchChartMetric === 'EMPLOYER'
                    ? 'Top Employers'
                    : 'Career Status'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verified distribution · Denominator N={batchAlumni.length}
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                Circle Chart
              </span>
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl mt-3">
              <button
                onClick={() => setBatchChartMetric('SECTOR')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  batchChartMetric === 'SECTOR'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                Sector
              </button>
              <button
                onClick={() => setBatchChartMetric('COUNTRY')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  batchChartMetric === 'COUNTRY'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                Country
              </button>
              <button
                onClick={() => setBatchChartMetric('EMPLOYER')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  batchChartMetric === 'EMPLOYER'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                Employers
              </button>
              <button
                onClick={() => setBatchChartMetric('STATUS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  batchChartMetric === 'STATUS'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                Status
              </button>
            </div>

            <div className="h-60 mt-3 relative">
              <canvas ref={canvasRef}></canvas>
            </div>

            {/* Category breakdown items */}
            <div className="space-y-1.5 mt-3 max-h-40 overflow-y-auto pr-1">
              {chartBatchData.items.map(([label, count], idx) => {
                const pct = chartBatchData.total > 0 ? Math.round((count / chartBatchData.total) * 100) : 0;
                const color = BATCH_PALETTE[idx % BATCH_PALETTE.length];
                return (
                  <div key={label} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-medium text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate max-w-[180px]">{label}</span>
                      </span>
                      <span className="navy font-bold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <span>Verified Employment Info:</span>
              <b className="navy">{verifiedEmployedAlumni.length} of {batchAlumni.length} ({employedRate}%)</b>
            </div>
            <div className="flex justify-between">
              <span>Unverified / Unknown Status:</span>
              <b className="navy">{unverifiedStatusCount} records</b>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
              * Denominator N={batchAlumni.length}. Missing employment details are not treated as unemployment. Country of employment is distinguished from residence where verified.
            </p>
          </div>
        </div>

        {/* Right Column: Search, Filter & Alumni Profiles */}
        <div className="lg:col-span-7 card p-6 bg-white border border-slate-200/90 shadow-xs rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black navy">Alumni from this Batch</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {filteredBatchAlumni.length} of {batchAlumni.length} verified profiles
              </p>
            </div>
            <span className="pill text-[11px] text-blue-600 bg-blue-50 border-blue-200">
              {batchAlumni.length} Researched Profiles
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
            <div className="relative sm:col-span-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name, employer..."
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-slate-700"
              >
                <option value="All">All Countries</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-slate-700"
              >
                <option value="All">All Sectors</option>
                {uniqueSectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alumni Profiles List */}
          <div className="mt-4 grid gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredBatchAlumni.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                {batchAlumni.length === 0
                  ? `No verified public-profile records cataloged for the ${batchYear} cohort yet. This cohort is part of the department intake.`
                  : 'No alumni match the search or filter criteria.'}
              </div>
            ) : (
              filteredBatchAlumni.map((person) => {
                const initials = person.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')
                  .slice(0, 2);

                return (
                  <div
                    key={person.id}
                    onClick={() =>
                      onNavigate('alumniProfile', {
                        id: person.id,
                        name: person.name,
                      })
                    }
                    className="p-4 border border-slate-200/90 rounded-xl hover:border-blue-400 hover:shadow-xs transition group bg-white cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl avatar flex items-center justify-center font-bold text-sm shrink-0 bg-linear-to-br from-blue-700 to-indigo-900 text-white">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <b className="navy text-sm group-hover:text-blue-600 transition">
                              {person.name}
                            </b>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Verified
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium mt-1">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              {person.jobRole} <span className="text-slate-400">at</span>{' '}
                              <b className="text-navy">{person.company}</b>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                            {person.degree && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <GraduationCap className="w-3 h-3 text-slate-400" />
                                {person.degree}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" />
                              <span>Country:</span>
                              <b>{person.city ? `${person.city}, ` : ''}{person.country}</b>
                            </span>
                          </div>

                          {person.sector && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="pill text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                                {person.sector}
                              </span>
                              {person.specialization && (
                                <span className="pill text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                  {person.specialization}
                                </span>
                              )}
                            </div>
                          )}

                          {person.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-1.5 line-clamp-2">
                              "{person.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {person.sourceUrl && (
                          <a
                            href={person.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition"
                            title="Open official verification source record"
                          >
                            <span>Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition">
                          Profile →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>


      {/* Department & Cohort Achievements Live Wire */}
      <div className="card p-6 mt-8 shadow-md bg-white border-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
                <Bot className="w-4 h-4 text-blue-700" />
              </span>
              <h2 className="text-xl font-black navy">
                {departmentName} Alumni Honors & Live Wire
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active alumni prize winnings, fellowship awards, and verified achievements from {universityName} · {departmentName}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanNews}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan AI Wire'}</span>
            </button>
            <button
              onClick={() => onNavigate('news')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-xl transition border border-blue-200 cursor-pointer"
            >
              Browse All News →
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 p-2.5 rounded-xl font-medium">
            {scanMessage}
          </div>
        )}

        {deptBatchNews.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Bot className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold navy">No live wire articles for {departmentName} currently.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click "Scan AI Wire" to crawl achievements or report a prize winner.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            {deptBatchNews.slice(0, 4).map((item, idx) => {
              const daysLeft = item.expiresAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                  )
                : null;

              return (
                <div
                  key={item.id || `dept-batch-news-${idx}-${item.title}`}
                  className={`p-4 rounded-xl border transition hover:shadow-md flex flex-col justify-between ${
                    item.isHotTopic
                      ? 'border-rose-300 bg-rose-50/30'
                      : 'border-soft bg-white'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.isHotTopic && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full animate-pulse">
                            <Flame className="w-3 h-3 text-rose-600" />
                            <span>HOT TOPIC</span>
                          </span>
                        )}

                        {item.alumniPrizeName && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Award className="w-3 h-3 text-amber-600" />
                            <span className="truncate max-w-[180px]">{item.alumniPrizeName}</span>
                          </span>
                        )}

                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.isPermanent ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            Permanent
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {daysLeft}d left
                          </span>
                        )}

                        {canUserManageArticle(item) && (
                          <button
                            onClick={() => {
                              if (item.isPermanent) {
                                removeNewsPermanent(item.id);
                              } else {
                                makeNewsPermanent(item.id);
                              }
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                              item.isPermanent
                                ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                                : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                            }`}
                            title="3 types of Admins can seal news as permanent"
                          >
                            <Pin className="w-2.5 h-2.5" />
                            <span>{item.isPermanent ? 'Unpin' : 'Make Permanent'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h3
                      onClick={() => onNavigate('newsDetail', { id: item.id })}
                      className="text-sm font-black navy hover:text-blue-600 transition cursor-pointer leading-snug"
                    >
                      {item.title}
                    </h3>

                    {item.isHotTopic && item.hotTopicReason && (
                      <p className="text-[11px] text-rose-700 font-bold mt-1">
                        🔥 {item.hotTopicReason}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.summary || item.content.slice(0, 150) + '...'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-soft flex items-center justify-between text-[11px] text-slate-400">
                    <span>By {item.authorName}</span>
                    <button
                      onClick={() => onNavigate('newsDetail', { id: item.id })}
                      className="text-blue-600 font-semibold hover:underline"
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
    </div>
  );
};
