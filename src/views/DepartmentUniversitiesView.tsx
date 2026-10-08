import React, { useState, useMemo } from 'react';
import { universityInitials } from '../data/initialData';
import { VERIFIED_DEPARTMENT_SEEDS } from '../data/verifiedDepartments';
import { useData } from '../context/DataContext';
import { Bot, Flame, Award, Shield, Clock, RefreshCw, ExternalLink, ArrowLeft } from 'lucide-react';

interface DepartmentUniversitiesViewProps {
  departmentName: string;
  departmentGroup: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const DepartmentUniversitiesView: React.FC<DepartmentUniversitiesViewProps> = ({
  departmentName,
  departmentGroup,
  onNavigate,
  onBack,
}) => {
  const { news, departments, universities, alumni, triggerAINewsBotScan } = useData();
  const [search, setSearch] = useState('');
  const [isScanningDept, setIsScanningDept] = useState(false);

  const normalizeDepartmentName = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

  // Relevant news for this department across all universities
  const deptNews = useMemo(() => {
    return news
      .filter(
        (n) =>
          n.department?.toLowerCase() === departmentName.toLowerCase() &&
          n.status === 'PUBLISHED'
      )
      .sort((a, b) => {
        if (a.isHotTopic && !b.isHotTopic) return -1;
        if (!a.isHotTopic && b.isHotTopic) return 1;
        return (
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
        );
      });
  }, [news, departmentName]);

  const handleScanDeptWire = async () => {
    try {
      setIsScanningDept(true);
      await triggerAINewsBotScan({
        department: departmentName,
        focusType: 'Alumni special achievements, prize winnings, research papers, grants',
        forceHotTopic: true,
        count: 2,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningDept(false);
    }
  };

  // Filter universities offering this department
  const list = useMemo(() => {
    const offered = new Set([
      ...VERIFIED_DEPARTMENT_SEEDS
        .filter((d) => normalizeDepartmentName(d.name) === normalizeDepartmentName(departmentName))
        .map((d) => d.university.toLowerCase()),
      ...departments
        .filter((d) => d.status !== 'Inactive' && normalizeDepartmentName(d.name) === normalizeDepartmentName(departmentName))
        .map((d) => d.university.toLowerCase()),
    ]);
    return universities
      .filter((u) => u.status !== 'Inactive' && offered.has(u.name.toLowerCase()))
      .filter((u) => {
        const q = search.trim().toLowerCase();
        const matchesSearch = !q || u.name.toLowerCase().includes(q);
        return matchesSearch;
      });
  }, [departments, universities, alumni, search, departmentName]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => (onBack ? onBack() : onNavigate('department'))}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:text-blue-600 transition group cursor-pointer"
          title="Back to previous / upper page"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5 text-slate-500 group-hover:text-blue-600" />
          <span>← Back to Departments</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            {departmentGroup}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black navy mt-2">{departmentName}</h1>
          <p className="text-slate-500 mt-2">
            Universities in the AlumniSphere network offering this discipline.
          </p>
        </div>
        <span className="pill text-blue-600 self-start md:self-end">
          {list.length} universities
        </span>
      </div>

      <div className="card p-5 mt-7">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-soft rounded-xl px-4 py-3 outline-none focus:border-blue-300 bg-white"
          placeholder="Filter university by name..."
        />
      </div>

      {/* Live Department Achievement & News Wire */}
      <div className="card p-6 mt-7 shadow-lg bg-white border-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-purple-100 text-purple-700 rounded-lg">
                <Bot className="w-4 h-4 text-purple-700" />
              </span>
              <h2 className="text-lg font-black navy">
                {departmentName} Alumni Live Wire & Breakthroughs
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time achievements, prestigious awards, and scholarly breakthroughs across all universities offering this discipline.
            </p>
          </div>

          <button
            onClick={handleScanDeptWire}
            disabled={isScanningDept}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningDept ? 'animate-spin' : ''}`} />
            <span>{isScanningDept ? 'Scanning Web Wire...' : 'Scan Department AI Wire'}</span>
          </button>
        </div>

        {deptNews.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <Bot className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold navy">No active wire stories for {departmentName} yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click "Scan Department AI Wire" to crawl scholarly databases and web publications.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3.5 mt-4">
            {deptNews.slice(0, 4).map((item) => {
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
                  key={item.id}
                  onClick={() => onNavigate('newsDetail', { id: item.id })}
                  className={`p-4 rounded-xl border transition hover:shadow-md cursor-pointer ${
                    item.isHotTopic
                      ? 'border-rose-300 bg-rose-50/30'
                      : 'border-soft bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
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
                          <span className="truncate max-w-[160px]">{item.alumniPrizeName}</span>
                        </span>
                      )}
                    </div>

                    {item.isPermanent ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Permanent</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span>{daysLeft}d left</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-xs navy hover:text-blue-600 transition line-clamp-2">
                    {item.title}
                  </h3>

                  {item.hotTopicReason && (
                    <p className="text-[11px] text-rose-700 font-semibold mt-1">
                      🔥 {item.hotTopicReason}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-soft">
                    <span>{item.university || 'Nationwide Institutions'}</span>
                    <span className="text-blue-600 font-bold">Read story →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {list.slice(0, 36).map((u) => {
          const initials = universityInitials(u.name);
          const alumniCount = alumni.filter((a) => a.status === 'APPROVED' && a.university.toLowerCase() === u.name.toLowerCase() && normalizeDepartmentName(a.department) === normalizeDepartmentName(departmentName)).length;
          const employmentRate = 0;
          const countriesCount = 0;

          return (
            <button
              key={u.name}
              onClick={() =>
                onNavigate('departmentProfile', {
                  dept: departmentName,
                  uni: u.name,
                })
              }
              className="dept-card card p-5 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center font-black navy text-sm group-hover:bg-blue-50 group-hover:text-blue-700 transition">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="leading-snug block text-slate-900 group-hover:text-blue-600 transition">
                    {u.name}
                  </b>
                  <p className="text-xs text-slate-400 mt-1">{u.type} · Bangladesh</p>
                </div>
              </div>

              <div className="line my-4"></div>

              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <b className="navy text-sm">{alumniCount}</b>
                  <p className="text-slate-400 text-[10px] mt-0.5">Alumni</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <b className="text-emerald-600 text-sm">{employmentRate ? `${employmentRate}%` : '—'}</b>
                  <p className="text-slate-400 text-[10px] mt-0.5">Employed</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <b className="navy text-sm">{countriesCount}</b>
                  <p className="text-slate-400 text-[10px] mt-0.5">Countries</p>
                </div>
              </div>

              <div className="mt-4 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition">
                Open department profile →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
