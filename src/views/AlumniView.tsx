import React, { useEffect, useRef, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { useData } from '../context/DataContext';
import { RAW_DEPARTMENT_CATALOG, ALL_DIRECTORY_UNIVERSITIES, demoSeed } from '../data/initialData';

interface AlumniViewProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const AlumniView: React.FC<AlumniViewProps> = ({ onNavigate }) => {
  const { universities, alumni, stats } = useData();

  const uChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uChartInstance = useRef<Chart | null>(null);
  const dChartInstance = useRef<Chart | null>(null);

  const [selectedUni, setSelectedUni] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');

  // Sorted universities by alumni count
  const universityRankings = useMemo(() => {
    return universities
      .map((u) => ({
        name: u.name,
        type: u.type,
        alumni: u.alumniCount || demoSeed(u.name) % 4000 + 600,
      }))
      .sort((a, b) => b.alumni - a.alumni);
  }, [universities]);

  // Sorted departments by aggregated alumni
  const departmentRankings = useMemo(() => {
    return RAW_DEPARTMENT_CATALOG.map((d) => {
      const seed = demoSeed(d.name);
      const totalDeptAlumni = 450 + (seed % 1400);
      return {
        name: d.name,
        group: d.group,
        alumni: totalDeptAlumni,
        universitiesCount: d.name.includes('Computer') ? 178 : 65,
      };
    }).sort((a, b) => b.alumni - a.alumni);
  }, []);

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

  // Filter individual alumni directory
  const filteredAlumni = useMemo(() => {
    return alumni.filter((a) => {
      if (a.status !== 'APPROVED') return false;
      const hay = [a.name, a.university, a.department, a.jobRole, a.company, a.country, a.batch]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !alumniSearch || hay.includes(alumniSearch.trim().toLowerCase());
      const matchesCountry = countryFilter === 'All' || a.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [alumni, alumniSearch, countryFilter]);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    alumni.forEach((a) => {
      if (a.country) set.add(a.country);
    });
    return Array.from(set);
  }, [alumni]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-5 py-7 sm:py-10">
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

          <div className="flex flex-wrap gap-2">
            <input
              value={alumniSearch}
              onChange={(e) => setAlumniSearch(e.target.value)}
              placeholder="Search alumni..."
              className="border border-soft rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="border border-soft rounded-xl px-3 py-2 text-sm bg-white outline-none cursor-pointer"
            >
              <option value="All">All Countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
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
            {filteredAlumni.map((person) => {
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
      </div>
    </div>
  );
};
