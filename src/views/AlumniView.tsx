import React, { useEffect, useRef, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { ArrowLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { RAW_DEPARTMENT_CATALOG, ALL_DIRECTORY_UNIVERSITIES } from '../data/initialData';

interface AlumniViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onBack?: () => void;
}

export const AlumniView: React.FC<AlumniViewProps> = ({ onNavigate, onBack }) => {
  const { universities, alumni, stats } = useData();

  const uChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uChartInstance = useRef<Chart | null>(null);
  const dChartInstance = useRef<Chart | null>(null);

  const [selectedUni, setSelectedUni] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [universityFilter, setUniversityFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [directorySort, setDirectorySort] = useState('name-asc');
  const [directoryPage, setDirectoryPage] = useState(1);
  const directoryPageSize = 9;

  // Sorted universities by alumni count
  const universityRankings = useMemo(() => {
    return universities
      .map((u) => {
        const liveCount = alumni.filter(
          (a) => a.status === 'APPROVED' && a.university?.toLowerCase() === u.name.toLowerCase()
        ).length;
        return {
          name: u.name,
          type: u.type,
          alumni: liveCount || u.alumniCount || 0,
        };
      })
      .sort((a, b) => b.alumni - a.alumni);
  }, [universities, alumni]);

  // Sorted departments by aggregated alumni
  const departmentRankings = useMemo(() => {
    return RAW_DEPARTMENT_CATALOG.map((d) => {
      const deptAlumni = alumni.filter(
        (a) => a.status === 'APPROVED' && a.department?.toLowerCase() === d.name.toLowerCase()
      );
      const liveCount = deptAlumni.length;
      const unisCount = new Set(deptAlumni.map((a) => a.university?.toLowerCase()).filter(Boolean)).size;
      return {
        name: d.name,
        group: d.group,
        alumni: liveCount,
        universitiesCount: unisCount,
      };
    }).sort((a, b) => b.alumni - a.alumni);
  }, [alumni]);

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

  // Filter and sort only approved alumni, then paginate the result set.
  const filteredAlumni = useMemo(() => {
    const query = alumniSearch.trim().toLocaleLowerCase();
    const filtered = alumni.filter((a) => {
      if (a.status !== 'APPROVED') return false;
      const hay = [a.name, a.university, a.department, a.jobRole, a.company, a.country, a.batch, a.graduationYear]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      const matchesSearch = !query || hay.includes(query);
      const matchesCountry = countryFilter === 'All' || a.country === countryFilter;
      const matchesUniversity = universityFilter === 'All' || a.university === universityFilter;
      const matchesDepartment = departmentFilter === 'All' || a.department === departmentFilter;
      return matchesSearch && matchesCountry && matchesUniversity && matchesDepartment;
    });

    return filtered.sort((a, b) => {
      const nameA = (a.name || '').toLocaleLowerCase();
      const nameB = (b.name || '').toLocaleLowerCase();
      const universityA = (a.university || '').toLocaleLowerCase();
      const universityB = (b.university || '').toLocaleLowerCase();
      const yearA = Number(a.graduationYear || a.batch) || 0;
      const yearB = Number(b.graduationYear || b.batch) || 0;

      switch (directorySort) {
        case 'name-desc': return nameB.localeCompare(nameA);
        case 'university-asc': return universityA.localeCompare(universityB) || nameA.localeCompare(nameB);
        case 'year-newest': return yearB - yearA || nameA.localeCompare(nameB);
        case 'year-oldest': return yearA - yearB || nameA.localeCompare(nameB);
        default: return nameA.localeCompare(nameB);
      }
    });
  }, [alumni, alumniSearch, countryFilter, universityFilter, departmentFilter, directorySort]);

  const approvedAlumni = useMemo(() => alumni.filter((a) => a.status === 'APPROVED'), [alumni]);
  const uniqueCountries = useMemo(
    () => Array.from(new Set(approvedAlumni.map((a) => a.country).filter((value): value is string => Boolean(value))).values()).sort(),
    [approvedAlumni]
  );
  const uniqueUniversities = useMemo(
    () => Array.from(new Set(approvedAlumni.map((a) => a.university).filter((value): value is string => Boolean(value))).values()).sort(),
    [approvedAlumni]
  );
  const uniqueDepartments = useMemo(
    () => Array.from(new Set(approvedAlumni.map((a) => a.department).filter((value): value is string => Boolean(value))).values()).sort(),
    [approvedAlumni]
  );
  const totalDirectoryPages = Math.max(1, Math.ceil(filteredAlumni.length / directoryPageSize));
  const visibleAlumni = filteredAlumni.slice((directoryPage - 1) * directoryPageSize, directoryPage * directoryPageSize);
  const clearDirectoryFilters = () => {
    setAlumniSearch('');
    setCountryFilter('All');
    setUniversityFilter('All');
    setDepartmentFilter('All');
    setDirectorySort('name-asc');
    setDirectoryPage(1);
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

      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
        Alumni Intelligence
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black navy">
            Alumni by University & Department
          </h1>
          <p className="text-slate-500 mt-2 max-w-3xl">
            Real-time counts aggregated across all 178 institutions and 48 academic departments.
            When an approved alumni is verified, platform statistics automatically sync.
          </p>
        </div>
        <span className="pill text-blue-600 self-start lg:self-end">
          {stats.totalAlumni.toLocaleString()} total network alumni
        </span>
      </div>

      {/* Top 5 Lists Grid */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
        {/* Top Universities */}
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black navy">Top universities by alumni</h2>
              <p className="text-xs text-slate-400 mt-1">Top 5 institutions shown</p>
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
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                onClick={() => onNavigate('universityDetail', { name: x.name })}
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-soft flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-sm block truncate navy">{x.name}</b>
                  <span className="text-[11px] text-slate-400">{x.type} University</span>
                </div>
                <b className="text-sm navy whitespace-nowrap">{x.alumni.toLocaleString()}</b>
              </div>
            ))}
          </div>

          {selectedUni && (
            <div className="mt-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
              <div className="flex justify-between items-center text-sm">
                <b className="navy">{selectedUni}</b>
                <b className="text-blue-700 font-black">
                  {universityRankings
                    .find((u) => u.name === selectedUni)
                    ?.alumni.toLocaleString()}{' '}
                  alumni
                </b>
              </div>
            </div>
          )}
        </div>

        {/* Top Departments */}
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black navy">Top departments by alumni</h2>
              <p className="text-xs text-slate-400 mt-1">Aggregated across all universities</p>
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
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                onClick={() =>
                  onNavigate('departmentUniversities', {
                    dept: x.name,
                    group: x.group,
                  })
                }
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-soft flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-sm block truncate navy">{x.name}</b>
                  <span className="text-[11px] text-slate-400">
                    {x.group} · {x.universitiesCount} offering universities
                  </span>
                </div>
                <b className="text-sm navy whitespace-nowrap">{x.alumni.toLocaleString()}</b>
              </div>
            ))}
          </div>

          {selectedDept && (
            <div className="mt-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
              <div className="flex justify-between items-center text-sm">
                <b className="navy">{selectedDept}</b>
                <b className="text-blue-700 font-black">
                  {departmentRankings
                    .find((d) => d.name === selectedDept)
                    ?.alumni.toLocaleString()}{' '}
                  alumni
                </b>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="card p-4 sm:p-6">
          <h2 className="text-xl font-black navy">University alumni distribution</h2>
          <p className="text-xs text-slate-400 mt-1">Top 10 institutions visual proportion</p>
          <div className="h-80 mt-4 relative">
            <canvas ref={uChartCanvasRef}></canvas>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="text-xl font-black navy">Department alumni distribution</h2>
          <p className="text-xs text-slate-400 mt-1">Top 10 academic disciplines proportion</p>
          <div className="h-80 mt-4 relative">
            <canvas ref={dChartCanvasRef}></canvas>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="card p-4 sm:p-6 mt-6">
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

      {/* Alumni Directory Table / Profiles */}
      <div className="card p-4 sm:p-6 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black navy">Verified Alumni Directory</h2>
            <p className="text-xs text-slate-400 mt-1">
              Search by name, organization, country, batch, or institution
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 w-full md:max-w-4xl">
            <input
              value={alumniSearch}
              onChange={(e) => { setAlumniSearch(e.target.value); setDirectoryPage(1); }}
              placeholder="Search name, role, company, batch..."
              aria-label="Search alumni directory"
              className="min-w-0 border border-soft rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
            />
            <select
              value={universityFilter}
              onChange={(e) => { setUniversityFilter(e.target.value); setDirectoryPage(1); }}
              aria-label="Filter by university"
              className="min-w-0 border border-soft rounded-xl px-3 py-2.5 text-sm bg-white outline-none cursor-pointer"
            >
              <option value="All">All Universities</option>
              {uniqueUniversities.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setDirectoryPage(1); }}
              aria-label="Filter by department"
              className="min-w-0 border border-soft rounded-xl px-3 py-2.5 text-sm bg-white outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={countryFilter}
              onChange={(e) => { setCountryFilter(e.target.value); setDirectoryPage(1); }}
              aria-label="Filter by country"
              className="min-w-0 border border-soft rounded-xl px-3 py-2.5 text-sm bg-white outline-none cursor-pointer"
            >
              <option value="All">All Countries</option>
              {uniqueCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={directorySort}
              onChange={(e) => { setDirectorySort(e.target.value); setDirectoryPage(1); }}
              aria-label="Sort alumni"
              className="min-w-0 border border-soft rounded-xl px-3 py-2.5 text-sm bg-white outline-none cursor-pointer"
            >
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="university-asc">University: A to Z</option>
              <option value="year-newest">Graduation: Newest first</option>
              <option value="year-oldest">Graduation: Oldest first</option>
            </select>
            <button
              type="button"
              onClick={clearDirectoryFilters}
              className="border border-soft rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-300 transition"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 text-xs text-slate-500">
          <span>
            Showing <b className="navy">{filteredAlumni.length === 0 ? 0 : (directoryPage - 1) * directoryPageSize + 1}–{Math.min(directoryPage * directoryPageSize, filteredAlumni.length)}</b> of <b className="navy">{filteredAlumni.length.toLocaleString()}</b> approved alumni
          </span>
          <span>Page {Math.min(directoryPage, totalDirectoryPages)} of {totalDirectoryPages}</span>
        </div>

        {filteredAlumni.length === 0 ? (
          <div className="py-16 text-center card p-8 border border-dashed border-soft">
            <b className="navy text-base block">No alumni records found</b>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {alumniSearch || countryFilter !== 'All'
                ? 'Try adjusting your search criteria or country filter.'
                : 'No other verified alumni have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleAlumni.map((person) => {
              const initials = person.name
                .split(' ')
                .map((x) => x[0])
                .join('')
                .slice(0, 2);

              return (
                <button
                  key={person.id}
                  onClick={() => onNavigate('alumniProfile', { id: person.id, name: person.name })}
                  className="card p-5 text-left hover:-translate-y-1 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-full avatar flex items-center justify-center font-bold text-base shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <b className="navy text-sm block truncate group-hover:text-blue-600 transition">
                            {person.name}
                          </b>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
                          {person.jobRole}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{person.company}</p>
                      </div>
                    </div>

                    <div className="line my-3.5"></div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="truncate">
                        <span className="text-slate-400">Uni:</span> {person.university}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400">Dept:</span> {person.department} (
                        {person.graduationYear || person.batch})
                      </div>
                      <div>
                        <span className="text-slate-400">Country:</span> {person.country}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-soft flex items-center justify-between text-xs">
                    {person.isVerified ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Verified Alumni
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                        Graduate
                      </span>
                    )}
                    <span className="text-blue-600 font-semibold group-hover:translate-x-1 transition">
                      Profile →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filteredAlumni.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-soft">
            <p className="text-xs text-slate-400">Showing {visibleAlumni.length} profiles on this page</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={directoryPage <= 1}
                onClick={() => setDirectoryPage((page) => Math.max(1, page - 1))}
                className="px-3.5 py-2 rounded-xl border border-soft text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 transition"
              >
                ← Previous
              </button>
              <span className="text-xs text-slate-500 tabular-nums">{directoryPage} / {totalDirectoryPages}</span>
              <button
                type="button"
                disabled={directoryPage >= totalDirectoryPages}
                onClick={() => setDirectoryPage((page) => Math.min(totalDirectoryPages, page + 1))}
                className="px-3.5 py-2 rounded-xl border border-soft text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
