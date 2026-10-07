import React, { useState, useMemo } from 'react';
import { ALL_DIRECTORY_UNIVERSITIES, universityInitials, demoSeed } from '../data/initialData';

interface DepartmentUniversitiesViewProps {
  departmentName: string;
  departmentGroup: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const DepartmentUniversitiesView: React.FC<DepartmentUniversitiesViewProps> = ({
  departmentName,
  departmentGroup,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');

  // Filter universities offering this department
  const list = useMemo(() => {
    return ALL_DIRECTORY_UNIVERSITIES.filter((u) => {
      // General availability rule
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || u.name.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <button
        onClick={() => onNavigate('department')}
        className="text-sm text-slate-500 hover:text-slate-800 transition mb-5 flex items-center gap-1"
      >
        <span>← All departments</span>
      </button>

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

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {list.slice(0, 36).map((u) => {
          const initials = universityInitials(u.name);
          const seed = demoSeed(u.name + departmentName);
          const alumniCount = 120 + (seed % 650);
          const employmentRate = 78 + (seed % 17);
          const countriesCount = 8 + (seed % 16);

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
                  <b className="text-emerald-600 text-sm">{employmentRate}%</b>
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
